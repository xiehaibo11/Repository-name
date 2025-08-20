const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixAgentIdField(client) {
  console.log(`\n🔍 检查 members 表的 agent_id 字段...`);
  const tableStructure = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'members'
    ORDER BY ordinal_position
  `);

  // 检查 agent_id 字段是否存在
  const agentIdExists = tableStructure.rows.some(row => row.column_name === 'agent_id');

  if (!agentIdExists) {
    console.log(`⚠️  members 表的 agent_id 字段不存在，需要添加该字段`);

    // 添加 agent_id 字段
    console.log(`🔧 为 members 表添加 agent_id 字段...`);
    await client.query(`ALTER TABLE members ADD COLUMN agent_id INTEGER`);

    // 为现有记录设置默认的 agent_id（使用第一个代理商的ID）
    console.log(`🔧 为 members 表设置默认 agent_id 值...`);
    const firstAgent = await client.query(`SELECT id FROM agents ORDER BY id LIMIT 1`);

    if (firstAgent.rows.length > 0) {
      const defaultAgentId = firstAgent.rows[0].id;
      await client.query(`
        UPDATE members
        SET agent_id = $1
        WHERE agent_id IS NULL
      `, [defaultAgentId]);

      console.log(`✅ 已为所有会员设置默认 agent_id: ${defaultAgentId}`);
    } else {
      console.log(`⚠️  没有找到代理商，无法设置默认 agent_id`);
    }

    // 设置 agent_id 为 NOT NULL
    console.log(`🔧 为 members 表设置 agent_id 为 NOT NULL...`);
    await client.query(`ALTER TABLE members ALTER COLUMN agent_id SET NOT NULL`);

    // 添加外键约束
    console.log(`🔧 为 members 表添加 agent_id 外键约束...`);
    await client.query(`
      ALTER TABLE members
      ADD CONSTRAINT fk_members_agent_id
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    `);

    console.log(`✅ members 表的 agent_id 字段修复完成`);
  } else {
    console.log(`✅ members 表的 agent_id 字段已存在`);
  }
}

async function fixNicknameForTable(client, tableName, usernameField = 'username') {
  console.log(`\n🔍 检查 ${tableName} 表结构...`);
  const tableStructure = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  console.log(`📋 ${tableName} 表字段:`);
  console.table(tableStructure.rows);

  // 检查 nickname 字段是否存在
  const nicknameExists = tableStructure.rows.some(row => row.column_name === 'nickname');

  if (!nicknameExists) {
    console.log(`⚠️  ${tableName} 表的 nickname 字段不存在，需要添加该字段`);

    // 添加 nickname 字段
    console.log(`🔧 为 ${tableName} 表添加 nickname 字段...`);
    await client.query(`ALTER TABLE ${tableName} ADD COLUMN nickname VARCHAR(100)`);

    // 更新所有记录的 nickname 为 username
    console.log(`🔧 为 ${tableName} 表设置默认 nickname 值...`);
    await client.query(`
      UPDATE ${tableName}
      SET nickname = ${usernameField}
      WHERE nickname IS NULL
    `);

    // 设置 nickname 为 NOT NULL
    console.log(`🔧 为 ${tableName} 表设置 nickname 为 NOT NULL...`);
    await client.query(`ALTER TABLE ${tableName} ALTER COLUMN nickname SET NOT NULL`);

    console.log(`✅ ${tableName} 表的 nickname 字段添加完成`);
  } else {
    // 检查是否有 nickname 为 NULL 的记录
    console.log(`🔍 检查 ${tableName} 表中 nickname 为 NULL 的记录...`);
    const checkResult = await client.query(
      `SELECT COUNT(*) as null_count FROM ${tableName} WHERE nickname IS NULL`
    );

    const nullCount = parseInt(checkResult.rows[0].null_count);
    console.log(`📊 ${tableName} 表发现 ${nullCount} 条 nickname 为 NULL 的记录`);

    if (nullCount > 0) {
      console.log(`🔧 开始修复 ${tableName} 表的 NULL 值...`);

      // 更新 nickname 为 NULL 的记录
      const updateResult = await client.query(`
        UPDATE ${tableName}
        SET nickname = COALESCE(${usernameField}, '${tableName.slice(0, -1)}_' || id::text),
            updated_at = NOW()
        WHERE nickname IS NULL
      `);

      console.log(`✅ ${tableName} 表已更新 ${updateResult.rowCount} 条记录`);
    } else {
      console.log(`✅ ${tableName} 表没有发现 nickname 为 NULL 的记录`);
    }
  }
}

async function fixNicknameNull() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'backend_management_clean',
  });

  try {
    console.log('🔗 连接数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 修复 agents 表
    await fixNicknameForTable(client, 'agents', 'username');

    // 修复 members 表
    await fixNicknameForTable(client, 'members', 'username');

    // 检查并修复 members 表的 agent_id 字段
    await fixAgentIdField(client);

    // 验证修复结果
    console.log('\n🔍 验证修复结果...');

    // 验证 agents 表
    const agentsVerifyResult = await client.query(`
      SELECT
        COUNT(*) as total_agents,
        COUNT(nickname) as agents_with_nickname,
        COUNT(*) - COUNT(nickname) as agents_with_null_nickname
      FROM agents
    `);

    const agentsStats = agentsVerifyResult.rows[0];
    console.log('📊 agents 表修复后统计:');
    console.log(`   总代理商数: ${agentsStats.total_agents}`);
    console.log(`   有昵称的代理商: ${agentsStats.agents_with_nickname}`);
    console.log(`   昵称为 NULL 的代理商: ${agentsStats.agents_with_null_nickname}`);

    // 验证 members 表
    const membersVerifyResult = await client.query(`
      SELECT
        COUNT(*) as total_members,
        COUNT(nickname) as members_with_nickname,
        COUNT(*) - COUNT(nickname) as members_with_null_nickname
      FROM members
    `);

    const membersStats = membersVerifyResult.rows[0];
    console.log('📊 members 表修复后统计:');
    console.log(`   总会员数: ${membersStats.total_members}`);
    console.log(`   有昵称的会员: ${membersStats.members_with_nickname}`);
    console.log(`   昵称为 NULL 的会员: ${membersStats.members_with_null_nickname}`);

    // 显示一些示例数据
    console.log('\n📋 agents 表数据示例:');
    const agentsSampleResult = await client.query(`
      SELECT id, username, nickname, status, created_at
      FROM agents
      ORDER BY id
      LIMIT 3
    `);

    if (agentsSampleResult.rows.length > 0) {
      console.table(agentsSampleResult.rows);
    } else {
      console.log('   没有找到代理商数据');
    }

    console.log('\n📋 members 表数据示例:');
    const membersSampleResult = await client.query(`
      SELECT id, username, nickname, status, created_at
      FROM members
      ORDER BY id
      LIMIT 3
    `);

    if (membersSampleResult.rows.length > 0) {
      console.table(membersSampleResult.rows);
    } else {
      console.log('   没有找到会员数据');
    }

    console.log('\n🎉 修复完成！现在可以重新启动应用程序');

  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行修复
fixNicknameNull().catch(console.error);

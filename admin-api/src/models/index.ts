import sequelize from '../config/database';
import Admin from './Admin';
import Agent from './Agent';
import Member from './Member';
import CreditLog from './CreditLog';
import BalanceLog from './BalanceLog';
import { Notice } from './Notice';
import LoginLog from './LoginLog';

// 定义模型关联关系

// Agent 和 Member 的关联（一对多）
Agent.hasMany(Member, {
  foreignKey: 'agentId',
  as: 'members',
  onDelete: 'RESTRICT', // 防止删除有会员的代理商
});

Member.belongsTo(Agent, {
  foreignKey: 'agentId',
  as: 'agent',
});

// Admin 和 CreditLog 的关联（一对多）
Admin.hasMany(CreditLog, {
  foreignKey: 'operatorId',
  as: 'creditLogs',
});

CreditLog.belongsTo(Admin, {
  foreignKey: 'operatorId',
  as: 'operator',
});

// Agent 和 CreditLog 的关联（一对多）
Agent.hasMany(CreditLog, {
  foreignKey: 'userId',
  as: 'creditLogs',
});

CreditLog.belongsTo(Agent, {
  foreignKey: 'userId',
  as: 'user',
});

// Admin 和 BalanceLog 的关联（一对多）
Admin.hasMany(BalanceLog, {
  foreignKey: 'operatorId',
  as: 'balanceLogs',
});

BalanceLog.belongsTo(Admin, {
  foreignKey: 'operatorId',
  as: 'operator',
});

// Member 和 BalanceLog 的关联（一对多）
Member.hasMany(BalanceLog, {
  foreignKey: 'userId',
  as: 'balanceLogs',
});

BalanceLog.belongsTo(Member, {
  foreignKey: 'userId',
  as: 'user',
});

// Admin 和 Notice 的关联（一对多）
Admin.hasMany(Notice, {
  foreignKey: 'createdBy',
  as: 'notices',
});

Notice.belongsTo(Admin, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// 导出所有模型
export {
  sequelize,
  Admin,
  Agent,
  Member,
  CreditLog,
  BalanceLog,
  Notice,
  LoginLog,
};

// 初始化数据库的函数
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 开始初始化数据库...');

    // 导入数据库连接函数
    const { connectDB } = await import('../config/database');

    // 连接数据库并创建表
    await connectDB();

    // 创建彩票系统表
    await createLotteryTables();

    // 创建默认管理员账户
    await createDefaultAdmin();

    // 创建默认彩种
    await createDefaultLotteryTypes();

    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
};

// 创建彩票系统表
const createLotteryTables = async (): Promise<void> => {
  try {
    const { pool } = await import('../db');

    // 创建彩种表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lottery_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        draw_frequency VARCHAR(50) NOT NULL,
        draw_interval INTEGER NOT NULL DEFAULT 1,
        daily_start_issue INTEGER NOT NULL DEFAULT 1,
        daily_issue_count INTEGER NOT NULL DEFAULT 1440,
        issue_format VARCHAR(100) NOT NULL,
        number_count INTEGER NOT NULL DEFAULT 5,
        number_range_min INTEGER NOT NULL DEFAULT 0,
        number_range_max INTEGER NOT NULL DEFAULT 9,
        start_time TIME,
        end_time TIME,
        draw_time_control TIME,
        seal_time INTEGER NOT NULL DEFAULT 10,
        sound_alert BOOLEAN NOT NULL DEFAULT true,
        countdown_display BOOLEAN NOT NULL DEFAULT true,
        random_source VARCHAR(50) NOT NULL DEFAULT 'hybrid',
        randomness_validation BOOLEAN NOT NULL DEFAULT true,
        blockchain_record BOOLEAN NOT NULL DEFAULT true,
        target_win_rate DECIMAL(15,9) NOT NULL DEFAULT 0.000000017,
        dynamic_payout_adjustment BOOLEAN NOT NULL DEFAULT true,
        anomaly_detection BOOLEAN NOT NULL DEFAULT true,
        multi_signature BOOLEAN NOT NULL DEFAULT true,
        audit_log BOOLEAN NOT NULL DEFAULT true,
        manual_draw_mode BOOLEAN NOT NULL DEFAULT false,
        smart_avoidance BOOLEAN NOT NULL DEFAULT true,
        risk_control_level VARCHAR(20) NOT NULL DEFAULT 'high',
        new_member_induction BOOLEAN NOT NULL DEFAULT true,
        induction_win_amount INTEGER NOT NULL DEFAULT 100,
        induction_periods INTEGER NOT NULL DEFAULT 3,
        big_bet_monitoring BOOLEAN NOT NULL DEFAULT true,
        big_bet_threshold INTEGER NOT NULL DEFAULT 5000,
        consecutive_loss_control INTEGER NOT NULL DEFAULT 20,
        member_profit_limit INTEGER NOT NULL DEFAULT 50000,
        profit_recovery_mode VARCHAR(20) NOT NULL DEFAULT 'smart',
        platform_protection_rate DECIMAL(5,2) NOT NULL DEFAULT 85.0,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建奖期表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lottery_issues (
        id SERIAL PRIMARY KEY,
        lottery_type_id INTEGER REFERENCES lottery_types(id),
        issue_no VARCHAR(50) NOT NULL,
        issue_date DATE NOT NULL,
        issue_index INTEGER NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        draw_time TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lottery_type_id, issue_no)
      )
    `);

    // 创建开奖结果表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lottery_draws (
        id SERIAL PRIMARY KEY,
        lottery_type_id INTEGER REFERENCES lottery_types(id),
        issue_id INTEGER REFERENCES lottery_issues(id),
        issue_no VARCHAR(50) NOT NULL,
        draw_numbers VARCHAR(50) NOT NULL,
        wan_wei INTEGER,
        qian_wei INTEGER,
        bai_wei INTEGER,
        shi_wei INTEGER,
        ge_wei INTEGER,
        sum_value INTEGER NOT NULL,
        sum_big_small VARCHAR(10) NOT NULL,
        sum_odd_even VARCHAR(10) NOT NULL,
        draw_method VARCHAR(20) NOT NULL DEFAULT 'auto',
        draw_status VARCHAR(20) NOT NULL DEFAULT 'completed',
        draw_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lottery_type_id, issue_no)
      )
    `);

    console.log('✅ 彩票系统表创建成功');
  } catch (error) {
    console.error('创建彩票系统表失败:', error);
  }
};

// 创建默认管理员账户
const createDefaultAdmin = async (): Promise<void> => {
  try {
    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || '1019683427';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'xie080886';
    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';

    // 检查是否已存在管理员
    const existingAdmin = await Admin.findOne({
      where: { username: defaultUsername }
    });

    if (!existingAdmin) {
      await Admin.create({
        username: defaultUsername,
        password: defaultPassword,
        email: defaultEmail,
        role: 'super_admin',
        status: 'active',
      });
      // 静默创建管理员账户
    }
  } catch (error) {
    console.error('创建默认管理员账户失败:', error);
  }
};

// 创建默认彩种
const createDefaultLotteryTypes = async (): Promise<void> => {
  try {
    const { pool } = await import('../db');

    // 检查是否已存在分分时时彩
    const existingLottery = await pool.query(
      'SELECT id FROM lottery_types WHERE code = $1',
      ['ssc']
    );

    if (existingLottery.rows.length === 0) {
      await pool.query(`
        INSERT INTO lottery_types (
          name, code, category, draw_frequency, draw_interval, daily_start_issue, daily_issue_count,
          issue_format, number_count, number_range_min, number_range_max,
          start_time, end_time, draw_time_control, seal_time, sound_alert, countdown_display,
          random_source, randomness_validation, blockchain_record, target_win_rate,
          dynamic_payout_adjustment, anomaly_detection, multi_signature, audit_log,
          manual_draw_mode, smart_avoidance, risk_control_level, new_member_induction,
          induction_win_amount, induction_periods, big_bet_monitoring, big_bet_threshold,
          consecutive_loss_control, member_profit_limit, profit_recovery_mode, platform_protection_rate,
          description, status
        ) VALUES (
          '分分时时彩', 'ssc', 'ssc', 'minutes', 1, 1, 1440,
          'YYYYMMDD{####}', 5, 0, 9,
          '00:00:00', '23:59:59', '00:01:00', 10, true, true,
          'hybrid', true, true, 0.000000017,
          true, true, true, true,
          false, true, 'high', true,
          100, 3, true, 5000,
          20, 50000, 'smart', 85.0,
          '分分时时彩，每分钟开奖一次，全天24小时不间断。开奖前10秒封盘，支持提示音和倒计时显示。号码范围0-9，共5位数字，总组合数100,000种。目标中奖概率约5960万千分之一。', 'active'
        )
      `);
      console.log('分分时时彩彩种创建成功');
    } else {
      console.log('分分时时彩彩种已存在，ID:', existingLottery.rows[0].id);
    }
  } catch (error) {
    console.error('创建默认彩种失败:', error);
  }
};

export default {
  sequelize,
  Admin,
  Agent,
  Member,
  CreditLog,
  BalanceLog,
  Notice,
  LoginLog,
  initializeDatabase,
};

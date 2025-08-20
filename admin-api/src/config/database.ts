import { Sequelize } from 'sequelize';
import { Client, Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 创建数据库（如果不存在）
export const createDatabaseIfNotExists = async (): Promise<void> => {
  const dbName = process.env.DB_NAME || 'backend_management';
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: 'postgres', // 连接到默认数据库
  });

  try {
    await client.connect();

    // 检查数据库是否存在
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      // 数据库不存在，创建它
      await client.query(`CREATE DATABASE "${dbName}"`);
      // 静默创建，不输出日志
    }
  } catch (error) {
    console.error('创建数据库失败:', error);
    throw error;
  } finally {
    await client.end();
  }
};

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'backend_management',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  dialect: 'postgres',
  logging: false, // 关闭SQL日志输出
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

export default sequelize;

// ==================== PostgreSQL Pool 连接 ====================

let pool: Pool | null = null;

/**
 * 获取数据库连接池单例
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'backend_management',
      password: process.env.DB_PASSWORD || '123456',
      port: parseInt(process.env.DB_PORT || '5432'),
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000, // 空闲连接超时时间
      connectionTimeoutMillis: 2000, // 连接超时时间
    });

    // 监听连接池事件
    pool.on('connect', () => {
      console.log('📊 数据库连接池：新连接已建立');
    });

    pool.on('error', (err) => {
      console.error('❌ 数据库连接池错误:', err);
    });

    console.log('✅ 数据库连接池已初始化');
  }

  return pool;
}

/**
 * 关闭数据库连接池
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 数据库连接池已关闭');
  }
}

/**
 * 测试数据库连接池
 */
export async function testPoolConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ 数据库连接池测试成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接池测试失败:', error);
    return false;
  }
}

// 测试数据库连接
export const connectDB = async (): Promise<void> => {
  try {
    // 首先创建数据库（如果不存在）
    await createDatabaseIfNotExists();

    // 然后连接到目标数据库
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 在开发环境中同步数据库表
    if (process.env.NODE_ENV === 'development') {
      // 暂时禁用自动同步以避免 SQL 语法错误
      // await sequelize.sync({ alter: true });
      console.log('⚠️  数据库表同步已禁用（避免 SQL 语法错误）');
    }
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

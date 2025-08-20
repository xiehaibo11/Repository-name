import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 创建PostgreSQL连接池
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'admin_system',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 连接错误处理
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// 测试连接
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

export default pool;

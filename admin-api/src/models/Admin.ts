import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

// 管理员属性接口
export interface AdminAttributes {
  id: number;
  username: string;
  password: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: 'super_admin' | 'admin';
  status: 'active' | 'disabled';
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 创建管理员时的可选属性
interface AdminCreationAttributes extends Optional<AdminAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// 管理员模型类
class Admin extends Model<AdminAttributes, AdminCreationAttributes> implements AdminAttributes {
  public id!: number;
  public username!: string;
  public password!: string;
  public nickname?: string;
  public email?: string;
  public phone?: string;
  public avatar?: string;
  public role!: 'super_admin' | 'admin';
  public status!: 'active' | 'disabled';
  public lastLoginAt?: Date;
  public lastLoginIp?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 实例方法：验证密码
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // 实例方法：获取安全的用户信息（不包含密码）
  public toSafeJSON() {
    const { password, ...safeData } = this.toJSON();
    return safeData;
  }

  // 静态方法：哈希密码
  public static async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, rounds);
  }
}

// 定义模型
Admin.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255],
        notEmpty: true,
      },
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin'),
      allowNull: false,
      defaultValue: 'admin',
    },
    status: {
      type: DataTypes.ENUM('active', 'disabled'),
      allowNull: false,
      defaultValue: 'active',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginIp: {
      type: DataTypes.STRING(45), // 支持IPv6
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'admins',
    modelName: 'Admin',
    hooks: {
      // 创建前哈希密码
      beforeCreate: async (admin: Admin) => {
        if (admin.password) {
          admin.password = await Admin.hashPassword(admin.password);
        }
      },
      // 更新前哈希密码
      beforeUpdate: async (admin: Admin) => {
        if (admin.changed('password')) {
          admin.password = await Admin.hashPassword(admin.password);
        }
      },
    },
  }
);

export default Admin;

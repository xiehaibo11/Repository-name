import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

// 会员属性接口
export interface MemberAttributes {
  id: number;
  username: string;
  nickname: string;
  password: string;
  balance: number;
  agentId: number;
  status: 'active' | 'disabled';
  lastLoginAt?: Date;
  lastLoginIp?: string;
  lastLoginLocation?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 创建会员时的可选属性
interface MemberCreationAttributes extends Optional<MemberAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// 会员模型类
class Member extends Model<MemberAttributes, MemberCreationAttributes> implements MemberAttributes {
  public id!: number;
  public username!: string;
  public nickname!: string;
  public password!: string;
  public balance!: number;
  public agentId!: number;
  public status!: 'active' | 'disabled';
  public lastLoginAt?: Date;
  public lastLoginIp?: string;
  public lastLoginLocation?: string;
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

  // 实例方法：调整余额
  public async adjustBalance(amount: number, reason: string, adminId: number): Promise<void> {
    const currentBalance = Number(this.balance);
    const adjustmentAmount = Number(amount);
    const newBalance = currentBalance + adjustmentAmount;

    if (newBalance < 0) {
      throw new Error('余额不能为负数');
    }

    this.balance = newBalance;
    await this.save();

    // 记录余额变更日志
    const { default: BalanceLog } = await import('./BalanceLog');
    await BalanceLog.create({
      userId: this.id,
      userType: 'member',
      amount,
      previousAmount: currentBalance,
      newAmount: newBalance,
      type: 'adjustment',
      reason,
      operatorId: adminId,
    });
  }

  // 静态方法：哈希密码
  public static async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, rounds);
  }
}

// 定义模型
Member.init(
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
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
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
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    agentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'agents',
        key: 'id',
      },
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
    lastLoginLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'members',
    modelName: 'Member',
    hooks: {
      // 创建前哈希密码
      beforeCreate: async (member: Member) => {
        if (member.password) {
          member.password = await Member.hashPassword(member.password);
        }
      },
      // 更新前哈希密码
      beforeUpdate: async (member: Member) => {
        if (member.changed('password')) {
          member.password = await Member.hashPassword(member.password);
        }
      },
    },
  }
);

export default Member;

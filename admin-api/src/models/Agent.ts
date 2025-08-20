import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

// 代理商属性接口
export interface AgentAttributes {
  id: number;
  username: string;
  nickname: string;
  password: string;
  credit: number;
  status: 'active' | 'disabled';
  createdAt?: Date;
  updatedAt?: Date;
}

// 创建代理商时的可选属性
interface AgentCreationAttributes extends Optional<AgentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// 代理商模型类
class Agent extends Model<AgentAttributes, AgentCreationAttributes> implements AgentAttributes {
  public id!: number;
  public username!: string;
  public nickname!: string;
  public password!: string;
  public credit!: number;
  public status!: 'active' | 'disabled';
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

  // 实例方法：调整信用额度
  public async adjustCredit(amount: number, reason: string, adminId: number): Promise<void> {
    try {
      const previousCredit = Number(this.credit) || 0;
      const adjustmentAmount = Number(amount) || 0;
      const newCredit = previousCredit + adjustmentAmount;

      if (newCredit < 0) {
        throw new Error('信用额度不能为负数');
      }

      // 更新信用额度
      this.credit = newCredit;
      await this.save();

      // 记录信用额度变更日志
      const { default: CreditLog } = await import('./CreditLog');
      await CreditLog.create({
        userId: this.id,
        userType: 'agent' as const,
        amount: adjustmentAmount,
        previousAmount: previousCredit,
        newAmount: newCredit,
        type: 'adjustment' as const,
        reason: reason || '管理员调整',
        operatorId: adminId,
      });
    } catch (error) {
      console.error('调整信用额度失败:', error);
      throw error;
    }
  }

  // 静态方法：哈希密码
  public static async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, rounds);
  }
}

// 定义模型
Agent.init(
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
    credit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'disabled'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'agents',
    modelName: 'Agent',
    hooks: {
      // 创建前哈希密码
      beforeCreate: async (agent: Agent) => {
        if (agent.password) {
          agent.password = await Agent.hashPassword(agent.password);
        }
      },
      // 更新前哈希密码
      beforeUpdate: async (agent: Agent) => {
        if (agent.changed('password')) {
          agent.password = await Agent.hashPassword(agent.password);
        }
      },
    },
  }
);

export default Agent;

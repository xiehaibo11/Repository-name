import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 登录日志属性接口
export interface LoginLogAttributes {
  id: number;
  userId: number;
  userType: 'member' | 'agent' | 'admin';
  username: string;
  loginIp: string;
  loginLocation?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  userAgent?: string;
  loginStatus: 'success' | 'failed';
  failureReason?: string;
  loginTime: Date;
  createdAt: Date;
}

// 创建登录日志时的可选属性
export interface LoginLogCreationAttributes extends Optional<LoginLogAttributes, 'id' | 'createdAt'> {}

// 登录日志模型类
class LoginLog extends Model<LoginLogAttributes, LoginLogCreationAttributes> implements LoginLogAttributes {
  public id!: number;
  public userId!: number;
  public userType!: 'member' | 'agent' | 'admin';
  public username!: string;
  public loginIp!: string;
  public loginLocation?: string;
  public country?: string;
  public region?: string;
  public city?: string;
  public isp?: string;
  public userAgent?: string;
  public loginStatus!: 'success' | 'failed';
  public failureReason?: string;
  public loginTime!: Date;
  public readonly createdAt!: Date;

  /**
   * 创建登录成功日志
   */
  public static async createSuccessLog(data: {
    userId: number;
    userType: 'member' | 'agent' | 'admin';
    username: string;
    loginIp: string;
    loginLocation?: string;
    country?: string;
    region?: string;
    city?: string;
    isp?: string;
    userAgent?: string;
  }): Promise<LoginLog> {
    return this.create({
      ...data,
      loginStatus: 'success',
      loginTime: new Date()
    });
  }

  /**
   * 创建登录失败日志
   */
  public static async createFailureLog(data: {
    userId?: number;
    userType: 'member' | 'agent' | 'admin';
    username: string;
    loginIp: string;
    loginLocation?: string;
    country?: string;
    region?: string;
    city?: string;
    isp?: string;
    userAgent?: string;
    failureReason: string;
  }): Promise<LoginLog> {
    return this.create({
      ...data,
      userId: data.userId || 0, // 登录失败时可能没有用户ID
      loginStatus: 'failed',
      loginTime: new Date()
    });
  }

  /**
   * 获取用户的登录历史
   */
  public static async getUserLoginHistory(
    userId: number,
    userType: 'member' | 'agent' | 'admin',
    options: {
      limit?: number;
      offset?: number;
      status?: 'success' | 'failed';
    } = {}
  ): Promise<{ logs: LoginLog[]; total: number }> {
    const { limit = 20, offset = 0, status } = options;
    
    const whereClause: any = {
      userId,
      userType
    };
    
    if (status) {
      whereClause.loginStatus = status;
    }

    const { count, rows } = await this.findAndCountAll({
      where: whereClause,
      order: [['loginTime', 'DESC']],
      limit,
      offset
    });

    return {
      logs: rows,
      total: count
    };
  }

  /**
   * 获取IP地址的登录历史
   */
  public static async getIpLoginHistory(
    loginIp: string,
    options: {
      limit?: number;
      offset?: number;
      days?: number;
    } = {}
  ): Promise<{ logs: LoginLog[]; total: number }> {
    const { limit = 20, offset = 0, days = 30 } = options;
    
    const whereClause: any = {
      loginIp
    };
    
    if (days > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      whereClause.loginTime = {
        [require('sequelize').Op.gte]: startDate
      };
    }

    const { count, rows } = await this.findAndCountAll({
      where: whereClause,
      order: [['loginTime', 'DESC']],
      limit,
      offset
    });

    return {
      logs: rows,
      total: count
    };
  }

  /**
   * 获取登录统计信息
   */
  public static async getLoginStats(
    userId: number,
    userType: 'member' | 'agent' | 'admin',
    days: number = 30
  ): Promise<{
    totalLogins: number;
    successLogins: number;
    failedLogins: number;
    uniqueIps: number;
    lastLoginTime?: Date;
    lastLoginIp?: string;
    lastLoginLocation?: string;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause = {
      userId,
      userType,
      loginTime: {
        [require('sequelize').Op.gte]: startDate
      }
    };

    // 总登录次数
    const totalLogins = await this.count({
      where: whereClause
    });

    // 成功登录次数
    const successLogins = await this.count({
      where: {
        ...whereClause,
        loginStatus: 'success'
      }
    });

    // 失败登录次数
    const failedLogins = totalLogins - successLogins;

    // 唯一IP数量
    const uniqueIpsResult = await this.findAll({
      where: whereClause,
      attributes: ['loginIp'],
      group: ['loginIp']
    });
    const uniqueIps = uniqueIpsResult.length;

    // 最后一次登录信息
    const lastLogin = await this.findOne({
      where: {
        userId,
        userType,
        loginStatus: 'success'
      },
      order: [['loginTime', 'DESC']]
    });

    return {
      totalLogins,
      successLogins,
      failedLogins,
      uniqueIps,
      lastLoginTime: lastLogin?.loginTime,
      lastLoginIp: lastLogin?.loginIp,
      lastLoginLocation: lastLogin?.loginLocation
    };
  }

  /**
   * 转换为安全的JSON格式（用于API响应）
   */
  public toSafeJSON(): Omit<LoginLogAttributes, 'userAgent'> {
    const { userAgent, ...safeData } = this.toJSON();
    return safeData;
  }
}

// 初始化模型
LoginLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userType: {
      type: DataTypes.ENUM('member', 'agent', 'admin'),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    loginIp: {
      type: DataTypes.STRING(45),
      allowNull: false,
    },
    loginLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isp: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    loginStatus: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: false,
      defaultValue: 'success',
    },
    failureReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    loginTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'LoginLog',
    tableName: 'login_logs',
    timestamps: false, // 我们手动管理时间戳
    indexes: [
      {
        fields: ['userId', 'userType', 'loginTime']
      },
      {
        fields: ['loginIp', 'loginTime']
      },
      {
        fields: ['loginStatus']
      }
    ]
  }
);

export default LoginLog;

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 余额日志属性接口
export interface BalanceLogAttributes {
  id: number;
  userId: number;
  userType: 'member';
  amount: number;
  previousAmount: number;
  newAmount: number;
  type: 'adjustment' | 'system' | 'admin' | 'transaction' | 'bet';
  reason: string;
  operatorId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// 创建余额日志时的可选属性
interface BalanceLogCreationAttributes extends Optional<BalanceLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// 余额日志模型类
class BalanceLog extends Model<BalanceLogAttributes, BalanceLogCreationAttributes> implements BalanceLogAttributes {
  public id!: number;
  public userId!: number;
  public userType!: 'member';
  public amount!: number;
  public previousAmount!: number;
  public newAmount!: number;
  public type!: 'adjustment' | 'system' | 'admin' | 'transaction' | 'bet';
  public reason!: string;
  public operatorId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;


}

// 定义模型
BalanceLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'members',
        key: 'id',
      },
    },
    userType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'member',
      field: 'user_type',
      validate: {
        isIn: [['member']]
      }
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: '变更金额（正数为增加，负数为减少）',
    },
    previousAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: '变更前金额',
    },
    newAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: '变更后金额',
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'adjustment',
      comment: '变更类型：adjustment-手动调整，system-系统操作，admin-管理员操作，transaction-交易，bet-投注',
      validate: {
        isIn: [['adjustment', 'system', 'admin', 'transaction', 'bet']]
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '变更原因',
    },
    operatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id',
      },
      comment: '操作人ID',
    },
  },
  {
    sequelize,
    tableName: 'balance_logs',
    modelName: 'BalanceLog',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['operator_id'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['type'],
      },
    ],
  }
);

export default BalanceLog;

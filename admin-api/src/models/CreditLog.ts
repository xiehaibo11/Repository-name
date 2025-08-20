import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 信用额度日志属性接口
export interface CreditLogAttributes {
  id: number;
  userId: number;
  userType: 'agent';
  amount: number;
  previousAmount: number;
  newAmount: number;
  type: 'adjustment' | 'system' | 'admin';
  reason: string;
  operatorId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// 创建信用额度日志时的可选属性
interface CreditLogCreationAttributes extends Optional<CreditLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// 信用额度日志模型类
class CreditLog extends Model<CreditLogAttributes, CreditLogCreationAttributes> implements CreditLogAttributes {
  public id!: number;
  public userId!: number;
  public userType!: 'agent';
  public amount!: number;
  public previousAmount!: number;
  public newAmount!: number;
  public type!: 'adjustment' | 'system' | 'admin';
  public reason!: string;
  public operatorId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;


}

// 定义模型
CreditLog.init(
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
        model: 'agents',
        key: 'id',
      },
    },
    userType: {
      type: DataTypes.ENUM('agent'),
      allowNull: false,
      defaultValue: 'agent',
      field: 'user_type',
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
      type: DataTypes.ENUM('adjustment', 'system', 'admin'),
      allowNull: false,
      defaultValue: 'adjustment',
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
    tableName: 'credit_logs',
    modelName: 'CreditLog',
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



export default CreditLog;

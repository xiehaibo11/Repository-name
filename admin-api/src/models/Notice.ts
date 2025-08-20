import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 公告属性接口
interface NoticeAttributes {
  id: number;
  title: string;
  content: string;
  type: 'platform' | 'system' | 'activity' | 'maintenance'; // 公告类型
  priority: 'low' | 'medium' | 'high' | 'urgent'; // 优先级
  status: 'draft' | 'published' | 'archived'; // 状态
  publishTime?: Date; // 发布时间
  expireTime?: Date; // 过期时间
  targetAudience: 'all' | 'members' | 'agents'; // 目标受众
  isTop: boolean; // 是否置顶
  viewCount: number; // 查看次数
  createdBy: number; // 创建者ID
  createdAt: Date;
  updatedAt: Date;
}

// 创建公告时的可选属性
interface NoticeCreationAttributes extends Optional<NoticeAttributes, 'id' | 'viewCount' | 'createdAt' | 'updatedAt'> {}

// 公告模型类
class Notice extends Model<NoticeAttributes, NoticeCreationAttributes> implements NoticeAttributes {
  public id!: number;
  public title!: string;
  public content!: string;
  public type!: 'platform' | 'system' | 'activity' | 'maintenance';
  public priority!: 'low' | 'medium' | 'high' | 'urgent';
  public status!: 'draft' | 'published' | 'archived';
  public publishTime?: Date;
  public expireTime?: Date;
  public targetAudience!: 'all' | 'members' | 'agents';
  public isTop!: boolean;
  public viewCount!: number;
  public createdBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 初始化公告模型
Notice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('platform', 'system', 'activity', 'maintenance'),
      allowNull: false,
      defaultValue: 'platform',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    publishTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expireTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    targetAudience: {
      type: DataTypes.ENUM('all', 'members', 'agents'),
      allowNull: false,
      defaultValue: 'all',
    },
    isTop: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'notices',
    timestamps: true,
    indexes: [
      {
        fields: ['status', 'publish_time'],
      },
      {
        fields: ['type', 'target_audience'],
      },
      {
        fields: ['is_top', 'priority'],
      },
    ],
  }
);

export { Notice, NoticeAttributes, NoticeCreationAttributes };

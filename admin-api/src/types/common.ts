// 通用API响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 用户角色类型
export type UserRole = 'super_admin' | 'admin' | 'agent' | 'member';

// 用户状态类型
export type UserStatus = 'active' | 'disabled' | 'suspended';

// 公告类型
export type NoticeType = 'system' | 'activity' | 'maintenance' | 'urgent';

// 公告状态
export type NoticeStatus = 'draft' | 'published' | 'archived';

// 目标用户类型
export type TargetUsers = 'all' | 'members' | 'agents';

// 公告接口
export interface NoticeInfo {
  id: number;
  title: string;
  content: string;
  type: NoticeType;
  status: NoticeStatus;
  priority: number;
  startTime?: Date;
  endTime?: Date;
  targetUsers: TargetUsers;
  isTop: boolean;
  viewCount: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

// 创建公告参数
export interface CreateNoticeParams {
  title: string;
  content: string;
  type?: NoticeType;
  status?: NoticeStatus;
  priority?: number;
  startTime?: string;
  endTime?: string;
  targetUsers?: TargetUsers;
  isTop?: boolean;
}

// 更新公告参数
export interface UpdateNoticeParams {
  title?: string;
  content?: string;
  type?: NoticeType;
  status?: NoticeStatus;
  priority?: number;
  startTime?: string;
  endTime?: string;
  targetUsers?: TargetUsers;
  isTop?: boolean;
}

// 公告查询参数
export interface NoticeQueryParams extends PaginationParams {
  status?: NoticeStatus;
  type?: NoticeType;
  targetUsers?: TargetUsers;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

// 批量操作参数
export interface BatchOperationParams {
  ids: number[];
  operation: 'delete' | 'publish' | 'archive' | 'update';
  data?: any;
}

// JWT载荷
export interface JwtPayload {
  id: number;
  username: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// 错误响应
export interface ErrorResponse {
  code: number;
  message: string;
  error?: string;
  details?: any;
}

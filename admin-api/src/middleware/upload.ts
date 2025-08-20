import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// 文件上传配置接口
interface UploadConfig {
  destination: string;
  filePrefix: string;
  allowedTypes: readonly string[];
  maxSize: number;
  maxFiles?: number;
}

// 预定义的上传配置
export const uploadConfigs = {
  avatar: {
    destination: 'public/uploads/avatars',
    filePrefix: 'admin-avatar',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    maxSize: 2 * 1024 * 1024, // 2MB
    maxFiles: 1
  },
  notice: {
    destination: 'public/uploads/notices',
    filePrefix: 'notice-attachment',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5
  },
  document: {
    destination: 'public/uploads/documents',
    filePrefix: 'document',
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1
  }
} as const;

// 创建上传目录
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 生成唯一文件名
const generateFileName = (prefix: string, originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const ext = path.extname(originalName);
  return `${prefix}-${timestamp}-${random}${ext}`;
};

// 文件过滤器
const createFileFilter = (allowedTypes: readonly string[]) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`));
    }
  };
};

// 创建multer实例
export const createUploadMiddleware = (configKey: keyof typeof uploadConfigs) => {
  const config = uploadConfigs[configKey];
  
  // 确保上传目录存在
  ensureDirectoryExists(config.destination);
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.destination);
    },
    filename: (req, file, cb) => {
      const fileName = generateFileName(config.filePrefix, file.originalname);
      cb(null, fileName);
    }
  });

  return multer({
    storage,
    fileFilter: createFileFilter(config.allowedTypes),
    limits: {
      fileSize: config.maxSize,
      files: config.maxFiles || 1
    }
  });
};

// 预定义的中间件实例
export const avatarUpload = createUploadMiddleware('avatar');
export const noticeUpload = createUploadMiddleware('notice');
export const documentUpload = createUploadMiddleware('document');

// 错误处理中间件
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          status: 'error',
          message: '文件大小超出限制',
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          status: 'error',
          message: '文件数量超出限制',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          status: 'error',
          message: '意外的文件字段',
          code: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          status: 'error',
          message: '文件上传错误',
          code: 'UPLOAD_ERROR'
        });
    }
  }
  
  if (error.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      status: 'error',
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  next(error);
};

// 文件清理工具
export const cleanupFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`已清理文件: ${filePath}`);
    }
  } catch (error) {
    console.error(`清理文件失败: ${filePath}`, error);
  }
};

// 批量清理文件
export const cleanupFiles = (filePaths: string[]) => {
  filePaths.forEach(cleanupFile);
};

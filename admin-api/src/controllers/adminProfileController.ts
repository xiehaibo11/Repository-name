import { Request, Response } from 'express';
import { Admin } from '../models';
import { avatarUpload, cleanupFile } from '../middleware/upload';
import path from 'path';

// 获取管理员个人信息
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin.id;
    
    const admin = await Admin.findByPk(adminId, {
      attributes: ['id', 'username', 'nickname', 'email', 'phone', 'avatar', 'role', 'status', 'lastLoginAt', 'lastLoginIp', 'createdAt', 'updatedAt']
    });

    if (!admin) {
      res.status(404).json({
        status: 'error',
        message: '管理员不存在',
        code: 'ADMIN_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: '获取个人信息成功',
      data: {
        profile: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname || admin.username,
          email: admin.email,
          phone: admin.phone,
          avatar: admin.avatar,
          role: admin.role,
          status: admin.status,
          lastLoginTime: admin.lastLoginAt,
          lastLoginIp: admin.lastLoginIp,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('获取管理员个人信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 更新管理员个人信息
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin.id;
    const { nickname, email, phone } = req.body;

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      res.status(404).json({
        status: 'error',
        message: '管理员不存在',
        code: 'ADMIN_NOT_FOUND'
      });
      return;
    }

    // 更新字段
    if (nickname !== undefined) admin.nickname = nickname;
    if (email !== undefined) admin.email = email;
    if (phone !== undefined) admin.phone = phone;

    await admin.save();

    res.status(200).json({
      status: 'success',
      message: '个人信息更新成功',
      data: {
        profile: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname,
          email: admin.email,
          phone: admin.phone,
          avatar: admin.avatar,
          role: admin.role,
          status: admin.status,
          lastLoginTime: admin.lastLoginAt,
          lastLoginIp: admin.lastLoginIp,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('更新管理员个人信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 上传头像
export const uploadAvatar = [
  avatarUpload.single('avatar'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).admin.id;
      
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: '请选择要上传的头像文件',
          code: 'NO_FILE_UPLOADED'
        });
        return;
      }

      const admin = await Admin.findByPk(adminId);
      if (!admin) {
        res.status(404).json({
          status: 'error',
          message: '管理员不存在',
          code: 'ADMIN_NOT_FOUND'
        });
        return;
      }

      // 删除旧头像文件（如果存在）
      if (admin.avatar) {
        const oldAvatarPath = path.join(__dirname, '../../public', admin.avatar);
        cleanupFile(oldAvatarPath);
      }

      // 更新头像路径
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      admin.avatar = avatarUrl;
      await admin.save();

      res.status(200).json({
        status: 'success',
        message: '头像上传成功',
        data: {
          avatar: avatarUrl,
          profile: {
            id: admin.id,
            username: admin.username,
            nickname: admin.nickname,
            email: admin.email,
            phone: admin.phone,
            avatar: admin.avatar,
            role: admin.role,
            status: admin.status,
            lastLoginTime: admin.lastLoginAt,
            lastLoginIp: admin.lastLoginIp,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('上传头像错误:', error);
      res.status(500).json({
        status: 'error',
        message: '头像上传失败',
        code: 'UPLOAD_ERROR'
      });
    }
  }
];

// 修改密码
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin.id;
    const { currentPassword, newPassword } = req.body;

    // 验证输入
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        status: 'error',
        message: '当前密码和新密码不能为空',
        code: 'MISSING_PASSWORDS'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        status: 'error',
        message: '新密码长度不能少于6位',
        code: 'PASSWORD_TOO_SHORT'
      });
      return;
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      res.status(404).json({
        status: 'error',
        message: '管理员不存在',
        code: 'ADMIN_NOT_FOUND'
      });
      return;
    }

    // 验证当前密码
    const isValidPassword = await admin.validatePassword(currentPassword);
    if (!isValidPassword) {
      res.status(400).json({
        status: 'error',
        message: '当前密码错误',
        code: 'INVALID_CURRENT_PASSWORD'
      });
      return;
    }

    // 更新密码
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      status: 'success',
      message: '密码修改成功',
      data: {
        changedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 删除头像
export const deleteAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin.id;

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      res.status(404).json({
        status: 'error',
        message: '管理员不存在',
        code: 'ADMIN_NOT_FOUND'
      });
      return;
    }

    // 删除头像文件
    if (admin.avatar) {
      const avatarPath = path.join(__dirname, '../../public', admin.avatar);
      cleanupFile(avatarPath);
    }

    // 清空头像字段
    admin.avatar = undefined;
    await admin.save();

    res.status(200).json({
      status: 'success',
      message: '头像删除成功',
      data: {
        profile: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname,
          email: admin.email,
          phone: admin.phone,
          avatar: admin.avatar,
          role: admin.role,
          status: admin.status,
          lastLoginTime: admin.lastLoginAt,
          lastLoginIp: admin.lastLoginIp,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('删除头像错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

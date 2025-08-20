import { Request, Response } from 'express';
import { Notice } from '../models/Notice';
import { Op } from 'sequelize';

// 获取公告列表
export const getNotices = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      type,
      status,
      priority,
      targetAudience,
      keyword,
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    // 构建查询条件
    const whereCondition: any = {};

    if (type) {
      whereCondition.type = type;
    }

    if (status) {
      whereCondition.status = status;
    }

    if (priority) {
      whereCondition.priority = priority;
    }

    if (targetAudience) {
      whereCondition.targetAudience = targetAudience;
    }

    if (keyword) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await Notice.findAndCountAll({
      where: whereCondition,
      order: [
        ['isTop', 'DESC'],
        ['priority', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      offset,
      limit,
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: rows,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(count / Number(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取公告列表失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 获取单个公告详情
export const getNoticeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findByPk(id);

    if (!notice) {
      return res.status(404).json({
        code: 404,
        message: '公告不存在',
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: notice,
    });
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取公告详情失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 创建公告
export const createNotice = async (req: Request, res: Response) => {
  try {
    const {
      title,
      content,
      type = 'platform',
      priority = 'medium',
      status = 'draft',
      publishTime,
      expireTime,
      targetAudience = 'all',
      isTop = false,
    } = req.body;

    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({
        code: 400,
        message: '标题和内容不能为空',
      });
    }

    // 获取当前用户ID（从JWT token中获取）
    const createdBy = (req as any).user?.id || 1; // 临时使用1，实际应从token获取

    const notice = await Notice.create({
      title,
      content,
      type,
      priority,
      status,
      publishTime: publishTime ? new Date(publishTime) : undefined,
      expireTime: expireTime ? new Date(expireTime) : undefined,
      targetAudience,
      isTop,
      createdBy,
    });

    res.status(201).json({
      code: 201,
      message: '创建成功',
      data: notice,
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建公告失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 更新公告
export const updateNotice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      priority,
      status,
      publishTime,
      expireTime,
      targetAudience,
      isTop,
    } = req.body;

    const notice = await Notice.findByPk(id);

    if (!notice) {
      return res.status(404).json({
        code: 404,
        message: '公告不存在',
      });
    }

    await notice.update({
      title,
      content,
      type,
      priority,
      status,
      publishTime: publishTime ? new Date(publishTime) : undefined,
      expireTime: expireTime ? new Date(expireTime) : undefined,
      targetAudience,
      isTop,
    });

    res.json({
      code: 200,
      message: '更新成功',
      data: notice,
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新公告失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 删除公告
export const deleteNotice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findByPk(id);

    if (!notice) {
      return res.status(404).json({
        code: 404,
        message: '公告不存在',
      });
    }

    await notice.destroy();

    res.json({
      code: 200,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除公告失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 批量删除公告
export const batchDeleteNotices = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择要删除的公告',
      });
    }

    await Notice.destroy({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    res.json({
      code: 200,
      message: '批量删除成功',
    });
  } catch (error) {
    console.error('批量删除公告失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量删除公告失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 发布公告
export const publishNotice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findByPk(id);

    if (!notice) {
      return res.status(404).json({
        code: 404,
        message: '公告不存在',
      });
    }

    await notice.update({
      status: 'published',
      publishTime: new Date(),
    });

    res.json({
      code: 200,
      message: '发布成功',
      data: notice,
    });
  } catch (error) {
    console.error('发布公告失败:', error);
    res.status(500).json({
      code: 500,
      message: '发布公告失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 获取前端公告列表（用户端）
export const getPublicNotices = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      type,
      targetAudience = 'all',
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    // 构建查询条件
    const whereCondition: any = {
      status: 'published',
      [Op.or]: [
        { expireTime: null },
        { expireTime: { [Op.gt]: new Date() } },
      ],
    };

    if (type) {
      whereCondition.type = type;
    }

    // 目标受众过滤
    if (targetAudience !== 'all') {
      whereCondition[Op.or] = [
        { targetAudience: 'all' },
        { targetAudience: targetAudience },
      ];
    }

    const { count, rows } = await Notice.findAndCountAll({
      where: whereCondition,
      attributes: ['id', 'title', 'content', 'type', 'priority', 'publishTime', 'isTop', 'viewCount'],
      order: [
        ['isTop', 'DESC'],
        ['priority', 'DESC'],
        ['publishTime', 'DESC'],
      ],
      offset,
      limit,
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: rows,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(count / Number(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取前端公告列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取前端公告列表失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

// 增加公告查看次数
export const incrementViewCount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findByPk(id);

    if (!notice) {
      return res.status(404).json({
        code: 404,
        message: '公告不存在',
      });
    }

    await notice.increment('viewCount');

    res.json({
      code: 200,
      message: '操作成功',
    });
  } catch (error) {
    console.error('增加查看次数失败:', error);
    res.status(500).json({
      code: 500,
      message: '操作失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

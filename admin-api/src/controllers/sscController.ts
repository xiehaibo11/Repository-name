/**
 * 分分时时彩控制器
 * 处理所有SSC相关的HTTP请求
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { SSCService } from '../modules/ssc/SSCService';
import { ApiResponse } from '../types/ssc';

export class SSCController {
  private sscService: SSCService;
  private realtimeCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 2000; // 缓存2秒

  constructor(pool: Pool) {
    this.sscService = SSCService.getInstance(pool);
  }

  /**
   * 启动SSC系统
   */
  startSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.sscService.startSystem();
      
      const response: ApiResponse = {
        status: 'success',
        message: '分分时时彩系统启动成功',
        data: this.sscService.getSystemStatus()
      };
      
      res.json(response);
    } catch (error) {
      console.error('启动SSC系统失败:', error);
      
      const response: ApiResponse = {
        status: 'error',
        message: '启动系统失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      res.status(500).json(response);
    }
  };

  /**
   * 停止SSC系统
   */
  stopSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      this.sscService.stopSystem();
      
      const response: ApiResponse = {
        status: 'success',
        message: '分分时时彩系统已停止',
        data: this.sscService.getSystemStatus()
      };
      
      res.json(response);
    } catch (error) {
      console.error('停止SSC系统失败:', error);
      
      const response: ApiResponse = {
        status: 'error',
        message: '停止系统失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      res.status(500).json(response);
    }
  };

  /**
   * 获取系统状态
   */
  getSystemStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.sscService.getSystemStatus();
      
      const response: ApiResponse = {
        status: 'success',
        message: '获取系统状态成功',
        data: {
          ...status,
          running: status.isRunning, // 兼容前端字段名
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('获取系统状态失败:', error);
      
      const response: ApiResponse = {
        status: 'error',
        message: '获取系统状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      res.status(500).json(response);
    }
  };

  /**
   * 获取当前倒计时
   */
  getCurrentCountdown = async (req: Request, res: Response): Promise<void> => {
    try {
      const countdown = this.sscService.getCurrentCountdown();
      
      const response: ApiResponse = {
        status: 'success',
        message: '获取倒计时成功',
        data: {
          ...countdown,
          // 添加系统状态信息
          system_status: {
            is_running: this.sscService.getSystemStatus().isRunning,
            running: this.sscService.getSystemStatus().isRunning,
            next_poll_recommended: countdown.remainingSeconds <= 10 ? 1 : 10
          }
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('获取倒计时失败:', error);
      
      const response: ApiResponse = {
        status: 'error',
        message: '获取倒计时失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      res.status(500).json(response);
    }
  };

  /**
   * 手动开奖
   */
  manualDraw = async (req: Request, res: Response): Promise<void> => {
    try {
      const { issueNo, numbers, operatorId } = req.body;
      
      if (!issueNo) {
        const response: ApiResponse = {
          status: 'error',
          message: '期号不能为空'
        };
        res.status(400).json(response);
        return;
      }
      
      const result = await this.sscService.manualDraw(issueNo, numbers, operatorId);
      
      const response: ApiResponse = {
        status: 'success',
        message: '手动开奖成功',
        data: result
      };
      
      res.json(response);
    } catch (error) {
      console.error('手动开奖失败:', error);
      
      const response: ApiResponse = {
        status: 'error',
        message: '手动开奖失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      res.status(500).json(response);
    }
  };

  /**
   * 获取赔率配置
   */
  getOddsConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const odds = await this.sscService.getOddsConfig();
      
      const response: ApiResponse = {
        status: 'success',
        message: '获取赔率配置成功',
        data: odds
      };
      
      res.json(response);
    } catch (error) {
      console.error('获取赔率配置失败:', error);
      
      const response: ApiResponse = {
        status: 'error',
        message: '获取赔率配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      res.status(500).json(response);
    }
  };

  /**
   * 获取最新开奖结果
   */
  getLatestResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const latestResult = await this.sscService.getLatestResult();

      const response: ApiResponse = {
        status: 'success',
        message: latestResult ? '获取最新开奖结果成功' : '暂无开奖结果',
        data: latestResult
      };

      res.json(response);
    } catch (error) {
      console.error('获取最新开奖结果失败:', error);

      const response: ApiResponse = {
        status: 'error',
        message: '获取最新开奖结果失败',
        error: error instanceof Error ? error.message : '未知错误'
      };

      res.status(500).json(response);
    }
  };

  /**
   * 获取历史开奖记录
   */
  getHistoryResults = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 20, date } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const historyData = await this.sscService.getHistoryResults({
        page: pageNum,
        limit: limitNum,
        date: date as string
      });

      const response: ApiResponse = {
        status: 'success',
        message: '获取历史开奖记录成功',
        data: historyData
      };

      res.json(response);
    } catch (error) {
      console.error('获取历史开奖记录失败:', error);

      const response: ApiResponse = {
        status: 'error',
        message: '获取历史开奖记录失败',
        error: error instanceof Error ? error.message : '未知错误'
      };

      res.status(500).json(response);
    }
  };

  /**
   * 健康检查
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.sscService.getSystemStatus();
      
      const response: ApiResponse = {
        status: 'success',
        message: 'SSC系统健康检查通过',
        data: {
          ...status,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('健康检查失败:', error);
      
      const response: ApiResponse = {
        status: 'error',
        message: '健康检查失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      res.status(500).json(response);
    }
  };

  /**
   * 获取实时数据 - 合并系统状态和倒计时，带缓存
   */
  getRealtimeData = async (req: Request, res: Response): Promise<void> => {
    try {
      const now = Date.now();

      // 检查缓存
      if (this.realtimeCache && (now - this.realtimeCache.timestamp) < this.CACHE_TTL) {
        res.json(this.realtimeCache.data);
        return;
      }

      // 并行获取系统状态和倒计时
      const [systemStatus, countdown] = await Promise.all([
        this.sscService.getSystemStatus(),
        this.sscService.getCurrentCountdown()
      ]);

      const response: ApiResponse = {
        status: 'success',
        message: '获取实时数据成功',
        data: {
          systemStatus,
          countdown
        }
      };

      // 更新缓存
      this.realtimeCache = {
        data: response,
        timestamp: now
      };

      res.json(response);
    } catch (error) {
      console.error('获取实时数据失败:', error);

      const response: ApiResponse = {
        status: 'error',
        message: '获取实时数据失败',
        error: error instanceof Error ? error.message : '未知错误'
      };

      res.status(500).json(response);
    }
  };

}

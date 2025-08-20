/**
 * 分分时时彩主服务
 * 整合所有核心模块，提供统一的服务接口
 */

import { Pool } from 'pg';
import * as cron from 'node-cron';
import { DrawNumberGenerator } from './core/DrawNumberGenerator';
import { ResultCalculator } from './core/ResultCalculator';
import { IssueGenerator } from './core/IssueGenerator';
import { CountdownManager } from './core/CountdownManager';
import { OddsManager } from './core/OddsManager';
import { WinChecker } from './core/WinChecker';
import { DrawResult, SystemStatusResponse, CountdownResponse } from '../../types/ssc';

export class SSCService {
  private static instance: SSCService | null = null;
  
  // 核心模块
  private drawNumberGenerator: DrawNumberGenerator;
  private resultCalculator: ResultCalculator;
  private issueGenerator: IssueGenerator;
  private countdownManager: CountdownManager;
  private oddsManager: OddsManager;
  private winChecker: WinChecker;
  
  // 系统状态
  private isRunning: boolean = false;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  
  // 数据库连接
  private pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
    
    // 初始化核心模块
    this.drawNumberGenerator = new DrawNumberGenerator();
    this.resultCalculator = new ResultCalculator();
    this.issueGenerator = new IssueGenerator();
    this.countdownManager = new CountdownManager();
    this.oddsManager = new OddsManager(pool);
    this.winChecker = new WinChecker();
    
    // 设置倒计时回调
    this.countdownManager.setCallbacks({
      onDrawTime: (issueNo: string) => this.handleDrawTime(issueNo),
      onIssueChange: (newIssue: string, oldIssue: string) => {
        console.log(`📅 期号变更: ${oldIssue} -> ${newIssue}`);
      }
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(pool: Pool): SSCService {
    if (!SSCService.instance) {
      SSCService.instance = new SSCService(pool);
    }
    return SSCService.instance;
  }

  /**
   * 启动分分时时彩系统
   */
  async startSystem(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 分分时时彩系统已在运行中');
      return;
    }

    try {
      console.log('🚀 启动分分时时彩系统...');
      
      // 启动倒计时管理器
      this.countdownManager.start();
      
      // 启动定时任务
      this.startCronJobs();
      
      this.isRunning = true;
      
      console.log('✅ 分分时时彩系统启动成功');
      console.log('📝 系统特性:');
      console.log('   - 每分钟准点开奖');
      console.log('   - 实时倒计时');
      console.log('   - 自动结算');
      console.log('   - 24小时不间断运行');
      
    } catch (error) {
      console.error('❌ 启动分分时时彩系统失败:', error);
      throw error;
    }
  }

  /**
   * 停止分分时时彩系统
   */
  stopSystem(): void {
    if (!this.isRunning) {
      console.log('⏹️ 分分时时彩系统未运行');
      return;
    }

    // 停止倒计时管理器
    this.countdownManager.stop();
    
    // 停止所有定时任务
    this.stopCronJobs();
    
    this.isRunning = false;
    
    console.log('🛑 分分时时彩系统已停止');
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): SystemStatusResponse {
    const countdownInfo = this.countdownManager.getCurrentCountdown();
    const todayStats = this.countdownManager.getTodayStats();
    
    return {
      isRunning: this.isRunning,
      currentIssue: countdownInfo.issueNo,
      nextDrawTime: countdownInfo.drawTime,
      totalIssuesCount: todayStats.totalIssues,
      todayIssuesCount: todayStats.completedIssues,
    };
  }

  /**
   * 获取当前倒计时
   */
  getCurrentCountdown(): CountdownResponse {
    return this.countdownManager.getCurrentCountdown();
  }

  /**
   * 手动开奖
   * @param issueNo 期号
   * @param manualNumbers 手动指定的号码（可选）
   * @param operatorId 操作员ID
   */
  async manualDraw(issueNo: string, manualNumbers?: number[], operatorId?: number): Promise<DrawResult> {
    console.log(`🎯 手动开奖 - 期号: ${issueNo}`);
    
    // 验证期号格式
    if (!this.issueGenerator.validateIssue(issueNo)) {
      throw new Error(`无效的期号格式: ${issueNo}`);
    }
    
    // 生成或使用指定的开奖号码
    let numbers: number[];
    if (manualNumbers && manualNumbers.length === 5) {
      // 验证手动号码
      if (manualNumbers.some(n => n < 0 || n > 9 || !Number.isInteger(n))) {
        throw new Error('开奖号码必须是0-9之间的整数');
      }
      numbers = manualNumbers;
      console.log(`🎲 使用手动号码: ${numbers.join(',')}`);
    } else {
      numbers = this.drawNumberGenerator.generateValidNumbers();
    }
    
    // 计算结果
    const calculated = this.resultCalculator.calculateResult(numbers);
    
    // 构建开奖结果
    const drawResult: DrawResult = {
      issueNo,
      drawTime: new Date(),
      numbers: {
        wan: numbers[0],
        qian: numbers[1],
        bai: numbers[2],
        shi: numbers[3],
        ge: numbers[4],
      },
      calculated,
      status: 'completed'
    };
    
    // 保存开奖结果
    await this.saveDrawResult(drawResult);
    
    // 触发结算
    await this.settleIssue(drawResult);
    
    console.log(`✅ 手动开奖完成 - 期号: ${issueNo}, 号码: ${numbers.join(',')}`);
    
    return drawResult;
  }

  /**
   * 获取赔率配置
   */
  async getOddsConfig(): Promise<Record<string, any>> {
    return await this.oddsManager.getAllOdds();
  }

  /**
   * 安全的JSON解析
   */
  private safeJsonParse(jsonString: any, defaultValue: any = {}): any {
    if (!jsonString) {
      return defaultValue;
    }

    // 如果已经是对象，直接返回
    if (typeof jsonString === 'object') {
      return jsonString;
    }

    // 如果是字符串，尝试解析
    if (typeof jsonString === 'string') {
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        console.warn('❌ JSON解析失败:', jsonString, error);
        return defaultValue;
      }
    }

    return defaultValue;
  }

  /**
   * 获取最新开奖结果
   */
  async getLatestResult(): Promise<DrawResult | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM ssc_draw_results
         ORDER BY draw_time DESC
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        issueNo: row.issue_no,
        drawTime: row.draw_time,
        numbers: {
          wan: row.wan_number,
          qian: row.qian_number,
          bai: row.bai_number,
          shi: row.shi_number,
          ge: row.ge_number,
        },
        calculated: {
          sum: row.sum_value,
          sumBigSmall: row.sum_big_small,
          sumOddEven: row.sum_odd_even,
          positions: this.safeJsonParse(row.positions_attributes, {}),
          dragonTiger: row.dragon_tiger,
          oddEvenCount: {
            oddCount: row.odd_count,
            evenCount: row.even_count,
          },
          spans: {
            front3: row.front3_span,
            middle3: row.middle3_span,
            back3: row.back3_span,
          },
          bull: this.safeJsonParse(row.bull_result, { type: 'none', value: 0, bigSmall: 'small', oddEven: 'even', primeComposite: 'composite' }),
          poker: this.safeJsonParse(row.poker_result, { type: 'none', description: '无' }),
        },
        status: row.status,
      };
    } finally {
      client.release();
    }
  }

  /**
   * 获取历史开奖记录
   */
  async getHistoryResults(params: {
    page: number;
    limit: number;
    date?: string;
  }): Promise<{
    total: number;
    page: number;
    limit: number;
    results: DrawResult[];
  }> {
    const { page, limit, date } = params;
    const offset = (page - 1) * limit;

    const client = await this.pool.connect();

    try {
      // 构建查询条件
      let whereClause = '';
      let queryParams: any[] = [limit, offset];

      if (date) {
        whereClause = 'WHERE DATE(draw_time) = $3';
        queryParams.push(date);
      }

      // 获取总数
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM ssc_draw_results ${whereClause}`,
        date ? [date] : []
      );
      const total = parseInt(countResult.rows[0].total);

      // 获取分页数据
      const result = await client.query(
        `SELECT * FROM ssc_draw_results
         ${whereClause}
         ORDER BY draw_time DESC
         LIMIT $1 OFFSET $2`,
        queryParams
      );

      const results = result.rows.map((row: any) => ({
        id: row.id,
        issueNo: row.issue_no,
        drawTime: row.draw_time,
        numbers: {
          wan: row.wan_number,
          qian: row.qian_number,
          bai: row.bai_number,
          shi: row.shi_number,
          ge: row.ge_number,
        },
        calculated: {
          sum: row.sum_value,
          sumBigSmall: row.sum_big_small,
          sumOddEven: row.sum_odd_even,
          positions: this.safeJsonParse(row.positions_attributes, {}),
          dragonTiger: row.dragon_tiger,
          oddEvenCount: {
            oddCount: row.odd_count,
            evenCount: row.even_count,
          },
          spans: {
            front3: row.front3_span,
            middle3: row.middle3_span,
            back3: row.back3_span,
          },
          bull: this.safeJsonParse(row.bull_result, { type: 'none', value: 0, bigSmall: 'small', oddEven: 'even', primeComposite: 'composite' }),
          poker: this.safeJsonParse(row.poker_result, { type: 'none', description: '无' }),
        },
        status: row.status,
      }));

      return {
        total,
        page,
        limit,
        results
      };
    } finally {
      client.release();
    }
  }

  /**
   * 启动定时任务
   */
  private startCronJobs(): void {
    // 每小时系统健康检查
    this.cronJobs.set('healthCheck', cron.schedule('0 * * * *', async () => {
      await this.performHealthCheck();
    }));
    
    // 每日凌晨清理历史记录
    this.cronJobs.set('cleanupHistory', cron.schedule('0 2 * * *', async () => {
      await this.cleanupHistoryRecords();
    }));
    
    console.log('⏰ 定时任务已启动');
  }

  /**
   * 停止定时任务
   */
  private stopCronJobs(): void {
    this.cronJobs.forEach((job, name) => {
      job.destroy();
      console.log(`⏹️ 停止定时任务: ${name}`);
    });
    this.cronJobs.clear();
  }

  /**
   * 处理开奖时间到达
   */
  private async handleDrawTime(issueNo: string): Promise<void> {
    try {
      console.log(`🎯 自动开奖开始 - 期号: ${issueNo}`);
      
      // 检查是否已经开奖
      const existingResult = await this.getDrawResult(issueNo);
      if (existingResult) {
        console.log(`⚠️ 期号 ${issueNo} 已开奖，跳过`);
        return;
      }
      
      // 执行自动开奖
      await this.manualDraw(issueNo);
      
    } catch (error) {
      console.error(`❌ 自动开奖失败 - 期号: ${issueNo}`, error);
    }
  }

  /**
   * 保存开奖结果到数据库
   */
  private async saveDrawResult(drawResult: DrawResult): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(
        `INSERT INTO ssc_draw_results (
          issue_no, draw_time, wan_number, qian_number, bai_number, shi_number, ge_number,
          sum_value, sum_big_small, sum_odd_even, positions_attributes, dragon_tiger,
          odd_count, even_count, front3_span, middle3_span, back3_span,
          bull_result, poker_result, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          drawResult.issueNo,
          drawResult.drawTime,
          drawResult.numbers.wan,
          drawResult.numbers.qian,
          drawResult.numbers.bai,
          drawResult.numbers.shi,
          drawResult.numbers.ge,
          drawResult.calculated.sum,
          drawResult.calculated.sumBigSmall,
          drawResult.calculated.sumOddEven,
          JSON.stringify(drawResult.calculated.positions),
          drawResult.calculated.dragonTiger,
          drawResult.calculated.oddEvenCount.oddCount,
          drawResult.calculated.oddEvenCount.evenCount,
          drawResult.calculated.spans.front3,
          drawResult.calculated.spans.middle3,
          drawResult.calculated.spans.back3,
          JSON.stringify(drawResult.calculated.bull),
          JSON.stringify(drawResult.calculated.poker),
          drawResult.status || 'completed'
        ]
      );
      
      console.log(`💾 开奖结果已保存 - 期号: ${drawResult.issueNo}`);
    } finally {
      client.release();
    }
  }

  /**
   * 获取开奖结果
   */
  private async getDrawResult(issueNo: string): Promise<DrawResult | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM ssc_draw_results WHERE issue_no = $1',
        [issueNo]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        issueNo: row.issue_no,
        drawTime: row.draw_time,
        numbers: {
          wan: row.wan_number,
          qian: row.qian_number,
          bai: row.bai_number,
          shi: row.shi_number,
          ge: row.ge_number,
        },
        calculated: {
          sum: row.sum_value,
          sumBigSmall: row.sum_big_small,
          sumOddEven: row.sum_odd_even,
          positions: JSON.parse(row.positions_attributes),
          dragonTiger: row.dragon_tiger,
          oddEvenCount: {
            oddCount: row.odd_count,
            evenCount: row.even_count,
          },
          spans: {
            front3: row.front3_span,
            middle3: row.middle3_span,
            back3: row.back3_span,
          },
          bull: JSON.parse(row.bull_result),
          poker: JSON.parse(row.poker_result),
        },
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * 结算期号
   */
  private async settleIssue(drawResult: DrawResult): Promise<void> {
    // TODO: 实现投注结算逻辑
    console.log(`💰 开始结算 - 期号: ${drawResult.issueNo}`);
    
    // 这里将在后续实现投注和结算模块时完善
  }

  /**
   * 系统健康检查
   */
  private async performHealthCheck(): Promise<void> {
    console.log('🏥 执行系统健康检查');
    
    try {
      // 检查数据库连接
      await this.pool.query('SELECT 1');
      
      // 检查系统状态
      const status = this.getSystemStatus();
      
      console.log('✅ 系统健康检查通过', {
        isRunning: status.isRunning,
        currentIssue: status.currentIssue
      });
    } catch (error) {
      console.error('❌ 系统健康检查失败:', error);
    }
  }

  /**
   * 清理历史记录
   */
  private async cleanupHistoryRecords(): Promise<void> {
    console.log('🧹 开始清理历史记录');
    
    try {
      const client = await this.pool.connect();
      
      // 删除30天前的开奖记录
      const result = await client.query(
        'DELETE FROM ssc_draw_results WHERE draw_time < NOW() - INTERVAL \'30 days\'',
      );
      
      console.log(`✅ 清理历史记录完成，删除 ${result.rowCount} 条记录`);
      
      client.release();
    } catch (error) {
      console.error('❌ 清理历史记录失败:', error);
    }
  }
}

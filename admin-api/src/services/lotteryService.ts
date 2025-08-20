import { Pool } from 'pg';
import crypto from 'crypto';
import cron from 'node-cron';

interface LotteryType {
  id: number;
  name: string;
  code: string;
  category: string;
  draw_frequency: string;
  draw_interval: number;
  daily_start_issue: number;
  daily_issue_count: number;
  issue_format: string;
  number_count: number;
  number_range_min: number;
  number_range_max: number;
  start_time?: string;
  end_time?: string;
  draw_time_control?: string;
  seal_time: number;
  sound_alert: boolean;
  countdown_display: boolean;
  // 随机算法配置
  random_source: string;
  randomness_validation: boolean;
  blockchain_record: boolean;
  // 概率控制算法
  target_win_rate: number;
  dynamic_payout_adjustment: boolean;
  // 安全监控配置
  anomaly_detection: boolean;
  multi_signature: boolean;
  audit_log: boolean;
  // 人工开奖控制
  manual_draw_mode: boolean;
  smart_avoidance: boolean;
  risk_control_level: string;
  // 会员下注风控算法
  new_member_induction: boolean;
  induction_win_amount: number;
  induction_periods: number;
  big_bet_monitoring: boolean;
  big_bet_threshold: number;
  consecutive_loss_control: number;
  // 盈利控制算法
  member_profit_limit: number;
  profit_recovery_mode: string;
  platform_protection_rate: number;
  description?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface LotteryIssue {
  id: number;
  lottery_type_id: number;
  issue_no: string;
  issue_date: string;
  issue_index: number;
  start_time: string;
  end_time: string;
  draw_time: string;
  status: string;
}

interface LotteryDraw {
  id: number;
  lottery_type_id: number;
  issue_id: number;
  issue_no: string;
  draw_numbers: string;
  wan_wei?: number;
  qian_wei?: number;
  bai_wei?: number;
  shi_wei?: number;
  ge_wei?: number;
  sum_value: number;
  sum_big_small: string;
  sum_odd_even: string;
  draw_method: string;
  draw_status: string;
  source?: string;
  draw_time: string;
}

export class LotteryService {
  protected pool: Pool;
  protected cronJobs: Map<string, any> = new Map();
  protected config: any = {};

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadConfig();
  }

  // 加载系统配置
  private async loadConfig() {
    try {
      const result = await this.pool.query('SELECT config_key, config_value, config_type FROM lottery_config');
      for (const row of result.rows) {
        let value = row.config_value;
        switch (row.config_type) {
          case 'number':
            value = parseInt(value);
            break;
          case 'boolean':
            value = value === 'true';
            break;
          case 'json':
            value = JSON.parse(value);
            break;
        }
        this.config[row.config_key] = value;
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  // 生成随机开奖号码
  protected generateRandomNumbers(count: number, min: number = 0, max: number = 9): number[] {
    const numbers: number[] = [];
    for (let i = 0; i < count; i++) {
      // 使用crypto模块生成安全随机数
      const randomBytes = crypto.randomBytes(4);
      const randomValue = randomBytes.readUInt32BE(0);
      const number = min + (randomValue % (max - min + 1));
      numbers.push(number);
    }
    return numbers;
  }

  // 计算和值相关属性
  protected calculateSumProperties(numbers: number[]): {
    sum_value: number;
    sum_big_small: string;
    sum_odd_even: string;
  } {
    const sum = numbers.reduce((acc, num) => acc + num, 0);

    // 根据分分时时彩规则：和值23-45为大，0-22为小
    const sum_big_small = sum >= 23 ? 'big' : 'small';

    // 和值单双
    const sum_odd_even = sum % 2 === 0 ? 'even' : 'odd';

    return {
      sum_value: sum,
      sum_big_small,
      sum_odd_even
    };
  }

  /**
   * 🎯 增强版开奖号码计算算法
   * 根据开奖号码计算所有相关结果：和值、大小单双、龙虎、奇偶统计
   * @param numbers 5位开奖号码数组 [万位, 千位, 百位, 十位, 个位]
   * @returns 完整的开奖结果分析
   */
  protected calculateEnhancedDrawResults(numbers: number[]): {
    // 基础信息
    draw_numbers: string;
    wan_wei: number;
    qian_wei: number;
    bai_wei: number;
    shi_wei: number;
    ge_wei: number;

    // 一、和值（和值大小单双）
    sum_value: number;
    sum_big_small: string;
    sum_odd_even: string;
    sum_big_small_cn: string;  // 中文显示
    sum_odd_even_cn: string;   // 中文显示
    sum_category: string;      // 组合：大单、小单、大双、小双

    // 二、龙虎（第一位 vs 第五位）
    dragon_tiger: string;      // dragon/tiger/tie
    dragon_tiger_cn: string;   // 龙/虎/和

    // 三、奇偶（开奖号码本身的奇偶个数）
    odd_count: number;         // 奇数个数
    even_count: number;        // 偶数个数
    odd_even_pattern: string;  // 奇偶模式：如 "奇3偶2"

    // 四、各位数字大小单双分析
    position_analysis: {
      wan_wei: { big_small: string; odd_even: string; };
      qian_wei: { big_small: string; odd_even: string; };
      bai_wei: { big_small: string; odd_even: string; };
      shi_wei: { big_small: string; odd_even: string; };
      ge_wei: { big_small: string; odd_even: string; };
    };
  } {
    // 验证输入
    if (!numbers || numbers.length !== 5) {
      throw new Error('开奖号码必须是5位数字');
    }

    // 验证每位数字范围
    for (let i = 0; i < 5; i++) {
      if (numbers[i] < 0 || numbers[i] > 9) {
        throw new Error(`第${i + 1}位数字必须在0-9范围内`);
      }
    }

    // 基础信息
    const draw_numbers = numbers.join(',');
    const [wan_wei, qian_wei, bai_wei, shi_wei, ge_wei] = numbers;

    // 一、和值计算
    const sum_value = numbers.reduce((acc, num) => acc + num, 0);

    // 和值大小：23-45为大，0-22为小
    const sum_big_small = sum_value >= 23 ? 'big' : 'small';
    const sum_big_small_cn = sum_value >= 23 ? '大' : '小';

    // 和值单双
    const sum_odd_even = sum_value % 2 === 0 ? 'even' : 'odd';
    const sum_odd_even_cn = sum_value % 2 === 0 ? '双' : '单';

    // 二、大小单双组合
    const sum_category = `${sum_big_small_cn}${sum_odd_even_cn}`;

    // 三、龙虎（第一位 vs 第五位）
    let dragon_tiger: string;
    let dragon_tiger_cn: string;

    if (wan_wei > ge_wei) {
      dragon_tiger = 'dragon';
      dragon_tiger_cn = '龙';
    } else if (wan_wei < ge_wei) {
      dragon_tiger = 'tiger';
      dragon_tiger_cn = '虎';
    } else {
      dragon_tiger = 'tie';
      dragon_tiger_cn = '和';
    }

    // 四、奇偶统计
    let odd_count = 0;
    let even_count = 0;

    numbers.forEach(num => {
      if (num % 2 === 0) {
        even_count++;
      } else {
        odd_count++;
      }
    });

    const odd_even_pattern = `奇${odd_count}偶${even_count}`;

    // 五、各位数字分析
    const analyzePosition = (num: number) => ({
      big_small: num >= 5 ? '大' : '小',
      odd_even: num % 2 === 0 ? '偶' : '奇'
    });

    const position_analysis = {
      wan_wei: analyzePosition(wan_wei),
      qian_wei: analyzePosition(qian_wei),
      bai_wei: analyzePosition(bai_wei),
      shi_wei: analyzePosition(shi_wei),
      ge_wei: analyzePosition(ge_wei)
    };

    return {
      // 基础信息
      draw_numbers,
      wan_wei,
      qian_wei,
      bai_wei,
      shi_wei,
      ge_wei,

      // 和值信息
      sum_value,
      sum_big_small,
      sum_odd_even,
      sum_big_small_cn,
      sum_odd_even_cn,
      sum_category,

      // 龙虎信息
      dragon_tiger,
      dragon_tiger_cn,

      // 奇偶统计
      odd_count,
      even_count,
      odd_even_pattern,

      // 各位分析
      position_analysis
    };
  }

  // 生成期号
  private generateIssueNo(lotteryType: LotteryType, date: Date, index: number): string {
    const year = String(date.getFullYear()).slice(-2); // 年份后两位
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let format = lotteryType.issue_format;
    format = format.replace('YYYY', String(date.getFullYear()));
    format = format.replace('YY', year);
    format = format.replace('MM', month);
    format = format.replace('DD', day);

    // 处理期号索引 {###} 或时间格式 {HHMM}
    const indexMatch = format.match(/\{([^}]+)\}/);
    if (indexMatch) {
      const placeholder = indexMatch[1];
      if (placeholder === 'HHMM') {
        // 根据期号索引计算时分
        const totalMinutes = (index - 1) % 1440; // 一天1440分钟
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const timeStr = String(hours).padStart(2, '0') + String(minutes).padStart(2, '0');
        format = format.replace(indexMatch[0], timeStr);
      } else if (placeholder.match(/^#+$/)) {
        // 传统的数字索引格式
        const paddingLength = placeholder.length;
        const paddedIndex = String(index).padStart(paddingLength, '0');
        format = format.replace(indexMatch[0], paddedIndex);
      }
    }

    return format;
  }

  // 创建彩种
  async createLotteryType(data: Partial<LotteryType>): Promise<LotteryType> {
    const query = `
      INSERT INTO lottery_types (
        name, code, category, draw_frequency, draw_interval, daily_start_issue, daily_issue_count,
        issue_format, number_count, number_range_min, number_range_max,
        start_time, end_time, draw_time_control, seal_time, sound_alert, countdown_display,
        random_source, randomness_validation, blockchain_record, target_win_rate,
        dynamic_payout_adjustment, anomaly_detection, multi_signature, audit_log,
        manual_draw_mode, smart_avoidance, risk_control_level, new_member_induction,
        induction_win_amount, induction_periods, big_bet_monitoring, big_bet_threshold,
        consecutive_loss_control, member_profit_limit, profit_recovery_mode, platform_protection_rate,
        description, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, $38, $39
      )
      RETURNING *
    `;

    const values = [
      data.name, data.code, data.category, data.draw_frequency, data.draw_interval || 1,
      data.daily_start_issue || 1, data.daily_issue_count || 1440, data.issue_format,
      data.number_count || 5, data.number_range_min || 0, data.number_range_max || 9,
      data.start_time, data.end_time, data.draw_time_control,
      data.seal_time || 10, data.sound_alert !== false, data.countdown_display !== false,
      data.random_source || 'hybrid', data.randomness_validation !== false, data.blockchain_record !== false,
      data.target_win_rate || 0.000000017, data.dynamic_payout_adjustment !== false,
      data.anomaly_detection !== false, data.multi_signature !== false, data.audit_log !== false,
      data.manual_draw_mode || false, data.smart_avoidance !== false, data.risk_control_level || 'high',
      data.new_member_induction !== false, data.induction_win_amount || 100, data.induction_periods || 3,
      data.big_bet_monitoring !== false, data.big_bet_threshold || 5000, data.consecutive_loss_control || 20,
      data.member_profit_limit || 50000, data.profit_recovery_mode || 'smart', data.platform_protection_rate || 85.0,
      data.description, data.status || 'active'
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // 根据ID获取彩种
  async getLotteryTypeById(id: number): Promise<LotteryType | null> {
    const result = await this.pool.query('SELECT * FROM lottery_types WHERE id = $1', [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 获取彩种列表
  async getLotteryTypes(filters: any = {}): Promise<{ data: LotteryType[], total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.name) {
      whereClause += ` AND name ILIKE $${paramIndex}`;
      values.push(`%${filters.name}%`);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.category) {
      whereClause += ` AND category = $${paramIndex}`;
      values.push(filters.category);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM lottery_types ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const offset = ((filters.page || 1) - 1) * (filters.pageSize || 20);
    const limit = filters.pageSize || 20;

    const dataQuery = `
      SELECT * FROM lottery_types ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, values);

    return {
      data: dataResult.rows,
      total
    };
  }

  // 更新彩种
  async updateLotteryType(id: number, data: Partial<LotteryType>): Promise<LotteryType> {
    const fields = Object.keys(data).filter(key => data[key as keyof LotteryType] !== undefined);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...fields.map(field => data[field as keyof LotteryType])];

    const query = `
      UPDATE lottery_types
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // 删除彩种
  async deleteLotteryType(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM lottery_types WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }



  // 生成特定时间的单期期号
  async generateSpecificIssue(lotteryTypeId: number, specificTime: Date): Promise<LotteryIssue> {
    const lotteryType = await this.pool.query('SELECT * FROM lottery_types WHERE id = $1', [lotteryTypeId]);
    if (lotteryType.rows.length === 0) {
      throw new Error('彩种不存在');
    }

    const type = lotteryType.rows[0];

    // 计算期号索引（基于当天的分钟数）
    const dayStart = new Date(specificTime);
    dayStart.setHours(0, 0, 0, 0);
    const minutesFromStart = Math.floor((specificTime.getTime() - dayStart.getTime()) / (1000 * 60));
    const issueIndex = minutesFromStart + 1;

    const issueNo = this.generateIssueNo(type, specificTime, issueIndex);

    // 计算时间
    const startTime = new Date(specificTime);
    startTime.setSeconds(0, 0); // 整分钟开始

    const endTime = new Date(startTime);
    endTime.setSeconds(50, 0); // 50秒结束

    const drawTime = new Date(startTime);
    drawTime.setMinutes(drawTime.getMinutes() + 1, 0, 0); // 下一分钟整点开奖

    const query = `
      INSERT INTO lottery_issues (
        lottery_type_id, issue_no, issue_date, issue_index,
        start_time, end_time, draw_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (lottery_type_id, issue_no) DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        draw_time = EXCLUDED.draw_time,
        status = EXCLUDED.status
      RETURNING *
    `;

    const values = [
      lotteryTypeId,
      issueNo,
      specificTime.toISOString().split('T')[0],
      issueIndex,
      startTime.toISOString(),
      endTime.toISOString(),
      drawTime.toISOString(),
      'pending'
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // 手动开奖
  async manualDraw(issueId: number, numbers?: number[], operatorId?: number): Promise<LotteryDraw> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // 获取奖期信息
      const issueResult = await client.query(`
        SELECT i.*, lt.* FROM lottery_issues i
        JOIN lottery_types lt ON i.lottery_type_id = lt.id
        WHERE i.id = $1
      `, [issueId]);

      if (issueResult.rows.length === 0) {
        throw new Error('奖期不存在');
      }

      const issue = issueResult.rows[0];

      // 生成或使用提供的开奖号码
      const drawNumbers = numbers || this.generateRandomNumbers(
        issue.number_count,
        issue.number_range_min,
        issue.number_range_max
      );

      // 计算和值属性
      const sumProps = this.calculateSumProperties(drawNumbers);

      // 插入开奖结果
      const drawQuery = `
        INSERT INTO lottery_draws (
          lottery_type_id, issue_id, issue_no, draw_numbers,
          wan_wei, qian_wei, bai_wei, shi_wei, ge_wei,
          sum_value, sum_big_small, sum_odd_even,
          draw_method, draw_status, source, draw_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const drawValues = [
        issue.lottery_type_id, issueId, issue.issue_no, drawNumbers.join(','),
        drawNumbers[0] || null, drawNumbers[1] || null, drawNumbers[2] || null,
        drawNumbers[3] || null, drawNumbers[4] || null,
        sumProps.sum_value, sumProps.sum_big_small, sumProps.sum_odd_even,
        'manual', 'drawn', '手动开奖', new Date().toISOString()
      ];

      const drawResult = await client.query(drawQuery, drawValues);

      // 更新奖期状态
      await client.query('UPDATE lottery_issues SET status = $1 WHERE id = $2', ['drawn', issueId]);

      // 记录日志
      await this.logOperation(client, {
        lottery_type_id: issue.lottery_type_id,
        issue_id: issueId,
        issue_no: issue.issue_no,
        operation: 'manual',
        operator_id: operatorId,
        operator_name: '管理员',
        after_data: { draw_numbers: drawNumbers.join(','), ...sumProps },
        result: 'success',
        source: '手动开奖',
        details: `手动开奖成功，号码：${drawNumbers.join(',')}`
      });

      await client.query('COMMIT');
      return drawResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 记录操作日志
  protected async logOperation(client: any, data: any) {
    // 如果没有提供客户端，使用连接池获取新的连接
    let shouldReleaseClient = false;
    if (!client) {
      client = await this.pool.connect();
      shouldReleaseClient = true;
    }

    try {
      const query = `
        INSERT INTO lottery_logs (
          lottery_type_id, issue_id, issue_no, operation, operator_id, operator_name,
          before_data, after_data, result, error_message, execution_time,
          source, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      const values = [
        data.lottery_type_id, data.issue_id, data.issue_no, data.operation,
        data.operator_id, data.operator_name, data.before_data, data.after_data,
        data.result, data.error_message, data.execution_time, data.source, data.details
      ];

      await client.query(query, values);
    } finally {
      // 只有在我们自己创建的连接才释放
      if (shouldReleaseClient) {
        client.release();
      }
    }
  }

  // 获取开奖历史
  async getDrawHistory(filters: any = {}): Promise<{ data: any[], total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.lottery_type_id) {
      whereClause += ` AND d.lottery_type_id = $${paramIndex}`;
      values.push(filters.lottery_type_id);
      paramIndex++;
    }

    if (filters.issue_no) {
      whereClause += ` AND d.issue_no ILIKE $${paramIndex}`;
      values.push(`%${filters.issue_no}%`);
      paramIndex++;
    }

    if (filters.draw_status) {
      whereClause += ` AND d.draw_status = $${paramIndex}`;
      values.push(filters.draw_status);
      paramIndex++;
    }

    if (filters.date_range && filters.date_range.length === 2) {
      whereClause += ` AND d.draw_time BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      values.push(filters.date_range[0], filters.date_range[1]);
      paramIndex += 2;
    }

    const countQuery = `
      SELECT COUNT(*) FROM lottery_draws d
      JOIN lottery_types lt ON d.lottery_type_id = lt.id
      ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const offset = ((filters.page || 1) - 1) * (filters.pageSize || 20);
    const limit = filters.pageSize || 20;

    const dataQuery = `
      SELECT d.*, lt.name as lottery_name
      FROM lottery_draws d
      JOIN lottery_types lt ON d.lottery_type_id = lt.id
      ${whereClause}
      ORDER BY d.draw_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, values);

    return {
      data: dataResult.rows,
      total
    };
  }

  // 启动定时任务
  async startScheduler() {
    // 清理历史记录任务
    if (this.config.auto_cleanup_enabled) {
      const cleanupHour = this.config.cleanup_time_hour || 0;
      const cleanupMinute = this.config.cleanup_time_minute || 5;
      
      this.cronJobs.set('cleanupHistory', cron.schedule(
        `${cleanupMinute} ${cleanupHour} * * *`,
        async () => {
          await this.cleanupHistoryRecords();
        }
      ));
    }

    // 启动所有任务
    this.cronJobs.forEach(job => job.start());
    console.log('彩票管理定时任务已启动');
  }

  // 清理历史记录
  async cleanupHistoryRecords(): Promise<any> {
    const retentionCount = this.config.history_retention_count || 50;
    const backupEnabled = this.config.cleanup_backup_enabled !== false;

    const query = `
      SELECT cleanup_lottery_history_records($1, $2) as result
    `;

    const result = await this.pool.query(query, [retentionCount, backupEnabled]);
    return result.rows[0].result;
  }

  // 停止定时任务
  stopScheduler() {
    this.cronJobs.forEach(job => job.destroy());
    this.cronJobs.clear();
    console.log('彩票管理定时任务已停止');
  }

  // 创建历史记录清理函数
  async createCleanupFunction(): Promise<void> {
    const functionSQL = `
      CREATE OR REPLACE FUNCTION cleanup_lottery_history_records(
          retention_count INTEGER DEFAULT 50,
          enable_backup BOOLEAN DEFAULT true
      )
      RETURNS JSON AS $$
      DECLARE
          cleanup_result RECORD;
          backup_count INTEGER := 0;
          delete_count INTEGER := 0;
          latest_issue VARCHAR(50);
          oldest_issue VARCHAR(50);
          min_keep_id INTEGER;
      BEGIN
          -- 获取需要保留的最新记录的最小ID
          SELECT MIN(id), MAX(issue_no), MIN(issue_no)
          INTO min_keep_id, latest_issue, oldest_issue
          FROM (
              SELECT id, issue_no
              FROM lottery_draws
              WHERE draw_status = 'drawn'
              ORDER BY draw_time DESC
              LIMIT retention_count
          ) recent_records;

          -- 如果启用备份，先备份要删除的记录
          IF enable_backup AND min_keep_id IS NOT NULL THEN
              INSERT INTO lottery_draws_archive (
                  original_id, lottery_type_id, issue_id, issue_no, draw_numbers,
                  wan_wei, qian_wei, bai_wei, shi_wei, ge_wei,
                  sum_value, sum_big_small, sum_odd_even,
                  draw_method, draw_status, source, draw_time, original_created_at
              )
              SELECT
                  id, lottery_type_id, issue_id, issue_no, draw_numbers,
                  wan_wei, qian_wei, bai_wei, shi_wei, ge_wei,
                  sum_value, sum_big_small, sum_odd_even,
                  draw_method, draw_status, source, draw_time, created_at
              FROM lottery_draws
              WHERE draw_status = 'drawn'
                AND id < min_keep_id;

              GET DIAGNOSTICS backup_count = ROW_COUNT;
          END IF;

          -- 删除过期记录
          IF min_keep_id IS NOT NULL THEN
              DELETE FROM lottery_draws
              WHERE draw_status = 'drawn'
                AND id < min_keep_id;

              GET DIAGNOSTICS delete_count = ROW_COUNT;

              -- 同步清理期号表
              DELETE FROM lottery_issues
              WHERE id NOT IN (
                  SELECT DISTINCT issue_id FROM lottery_draws WHERE issue_id IS NOT NULL
              );
          END IF;

          -- 返回清理结果
          RETURN json_build_object(
              'cleaned_count', delete_count,
              'backed_up_count', backup_count,
              'latest_kept_issue', latest_issue,
              'oldest_kept_issue', oldest_issue
          );
      END;
      $$ LANGUAGE plpgsql;
    `;

    await this.pool.query(functionSQL);
  }


}

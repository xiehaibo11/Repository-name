/**
 * 分分时时彩期号生成器
 * 负责生成和管理期号
 */

export class IssueGenerator {
  /**
   * 生成当前期号 (格式: YYYYMMDDHHMM)
   * 基于当前时间生成期号
   */
  generateCurrentIssue(): string {
    const now = new Date();
    return this.formatDateToIssue(now);
  }
  
  /**
   * 生成下一期号
   * @param currentIssue 当前期号
   */
  generateNextIssue(currentIssue: string): string {
    const currentTime = this.parseIssueToDate(currentIssue);
    const nextTime = new Date(currentTime.getTime() + 60 * 1000); // 加1分钟
    
    return this.formatDateToIssue(nextTime);
  }
  
  /**
   * 生成上一期号
   * @param currentIssue 当前期号
   */
  generatePreviousIssue(currentIssue: string): string {
    const currentTime = this.parseIssueToDate(currentIssue);
    const previousTime = new Date(currentTime.getTime() - 60 * 1000); // 减1分钟
    
    return this.formatDateToIssue(previousTime);
  }
  
  /**
   * 解析期号为日期
   * @param issue 期号字符串
   */
  parseIssueToDate(issue: string): Date {
    if (issue.length !== 12) {
      throw new Error(`无效的期号格式: ${issue}`);
    }
    
    const year = parseInt(issue.substring(0, 4));
    const month = parseInt(issue.substring(4, 6)) - 1; // 月份从0开始
    const day = parseInt(issue.substring(6, 8));
    const hour = parseInt(issue.substring(8, 10));
    const minute = parseInt(issue.substring(10, 12));
    
    return new Date(year, month, day, hour, minute);
  }
  
  /**
   * 格式化日期为期号
   * @param date 日期对象
   */
  formatDateToIssue(date: Date): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}`;
  }
  
  /**
   * 获取今日所有期号
   * @param date 指定日期，默认为今天
   */
  getTodayIssues(date?: Date): string[] {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const issues: string[] = [];
    
    for (let i = 0; i < 1440; i++) { // 1440分钟 = 24小时
      const issueTime = new Date(startOfDay.getTime() + i * 60 * 1000);
      issues.push(this.formatDateToIssue(issueTime));
    }
    
    return issues;
  }
  
  /**
   * 获取指定日期范围内的所有期号
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  getIssuesInRange(startDate: Date, endDate: Date): string[] {
    const issues: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayIssues = this.getTodayIssues(currentDate);
      issues.push(...dayIssues);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return issues;
  }
  
  /**
   * 验证期号格式是否正确
   * @param issue 期号字符串
   */
  validateIssue(issue: string): boolean {
    // 检查长度
    if (issue.length !== 12) {
      return false;
    }
    
    // 检查是否全为数字
    if (!/^\d{12}$/.test(issue)) {
      return false;
    }
    
    try {
      // 尝试解析为日期
      const date = this.parseIssueToDate(issue);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        return false;
      }
      
      // 检查年份范围 (2020-2099)
      const year = date.getFullYear();
      if (year < 2020 || year > 2099) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 获取期号对应的日期信息
   * @param issue 期号字符串
   */
  getIssueInfo(issue: string): {
    date: Date;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    dayOfWeek: string;
    isToday: boolean;
    dayIndex: number; // 当日第几期 (0-1439)
  } {
    if (!this.validateIssue(issue)) {
      throw new Error(`无效的期号: ${issue}`);
    }
    
    const date = this.parseIssueToDate(issue);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    // 计算当日期号索引
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayIndex = Math.floor((date.getTime() - startOfDay.getTime()) / (60 * 1000));
    
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    return {
      date,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      dayOfWeek: dayNames[date.getDay()],
      isToday,
      dayIndex
    };
  }
  
  /**
   * 获取下一个开奖时间
   * @param currentTime 当前时间，默认为现在
   */
  getNextDrawTime(currentTime?: Date): Date {
    const now = currentTime || new Date();
    const nextMinute = new Date(now);
    
    // 设置到下一个整分钟
    nextMinute.setSeconds(0, 0);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);
    
    return nextMinute;
  }
  
  /**
   * 计算距离下次开奖的剩余时间
   * @param currentTime 当前时间，默认为现在
   */
  getTimeToNextDraw(currentTime?: Date): {
    totalSeconds: number;
    minutes: number;
    seconds: number;
  } {
    const now = currentTime || new Date();
    const nextDrawTime = this.getNextDrawTime(now);
    const diffMs = nextDrawTime.getTime() - now.getTime();
    const totalSeconds = Math.max(0, Math.ceil(diffMs / 1000));
    
    return {
      totalSeconds,
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60
    };
  }
  
  /**
   * 检查指定时间是否为开奖时间
   * @param time 要检查的时间
   */
  isDrawTime(time: Date): boolean {
    return time.getSeconds() === 0 && time.getMilliseconds() === 0;
  }
  
  /**
   * 获取期号的显示格式
   * @param issue 期号字符串
   */
  formatIssueDisplay(issue: string): string {
    if (!this.validateIssue(issue)) {
      return issue;
    }
    
    const info = this.getIssueInfo(issue);
    return `${info.year}-${info.month.toString().padStart(2, '0')}-${info.day.toString().padStart(2, '0')} ${info.hour.toString().padStart(2, '0')}:${info.minute.toString().padStart(2, '0')}`;
  }
}

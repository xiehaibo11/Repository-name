/**
 * 分分时时彩倒计时管理器
 * 负责管理倒计时和开奖时间控制
 */

import { IssueGenerator } from './IssueGenerator';
import { CountdownResponse } from '../../../types/ssc';

export class CountdownManager {
  private issueGenerator: IssueGenerator;
  private currentIssue: string = '';
  private nextDrawTime: Date = new Date();
  private countdownInterval: NodeJS.Timeout | null = null;
  private issueUpdateInterval: NodeJS.Timeout | null = null;
  private callbacks: {
    onCountdownUpdate?: (data: CountdownResponse) => void;
    onDrawTime?: (issueNo: string) => void;
    onIssueChange?: (newIssue: string, oldIssue: string) => void;
  } = {};

  constructor() {
    this.issueGenerator = new IssueGenerator();
  }

  /**
   * 启动倒计时系统
   */
  start(): void {
    console.log('⏰ 启动倒计时管理器');
    
    this.updateCurrentIssue();
    this.startCountdown();
    
    // 每分钟检查一次期号更新
    if (this.issueUpdateInterval) {
      clearInterval(this.issueUpdateInterval);
      this.issueUpdateInterval = null;
    }
    this.issueUpdateInterval = setInterval(() => {
      this.updateCurrentIssue();
    }, 60000);
  }

  /**
   * 停止倒计时系统
   */
  stop(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.issueUpdateInterval) {
      clearInterval(this.issueUpdateInterval);
      this.issueUpdateInterval = null;
    }
    console.log('⏹️ 倒计时管理器已停止');
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onCountdownUpdate?: (data: CountdownResponse) => void;
    onDrawTime?: (issueNo: string) => void;
    onIssueChange?: (newIssue: string, oldIssue: string) => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 更新当前期号和开奖时间
   */
  private updateCurrentIssue(): void {
    const now = new Date();
    const oldIssue = this.currentIssue;
    
    // 计算下一个整分钟时间
    const nextMinute = new Date(now);
    nextMinute.setSeconds(0, 0);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);
    
    this.currentIssue = this.issueGenerator.formatDateToIssue(nextMinute);
    this.nextDrawTime = nextMinute;
    
    // 如果期号发生变化，触发回调
    if (oldIssue && oldIssue !== this.currentIssue && this.callbacks.onIssueChange) {
      this.callbacks.onIssueChange(this.currentIssue, oldIssue);
    }
    
    console.log(`📅 当前期号: ${this.currentIssue}, 开奖时间: ${this.nextDrawTime.toLocaleString()}`);
  }

  /**
   * 启动倒计时
   */
  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdownInterval = setInterval(() => {
      const now = new Date();
      const remainingMs = this.nextDrawTime.getTime() - now.getTime();
      
      if (remainingMs <= 0) {
        // 时间到，触发开奖
        this.handleDrawTime();
        this.updateCurrentIssue();
      } else {
        // 更新倒计时
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        this.broadcastCountdown(remainingSeconds);
      }
    }, 1000);
  }

  /**
   * 处理开奖时间到达
   */
  private handleDrawTime(): void {
    console.log(`🎯 开奖时间到达 - 期号: ${this.currentIssue}`);
    
    if (this.callbacks.onDrawTime) {
      this.callbacks.onDrawTime(this.currentIssue);
    }
  }

  /**
   * 广播倒计时信息
   */
  private broadcastCountdown(seconds: number): void {
    const countdownData: CountdownResponse = {
      issueNo: this.currentIssue,
      drawTime: this.nextDrawTime.toISOString(),
      remainingSeconds: seconds,
      isActive: seconds > 0,
      currentTime: new Date().toISOString(),
    };
    
    if (this.callbacks.onCountdownUpdate) {
      this.callbacks.onCountdownUpdate(countdownData);
    }
    
    // 只在特定时间点打印日志，避免过多输出
    if (seconds <= 10 || seconds % 10 === 0) {
      console.log(`⏱️ 倒计时: ${seconds}秒 - 期号: ${this.currentIssue}`);
    }
  }

  /**
   * 获取当前倒计时信息
   */
  getCurrentCountdown(): CountdownResponse {
    const now = new Date();
    const remainingMs = this.nextDrawTime.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    
    return {
      issueNo: this.currentIssue,
      drawTime: this.nextDrawTime.toISOString(),
      remainingSeconds,
      isActive: remainingSeconds > 0,
      currentTime: now.toISOString(),
    };
  }

  /**
   * 获取当前期号
   */
  getCurrentIssue(): string {
    return this.currentIssue;
  }

  /**
   * 获取下次开奖时间
   */
  getNextDrawTime(): Date {
    return new Date(this.nextDrawTime);
  }

  /**
   * 检查是否可以投注
   * @param beforeSeconds 开奖前多少秒停止投注，默认10秒
   */
  canBet(beforeSeconds: number = 10): boolean {
    const now = new Date();
    const remainingMs = this.nextDrawTime.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    
    return remainingSeconds > beforeSeconds;
  }

  /**
   * 获取投注截止时间
   * @param beforeSeconds 开奖前多少秒停止投注，默认10秒
   */
  getBetCloseTime(beforeSeconds: number = 10): Date {
    return new Date(this.nextDrawTime.getTime() - beforeSeconds * 1000);
  }

  /**
   * 检查指定时间是否在投注时间内
   * @param time 要检查的时间
   * @param beforeSeconds 开奖前多少秒停止投注，默认10秒
   */
  isBetTimeValid(time: Date, beforeSeconds: number = 10): boolean {
    const betCloseTime = this.getBetCloseTime(beforeSeconds);
    return time <= betCloseTime;
  }

  /**
   * 获取系统状态信息
   */
  getSystemStatus(): {
    isRunning: boolean;
    currentIssue: string;
    nextDrawTime: string;
    remainingSeconds: number;
    canBet: boolean;
  } {
    const countdown = this.getCurrentCountdown();
    
    return {
      isRunning: this.countdownInterval !== null,
      currentIssue: this.currentIssue,
      nextDrawTime: this.nextDrawTime.toISOString(),
      remainingSeconds: countdown.remainingSeconds,
      canBet: this.canBet(),
    };
  }

  /**
   * 强制更新期号（用于测试或特殊情况）
   */
  forceUpdateIssue(): void {
    console.log('🔄 强制更新期号');
    this.updateCurrentIssue();
  }

  /**
   * 获取今日开奖统计
   */
  getTodayStats(): {
    totalIssues: number;
    completedIssues: number;
    remainingIssues: number;
    currentIssueIndex: number;
  } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const minutesFromStart = Math.floor((now.getTime() - startOfDay.getTime()) / (60 * 1000));
    
    return {
      totalIssues: 1440, // 24小时 * 60分钟
      completedIssues: minutesFromStart,
      remainingIssues: 1440 - minutesFromStart,
      currentIssueIndex: minutesFromStart + 1,
    };
  }
}

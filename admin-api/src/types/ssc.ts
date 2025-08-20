/**
 * 分分时时彩系统类型定义
 * 基于设计文档的完整类型系统
 */

// ==================== 基础数据类型 ====================

/**
 * 开奖结果数据结构
 */
export interface DrawResult {
  id?: number;
  issueNo: string;           // 期号 (格式: YYYYMMDDHHMM)
  drawTime: Date;            // 开奖时间
  
  // 开奖号码 (万千百十个)
  numbers: {
    wan: number;             // 万位 (0-9)
    qian: number;            // 千位 (0-9)
    bai: number;             // 百位 (0-9)
    shi: number;             // 十位 (0-9)
    ge: number;              // 个位 (0-9)
  };
  
  // 自动计算的属性
  calculated: CalculatedResult;
  
  // 状态
  status?: 'pending' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 计算结果数据结构
 */
export interface CalculatedResult {
  // 和值相关
  sum: number;             // 和值 (0-45)
  sumBigSmall: 'big' | 'small';    // 和值大小 (23-45大, 0-22小)
  sumOddEven: 'odd' | 'even';      // 和值单双
  
  // 各位属性
  positions: {
    wan: PositionAttributes;
    qian: PositionAttributes;
    bai: PositionAttributes;
    shi: PositionAttributes;
    ge: PositionAttributes;
  };
  
  // 龙虎 (第1位 vs 第5位)
  dragonTiger: 'dragon' | 'tiger' | 'tie';
  
  // 奇偶统计
  oddEvenCount: {
    oddCount: number;      // 奇数个数
    evenCount: number;     // 偶数个数
  };
  
  // 跨度
  spans: {
    front3: number;        // 前三跨度 (万千百)
    middle3: number;       // 中三跨度 (千百十)
    back3: number;         // 后三跨度 (百十个)
  };
  
  // 牛牛相关
  bull: BullResult;
  
  // 牛梭哈相关
  poker: PokerResult;
}

/**
 * 位置属性
 */
export interface PositionAttributes {
  value: number;             // 数字值 (0-9)
  bigSmall: 'big' | 'small'; // 大小 (5-9大, 0-4小)
  oddEven: 'odd' | 'even';   // 单双 (1,3,5,7,9单, 0,2,4,6,8双)
  primeComposite: 'prime' | 'composite'; // 质合 (1,2,3,5,7质, 0,4,6,8,9合)
}

/**
 * 牛牛结果
 */
export interface BullResult {
  type: 'none' | 'bull1' | 'bull2' | 'bull3' | 'bull4' | 'bull5' | 
        'bull6' | 'bull7' | 'bull8' | 'bull9' | 'bullbull';
  value: number;             // 牛几 (0-10, 10为牛牛)
  bigSmall: 'big' | 'small'; // 牛大小
  oddEven: 'odd' | 'even';   // 牛单双
  primeComposite: 'prime' | 'composite'; // 牛质合
}

/**
 * 牛梭哈结果
 */
export interface PokerResult {
  type: 'fiveOfKind' | 'fourOfKind' | 'fullHouse' | 'straight' | 
        'threeOfKind' | 'twoPair' | 'onePair' | 'highCard';
  description: string;       // 中文描述
}

// ==================== 投注相关类型 ====================

/**
 * 投注订单
 */
export interface BetOrder {
  id?: number;
  orderNo: string;
  userId: number;
  issueNo: string;
  
  // 投注内容
  bets: BetItem[];
  
  // 金额信息
  totalAmount: number;       // 总投注金额
  totalWinAmount?: number;   // 总中奖金额
  betCount: number;          // 投注项数
  
  // 状态
  status: 'pending' | 'win' | 'lose' | 'cancelled';
  betTime: Date;
  settleTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 投注明细
 */
export interface BetItem {
  id?: number;
  orderId?: number;
  
  // 玩法类型
  gameType: GameType;
  
  // 投注内容
  betContent: string;        // 投注内容描述
  betValue: any;             // 具体投注值
  
  // 金额和赔率
  amount: number;            // 投注金额
  odds: number;              // 赔率
  winAmount?: number;        // 中奖金额
  
  // 结果
  isWin?: boolean;
  resultDescription?: string; // 开奖结果描述
  
  createdAt?: Date;
}

/**
 * 游戏类型枚举
 */
export type GameType = 
  // 数字盘
  | 'number_wan' | 'number_qian' | 'number_bai' | 'number_shi' | 'number_ge'
  
  // 双面玩法
  | 'double_wan_big_small' | 'double_wan_odd_even' | 'double_wan_prime_composite'
  | 'double_qian_big_small' | 'double_qian_odd_even' | 'double_qian_prime_composite'
  | 'double_bai_big_small' | 'double_bai_odd_even' | 'double_bai_prime_composite'
  | 'double_shi_big_small' | 'double_shi_odd_even' | 'double_shi_prime_composite'
  | 'double_ge_big_small' | 'double_ge_odd_even' | 'double_ge_prime_composite'
  | 'double_sum_big_small' | 'double_sum_odd_even'
  
  // 牛牛玩法
  | 'bull_basic' | 'bull_double_face' | 'bull_poker'
  
  // 定位玩法
  | 'position_one' | 'position_two' | 'position_three'
  
  // 跨度玩法
  | 'span_front3' | 'span_middle3' | 'span_back3'
  
  // 龙虎玩法
  | 'dragon_tiger';

// ==================== 配置相关类型 ====================

/**
 * 赔率配置
 */
export interface OddsConfig {
  id?: number;
  gameType: string;
  betType: string;
  odds: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 系统配置
 */
export interface SystemConfig {
  id?: number;
  configKey: string;
  configValue: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==================== API响应类型 ====================

/**
 * 标准API响应
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

/**
 * 倒计时响应
 */
export interface CountdownResponse {
  issueNo: string;
  drawTime: string;
  remainingSeconds: number;
  isActive: boolean;
  currentTime: string;
}

/**
 * 系统状态响应
 */
export interface SystemStatusResponse {
  isRunning: boolean;
  currentIssue?: string;
  nextDrawTime?: string;
  totalIssuesCount?: number;
  todayIssuesCount?: number;
}

// ==================== 投注请求类型 ====================

/**
 * 投注请求
 */
export interface BetRequest {
  issueNo: string;
  bets: BetItemRequest[];
}

/**
 * 投注项请求
 */
export interface BetItemRequest {
  gameType: GameType;
  betValue: any;
  amount: number;
}

/**
 * 计算收益请求
 */
export interface CalculateWinRequest {
  bets: BetItemRequest[];
}

/**
 * 计算收益响应
 */
export interface CalculateWinResponse {
  totalAmount: number;
  maxWinAmount: number;
  items: {
    gameType: GameType;
    amount: number;
    odds: number;
    maxWin: number;
  }[];
}

// ==================== 常量定义 ====================

/**
 * 可选投注金额
 */
export const BET_AMOUNTS = [10, 50, 100, 500, 1000, 5000, 10000, 50000] as const;

/**
 * 位置名称映射
 */
export const POSITION_NAMES = {
  wan: '万位',
  qian: '千位', 
  bai: '百位',
  shi: '十位',
  ge: '个位'
} as const;

/**
 * 游戏类型名称映射
 */
export const GAME_TYPE_NAMES: Record<GameType, string> = {
  // 数字盘
  number_wan: '万位数字',
  number_qian: '千位数字',
  number_bai: '百位数字',
  number_shi: '十位数字',
  number_ge: '个位数字',
  
  // 双面玩法
  double_wan_big_small: '万位大小',
  double_wan_odd_even: '万位单双',
  double_wan_prime_composite: '万位质合',
  double_qian_big_small: '千位大小',
  double_qian_odd_even: '千位单双',
  double_qian_prime_composite: '千位质合',
  double_bai_big_small: '百位大小',
  double_bai_odd_even: '百位单双',
  double_bai_prime_composite: '百位质合',
  double_shi_big_small: '十位大小',
  double_shi_odd_even: '十位单双',
  double_shi_prime_composite: '十位质合',
  double_ge_big_small: '个位大小',
  double_ge_odd_even: '个位单双',
  double_ge_prime_composite: '个位质合',
  double_sum_big_small: '总和大小',
  double_sum_odd_even: '总和单双',
  
  // 牛牛玩法
  bull_basic: '牛牛基础',
  bull_double_face: '牛牛双面',
  bull_poker: '牛梭哈',
  
  // 定位玩法
  position_one: '一字定位',
  position_two: '二字定位',
  position_three: '三字定位',
  
  // 跨度玩法
  span_front3: '前三跨度',
  span_middle3: '中三跨度',
  span_back3: '后三跨度',
  
  // 龙虎玩法
  dragon_tiger: '龙虎'
};

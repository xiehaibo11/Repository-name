# 重庆时时彩Vue项目迁移开发文档

## 📋 项目概述

本文档详细记录了将原ASP.NET MVC + Knockout.js的重庆时时彩系统完整迁移到Vue 3 + TypeScript架构的过程，保持原有的UI设计和业务逻辑，但使用现代化的Vue技术栈。

## 🎯 迁移目标

- **保持原有UI设计**: 完全保留原系统的界面布局、色彩搭配、交互方式
- **技术栈升级**: Knockout.js → Vue 3 Composition API
- **类型安全**: JavaScript → TypeScript
- **模块化重构**: 单文件组件化，提高可维护性
- **性能优化**: 利用Vue 3的响应式系统和Vite构建工具

## 🏗️ 系统架构设计

### 技术栈对比

| 组件 | 原系统 | 新系统 |
|------|--------|--------|
| 前端框架 | Knockout.js | Vue 3 Composition API |
| 语言 | JavaScript | TypeScript |
| 构建工具 | ASP.NET Bundling | Vite |
| 样式方案 | Bootstrap + 自定义CSS | 保留原CSS + Vue单文件组件 |
| 状态管理 | Knockout Observable | Vue Ref/Reactive |
| 路由 | ASP.NET MVC | Vue Router 4 |

### 项目目录结构

```
QIANDUAN/
├── src/
│   ├── components/
│   │   ├── ssc/
│   │   │   ├── SSCLayout.vue          # 主布局组件
│   │   │   ├── SSCNavigation.vue      # 左侧导航
│   │   │   ├── SSCBettingArea.vue     # 投注区域
│   │   │   ├── SSCNumberGrid.vue      # 数字选择网格
│   │   │   ├── SSCGameTabs.vue        # 玩法切换标签
│   │   │   ├── SSCQuickSelect.vue     # 快速选择按钮
│   │   │   ├── SSCLotteryInfo.vue     # 开奖信息
│   │   │   └── SSCInputBetType.vue    # 信用玩法面板
│   │   └── common/
│   │       ├── CountdownTimer.vue     # 倒计时组件
│   │       └── GameLogo.vue           # 游戏Logo
│   ├── views/
│   │   └── ssc/
│   │       └── ChongqingSSC.vue       # 重庆时时彩主页面
│   ├── composables/
│   │   ├── useSSCBetting.ts           # 投注逻辑
│   │   ├── useSSCCalculation.ts       # 赔率计算
│   │   ├── useSSCGameData.ts          # 游戏数据
│   │   └── useSSCStatistics.ts        # 统计数据
│   ├── types/
│   │   ├── ssc.ts                     # 时时彩类型定义
│   │   └── betting.ts                 # 投注类型定义
│   ├── assets/
│   │   ├── css/
│   │   │   ├── ssc-layout.css         # 布局样式
│   │   │   ├── ssc-betting.css        # 投注区样式
│   │   │   └── ssc-components.css     # 组件样式
│   │   └── images/
│   │       └── ssc/                   # 时时彩相关图片
│   └── utils/
│       ├── sscCalculator.ts           # 计算工具
│       └── sscValidator.ts            # 验证工具
```

## 🎨 UI组件设计

### 1. 主布局组件 (SSCLayout.vue)

```vue
<template>
  <div class="ssc-layout">
    <!-- 左侧导航 -->
    <div class="left-sidebar">
      <SSCNavigation />
    </div>
    
    <!-- 主内容区域 -->
    <div class="main-content">
      <div class="main-header">
        <SSCLotteryInfo 
          :current-issue="currentIssue"
          :countdown="countdown"
          :last-results="lastResults"
        />
      </div>
      
      <div class="main-body">
        <SSCBettingArea 
          :current-game="currentGame"
          @bet-placed="handleBetPlaced"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { LotteryGame, BetData } from '@/types/ssc'

// 游戏状态
const currentIssue = ref<string>('')
const countdown = ref<number>(0)
const lastResults = ref<string[]>([])
const currentGame = ref<LotteryGame>()

// 处理投注
const handleBetPlaced = (betData: BetData) => {
  // 投注逻辑处理
  console.log('投注数据:', betData)
}

onMounted(() => {
  // 初始化游戏数据
  initGameData()
})
</script>

<style scoped>
.ssc-layout {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.left-sidebar {
  width: 220px;
  background: #2c3e50;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-header {
  height: 120px;
  background: white;
  border-bottom: 1px solid #ddd;
}

.main-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
</style>
```

### 2. 投注区域组件 (SSCBettingArea.vue)

```vue
<template>
  <div class="ssc-betting-area">
    <!-- 玩法切换标签 -->
    <SSCGameTabs 
      v-model:active-tab="activeGameTab"
      :tabs="gameTabs"
      @tab-change="handleTabChange"
    />
    
    <!-- 投注类型选择 -->
    <div class="bet-type-selector">
      <div class="bet-type-group" v-for="group in betTypeGroups" :key="group.name">
        <span class="group-label">{{ group.label }}</span>
        <div class="bet-type-buttons">
          <button 
            v-for="betType in group.types"
            :key="betType.id"
            :class="['bet-type-btn', { active: activeBetType === betType.id }]"
            @click="selectBetType(betType.id)"
          >
            {{ betType.name }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 数字选择区域 -->
    <div class="number-selection-area">
      <SSCNumberGrid 
        v-for="position in positions"
        :key="position.id"
        :position="position"
        :selected-numbers="selectedNumbers[position.id]"
        :statistics="statistics[position.id]"
        :show-statistics="showStatistics"
        @number-select="handleNumberSelect"
      />
    </div>
    
    <!-- 投注信息显示 -->
    <div class="bet-info-panel">
      <div class="bet-summary">
        <span>已选 <em>{{ totalBets }}</em> 注，共 <em>{{ totalAmount }}</em> 元</span>
        <span v-if="maxProfit">若中奖，最高盈利 <em>{{ maxProfit }}</em> 元</span>
      </div>
      
      <div class="bet-controls">
        <div class="amount-controls">
          <label>单注金额：</label>
          <input v-model.number="betAmount" type="number" min="2" />
        </div>
        <div class="multiplier-controls">
          <label>投注倍数：</label>
          <input v-model.number="betMultiplier" type="number" min="1" />
        </div>
        <button class="confirm-bet-btn" @click="confirmBet">确认投注</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSSCBetting } from '@/composables/useSSCBetting'
import { useSSCCalculation } from '@/composables/useSSCCalculation'
import type { BetType, Position, SelectedNumbers } from '@/types/ssc'

// 组合式API
const {
  activeGameTab,
  activeBetType,
  selectedNumbers,
  betAmount,
  betMultiplier,
  selectBetType,
  handleNumberSelect
} = useSSCBetting()

const {
  calculateBetCount,
  calculateTotalAmount,
  calculateMaxProfit
} = useSSCCalculation()

// 计算属性
const totalBets = computed(() => calculateBetCount(selectedNumbers.value, activeBetType.value))
const totalAmount = computed(() => calculateTotalAmount(totalBets.value, betAmount.value, betMultiplier.value))
const maxProfit = computed(() => calculateMaxProfit(activeBetType.value, totalBets.value, betAmount.value))

// 游戏标签配置
const gameTabs = [
  { id: 'five-star', name: '五星', active: true },
  { id: 'four-star', name: '四星' },
  { id: 'front-three', name: '前三' },
  { id: 'middle-three', name: '中三' },
  { id: 'back-three', name: '后三' },
  { id: 'front-two', name: '前二' },
  { id: 'back-two', name: '后二' },
  { id: 'fixed-position', name: '定位胆' },
  { id: 'any-position', name: '不定位' },
  { id: 'big-small-odd-even', name: '大小单双' },
  { id: 'dragon-tiger', name: '龙虎和' }
]

// 投注类型分组
const betTypeGroups = computed(() => {
  const groups = []
  
  if (activeGameTab.value === 'five-star') {
    groups.push({
      name: 'direct',
      label: '直　选：',
      types: [
        { id: 'five-direct-compound', name: '直选复式' },
        { id: 'five-direct-single', name: '直选单式' },
        { id: 'five-combination', name: '五星组合' }
      ]
    })
    groups.push({
      name: 'group',
      label: '组　选：',
      types: [
        { id: 'group-120', name: '组选120' },
        { id: 'group-60', name: '组选60' },
        { id: 'group-30', name: '组选30' },
        { id: 'group-20', name: '组选20' },
        { id: 'group-10', name: '组选10' },
        { id: 'group-5', name: '组选5' }
      ]
    })
    groups.push({
      name: 'special',
      label: '特　殊：',
      types: [
        { id: 'smooth-sailing', name: '一帆风顺' },
        { id: 'good-things-come-in-pairs', name: '好事成双' },
        { id: 'three-stars-bring-joy', name: '三星报喜' },
        { id: 'four-seasons-fortune', name: '四季发财' }
      ]
    })
    groups.push({
      name: 'others',
      label: '其　他：',
      types: [
        { id: 'sum-big-small-odd-even', name: '总和大小单双' },
        { id: 'sum-combination-big-small-odd-even', name: '总和组合大小单双' }
      ]
    })
  }
  
  // 其他玩法的配置...
  
  return groups
})

// 位置配置
const positions = computed(() => {
  const positionMap = {
    'five-star': [
      { id: 'ten-thousands', name: '万位', numbers: Array.from({length: 10}, (_, i) => i) },
      { id: 'thousands', name: '千位', numbers: Array.from({length: 10}, (_, i) => i) },
      { id: 'hundreds', name: '百位', numbers: Array.from({length: 10}, (_, i) => i) },
      { id: 'tens', name: '十位', numbers: Array.from({length: 10}, (_, i) => i) },
      { id: 'units', name: '个位', numbers: Array.from({length: 10}, (_, i) => i) }
    ]
    // 其他玩法的位置配置...
  }
  
  return positionMap[activeGameTab.value] || []
})

// 事件处理
const handleTabChange = (tabId: string) => {
  activeGameTab.value = tabId
  // 重置选择状态
  selectedNumbers.value = {}
}

const confirmBet = () => {
  // 投注确认逻辑
  const betData = {
    gameType: activeGameTab.value,
    betType: activeBetType.value,
    selectedNumbers: selectedNumbers.value,
    betCount: totalBets.value,
    betAmount: betAmount.value,
    multiplier: betMultiplier.value,
    totalAmount: totalAmount.value
  }
  
  emit('bet-placed', betData)
}

const emit = defineEmits<{
  'bet-placed': [betData: any]
}>()
</script>

<style scoped>
.ssc-betting-area {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.bet-type-selector {
  margin: 20px 0;
}

.bet-type-group {
  display: flex;
  align-items: center;
  margin: 15px 0;
}

.group-label {
  width: 80px;
  font-weight: bold;
  color: #333;
}

.bet-type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.bet-type-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.bet-type-btn:hover {
  background: #f0f0f0;
}

.bet-type-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.number-selection-area {
  margin: 30px 0;
}

.bet-info-panel {
  border-top: 1px solid #eee;
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bet-summary {
  font-size: 16px;
  color: #333;
}

.bet-summary em {
  color: #ff6b6b;
  font-style: normal;
  font-weight: bold;
}

.bet-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.amount-controls, .multiplier-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount-controls input, .multiplier-controls input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.confirm-bet-btn {
  padding: 10px 30px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.confirm-bet-btn:hover {
  background: #218838;
}
</style>
```

### 3. 数字选择网格组件 (SSCNumberGrid.vue)

```vue
<template>
  <div class="ssc-number-grid">
    <div class="grid-header">
      <span class="position-name">{{ position.name }}</span>
      <div class="quick-select-buttons">
        <button @click="selectAll">全</button>
        <button @click="selectBig">大</button>
        <button @click="selectSmall">小</button>
        <button @click="selectOdd">奇</button>
        <button @click="selectEven">偶</button>
        <button @click="clearAll">清</button>
      </div>
    </div>
    
    <div class="number-grid">
      <div 
        v-for="number in position.numbers"
        :key="number"
        :class="['number-cell', { 
          selected: selectedNumbers.includes(number),
          hot: isHot(number),
          cold: isCold(number)
        }]"
        @click="toggleNumber(number)"
      >
        <span class="number">{{ number }}</span>
        <span v-if="showStatistics && statistics" class="miss-count">
          {{ statistics.miss[number] || 0 }}
        </span>
        <span v-if="showStatistics && statistics" class="hot-count">
          {{ statistics.hot[number] || 0 }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Position, Statistics } from '@/types/ssc'

interface Props {
  position: Position
  selectedNumbers: number[]
  statistics?: Statistics
  showStatistics?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStatistics: false
})

const emit = defineEmits<{
  'number-select': [positionId: string, numbers: number[]]
}>()

// 数字选择逻辑
const toggleNumber = (number: number) => {
  const newSelection = [...props.selectedNumbers]
  const index = newSelection.indexOf(number)
  
  if (index > -1) {
    newSelection.splice(index, 1)
  } else {
    newSelection.push(number)
  }
  
  emit('number-select', props.position.id, newSelection)
}

// 快速选择
const selectAll = () => {
  emit('number-select', props.position.id, [...props.position.numbers])
}

const selectBig = () => {
  const bigNumbers = props.position.numbers.filter(n => n >= 5)
  emit('number-select', props.position.id, bigNumbers)
}

const selectSmall = () => {
  const smallNumbers = props.position.numbers.filter(n => n <= 4)
  emit('number-select', props.position.id, smallNumbers)
}

const selectOdd = () => {
  const oddNumbers = props.position.numbers.filter(n => n % 2 === 1)
  emit('number-select', props.position.id, oddNumbers)
}

const selectEven = () => {
  const evenNumbers = props.position.numbers.filter(n => n % 2 === 0)
  emit('number-select', props.position.id, evenNumbers)
}

const clearAll = () => {
  emit('number-select', props.position.id, [])
}

// 统计数据判断
const isHot = (number: number) => {
  if (!props.statistics) return false
  return props.statistics.hot[number] > 5 // 热号阈值
}

const isCold = (number: number) => {
  if (!props.statistics) return false
  return props.statistics.miss[number] > 10 // 冷号阈值
}
</script>

<style scoped>
.ssc-number-grid {
  margin: 20px 0;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.position-name {
  font-weight: bold;
  color: #333;
  font-size: 16px;
}

.quick-select-buttons {
  display: flex;
  gap: 8px;
}

.quick-select-buttons button {
  padding: 4px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.quick-select-buttons button:hover {
  background: #e9ecef;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  background: #ddd;
  padding: 1px;
}

.number-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.number-cell:hover {
  background: #f0f0f0;
}

.number-cell.selected {
  background: #007bff;
  color: white;
}

.number-cell.hot {
  background-color: #ffebee;
}

.number-cell.cold {
  background-color: #e3f2fd;
}

.number {
  font-size: 18px;
  font-weight: bold;
}

.miss-count {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  color: #666;
}

.hot-count {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: #f44336;
}
</style>
```

## 🔧 核心逻辑实现

### 投注逻辑 Composable (useSSCBetting.ts)

```typescript
import { ref, reactive, computed } from 'vue'
import type { GameTab, BetType, SelectedNumbers } from '@/types/ssc'

export function useSSCBetting() {
  // 状态管理
  const activeGameTab = ref<string>('five-star')
  const activeBetType = ref<string>('five-direct-compound')
  const selectedNumbers = reactive<SelectedNumbers>({})
  const betAmount = ref<number>(2)
  const betMultiplier = ref<number>(1)
  const showStatistics = ref<boolean>(false)
  
  // 选择投注类型
  const selectBetType = (betTypeId: string) => {
    activeBetType.value = betTypeId
    // 根据投注类型重置选号
    resetSelection()
  }
  
  // 处理数字选择
  const handleNumberSelect = (positionId: string, numbers: number[]) => {
    selectedNumbers[positionId] = numbers
  }
  
  // 重置选择
  const resetSelection = () => {
    Object.keys(selectedNumbers).forEach(key => {
      selectedNumbers[key] = []
    })
  }
  
  // 切换统计显示
  const toggleStatistics = () => {
    showStatistics.value = !showStatistics.value
  }
  
  return {
    activeGameTab,
    activeBetType,
    selectedNumbers,
    betAmount,
    betMultiplier,
    showStatistics,
    selectBetType,
    handleNumberSelect,
    resetSelection,
    toggleStatistics
  }
}
```

### 计算逻辑 Composable (useSSCCalculation.ts)

```typescript
import { computed } from 'vue'
import type { SelectedNumbers, BetType } from '@/types/ssc'

export function useSSCCalculation() {
  
  // 计算注数
  const calculateBetCount = (selectedNumbers: SelectedNumbers, betType: string): number => {
    switch (betType) {
      case 'five-direct-compound':
        return calculateDirectCompoundCount(selectedNumbers)
      case 'five-direct-single':
        return calculateDirectSingleCount(selectedNumbers)
      case 'five-combination':
        return calculateCombinationCount(selectedNumbers)
      case 'group-120':
        return calculateGroup120Count(selectedNumbers)
      // ... 其他玩法计算
      default:
        return 0
    }
  }
  
  // 直选复式计算
  const calculateDirectCompoundCount = (selectedNumbers: SelectedNumbers): number => {
    const positions = ['ten-thousands', 'thousands', 'hundreds', 'tens', 'units']
    let count = 1
    
    for (const position of positions) {
      const numbers = selectedNumbers[position] || []
      if (numbers.length === 0) return 0
      count *= numbers.length
    }
    
    return count
  }
  
  // 直选单式计算
  const calculateDirectSingleCount = (selectedNumbers: SelectedNumbers): number => {
    // 单式投注的注数计算逻辑
    return selectedNumbers.singleNumbers?.length || 0
  }
  
  // 五星组合计算
  const calculateCombinationCount = (selectedNumbers: SelectedNumbers): number => {
    const allNumbers = Object.values(selectedNumbers).flat()
    const uniqueNumbers = [...new Set(allNumbers)]
    
    if (uniqueNumbers.length < 5) return 0
    
    // 计算组合数 C(n,5)
    return combination(uniqueNumbers.length, 5)
  }
  
  // 组选120计算
  const calculateGroup120Count = (selectedNumbers: SelectedNumbers): number => {
    const allNumbers = Object.values(selectedNumbers).flat()
    const uniqueNumbers = [...new Set(allNumbers)]
    
    if (uniqueNumbers.length < 5) return 0
    
    // 五个不同数字的组合
    return combination(uniqueNumbers.length, 5)
  }
  
  // 计算总金额
  const calculateTotalAmount = (betCount: number, betAmount: number, multiplier: number): number => {
    return betCount * betAmount * multiplier
  }
  
  // 计算最高奖金
  const calculateMaxProfit = (betType: string, betCount: number, betAmount: number): number => {
    const prizeMap: Record<string, number> = {
      'five-direct-compound': 100000,
      'five-direct-single': 100000,
      'five-combination': 100000,
      'group-120': 833,
      'group-60': 1666,
      'group-30': 3333,
      'group-20': 5000,
      'group-10': 10000,
      'group-5': 20000
    }
    
    const prizePerBet = prizeMap[betType] || 0
    const totalPrize = prizePerBet * betAmount
    const totalCost = betCount * betAmount
    
    return totalPrize - totalCost
  }
  
  // 组合数计算辅助函数
  const combination = (n: number, r: number): number => {
    if (r > n) return 0
    if (r === 0 || r === n) return 1
    
    let result = 1
    for (let i = 1; i <= r; i++) {
      result = result * (n - i + 1) / i
    }
    
    return Math.round(result)
  }
  
  return {
    calculateBetCount,
    calculateTotalAmount,
    calculateMaxProfit,
    calculateDirectCompoundCount,
    calculateDirectSingleCount,
    calculateCombinationCount
  }
}
```

## 📝 类型定义

### SSC类型定义 (types/ssc.ts)

```typescript
// 游戏标签
export interface GameTab {
  id: string
  name: string
  active?: boolean
}

// 投注类型
export interface BetType {
  id: string
  name: string
  category: string
  prize: number
}

// 位置定义
export interface Position {
  id: string
  name: string
  numbers: number[]
}

// 选中的号码
export interface SelectedNumbers {
  [positionId: string]: number[]
}

// 统计数据
export interface Statistics {
  miss: Record<number, number>  // 遗漏数据
  hot: Record<number, number>   // 冷热数据
}

// 开奖结果
export interface LotteryResult {
  issue: string
  numbers: string[]
  time: string
}

// 游戏数据
export interface LotteryGame {
  id: number
  name: string
  categoryId: number
  currentIssue: string
  nextIssue: string
  countdown: number
  lastResults: LotteryResult[]
  betTypes: BetType[]
}

// 投注数据
export interface BetData {
  gameType: string
  betType: string
  selectedNumbers: SelectedNumbers
  betCount: number
  betAmount: number
  multiplier: number
  totalAmount: number
  maxProfit: number
}

// API响应
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  code?: number
}

// 投注结果
export interface BetResult {
  success: boolean
  orderId: string
  message: string
}
```

## 🎨 样式迁移

### 主样式文件 (assets/css/ssc-layout.css)

```css
/* 重庆时时彩布局样式 - 完全保持原设计 */

.ssc-layout {
  font-family: "Microsoft YaHei", Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
  background: #f5f5f5;
}

/* 左侧导航样式 */
.left-sidebar {
  width: 220px;
  background: #2c3e50;
  height: 100vh;
  overflow-y: auto;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
}

.left-sidebar::-webkit-scrollbar {
  width: 6px;
}

.left-sidebar::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.1);
}

.left-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.3);
  border-radius: 3px;
}

/* 游戏分类菜单 */
.game-category-menu {
  padding: 0;
  margin: 0;
  list-style: none;
}

.menu-item {
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.menu-header {
  display: block;
  padding: 15px 20px;
  color: #ecf0f1;
  text-decoration: none;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.menu-header:hover {
  background: rgba(255,255,255,0.1);
}

.menu-header.active {
  background: #3498db;
}

.submenu {
  background: #34495e;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.submenu.open {
  max-height: 500px;
}

.submenu-item {
  display: block;
  padding: 10px 40px;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.3s;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.submenu-item:hover {
  background: rgba(255,255,255,0.1);
  color: #ecf0f1;
  padding-left: 50px;
}

.submenu-item.active {
  background: #e74c3c;
  color: white;
}

/* 热门标识 */
.hot-badge {
  display: inline-block;
  width: 16px;
  height: 16px;
  background: url('/images/hot.png') no-repeat;
  background-size: contain;
  margin-left: 5px;
  vertical-align: middle;
}

/* 主内容区域 */
.main-content {
  margin-left: 220px;
  min-height: 100vh;
  background: #f5f5f5;
}

/* 游戏信息头部 */
.game-header {
  background: white;
  padding: 20px;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.game-logo {
  height: 60px;
}

.countdown-container {
  text-align: center;
  flex: 1;
  margin: 0 40px;
}

.current-issue {
  font-size: 16px;
  color: #666;
  margin-bottom: 10px;
}

.countdown-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  font-size: 24px;
  font-weight: bold;
  color: #e74c3c;
}

.countdown-digit {
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  min-width: 40px;
  text-align: center;
}

.countdown-separator {
  color: #333;
  font-size: 20px;
}

.last-results {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.last-issue {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.result-numbers {
  display: flex;
  gap: 8px;
}

.result-number {
  width: 30px;
  height: 30px;
  background: #007bff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

/* 投注区域样式 */
.betting-container {
  padding: 20px;
}

.betting-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
}

/* 玩法切换标签 */
.game-tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.game-tab {
  padding: 15px 25px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
}

.game-tab:hover {
  background: rgba(0,123,255,0.1);
  color: #007bff;
}

.game-tab.active {
  background: white;
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: bold;
}

/* 投注类型选择 */
.bet-type-section {
  padding: 20px;
}

.bet-type-row {
  display: flex;
  align-items: center;
  margin: 15px 0;
  min-height: 40px;
}

.bet-type-label {
  width: 80px;
  font-weight: bold;
  color: #333;
  text-align: right;
  margin-right: 20px;
}

.bet-type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.bet-type-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  white-space: nowrap;
}

.bet-type-button:hover {
  background: #f0f0f0;
  border-color: #007bff;
}

.bet-type-button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.bet-type-button.disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 数字选择区域 */
.number-selection-container {
  padding: 0 20px 20px;
}

.number-position {
  margin: 20px 0;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.position-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.position-name {
  font-weight: bold;
  color: #495057;
  font-size: 15px;
}

.quick-buttons {
  display: flex;
  gap: 6px;
}

.quick-button {
  padding: 4px 10px;
  border: 1px solid #ced4da;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #495057;
  transition: all 0.2s;
}

.quick-button:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  background: #e9ecef;
  padding: 1px;
}

.number-cell {
  position: relative;
  height: 50px;
  background: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  user-select: none;
}

.number-cell:hover {
  background: #e3f2fd;
}

.number-cell.selected {
  background: #2196f3;
  color: white;
}

.number-cell.hot {
  background: #ffebee;
}

.number-cell.cold {
  background: #e8f5e8;
}

.number-value {
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
}

.miss-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 9px;
  color: #666;
  line-height: 1;
}

.hot-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 9px;
  color: #f44336;
  line-height: 1;
}

/* 投注信息面板 */
.bet-info-panel {
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  padding: 20px;
}

.bet-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.bet-summary-text {
  font-size: 16px;
  color: #495057;
}

.bet-summary-text .highlight {
  color: #dc3545;
  font-weight: bold;
}

.bet-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  color: #495057;
  white-space: nowrap;
}

.control-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.control-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s;
}

.confirm-button {
  background: #28a745;
  color: white;
}

.confirm-button:hover {
  background: #218838;
}

.confirm-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.clear-button {
  background: #6c757d;
  color: white;
}

.clear-button:hover {
  background: #545b62;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .left-sidebar {
    width: 200px;
  }
  
  .main-content {
    margin-left: 200px;
  }
}

@media (max-width: 992px) {
  .left-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  
  .left-sidebar.open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .game-header {
    flex-direction: column;
    gap: 20px;
  }
  
  .countdown-container {
    margin: 0;
  }
}

@media (max-width: 768px) {
  .game-tabs {
    flex-wrap: wrap;
  }
  
  .game-tab {
    flex: 1;
    min-width: 80px;
    padding: 12px 15px;
    font-size: 13px;
  }
  
  .bet-type-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .bet-type-label {
    width: auto;
    text-align: left;
    margin-right: 0;
  }
  
  .number-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  
  .bet-controls {
    flex-direction: column;
    gap: 15px;
  }
}
```

## 🚀 部署与运行

### 1. 安装依赖

```bash
cd QIANDUAN
npm install
```

### 2. 开发运行

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产版本

```bash
npm run preview
```

## 📈 性能优化

### 1. 组件懒加载

```typescript
// router/index.ts
const routes = [
  {
    path: '/ssc/chongqing',
    name: 'ChongqingSSC',
    component: () => import('@/views/ssc/ChongqingSSC.vue')
  }
]
```

### 2. 计算缓存

```typescript
// 在 composables 中使用 computed 缓存计算结果
const totalBets = computed(() => {
  return calculateBetCount(selectedNumbers.value, activeBetType.value)
})
```

### 3. 虚拟滚动

对于大量数据的列表，使用虚拟滚动优化性能。

## 🔒 安全考虑

### 1. 输入验证

```typescript
// 投注金额验证
const validateBetAmount = (amount: number): boolean => {
  return amount >= 2 && amount <= 50000
}

// 投注倍数验证
const validateMultiplier = (multiplier: number): boolean => {
  return multiplier >= 1 && multiplier <= 999
}
```

### 2. API调用安全

```typescript
// 添加请求拦截器
axios.interceptors.request.use(config => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  config.headers['Content-Type'] = 'application/json'
  return config
})
```

## 📊 测试策略

### 1. 单元测试

```typescript
// tests/composables/useSSCCalculation.test.ts
import { describe, it, expect } from 'vitest'
import { useSSCCalculation } from '@/composables/useSSCCalculation'

describe('useSSCCalculation', () => {
  it('should calculate direct compound count correctly', () => {
    const { calculateBetCount } = useSSCCalculation()
    const selectedNumbers = {
      'ten-thousands': [1, 2],
      'thousands': [3, 4],
      'hundreds': [5],
      'tens': [6, 7, 8],
      'units': [9, 0]
    }
    
    expect(calculateBetCount(selectedNumbers, 'five-direct-compound')).toBe(24)
  })
})
```

### 2. 组件测试

```typescript
// tests/components/SSCNumberGrid.test.ts
import { mount } from '@vue/test-utils'
import SSCNumberGrid from '@/components/ssc/SSCNumberGrid.vue'

describe('SSCNumberGrid', () => {
  it('should emit number selection when clicked', async () => {
    const wrapper = mount(SSCNumberGrid, {
      props: {
        position: { id: 'test', name: '测试位', numbers: [0, 1, 2, 3, 4] },
        selectedNumbers: []
      }
    })
    
    await wrapper.find('.number-cell').trigger('click')
    expect(wrapper.emitted('number-select')).toBeTruthy()
  })
})
```

## 📋 开发清单

### Phase 1: 基础架构 ✅
- [x] 项目结构搭建
- [x] 类型定义完成
- [x] 基础组件框架

### Phase 2: 核心功能 🚧
- [ ] 投注逻辑实现
- [ ] 计算引擎完成
- [ ] 数据管理系统

### Phase 3: UI实现 📋
- [ ] 布局组件完成
- [ ] 投注区域组件
- [ ] 数字选择组件
- [ ] 样式完全迁移

### Phase 4: 集成测试 📋
- [ ] 功能测试完成
- [ ] 性能测试通过
- [ ] 兼容性验证

### Phase 5: 部署上线 📋
- [ ] 生产环境配置
- [ ] 监控系统接入
- [ ] 用户培训文档

## 📞 技术支持

如有任何问题，请联系开发团队：
- 技术负责人：[姓名]
- 邮箱：[邮箱地址]
- 项目地址：[Git仓库地址]

---

**注意**: 本文档将随着项目进展持续更新，请关注最新版本。 
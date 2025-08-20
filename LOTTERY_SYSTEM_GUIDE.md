# 彩票管理系统使用指南

## 📋 系统概述

本彩票管理系统是一个完整的彩票开奖和管理解决方案，支持多种彩票类型，包括分分时时彩、五分时时彩、快3、PK10、11选5等。系统提供了完整的管理端和用户端API接口。

### 🎯 核心功能

- **多彩种支持**: 支持分分时时彩、快3、PK10、11选5等多种彩票
- **自动开奖**: 基于定时任务的自动开奖系统
- **手动开奖**: 管理员可手动触发开奖
- **历史管理**: 自动清理历史数据，保持系统性能
- **数据分析**: 提供投注分析和统计数据
- **API接口**: 完整的管理端和用户端API

### 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   管理端界面    │    │   用户端界面    │    │   API接口       │
│  (Vue Admin)    │    │  (User App)     │    │  (REST API)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              Express.js 后端服务                │
         │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
         │  │ 彩票管理服务 │  │ 开奖服务    │  │ 定时任务 │ │
         │  └─────────────┘  └─────────────┘  └──────────┘ │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              PostgreSQL 数据库                  │
         │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
         │  │ 彩种管理    │  │ 开奖记录    │  │ 系统配置 │ │
         │  └─────────────┘  └─────────────┘  └──────────┘ │
         └─────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- TypeScript >= 4.0

### 2. 安装依赖

```bash
cd admin-api
npm install
```

### 3. 数据库初始化

```bash
# 连接到PostgreSQL数据库
psql -U your_username -d your_database

# 执行初始化脚本
\i scripts/init-lottery-system.sql
```

### 4. 启动系统

```bash
# 方式1: 使用启动脚本
npm run start:lottery

# 方式2: 手动启动
npm run dev
# 然后调用API: POST /api/admin/lottery/init
```

### 5. 验证安装

访问 `http://localhost:3001/api` 查看API文档，确认彩票相关接口已加载。

## 📊 数据库结构

### 核心表结构

#### 1. 彩种表 (lottery_types)
```sql
- id: 彩种ID
- name: 彩种名称 (如: 分分时时彩)
- code: 彩种代码 (如: ssc)
- category: 彩种类别 (ssc, k3, pk10, 11x5)
- draw_frequency: 开奖频率 (minutes, hourly, daily)
- draw_interval: 开奖间隔(分钟)
- issue_format: 期号格式 (YYYYMMDD{####})
- number_count: 开奖号码位数
- number_range_min/max: 号码范围
```

#### 2. 奖期表 (lottery_issues)
```sql
- id: 奖期ID
- lottery_type_id: 彩种ID
- issue_no: 期号
- issue_date: 期号日期
- start_time: 开始时间
- end_time: 截止时间
- draw_time: 开奖时间
- status: 状态 (pending, closed, drawn, canceled)
```

#### 3. 开奖结果表 (lottery_draws)
```sql
- id: 开奖ID
- lottery_type_id: 彩种ID
- issue_id: 奖期ID
- issue_no: 期号
- draw_numbers: 开奖号码
- wan_wei, qian_wei, bai_wei, shi_wei, ge_wei: 各位数字
- sum_value: 和值
- sum_big_small: 和值大小
- sum_odd_even: 和值单双
- draw_method: 开奖方式 (auto, manual, api)
- draw_status: 开奖状态 (pending, drawn, error)
```

## 🔧 API 接口

### 管理端接口

#### 彩种管理
```http
GET    /api/admin/lottery/types          # 获取彩种列表
POST   /api/admin/lottery/types          # 创建彩种
PUT    /api/admin/lottery/types/:id      # 更新彩种
DELETE /api/admin/lottery/types/:id      # 删除彩种
```

#### 开奖管理
```http
POST   /api/admin/lottery/draw/manual    # 手动开奖
GET    /api/admin/lottery/draw/history   # 获取开奖历史
POST   /api/admin/lottery/cleanup/history # 清理历史记录
```

#### 分分时时彩专用
```http
POST   /api/admin/ssc/start              # 启动系统
POST   /api/admin/ssc/stop               # 停止系统
GET    /api/admin/ssc/status             # 获取系统状态
GET    /api/admin/ssc/realtime-status    # 获取实时状态
POST   /api/admin/ssc/manual-draw        # 手动开奖
GET    /api/admin/ssc/today-stats        # 今日统计
```

### 用户端接口

#### 基础接口
```http
GET    /api/lottery/types                # 获取彩种列表
GET    /api/lottery/:code/game-data      # 获取游戏数据
GET    /api/lottery/:code/current-issue  # 获取当前期号
GET    /api/lottery/:code/latest         # 获取最新开奖
GET    /api/lottery/:code/history        # 获取开奖历史
GET    /api/lottery/:code/analysis       # 获取投注分析
```

## 🎲 分分时时彩详细说明

### 游戏规则

分分时时彩是基于您提供的文档实现的完整彩票系统：

#### 基本信息
- **开奖频率**: 每分钟一期，全天24小时不间断
- **号码格式**: 5位数字，每位0-9
- **期号格式**: YYYYMMDD#### (如: 202501210001)

#### 玩法类型

1. **数字盘玩法**
   - 万位、千位、百位、十位、个位任选
   - 赔率: 9.8倍

2. **双面玩法**
   - 大小: 5-9为大，0-4为小
   - 单双: 1,3,5,7,9为单，0,2,4,6,8为双
   - 质合: 1,2,3,5,7为质，0,4,6,8,9为合
   - 总和大小: 23-45为大，0-22为小
   - 赔率: 1.98倍

3. **龙虎玩法**
   - 10种位置组合比较大小
   - 龙/虎赔率: 1.98倍，和赔率: 9倍

4. **跨度玩法**
   - 前三、中三、后三跨度
   - 赔率: 跨度0为71倍，其他根据概率调整

5. **牛牛玩法**
   - 牛牛类型: 无牛到牛牛
   - 牛双面: 牛大小、牛单双等
   - 牛梭哈: 五条、炸弹、葫芦等

### 系统特性

#### 自动开奖
- 每分钟整点自动开奖
- 使用crypto模块生成安全随机数
- 自动计算和值、大小、单双等属性

#### 历史管理
- 默认保留最新50期记录
- 自动备份到归档表
- 每日凌晨自动清理

#### 数据分析
- 各位数字分布统计
- 龙虎走势分析
- 跨度分布统计
- 和值趋势分析

## 🛠️ 配置说明

### 系统配置 (lottery_config表)

```sql
-- 历史记录保留期数
history_retention_count: 50

-- 自动清理开关
auto_cleanup_enabled: true

-- 清理时间设置
cleanup_time_hour: 0
cleanup_time_minute: 5

-- 随机数生成配置
random_seed_sources: ["crypto", "os", "hardware"]

-- 开奖验证开关
draw_validation_enabled: true

-- 最大开奖尝试次数
max_draw_attempts: 100
```

### 定时任务配置

系统包含以下定时任务：

1. **自动开奖**: 每分钟执行 (`* * * * *`)
2. **生成期号**: 每日00:05执行 (`5 0 * * *`)
3. **清理历史**: 每日00:10执行 (`10 0 * * *`)
4. **健康检查**: 每小时执行 (`0 * * * *`)

## 📈 监控和维护

### 系统监控

#### 健康检查
```bash
# 检查系统状态
curl http://localhost:3001/api/admin/ssc/status

# 检查数据完整性
SELECT check_lottery_data_integrity();

# 获取统计信息
SELECT get_lottery_statistics('ssc');
```

#### 性能监控
- 监控开奖耗时
- 监控数据库连接
- 监控定时任务执行状态
- 监控历史数据增长

### 维护操作

#### 手动清理历史数据
```sql
SELECT cleanup_lottery_history_records(50, true);
```

#### 重新生成期号
```bash
curl -X POST http://localhost:3001/api/admin/ssc/regenerate-issues
```

#### 手动开奖
```bash
curl -X POST http://localhost:3001/api/admin/ssc/manual-draw \
  -H "Content-Type: application/json" \
  -d '{"issueId": 123, "numbers": [1,2,3,4,5]}'
```

## 🔒 安全考虑

### 随机数安全
- 使用Node.js crypto模块生成安全随机数
- 支持多重随机源验证
- 实施随机性检测算法

### 数据安全
- 所有开奖记录不可篡改
- 完整的操作日志记录
- 数据备份和恢复机制

### 访问控制
- JWT认证保护管理接口
- 用户端接口无需认证
- 操作权限分级管理

## 🚨 故障排除

### 常见问题

1. **系统无法启动**
   - 检查数据库连接
   - 确认表结构完整
   - 查看错误日志

2. **开奖失败**
   - 检查期号是否存在
   - 确认开奖时间是否到达
   - 查看定时任务状态

3. **数据不一致**
   - 运行数据完整性检查
   - 清理孤立记录
   - 重新生成缺失数据

### 日志查看
```sql
-- 查看开奖日志
SELECT * FROM lottery_logs 
WHERE operation = 'auto_draw' 
ORDER BY created_at DESC LIMIT 10;

-- 查看定时任务日志
SELECT * FROM lottery_scheduler_logs 
ORDER BY start_time DESC LIMIT 10;
```

## 📞 技术支持

如需技术支持，请提供以下信息：
- 系统版本和环境信息
- 错误日志和堆栈跟踪
- 重现问题的步骤
- 数据库状态和配置

---

**版本**: v1.0  
**更新时间**: 2025-01-21  
**作者**: 系统开发团队

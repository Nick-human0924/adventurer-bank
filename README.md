# 儿童行为激励银行系统

基于 Vue 3 + Vite + Supabase + ECharts 的行为激励管理平台。

## 🎯 功能特性

- 📊 **实时仪表盘** - ECharts 数据可视化，积分趋势分析
- 📝 **规则管理** - 奖励/惩罚规则 CRUD 管理
- 🔗 **Supabase 集成** - 实时数据库连接
- ⚡ **快速操作** - 积分奖励/扣除快捷操作
- 📱 **响应式设计** - 适配各种屏幕尺寸

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Supabase** - 开源 Firebase 替代方案
- **ECharts** - 强大的数据可视化库
- **Vue Router** - 官方路由管理器

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Supabase

在 `src/utils/supabase.js` 中配置你的 Supabase 凭证：

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_KEY = 'your-anon-key'
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
kids-behavior-bank/
├── src/
│   ├── components/     # 可复用组件
│   ├── views/          # 页面视图
│   │   ├── Dashboard.vue   # 仪表盘
│   │   ├── Rules.vue       # 规则管理
│   │   └── Config.vue      # 系统配置
│   ├── router/         # 路由配置
│   ├── utils/          # 工具函数
│   │   └── supabase.js     # Supabase 配置
│   ├── App.vue         # 根组件
│   └── main.js         # 入口文件
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🗄️ 数据库表结构

### children (孩子表)
- `id`: uuid
- `name`: string
- `avatar`: string
- `total_points`: number
- `current_balance`: number
- `created_at`: timestamp

### rules (规则表)
- `id`: uuid
- `name`: string
- `description`: text
- `points`: number
- `type`: good | bad
- `icon`: string
- `is_active`: boolean
- `created_at`: timestamp

### transactions (交易表)
- `id`: uuid
- `child_id`: uuid (外键)
- `rule_id`: uuid (外键)
- `points`: number
- `type`: earn | spend
- `note`: text
- `created_at`: timestamp

## 📄 许可证

MIT
# Trigger redeploy 1774328869

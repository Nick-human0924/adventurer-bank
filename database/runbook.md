# 数据库资产管理手册

> 申总的行为银行数据库管理规范。所有 Supabase 相关操作由我统一处理。

---

## 目录结构

```
database/
├── schema/
│   └── current.sql          ← 当前完整库结构（汇总状态）
├── migrations/
│   ├── 001_init_core.sql
│   ├── 002_add_category.sql
│   ├── 003_smart_tasks.sql
│   ├── 004_multi_family.sql
│   ├── 005_mall_tables.sql
│   ├── 006_badges_system.sql
│   └── 007_task_progress_fix.sql
├── seeds/
│   └── badges.sql
├── fixes/
│   └── (临时修复脚本，执行后立即归档)
├── archive/
│   └── (已废弃/已执行的历史脚本)
└── runbook.md               ← 本文件
```

---

## 迁移执行记录

| 序号 | 文件名 | 状态 | 说明 |
|------|--------|------|------|
| 001 | `001_init_core.sql` | ✅ 已执行 | 核心表：children/rules/transactions/tasks |
| 002 | `002_add_category.sql` | ✅ 已执行 | rules 表的 category/icon_emoji 字段 |
| 003 | `003_smart_tasks.sql` | ✅ 已执行 | 智能任务系统，含核心函数 |
| 004 | `004_multi_family.sql` | ✅ 已执行 | 多家庭隔离 + RLS + user_id 触发器 |
| 005 | `005_mall_tables.sql` | ✅ 已执行 | prizes + orders + gem_transactions |
| 006 | `006_badges_system.sql` | ✅ 已执行 | badges + child_badges 表结构 |
| 007 | `007_task_progress_fix.sql` | ✅ 已执行 | last_check_date → last_completed_date |
| — | `seeds/badges.sql` | ✅ 已执行 | 39 个徽章种子数据 |

---

## 操作规范

### 1. 新增迁移

- **命名格式**：`008_xxx.sql`、`009_xxx.sql`（三位递增）
- **内容要求**：
  - 全部使用 `IF NOT EXISTS` / `IF EXISTS`
  - 表结构变更前要有 `DO $$` 安全检查
  - 必须有回滚逻辑或幂等设计
- **禁止**：在根目录扔 `fix_xxx.sql`

### 2. 执行迁移

```bash
# 方式一：单条执行
/tmp/supabase db query --file database/migrations/008_xxx.sql

# 方式二：直接进 SQL Editor 粘贴执行（适合复杂脚本）
```

### 3. 部署 Edge Function

```bash
cd /root/.openclaw/workspace/kids-behavior-bank
/tmp/supabase functions deploy record-behavior
```

### 4. 查看表结构

```bash
/tmp/supabase db dump --table transactions --data-only
```

---

## 历史问题归档

- `fix_and_setup.sql` → 归档（`archive/`）
- `fix_delete_policy.sql` / `fix_delete_only.sql` / `fix_delete_policy_v2.sql` → 归档（同义重复）
- `fix_mall_tables.sql` → 归档（已合并入 `005_mall_tables.sql`）
- `fix_task_progress_schema.sql` → 归档（已合并入 `007_task_progress_fix.sql`）
- `init_database.sql` → 归档（已合并入 `001_init_core.sql`）
- `migration_add_category.sql` → 归档（已合并入 `002_add_category.sql`）
- `migrations/add_category_icons.sql` → 归档（已合并入 `002_add_category.sql`）
- `migration_v2_smart_tasks.sql` → 归档（已合并入 `003_smart_tasks.sql`）
- `migration_v3_complete.sql` / `migration_v3_multi_family_auth.sql` → 归档（已合并入 `004_multi_family.sql`）
- `optimize-db.sql` → 归档（索引已并入各 migration）
- `scripts/create-tables-simple.sql` → 归档
- `scripts/init-badges.sql` / `scripts/init-badges-full.sql` → 归档（重复，已合并入 `006_badges_system.sql` + `seeds/badges.sql`）
- `scripts/insert-badges-data.sql` → 归档（已合并入 `seeds/badges.sql`）

---

## 记住的凭证

- **Supabase PAT**：已保存到 `/root/.openclaw/workspace/.credentials/supabase-pat.txt`
- **Project ref**：`agkemugaxrhrsnbyiluw`（20 位，注意不是错的 19 位版本）
- **CLI 路径**：`/tmp/supabase`（v2.84.2）

---

*整理日期：2026-04-11*

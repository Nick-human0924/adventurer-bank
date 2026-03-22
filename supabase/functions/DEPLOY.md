# Supabase Edge Function 部署指南

## 功能
接收飞书消息，自动记录儿童行为并返回积分变动

## 部署步骤

### 步骤1：打开Supabase Dashboard
访问: https://supabase.com/dashboard/project/agkemugaxhrsnbyiluw/functions

### 步骤2：创建新Function
1. 点击 **"Create a new function"**
2. 名称填写: `record-behavior`
3. 点击 **Create**

### 步骤3：粘贴代码
将 `index.ts` 文件中的代码完整粘贴到编辑器中

### 步骤4：设置环境变量
在 Function 设置中添加:
- `SUPABASE_URL`: `https://agkemugaxhrsnbyiluw.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk`

### 步骤5：部署
点击 **Deploy**

### 步骤6：获取调用URL
部署成功后，复制Function URL:
```
https://agkemugaxhrsnbyiluw.supabase.co/functions/v1/record-behavior
```

## 测试方法

```bash
curl -X POST https://agkemugaxhrsnbyiluw.supabase.co/functions/v1/record-behavior \
  -H "Content-Type: application/json" \
  -d '{
    "message": "安哲今天整理房间了",
    "accountId": "ou_bec0f1afbf17f502b7292517eafcb69a"
  }'
```

## 功能说明

支持的自然语言:
- "安哲今天按时起床了"
- "andrew 完成作业"
- "申安哲整理了房间"

返回格式:
```json
{
  "success": true,
  "message": "✅ 已记录！\n\n👶 申安哲\n📝 整理房间\n💎 +5分\n💰 当前积分：25分",
  "data": {
    "childName": "申安哲",
    "ruleName": "整理房间",
    "points": 5,
    "currentBalance": 25
  }
}
```

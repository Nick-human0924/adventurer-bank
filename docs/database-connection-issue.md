# 数据库连接超时问题排查

## 问题
腾讯云服务器无法连接 Supabase，显示 "数据库连接超时"

## 原因
腾讯云服务器可能存在网络限制，无法直接访问 Supabase（海外服务）

## 解决方案

### 方案1：检查腾讯云安全组设置
1. 登录腾讯云控制台
2. 进入安全组设置
3. 确保出站规则允许访问 443 端口（HTTPS）

### 方案2：使用 Supabase 中国加速
在 `.env` 文件中添加：
```
VITE_SUPABASE_URL=https://agkemugaxrhrsnbyiluw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 方案3：使用代理/VPN
如果腾讯云服务器有网络限制，可能需要配置代理

### 方案4：切换到国内数据库
考虑将数据迁移到国内云服务（如阿里云 RDS）

## 临时测试
在腾讯云服务器上执行：
```bash
curl -I https://agkemugaxrhrsnbyiluw.supabase.co/rest/v1/
```

如果返回 401 表示网络正常，如果是 timeout 则表示网络限制

## 当前状态
- Supabase 服务：✅ 正常
- 本地连接测试：✅ 正常（返回 401）
- 问题定位：腾讯云服务器网络限制

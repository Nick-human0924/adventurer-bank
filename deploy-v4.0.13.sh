#!/bin/bash
set -e

echo "🚀 开始部署 v4.0.13..."

# 1. 构建
echo "📦 构建项目..."
npm run build

# 2. 添加缓存破坏标记
BUILD_TIME=$(date +%Y%m%d_%H%M%S)
echo "<!-- Build: v4.0.13 Time: $BUILD_TIME -->" >> dist/index.html
echo "<meta http-equiv='Cache-Control' content='no-cache, no-store, must-revalidate'>" >> dist/index.html

# 3. 提交
echo "💾 提交更改..."
git add -A
git commit -m "v4.0.13: 修复task_progress记录不创建bug" || echo "无更改需要提交"

# 4. 推送
echo "📤 推送到 GitHub..."
git push origin main

echo "✅ 完成！请部署到腾讯云服务器。"

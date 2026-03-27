#!/bin/bash
set -e

echo "🚀 开始部署 v4.0.11..."

# 1. 构建
echo "📦 构建项目..."
npm run build

# 2. 添加缓存破坏标记
BUILD_TIME=$(date +%Y%m%d_%H%M%S)
echo "<!-- Build: v4.0.11 Time: $BUILD_TIME -->" >> dist/index.html
echo "<meta http-equiv='Cache-Control' content='no-cache, no-store, must-revalidate'>" >> dist/index.html

# 3. 提交
echo "💾 提交更改..."
git add -A
git commit -m "v4.0.11: 修复时区bug + 版本号同步" || echo "无更改需要提交"

# 4. 推送
echo "📤 推送到 GitHub..."
git push origin main

# 5. 验证远程版本
echo "🔍 验证远程版本..."
sleep 5
REMOTE_VERSION=$(curl -s https://nick-human0924.github.io/adventurer-bank/index.html | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "远程版本: $REMOTE_VERSION"

if [ "$REMOTE_VERSION" = "v4.0.11" ]; then
    echo "✅ 部署成功！版本已同步 v4.0.11"
else
    echo "⚠️ 缓存可能未生效，远程版本: $REMOTE_VERSION"
    echo "请稍后刷新或访问: https://nick-human0924.github.io/adventurer-bank/?nocache=1"
fi

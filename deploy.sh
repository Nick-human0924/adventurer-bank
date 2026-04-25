#!/bin/bash
# ============================================
# deploy.sh - 行为银行标准化部署脚本
# ============================================

set -e

echo "🚀 开始部署行为银行..."

# 读取版本号
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
echo "📦 版本: v${VERSION}"

# 1. 构建
echo "🔨 构建中..."
npm run build

# 2. 添加版本标记
echo "🏷️  添加版本标记..."
echo "<!-- Build: v${VERSION} Time: $(date +%Y%m%d%H%M%S) -->" >> dist/index.html

# 3. 提交代码
echo "💾 提交代码..."
git add -A
git commit -m "v${VERSION}: $(date '+%Y-%m-%d %H:%M') 部署" || true

# 4. 推送
echo "📤 推送到 GitHub..."
git push origin main

echo "✅ 部署完成！"
echo ""
echo "⚠️  CDN缓存可能需要1-2分钟生效"
echo "🔄 强制刷新: Ctrl+F5 或访问 https://nick-human0924.github.io/adventurer-bank/?nocache=1"
echo ""

# 5. 验证远程版本
echo "🔍 验证远程版本..."
sleep 3
REMOTE_VERSION=$(curl -s https://nick-human0924.github.io/adventurer-bank/index.html | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
echo "🌐 远程版本: ${REMOTE_VERSION}"

if [ "${VERSION}" = "${REMOTE_VERSION}" ]; then
    echo "✅ 版本验证通过"
else
    echo "⚠️  版本不一致 (本地:${VERSION} vs 远程:${REMOTE_VERSION})"
    echo "   等待CDN缓存刷新后重试验证..."
    sleep 10
    REMOTE_VERSION=$(curl -s https://nick-human0924.github.io/adventurer-bank/index.html | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
    echo "🌐 再次验证远程版本: ${REMOTE_VERSION}"
fi

echo ""
echo "🎉 部署完成！访问: https://nick-human0924.github.io/adventurer-bank/"

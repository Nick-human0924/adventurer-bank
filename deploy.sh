#!/bin/bash
# kids-behavior-bank 标准化部署脚本
# 应用 github-deploy-cache-handler 最佳实践

set -e

# 配置
PROJECT_DIR="/root/.openclaw/workspace/kids-behavior-bank"
SITE_URL="https://nick-human0924.github.io/adventurer-bank"
# 从环境变量或文件读取token（避免硬编码）
GITHUB_TOKEN=${GITHUB_TOKEN:-$(cat ~/.github-token 2>/dev/null || echo '')}
GIT_REMOTE="https://${GITHUB_TOKEN}@github.com/Nick-human0924/adventurer-bank.git"

cd "$PROJECT_DIR"

# 1. 获取版本号
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
echo "🚀 开始部署 kids-behavior-bank v$VERSION"

# 2. 构建
echo "📦 执行构建..."
npm run build 2>&1

# 3. 更新版本标记到 dist/index.html
echo "🏷️  更新版本标记..."
sed -i "s/Build: v[0-9]\+\.[0-9]\+\.[0-9]\+/Build: v$VERSION/" dist/index.html
sed -i "s/Time: [0-9]\{8\}/Time: $(date +%Y%m%d)/" dist/index.html

# 4. 部署到 gh-pages
echo "📤 推送到 GitHub Pages..."
cd dist
git init 2>/dev/null || true
git remote add origin "$GIT_REMOTE" 2>/dev/null || git remote set-url origin "$GIT_REMOTE"
git checkout -b gh-pages 2>/dev/null || git checkout gh-pages
git add .
git commit -m "Deploy v$VERSION - $(date '+%Y-%m-%d %H:%M')" || echo "无变更需要提交"
git push origin gh-pages --force 2>&1

# 5. 等待CDN刷新
echo "⏳ 等待CDN刷新 (15秒)..."
sleep 15

# 6. 验证远程版本
echo "🔍 验证远程版本..."
REMOTE_VERSION=$(curl -s "$SITE_URL/index.html" | grep -oE 'Build: v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | sed 's/Build: //')

echo ""
echo "═══════════════════════════════════════"
if [ "$REMOTE_VERSION" = "v$VERSION" ]; then
  echo "✅ 部署验证成功!"
  echo "   本地版本: v$VERSION"
  echo "   远程版本: $REMOTE_VERSION"
  echo "═══════════════════════════════════════"
  echo ""
  echo "📋 部署完成提示:"
  echo "   • CDN缓存可能需要 1-2 分钟完全生效"
  echo "   • 如看到旧版本，请 Ctrl+F5 强制刷新"
  echo "   • 验证地址: $SITE_URL"
else
  echo "⚠️  版本不一致!"
  echo "   本地版本: v$VERSION"
  echo "   远程版本: ${REMOTE_VERSION:-'获取失败'}"
  echo "═══════════════════════════════════════"
  echo ""
  echo "🔧 建议操作:"
  echo "   1. 等待60秒后再次验证"
  echo "   2. 访问: ${SITE_URL}/?nocache=$(date +%s)"
  echo "   3. 检查 GitHub Pages 构建状态"
fi

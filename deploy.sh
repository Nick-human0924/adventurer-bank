#!/bin/bash
# kids-behavior-bank 标准化部署脚本（EdgeOne Pages / main 分支）

set -e

# 配置
PROJECT_DIR="/root/.openclaw/workspace/kids-behavior-bank"
SITE_URL="https://behavioral-bank.neurocloud.com.cn"
# 从环境变量或文件读取token（避免硬编码）
GITHUB_TOKEN=${GITHUB_TOKEN:-$(cat ~/.github-token 2>/dev/null || echo '')}
GIT_REMOTE="https://${GITHUB_TOKEN}@github.com/Nick-human0924/adventurer-bank.git"
DEPLOY_BRANCH="main"

cd "$PROJECT_DIR"

# 0. 确保在 main 分支上
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "$DEPLOY_BRANCH" ]; then
  echo "⚠️  当前分支为 $current_branch，切换到 $DEPLOY_BRANCH..."
  git checkout "$DEPLOY_BRANCH"
fi

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
sed -i "s/Build: v[0-9]\+\.[0-9]\+\.[0-9]\+/Build: v$VERSION/" index.html
sed -i "s/Time: [0-9]\{8\}/Time: $(date +%Y%m%d)/" index.html

# 4. 提交并推送到 main 分支
echo "📤 推送到 $DEPLOY_BRANCH 分支..."
git remote set-url origin "$GIT_REMOTE" 2>/dev/null || git remote add origin "$GIT_REMOTE"
git add dist/ index.html src/ vite.config.js package.json
git commit -m "Deploy v$VERSION - $(date '+%Y-%m-%d %H:%M')" || echo "无变更需要提交"
git push origin "$DEPLOY_BRANCH" 2>&1

# 5. 等待 EdgeOne 构建并刷新
echo "⏳ 等待 EdgeOne 构建 (25秒)..."
sleep 25

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
  echo "   • EdgeOne 国内节点已生效"
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
  echo "   3. 检查 EdgeOne Pages 控制台构建状态"
fi

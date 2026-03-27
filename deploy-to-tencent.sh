#!/bin/bash
# 部署脚本 - 需要填写服务器信息后执行

# 服务器配置（请填写）
SERVER_IP=""           # 例如: 123.456.789.0
SERVER_USER=""         # 例如: root 或 ubuntu
SERVER_PATH=""         # 例如: /var/www/behavioral-bank
SSH_KEY="~/.ssh/id_rsa" # SSH密钥路径

# 本地构建目录
LOCAL_DIST="/root/.openclaw/workspace/kids-behavior-bank/dist"

if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_PATH" ]; then
    echo "❌ 请编辑脚本填写服务器信息"
    exit 1
fi

echo "🚀 开始部署到腾讯云服务器..."
echo "   服务器: $SERVER_USER@$SERVER_IP"
echo "   路径: $SERVER_PATH"
echo ""

# 1. 确保本地已构建
echo "📦 检查本地构建..."
if [ ! -d "$LOCAL_DIST" ]; then
    echo "❌ 本地 dist 文件夹不存在，请先执行 npm run build"
    exit 1
fi

# 2. 创建远程备份
echo "💾 创建远程备份..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "
    if [ -d '$SERVER_PATH' ]; then
        mv $SERVER_PATH $SERVER_PATH.backup.$(date +%Y%m%d_%H%M%S)
        mkdir -p $SERVER_PATH
    else
        mkdir -p $SERVER_PATH
    fi
"

# 3. 上传文件
echo "📤 上传文件到服务器..."
rsync -avz --delete -e "ssh -i $SSH_KEY" $LOCAL_DIST/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# 4. 验证部署
echo "🔍 验证部署..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "
    echo '✅ 文件已上传到:'
    ls -la $SERVER_PATH/
    echo ''
    echo '✅ 版本信息:'
    grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' $SERVER_PATH/index.html | head -1
"

echo ""
echo "🎉 部署完成！"
echo "   访问: https://behavioral-bank.neurocloud.com.cn"

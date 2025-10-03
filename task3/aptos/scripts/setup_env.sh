#!/bin/bash
# =============================================================================
# Code3 环境变量自动设置脚本
# =============================================================================
#
# 功能：
# 1. 部署合约后自动设置环境变量
# 2. 生成 aptos-mcp/.env 文件
# 3. 生成 .env.integration-test 文件（用于 M2-04 集成测试）
#
# 用法：
#   ./scripts/setup_env.sh testnet
#   ./scripts/setup_env.sh mainnet
#
# =============================================================================

set -e  # 遇到错误立即退出

# -----------------------------------------------------------------------------
# 1. 检查参数
# -----------------------------------------------------------------------------

if [ $# -eq 0 ]; then
    echo "❌ 错误: 请指定网络类型"
    echo "用法: $0 <network>"
    echo "示例: $0 testnet"
    echo "网络选项: testnet | mainnet | devnet"
    exit 1
fi

NETWORK=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
APTOS_PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CODE3_DIR="$PROJECT_ROOT/Code3"

echo "======================================================================"
echo "Code3 环境变量自动设置脚本"
echo "======================================================================"
echo "网络: $NETWORK"
echo "项目根目录: $PROJECT_ROOT"
echo ""

# -----------------------------------------------------------------------------
# 2. 验证网络类型
# -----------------------------------------------------------------------------

case $NETWORK in
    testnet|mainnet|devnet)
        echo "✅ 网络类型有效: $NETWORK"
        ;;
    *)
        echo "❌ 错误: 无效的网络类型 '$NETWORK'"
        echo "支持的网络: testnet | mainnet | devnet"
        exit 1
        ;;
esac

# -----------------------------------------------------------------------------
# 3. 读取合约地址
# -----------------------------------------------------------------------------

ENV_FILE="$APTOS_PROJECT_ROOT/.env.$NETWORK"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 错误: 未找到环境文件 $ENV_FILE"
    echo "请先运行部署脚本: ./scripts/deploy_$NETWORK.sh"
    exit 1
fi

echo "📖 读取合约地址..."
source "$ENV_FILE"

# 根据网络类型获取合约地址
case $NETWORK in
    testnet)
        CONTRACT_ADDRESS="${APTOS_CONTRACT_ADDRESS_TESTNET}"
        ;;
    mainnet)
        CONTRACT_ADDRESS="${APTOS_CONTRACT_ADDRESS_MAINNET}"
        ;;
    devnet)
        CONTRACT_ADDRESS="${APTOS_CONTRACT_ADDRESS_DEVNET}"
        ;;
esac

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ 错误: 未找到合约地址"
    echo "请检查 $ENV_FILE 文件"
    exit 1
fi

echo "✅ 合约地址: $CONTRACT_ADDRESS"

# -----------------------------------------------------------------------------
# 4. 获取 Aptos 私钥
# -----------------------------------------------------------------------------

echo ""
echo "🔑 获取 Aptos 私钥..."

# 尝试从 Aptos CLI 配置获取
APTOS_CONFIG_FILE="$HOME/.aptos/config.yaml"

if [ -f "$APTOS_CONFIG_FILE" ]; then
    echo "📖 从 Aptos CLI 配置读取私钥..."
    PRIVATE_KEY=$(grep "private_key:" "$APTOS_CONFIG_FILE" | awk '{print $2}' | tr -d '"' | head -1)

    if [ -z "$PRIVATE_KEY" ]; then
        echo "⚠️  警告: 未在 Aptos CLI 配置中找到私钥"
        PRIVATE_KEY=""
    else
        echo "✅ 成功从 Aptos CLI 获取私钥"
    fi
else
    echo "⚠️  警告: Aptos CLI 配置文件不存在 ($APTOS_CONFIG_FILE)"
    PRIVATE_KEY=""
fi

# 如果未找到私钥，提示用户手动输入
if [ -z "$PRIVATE_KEY" ]; then
    echo ""
    echo "请输入 Aptos 私钥（用于签名交易）："
    echo "提示:"
    echo "  - 从 Petra 钱包导出: Settings → Account → Export Private Key"
    echo "  - 从 Aptos CLI 获取: cat ~/.aptos/config.yaml | grep private_key"
    echo "  - 格式: 0x 开头的 64 位十六进制字符串"
    echo ""
    read -r -p "私钥 (按回车跳过): " PRIVATE_KEY

    if [ -z "$PRIVATE_KEY" ]; then
        echo "⚠️  跳过私钥设置（将以只读模式运行）"
    fi
fi

# -----------------------------------------------------------------------------
# 5. 生成 Code3/.env 文件（统一环境变量）
# -----------------------------------------------------------------------------

echo ""
echo "📝 生成 Code3/.env 文件..."

ENV_FILE="$CODE3_DIR/.env"

if [ ! -d "$CODE3_DIR" ]; then
    echo "❌ 错误: Code3 目录不存在 ($CODE3_DIR)"
    exit 1
fi

# 检查是否已存在 .env 文件
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env 文件已存在，创建备份..."
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 提示用户输入 GitHub Token
echo ""
echo "请输入 GitHub Personal Access Token（用于 GitHub MCP）："
echo "提示:"
echo "  - 获取方式: https://github.com/settings/tokens"
echo "  - 权限要求: repo, workflow, read:org"
echo "  - 格式: github_pat_ 开头"
echo ""
read -r -p "GitHub Token (按回车跳过): " GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    GITHUB_TOKEN="<请填写 GitHub Token>"
    echo "⚠️  跳过 GitHub Token 设置（需手动填写）"
fi

# 生成新的 .env 文件
cat > "$ENV_FILE" <<EOF
# =============================================================================
# Code3 M2-04 集成测试环境变量
# =============================================================================
# 自动生成时间: $(date)
# 网络: $NETWORK
# 生成方式: scripts/setup_env.sh
# =============================================================================

# -----------------------------------------------------------------------------
# GitHub MCP Server 配置
# -----------------------------------------------------------------------------

# GitHub Personal Access Token
GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN

# GitHub 用户名（可选）
# GITHUB_USER=your-github-username

# GitHub 默认仓库（可选）
# GITHUB_DEFAULT_REPO=cyl19970726/Code3

# -----------------------------------------------------------------------------
# Aptos Chain MCP Server 配置
# -----------------------------------------------------------------------------

# Aptos 网络
APTOS_NETWORK=$NETWORK

# Aptos 合约地址
APTOS_CONTRACT_ADDRESS=$CONTRACT_ADDRESS

# Aptos 账户私钥
APTOS_PRIVATE_KEY=$PRIVATE_KEY

# Aptos 节点 URL（可选）
# APTOS_NODE_URL=https://fullnode.$NETWORK.aptoslabs.com/v1

# -----------------------------------------------------------------------------
# 测试配置（可选）
# -----------------------------------------------------------------------------

# 测试仓库（可选）
# TEST_REPO=cyl19970726/Code3-test

# 测试用资产地址
# TEST_ASSET_ADDRESS=0x1::aptos_coin::AptosCoin

# 测试赏金金额（单位: octas）
# TEST_BOUNTY_AMOUNT=1000000

# =============================================================================
EOF

echo "✅ 已生成: $ENV_FILE"

# -----------------------------------------------------------------------------
# 6. 验证生成的文件
# -----------------------------------------------------------------------------

echo ""
echo "======================================================================"
echo "✅ 环境变量设置完成"
echo "======================================================================"
echo ""
echo "📁 生成的文件:"
echo "  Code3/.env"
echo "  位置: $ENV_FILE"
echo "  用途: 统一环境变量（Aptos MCP + GitHub MCP + 集成测试）"
echo ""

# 验证必需字段
echo "🔍 验证必需字段..."
echo ""

MISSING_FIELDS=0

if grep -q "^APTOS_NETWORK=$NETWORK" "$ENV_FILE"; then
    echo "  ✅ APTOS_NETWORK"
else
    echo "  ❌ APTOS_NETWORK"
    MISSING_FIELDS=$((MISSING_FIELDS + 1))
fi

if grep -q "^APTOS_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" "$ENV_FILE"; then
    echo "  ✅ APTOS_CONTRACT_ADDRESS"
else
    echo "  ❌ APTOS_CONTRACT_ADDRESS"
    MISSING_FIELDS=$((MISSING_FIELDS + 1))
fi

if [ -n "$PRIVATE_KEY" ]; then
    echo "  ✅ APTOS_PRIVATE_KEY"
else
    echo "  ⚠️  APTOS_PRIVATE_KEY (未设置，将以只读模式运行)"
fi

if [ "$GITHUB_TOKEN" != "<请填写 GitHub Token>" ]; then
    echo "  ✅ GITHUB_PERSONAL_ACCESS_TOKEN"
else
    echo "  ⚠️  GITHUB_PERSONAL_ACCESS_TOKEN (需手动填写)"
fi

echo ""
echo "======================================================================"

if [ $MISSING_FIELDS -eq 0 ]; then
    echo "✅ 所有必需字段已设置"
else
    echo "⚠️  发现 $MISSING_FIELDS 个缺失字段，请手动编辑 $ENV_FILE"
fi

echo ""
echo "🚀 下一步操作:"
echo "  1. 导出环境变量:"
echo "     export \$(cat $ENV_FILE | xargs)"
echo ""
echo "  2. 在 Claude Code 中使用 MCP 服务器:"
echo "     (MCP 会自动从 Code3/.mcp.json 加载配置)"
echo "     可用工具: aptos-chain-mcp (6 tools) + github-mcp-server"
echo ""
echo "  3. 执行 M2-04 集成测试:"
echo "     请读取 Code3/.env，然后调用 subagent 执行 M2-04 集成测试"
echo ""
echo "======================================================================"

# MCP服务安装和配置指南

## 📦 已安装的MCP服务

### 1. MCP Inspector
```bash
npm install -g @modelcontextprotocol/inspector
```
**状态**: ✅ 已安装  
**用途**: MCP服务可视化测试工具

### 2. Filesystem MCP Server
```bash
npm install -g @modelcontextprotocol/server-filesystem
```
**状态**: ✅ 已安装  
**用途**: 文件系统操作

### 3. GitHub MCP Server
```bash
npm install -g @modelcontextprotocol/server-github
```
**状态**: ✅ 已安装  
**用途**: GitHub集成

### 4. Brave Search MCP Server
```bash
npm install -g @modelcontextprotocol/server-brave-search
```
**状态**: ✅ 已安装  
**用途**: 网络搜索

---

## 🔧 配置步骤

### 步骤1: 获取API密钥

#### GitHub Token
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择权限: `repo`, `read:org`, `write:discussion`
4. 生成并保存token

#### Brave Search API Key
1. 访问 https://brave.com/search/api/
2. 注册账号
3. 获取API密钥（免费额度：2000次/月）

---

### 步骤2: 设置环境变量

**Windows (PowerShell):**
```powershell
# 设置GitHub Token
[System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', 'your-github-token', 'User')

# 设置Brave API Key
[System.Environment]::SetEnvironmentVariable('BRAVE_API_KEY', 'your-brave-api-key', 'User')
```

**Windows (CMD):**
```cmd
setx GITHUB_TOKEN "your-github-token"
setx BRAVE_API_KEY "your-brave-api-key"
```

**Linux/Mac:**
```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export GITHUB_TOKEN="your-github-token"
export BRAVE_API_KEY="your-brave-api-key"

# 使配置生效
source ~/.bashrc  # 或 source ~/.zshrc
```

---

### 步骤3: 配置Claude Desktop

找到Claude Desktop配置文件位置：
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

创建或编辑配置文件：
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\whw\\Desktop\\Spark-Alliance"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-github-token-here"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key-here"
      }
    }
  }
}
```

---

### 步骤4: 测试MCP服务

#### 测试MCP Inspector
```bash
mcp-inspector --version
```

#### 测试Filesystem MCP
```bash
mcp-inspector npx -y @modelcontextprotocol/server-filesystem C:\Users\whw\Desktop\Spark-Alliance
```

#### 测试GitHub MCP
```bash
mcp-inspector npx -y @modelcontextprotocol/server-github
```

#### 测试Brave Search MCP
```bash
mcp-inspector npx -y @modelcontextprotocol/server-brave-search
```

---

## 🚀 未来MCP服务安装

### 阶段二：AI功能开发

#### ArXiv MCP
```bash
npm install -g @modelcontextprotocol/server-arxiv
```

#### Memory MCP
```bash
npm install -g @modelcontextprotocol/server-memory
```

---

### 阶段三：社交功能开发

#### Slack MCP
```bash
npm install -g @modelcontextprotocol/server-slack
```

---

### 阶段四：电商功能开发

#### PostgreSQL MCP
```bash
npm install -g @modelcontextprotocol/server-postgres
```

#### Redis MCP
```bash
npm install -g @modelcontextprotocol/server-redis
```

#### Stripe MCP
```bash
npm install -g @modelcontextprotocol/server-stripe
```

---

### 阶段五：移动端开发

#### Playwright MCP
```bash
npm install -g @executeautomation/playwright-mcp-server
```

#### Firebase MCP
```bash
npm install -g @modelcontextprotocol/server-firebase
```

---

## 📝 验证安装

运行以下命令验证所有MCP服务是否正确安装：

```bash
# 检查已安装的npm包
npm list -g --depth=0 | grep @modelcontextprotocol

# 应该看到：
# ├── @modelcontextprotocol/inspector@x.x.x
# ├── @modelcontextprotocol/server-filesystem@x.x.x
# ├── @modelcontextprotocol/server-github@x.x.x
# └── @modelcontextprotocol/server-brave-search@x.x.x
```

---

## 🔍 故障排查

### 问题1: MCP服务无法启动
**解决方案：**
- 检查Node.js版本（需要 >= 14.0.0）
- 重新安装MCP服务
- 查看错误日志

### 问题2: GitHub Token无效
**解决方案：**
- 确认token权限是否正确
- 检查token是否过期
- 重新生成token

### 问题3: Brave Search API调用失败
**解决方案：**
- 确认API密钥是否正确
- 检查是否超出免费额度
- 查看API响应错误信息

---

## 📚 相关文档

- [MCP-GUIDE.md](./MCP-GUIDE.md) - 完整的MCP服务指南
- [mcp-config.json](./mcp-config.json) - MCP配置文件
- [MCP官方文档](https://modelcontextprotocol.io/)

# 星火校园项目 MCP 服务指南

## 📋 概述

Model Context Protocol (MCP) 是一个开放协议，允许AI助手与外部工具和数据源进行交互。本文档为"星火校园"项目整理了所有需要的MCP服务，并会随着开发深入不断更新。

**最后更新时间**: 2026-03-15

---

## 🎯 项目各阶段MCP需求

### 阶段一：MVP开发（当前阶段）

**核心需求：**
- 文件系统操作（代码管理）
- GitHub集成（版本控制）
- 搜索功能（资料查找）
- 数据库操作（用户数据）

**推荐MCP服务：**
1. **Filesystem MCP** - 文件读写、搜索
2. **GitHub MCP** - 仓库管理、Issue处理
3. **Brave Search MCP** - 网络搜索
4. **SQLite MCP** - 本地数据库

---

### 阶段二：AI功能开发

**新增需求：**
- 多模型API调用
- 学术论文搜索
- 知识库管理

**推荐MCP服务：**
1. **ArXiv MCP** - 学术论文搜索
2. **Memory MCP** - 对话记忆存储
3. **Fetch MCP** - HTTP请求处理

---

### 阶段三：社交功能开发

**新增需求：**
- 实时消息处理
- 用户认证
- 文件上传

**推荐MCP服务：**
1. **Slack MCP** - 消息推送测试
2. **Auth MCP** - 身份认证
3. **Storage MCP** - 文件存储

---

### 阶段四：电商功能开发

**新增需求：**
- 支付集成
- 订单管理
- 商品搜索

**推荐MCP服务：**
1. **Stripe MCP** - 支付处理
2. **PostgreSQL MCP** - 生产数据库
3. **Redis MCP** - 缓存服务

---

### 阶段五：移动端开发

**新增需求：**
- 移动端测试
- 推送通知
- 设备管理

**推荐MCP服务：**
1. **Playwright MCP** - 浏览器自动化测试
2. **Firebase MCP** - 移动后端服务
3. **APNs/FCM MCP** - 推送通知

---

## 📦 已安装的MCP服务

### 1. MCP Inspector (已安装 ✅)
**包名**: `@modelcontextprotocol/inspector`  
**用途**: MCP服务可视化测试工具  
**Stars**: ⭐9,052

**功能：**
- 可视化测试MCP服务器
- 调试MCP工具调用
- 查看MCP资源列表

**使用方法：**
```bash
mcp-inspector <server-command>
```

**项目用途：**
- 测试所有MCP服务是否正常工作
- 调试自定义MCP服务
- 开发阶段验证功能

---

### 2. Filesystem MCP Server (已安装 ✅)
**包名**: `@modelcontextprotocol/server-filesystem`  
**用途**: 文件系统操作  
**Stars**: ⭐34+

**功能：**
- 读取/写入文件
- 搜索文件内容
- 列出目录结构
- 创建/删除文件

**配置示例：**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    }
  }
}
```

**项目用途：**
- 代码文件管理
- 配置文件读写
- 日志文件查看
- 用户上传文件处理

---

### 3. GitHub MCP Server (已安装 ✅)
**包名**: `@modelcontextprotocol/server-github`  
**用途**: GitHub集成  
**Stars**: ⭐27,890

**功能：**
- 创建/更新仓库
- 管理Issues和PR
- 搜索代码
- 查看提交历史

**配置示例：**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

**项目用途：**
- 项目版本控制
- Bug跟踪（Issues）
- 功能请求管理
- 代码审查（PR）

---

### 4. Brave Search MCP Server (已安装 ✅)
**包名**: `@modelcontextprotocol/server-brave-search`  
**用途**: 网络搜索  
**Stars**: 官方MCP服务

**功能：**
- 网络搜索
- 新闻搜索
- 图片搜索
- 本地搜索

**配置示例：**
```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key"
      }
    }
  }
}
```

**项目用途：**
- 校园信息搜索
- 学习资料查找
- 新闻资讯获取
- AI辅助搜索

---

## 🔮 未来需要的MCP服务

### 数据库相关

#### PostgreSQL MCP
**用途**: 生产环境数据库  
**安装**: `npm install -g @modelcontextprotocol/server-postgres`  
**需要时间**: 阶段四（电商功能）  
**配置：**
```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "env": {
      "DATABASE_URL": "postgresql://..."
    }
  }
}
```

#### Redis MCP
**用途**: 缓存和会话管理  
**需要时间**: 阶段四  
**用途：**
- 用户会话缓存
- 聊天消息缓存
- 热点数据缓存

---

### 浏览器自动化

#### Playwright MCP
**仓库**: `microsoft/playwright-mcp`  
**Stars**: ⭐28,905  
**用途**: 浏览器自动化测试  
**需要时间**: 阶段五（移动端测试）

**功能：**
- 自动化UI测试
- 网页抓取
- 截图和录屏
- 表单自动填写

**项目用途：**
- 前端UI自动化测试
- 校园网站数据抓取
- 用户行为模拟测试

---

### AI和搜索

#### ArXiv MCP
**用途**: 学术论文搜索  
**需要时间**: 阶段二（AI功能）

**项目用途：**
- 学术研究辅助
- 论文推荐
- 文献管理

#### Memory MCP
**用途**: 对话记忆存储  
**需要时间**: 阶段二

**项目用途：**
- AI对话历史记录
- 用户偏好记忆
- 上下文管理

---

### 通讯和通知

#### Slack MCP
**用途**: Slack集成  
**需要时间**: 阶段三（社交功能）

**项目用途：**
- 团队通知
- 开发协作
- 测试消息推送

#### Discord MCP
**用途**: Discord集成  
**需要时间**: 阶段三

**项目用途：**
- 社区通知
- 用户反馈收集

---

### 支付和商务

#### Stripe MCP
**用途**: 支付处理  
**需要时间**: 阶段四（电商功能）

**项目用途：**
- 二手交易支付
- 会员订阅
- 配送费用收取

---

### 云服务

#### AWS MCP
**仓库**: `awslabs/mcp`  
**Stars**: ⭐8,454  
**用途**: AWS服务集成  
**需要时间**: 阶段四

**项目用途：**
- 文件存储（S3）
- 图片处理
- 部署管理

#### Firebase MCP
**用途**: 移动后端服务  
**需要时间**: 阶段五

**项目用途：**
- 移动端后端
- 实时数据库
- 推送通知

---

## 🛠️ MCP服务开发

### 自定义MCP服务需求

根据项目特殊需求，可能需要开发以下自定义MCP服务：

#### 1. 校园数据MCP
**功能：**
- 获取课程表
- 查询成绩
- 校园新闻
- 食堂菜单

#### 2. 社交功能MCP
**功能：**
- 好友关系管理
- 群聊消息处理
- 动态发布
- 点赞评论

#### 3. 交易系统MCP
**功能：**
- 商品发布
- 订单管理
- 支付处理
- 信用评分

#### 4. 任务系统MCP
**功能：**
- 任务创建
- 进度追踪
- 星空点亮
- 成就系统

---

## 📚 MCP服务资源

### 官方资源
- [MCP官方文档](https://modelcontextprotocol.io/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [MCP Registry](https://github.com/modelcontextprotocol/registry)

### 社区资源
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers) (⭐83,107)
- [Awesome MCP 中文](https://github.com/yzfly/Awesome-MCP-ZH) (⭐6,509)
- [FastMCP](https://github.com/PrefectHQ/fastmcp) (⭐23,682) - 快速构建MCP服务

---

## 🚀 快速开始

### 1. 验证已安装的MCP服务

```bash
# 检查MCP Inspector
mcp-inspector --version

# 测试Filesystem MCP
mcp-inspector npx -y @modelcontextprotocol/server-filesystem /path/to/test

# 测试GitHub MCP（需要token）
mcp-inspector npx -y @modelcontextprotocol/server-github
```

### 2. 配置Claude Desktop使用MCP

编辑Claude Desktop配置文件：
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

添加MCP服务配置：
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
        "GITHUB_TOKEN": "your-token-here"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 3. 获取API密钥

**GitHub Token:**
1. 访问 https://github.com/settings/tokens
2. 创建Personal Access Token
3. 选择需要的权限（repo, issues等）

**Brave Search API Key:**
1. 访问 https://brave.com/search/api/
2. 注册并获取API密钥
3. 免费额度：2000次/月

---

## 📊 MCP服务使用统计

### 当前已安装
- ✅ MCP Inspector
- ✅ Filesystem MCP
- ✅ GitHub MCP
- ✅ Brave Search MCP

### 计划安装（按优先级）
1. **高优先级**（阶段二）
   - ArXiv MCP
   - Memory MCP
   - Fetch MCP

2. **中优先级**（阶段三）
   - Slack MCP
   - PostgreSQL MCP
   - Redis MCP

3. **低优先级**（阶段四-五）
   - Playwright MCP
   - Stripe MCP
   - Firebase MCP
   - AWS MCP

---

## 🔄 更新日志

### 2026-03-15
- ✅ 创建MCP服务指南文档
- ✅ 安装MCP Inspector
- ✅ 安装Filesystem MCP Server
- ✅ 安装GitHub MCP Server
- ✅ 安装Brave Search MCP Server
- ✅ 整理未来需要的MCP服务清单

### 待办事项
- [ ] 配置GitHub Token
- [ ] 配置Brave Search API Key
- [ ] 测试所有已安装的MCP服务
- [ ] 开发自定义校园数据MCP

---

## 💡 最佳实践

### 1. 安全性
- 不要在代码中硬编码API密钥
- 使用环境变量存储敏感信息
- 限制文件系统访问范围

### 2. 性能优化
- 使用Redis缓存频繁访问的数据
- 批量处理API请求
- 异步处理耗时操作

### 3. 错误处理
- 实现MCP服务的重试机制
- 记录所有错误日志
- 提供友好的错误提示

### 4. 监控
- 监控MCP服务调用频率
- 记录响应时间
- 设置告警阈值

---

## 📞 技术支持

遇到问题时：
1. 查看MCP官方文档
2. 使用MCP Inspector调试
3. 在对应GitHub仓库提Issue
4. 查看社区资源

---

**本文档会随着项目开发进度持续更新，请定期查看最新版本。**

# Skill使用指南与执行规范

## 一、为什么每次都要检查Skill？

### 1.1 Skill的价值

Skill是预定义的专家级指令集，能够：
- **提高效率**：避免重复编写相同的提示词
- **保证质量**：经过AI评估和优化的最佳实践
- **扩展能力**：提供专业的领域知识（如音频处理、密码管理等）
- **节省时间**：快速调用专业功能，无需从头学习

### 1.2 当前可用的Skill

根据检查，当前系统中有以下可用的skill：

| Skill名称 | 功能描述 | 适用场景 |
|-----------|---------|---------|
| **songsee** | 生成音频频谱图和特征面板可视化 | 音频分析、音乐可视化、声音处理 |
| **obsidian-cli** | 管理Obsidian笔记、任务、属性 | 笔记管理、知识库操作、插件开发 |
| **1password** | 1Password密码管理集成 | 安全认证、密码管理、敏感信息处理 |
| **github-explorer** | GitHub仓库探索和管理 | 代码仓库管理、项目分析、PR处理 |

---

## 二、执行规范：每次必须检查Skill

### 2.1 检查时机

**必须在以下时机检查skill：**

1. **任务开始时**
   - 在执行任何任务之前，先检查是否有相关skill
   - 示例：用户要求"分析音频"，先检查是否有songsee skill

2. **遇到专业领域问题时**
   - 涉及特定领域（音频、密码、笔记等）时，检查对应skill
   - 示例：用户要求"管理密码"，检查1password skill

3. **需要工具集成时**
   - 需要使用外部工具（CLI、API等）时，检查是否有集成skill
   - 示例：用户要求"操作GitHub"，检查github-explorer skill

4. **重复性任务时**
   - 对于可能重复的任务，检查是否有现成的skill
   - 示例：用户要求"创建笔记"，检查obsidian-cli skill

### 2.2 检查流程

**标准检查流程：**

```
1. 分析用户需求
   ↓
2. 识别关键词和领域
   - 音频相关 → songsee
   - 笔记相关 → obsidian-cli
   - 密码相关 → 1password
   - GitHub相关 → github-explorer
   ↓
3. 检查skill目录
   - 列出所有可用skill
   - 查看skill描述和功能
   ↓
4. 匹配skill
   - 如果找到匹配的skill，优先使用
   - 如果没有匹配，继续常规处理
   ↓
5. 应用skill
   - 读取skill内容
   - 按照skill指令执行
   - 必要时结合用户需求调整
```

### 2.3 检查命令

**快速检查skill的命令：**

```bash
# 列出所有skill
ls ~/.claude/skills/*.md ~/.claude/skills/*.mdc 2>/dev/null

# 查看skill名称和描述
for file in ~/.claude/skills/*.md ~/.claude/skills/*.mdc; do
  if [ -f "$file" ]; then
    echo "=== $(basename $file) ==="
    head -10 "$file" | grep -E "^name:|^description:"
  fi
done

# 搜索特定关键词的skill
grep -l "关键词" ~/.claude/skills/*.md ~/.claude/skills/*.mdc 2>/dev/null
```

---

## 三、Skill使用示例

### 3.1 songsee - 音频可视化

**触发条件：**
- 用户提到"音频"、"频谱"、"可视化"、"音乐"
- 需要分析音频文件
- 需要生成音频特征图

**使用方式：**
```bash
# 基本频谱图
songsee track.mp3

# 多面板可视化
songsee track.mp3 --viz spectrogram,mel,chroma

# 自定义输出
songsee track.mp3 --viz mel --style magma -o output.png
```

**示例对话：**
```
用户：帮我分析这个音频文件的频谱
助手：检测到音频分析需求，使用songsee skill...
      [读取songsee.md]
      [执行songsee命令]
```

### 3.2 obsidian-cli - 笔记管理

**触发条件：**
- 用户提到"笔记"、"Obsidian"、"知识库"
- 需要创建、编辑、搜索笔记
- 需要管理任务或属性

**使用方式：**
```bash
# 读取笔记
obsidian read file="My Note"

# 创建笔记
obsidian create name="New Note" content="# Hello"

# 搜索笔记
obsidian search query="关键词"
```

**示例对话：**
```
用户：帮我在Obsidian中创建一个新笔记
助手：检测到Obsidian操作需求，使用obsidian-cli skill...
      [读取obsidian-cli.md]
      [执行obsidian命令]
```

### 3.3 1password - 密码管理

**触发条件：**
- 用户提到"密码"、"1Password"、"认证"
- 需要安全地访问敏感信息
- 需要进行身份验证

**使用方式：**
```bash
# 获取密码
op item get "项目名称"

# 列出所有项目
op item list

# 创建新项目
op item create --category=password
```

**示例对话：**
```
用户：帮我获取数据库密码
助手：检测到密码管理需求，使用1password skill...
      [读取1password.mdc]
      [执行op命令]
```

### 3.4 github-explorer - GitHub管理

**触发条件：**
- 用户提到"GitHub"、"仓库"、"PR"、"Issue"
- 需要搜索或分析GitHub项目
- 需要管理代码仓库

**使用方式：**
```bash
# 搜索仓库
gh search repos "关键词"

# 查看仓库信息
gh repo view owner/repo

# 创建Issue
gh issue create --title "标题" --body "内容"
```

**示例对话：**
```
用户：帮我查看这个GitHub仓库的信息
助手：检测到GitHub操作需求，使用github-explorer skill...
      [读取github-explorer.md]
      [执行gh命令]
```

---

## 四、更新规则文档

### 4.1 需要更新的位置

**在以下文档中添加skill检查规则：**

1. **CLAUDE.md（如果存在）**
   ```markdown
   ## 执行前检查
   
   在执行任何任务之前，必须：
   1. 检查 ~/.claude/skills/ 目录
   2. 查看是否有相关skill
   3. 如果有，优先使用skill
   ```

2. **项目README.md**
   ```markdown
   ## Skill使用
   
   本项目支持以下skill：
   - songsee: 音频可视化
   - obsidian-cli: 笔记管理
   - 1password: 密码管理
   - github-explorer: GitHub管理
   ```

3. **创建专门的SKILL-GUIDE.md**
   - 详细说明每个skill的使用方法
   - 提供示例和最佳实践

### 4.2 自动检查脚本

**创建自动检查脚本：**

```bash
#!/bin/bash
# check-skills.sh

SKILL_DIR="$HOME/.claude/skills"

echo "=== 检查可用Skills ==="
echo ""

# 列出所有skill
for file in "$SKILL_DIR"/*.md "$SKILL_DIR"/*.mdc; do
  if [ -f "$file" ]; then
    name=$(grep "^name:" "$file" | head -1 | cut -d: -f2- | xargs)
    desc=$(grep "^description:" "$file" | head -1 | cut -d: -f2- | xargs)
    if [ -n "$name" ]; then
      echo "✅ $name"
      echo "   $desc"
      echo ""
    fi
  fi
done

echo "=== 检查完成 ==="
```

---

## 五、最佳实践

### 5.1 Skill优先原则

**原则：Skill > 自定义实现**

```
当用户提出需求时：
1. 首先检查是否有现成的skill
2. 如果有skill，优先使用skill
3. 如果skill不满足需求，再自定义实现
4. 如果自定义实现有价值，考虑创建新skill
```

### 5.2 Skill组合使用

**多个skill可以组合使用：**

```
示例：用户要求"将GitHub项目信息保存到Obsidian笔记"

步骤：
1. 使用github-explorer skill获取项目信息
2. 使用obsidian-cli skill创建笔记
3. 将信息保存到笔记中
```

### 5.3 Skill更新维护

**定期更新skill：**

```
1. 每周检查skillhub.club是否有新skill
2. 下载有用的新skill
3. 删除不再使用的skill
4. 更新skill使用文档
```

---

## 六、执行检查清单

### 6.1 任务开始前

- [ ] 分析用户需求关键词
- [ ] 检查skill目录
- [ ] 匹配相关skill
- [ ] 读取skill内容
- [ ] 准备执行

### 6.2 执行过程中

- [ ] 按照skill指令执行
- [ ] 监控执行结果
- [ ] 必要时调整参数
- [ ] 记录使用情况

### 6.3 任务完成后

- [ ] 验证结果
- [ ] 记录skill使用效果
- [ ] 更新skill使用统计
- [ ] 反馈改进建议

---

## 七、总结

### 核心要点

1. **每次必查**：执行任何任务前，必须检查skill目录
2. **优先使用**：有现成skill时，优先使用skill
3. **持续更新**：定期更新和添加新skill
4. **记录反馈**：记录skill使用效果，持续改进

### 执行规范

```
标准执行流程：
1. 接收用户需求
2. 【必须】检查skill目录
3. 【必须】匹配相关skill
4. 如果有skill → 使用skill执行
5. 如果无skill → 常规处理
6. 记录和反馈
```

### 价值体现

通过严格执行skill检查规范，可以：
- 提高执行效率 50%+
- 减少重复劳动
- 保证执行质量
- 扩展专业能力

---

**记住：永远不要跳过skill检查步骤！**

#!/usr/bin/env node
/**
 * Ollama 环境检测 & Gemma 4B 模型拉取脚本
 *
 * 用法: node scripts/setup-ollama.mjs
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODEL = 'gemma3:4b'

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 10000 }).trim()
  } catch {
    return null
  }
}

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`)
}

async function main() {
  console.log('\n🌟 Spark Alliance - 本地 AI 环境配置\n')

  // 1. 检查 Ollama 是否安装
  const ollamaVersion = run('ollama --version')
  if (!ollamaVersion) {
    log('❌', 'Ollama 未安装')
    log('📦', '请先安装 Ollama:')
    console.log('   Windows: https://ollama.com/download/windows')
    console.log('   macOS:   brew install ollama')
    console.log('   Linux:   curl -fsSL https://ollama.com/install.sh | sh')
    process.exit(1)
  }
  log('✅', `Ollama 已安装: ${ollamaVersion}`)

  // 2. 检查 Ollama 是否运行
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) throw new Error()
    log('✅', 'Ollama 服务运行中')

    // 3. 检查模型
    const data = await res.json()
    const models = data.models || []
    const hasModel = models.some(
      (m) => m.name === MODEL || m.name.startsWith(MODEL.split(':')[0]),
    )

    if (hasModel) {
      log('✅', `模型 ${MODEL} 已就绪`)
    } else {
      log('📥', `正在拉取模型 ${MODEL}（约 3GB，请耐心等待）...`)
      console.log()
      try {
        execSync(`ollama pull ${MODEL}`, { stdio: 'inherit' })
        log('✅', `模型 ${MODEL} 拉取完成`)
      } catch (e) {
        log('❌', `模型拉取失败: ${e.message}`)
        log('💡', `请手动运行: ollama pull ${MODEL}`)
        process.exit(1)
      }
    }
  } catch {
    log('⚠️', 'Ollama 服务未运行')
    log('💡', '请先启动 Ollama:')
    console.log('   Windows: 启动 Ollama 桌面应用 或运行 ollama serve')
    console.log('   macOS/Linux: ollama serve')
    process.exit(1)
  }

  // 4. 创建 .env 文件（如果不存在）
  const envPath = resolve(__dirname, '..', '.env')
  if (!existsSync(envPath)) {
    const examplePath = resolve(__dirname, '..', '.env.example')
    if (existsSync(examplePath)) {
      const content = readFileSync(examplePath, 'utf-8')
      writeFileSync(envPath, content)
      log('📝', '已从 .env.example 创建 .env 配置文件')
    }
  } else {
    log('✅', '.env 配置文件已存在')
  }

  console.log('\n🎉 环境配置完成！可以启动服务了：')
  console.log('   npm run dev\n')
}

main().catch(console.error)

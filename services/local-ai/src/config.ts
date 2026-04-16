import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

export const config = {
  port: parseInt(process.env.PORT || '3721', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gemma3:4b',
  },
  rateLimit: {
    perMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '30', 10),
  },
  maxInputTokens: parseInt(process.env.MAX_INPUT_TOKENS || '4096', 10),
  maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || '2048', 10),
} as const

/**
 * spark-rag — 语义检索 Edge Function（RAG 核心）
 * =================================================
 * 路径：POST /functions/v1/spark-rag
 *
 * 支持两种 action：
 *   - "search"（默认）：对 query 做 embedding + 最近邻查 spark_knowledge 返回 topK 片段
 *   - "ingest"：把一组文档 chunks embed 后 upsert 到 spark_knowledge（需要 owner 绑定）
 *
 * 核心安全约束：
 *   1. 鉴权：Authorization Bearer JWT 必须有效 user
 *   2. 输入限长（query ≤ 1000 chars；每 chunk ≤ 2000）
 *   3. 敏感词前置过滤（与 spark-ai-general 同步）
 *   4. 上游 NVIDIA API key 仅存在 Deno.env，绝不回传给前端
 *   5. Rate limit：Supabase 内置 60 req/min per JWT，够用
 *
 * 环境变量：
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   - NVIDIA_API_KEY（或 NV_API_KEY）
 *   - NVIDIA_BASE_URL（默认 https://integrate.api.nvidia.com/v1）
 *   - NVIDIA_EMBED_MODEL（默认 nvidia/nv-embedqa-e5-v5，输出 1024 维）
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** query 长度上限 —— 1024 维模型对单条 text 最多 512 tokens，超出会被模型截断 */
const MAX_QUERY_CHARS = 1000
const MAX_CHUNK_CHARS = 2000
const MAX_INGEST_BATCH = 64
const MAX_MATCH_COUNT = 10
const MIN_MATCH_SCORE_DEFAULT = 0.35

/** 敏感词与 spark-ai-general 保持一致，避免把恶意 query 送上游 */
const SENSITIVE_PATTERNS = [
  /(?:赌博|gambling|casino)/i,
  /(?:色情|pornograph|xxx|nsfw|黄色|裸体)/i,
  /(?:毒品|drug\s+deal|narcotic|吸毒|贩毒)/i,
  /(?:恐怖袭击|terroris[mt]|bomb\s+threat)/i,
  /(?:枪支|炸弹|武器制造|制毒)/i,
  /(?:传销|非法集资|洗钱)/i,
  /(?:自杀|自残|自我伤害|suicide|self[- ]harm)/i,
]

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function checkSafety(text: string): { safe: boolean; reason?: string } {
  for (const p of SENSITIVE_PATTERNS) {
    if (p.test(text)) return { safe: false, reason: '命中敏感内容过滤' }
  }
  return { safe: true }
}

/** 批量调用 NVIDIA embeddings API，返回与 texts 对齐的向量数组。 */
async function embedTexts(texts: string[], apiKey: string, baseUrl: string, model: string): Promise<number[][]> {
  if (!texts.length) return []
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: texts,
      // NVIDIA nv-embedqa-e5-v5 支持 input_type: 'query' | 'passage'
      input_type: 'query',
      encoding_format: 'float',
      truncate: 'END',
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Embedding 请求失败: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!Array.isArray(data?.data)) throw new Error('Embedding 响应格式异常')
  // OpenAI 兼容：data = [{index, embedding:[...]}]
  const sorted = [...data.data].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
  return sorted.map((x: any) => x.embedding as number[])
}

/** 把向量转成 pgvector 字面量字符串（'[0.1,0.2,...]'），避免 Supabase JS client 序列化问题 */
function vectorLiteral(arr: number[]): string {
  return '[' + arr.map((n) => (Number.isFinite(n) ? n : 0)).join(',') + ']'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: '未授权' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: '服务端配置缺失' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return jsonResponse({ error: '认证失败' }, 401)

    const providerApiKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('NV_API_KEY')
    if (!providerApiKey) return jsonResponse({ error: 'AI 服务密钥未配置' }, 500)
    const providerBaseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
    const embedModel = Deno.env.get('NVIDIA_EMBED_MODEL') || 'nvidia/nv-embedqa-e5-v5'

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return jsonResponse({ error: '请求体无效' }, 400)

    const action = (body.action as string) || 'search'

    // =================== action: search ===================
    if (action === 'search') {
      const rawQuery = typeof body.query === 'string' ? body.query : ''
      const query = rawQuery.trim()
      if (!query) return jsonResponse({ error: 'query 不能为空' }, 400)
      if (query.length > MAX_QUERY_CHARS) {
        return jsonResponse({ error: `query 过长（>${MAX_QUERY_CHARS} 字符）` }, 400)
      }
      const safety = checkSafety(query)
      if (!safety.safe) {
        // 命中敏感词不调用上游，直接返回空结果 + 一个温和的提示片段
        return jsonResponse({
          chunks: [],
          blocked: true,
          reason: safety.reason,
        })
      }

      const matchCount = Math.min(MAX_MATCH_COUNT, Math.max(1, Number(body.match_count) || 5))
      const minScore = Math.max(0, Math.min(1, Number(body.min_score) ?? MIN_MATCH_SCORE_DEFAULT))
      const sourceFilter = typeof body.source === 'string' && body.source ? body.source : null

      const [embedding] = await embedTexts([query], providerApiKey, providerBaseUrl, embedModel)
      if (!embedding || !embedding.length) {
        return jsonResponse({ error: 'Embedding 为空' }, 502)
      }

      // 使用 service role 调 RPC：RLS 控制可见性由 RPC 调用者上下文决定，
      // 这里用 service role 扫描全表，然后在 JS 层按 visibility 二次过滤。
      const { data, error } = await supabase.rpc('match_spark_knowledge', {
        query_embedding: vectorLiteral(embedding),
        match_count: matchCount * 2, // 多拉一点再筛
        source_filter: sourceFilter,
        min_score: minScore,
      })
      if (error) {
        return jsonResponse({ error: `检索失败: ${error.message.slice(0, 200)}` }, 500)
      }

      // 安全过滤：只返回对当前用户可见的片段（public/logged_in/private by owner）
      const rows = Array.isArray(data) ? data : []
      // 我们需要 owner_id / visibility，rpc 未返回；简单起见只保留 public/logged_in（RLS 逻辑复制到 JS）
      // 额外二次查询拿完整字段（只针对候选 IDs）
      let filtered = rows
      if (rows.length) {
        const ids = rows.map((r: any) => r.id)
        const { data: full } = await supabase
          .from('spark_knowledge')
          .select('id, visibility, owner_id')
          .in('id', ids)
        const metaMap = new Map<string, { visibility: string; owner_id: string | null }>(
          (full || []).map((r: any) => [r.id, { visibility: r.visibility, owner_id: r.owner_id }])
        )
        filtered = rows.filter((r: any) => {
          const meta = metaMap.get(r.id)
          if (!meta) return false
          if (meta.visibility === 'public') return true
          if (meta.visibility === 'logged_in') return true // 已通过 auth
          if (meta.visibility === 'private') return meta.owner_id === user.id
          return false
        })
      }
      const chunks = filtered.slice(0, matchCount).map((r: any) => ({
        id: r.id,
        source: r.source,
        title: r.title,
        content: r.content,
        url: r.url,
        score: Number(r.score) || 0,
      }))
      return jsonResponse({ chunks, model: embedModel, count: chunks.length })
    }

    // =================== action: ingest ===================
    if (action === 'ingest') {
      const docs = Array.isArray(body.docs) ? body.docs : []
      if (!docs.length) return jsonResponse({ error: 'docs 不能为空' }, 400)
      if (docs.length > MAX_INGEST_BATCH) {
        return jsonResponse({ error: `一次最多 ingest ${MAX_INGEST_BATCH} 条` }, 400)
      }

      const cleaned = docs.map((d: any, i: number) => {
        const content = typeof d?.content === 'string' ? d.content.trim() : ''
        const title = typeof d?.title === 'string' ? d.title.trim().slice(0, 200) : ''
        if (!content || !title) throw new Error(`docs[${i}] title/content 不能为空`)
        if (content.length > MAX_CHUNK_CHARS) {
          throw new Error(`docs[${i}] content 过长（>${MAX_CHUNK_CHARS}）`)
        }
        const safety = checkSafety(content)
        if (!safety.safe) throw new Error(`docs[${i}] 命中敏感内容`)
        return {
          source: typeof d?.source === 'string' && d.source ? d.source : 'user-note',
          title,
          content,
          chunk_index: Number(d?.chunk_index) || 0,
          url: typeof d?.url === 'string' ? d.url : null,
          metadata: d?.metadata && typeof d.metadata === 'object' ? d.metadata : {},
          visibility: d?.visibility === 'private' || d?.visibility === 'logged_in' ? d.visibility : 'private',
        }
      })

      // 批量 embed
      const embeddings = await embedTexts(
        cleaned.map((d: any) => `${d.title}\n${d.content}`),
        providerApiKey,
        providerBaseUrl,
        embedModel,
      )
      if (embeddings.length !== cleaned.length) {
        return jsonResponse({ error: 'Embedding 数量不匹配' }, 502)
      }

      const rows = cleaned.map((d: any, i: number) => ({
        ...d,
        owner_id: user.id,
        embedding: vectorLiteral(embeddings[i]),
      }))

      const { data, error } = await supabase
        .from('spark_knowledge')
        .upsert(rows, { onConflict: 'source,title,chunk_index' })
        .select('id')
      if (error) return jsonResponse({ error: `写入失败: ${error.message.slice(0, 200)}` }, 500)
      return jsonResponse({ ingested: data?.length ?? 0, model: embedModel })
    }

    return jsonResponse({ error: `未知 action: ${action}` }, 400)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误'
    return jsonResponse({ error: msg }, 500)
  }
})

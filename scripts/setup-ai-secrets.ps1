# ============================================================
# setup-ai-secrets.ps1 —— 一键推送星火助手所需的 AI 服务密钥
# ============================================================
# 作用：把 NVIDIA_API_KEY / NVIDIA_BASE_URL / SPARK_MODEL_* 等密钥
#       安全地推送到 Supabase Edge Function Secrets。
#
# 安全：
#   • 本脚本不把 API Key 写到任何代码文件里
#   • 从 supabase/.env.local 读取（该文件已被 .gitignore 排除）
#   • 只通过 `supabase secrets set` 命令直接传给 Supabase 后端
#   • Key 在服务端加密存储、不对前端暴露
#
# 使用：
#   1. 确保本机已安装 Supabase CLI (https://supabase.com/docs/guides/cli)
#   2. 在 supabase/.env.local 填好 NVIDIA_API_KEY（模板已自动生成）
#   3. 在项目根目录 PowerShell 运行：
#        .\scripts\setup-ai-secrets.ps1
#   4. 脚本会自动：
#        a) 读取 supabase/.env.local 的全部 SPARK_* 和 NVIDIA_* 变量
#        b) 调用 `supabase link`（如未链接）
#        c) 推送所有变量到 Supabase Edge Function Secrets
#        d) 重新部署 assistant-chat Edge Function 让新 Key 生效
# ============================================================

param(
    [Parameter(Mandatory = $false)]
    [string]$EnvFile = "supabase\.env.local",

    [Parameter(Mandatory = $false)]
    [string]$ApiKey = "",

    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "",

    [Parameter(Mandatory = $false)]
    [switch]$SkipDeploy = $false
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Message) Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Message) Write-Host "    + $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "    ! $Message" -ForegroundColor Yellow }
function Write-Err  { param([string]$Message) Write-Host "    x $Message" -ForegroundColor Red }

Write-Host ""
Write-Host "===============================================" -ForegroundColor Magenta
Write-Host "  星火助手 - AI 密钥一键配置 v11                " -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

# -----------------------------------------------------------
# 1) 读取 .env.local（若存在）
# -----------------------------------------------------------
$envMap = @{}
if (Test-Path $EnvFile) {
    Write-Step "读取密钥文件: $EnvFile"
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $idx = $line.IndexOf("=")
            $k = $line.Substring(0, $idx).Trim()
            $v = $line.Substring($idx + 1).Trim()
            if ($v.StartsWith('"') -and $v.EndsWith('"')) {
                $v = $v.Substring(1, $v.Length - 2)
            }
            $envMap[$k] = $v
        }
    }
    Write-Ok "已解析 $($envMap.Count) 个变量"
} else {
    Write-Warn "未找到 $EnvFile，将使用交互式输入"
}

# -----------------------------------------------------------
# 2) 检查 Supabase CLI（优先 PATH，其次项目 tools\supabase.exe）
# -----------------------------------------------------------
Write-Step "检查 Supabase CLI"
$script:SUPABASE_CMD = $null
try {
    $null = & supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $script:SUPABASE_CMD = "supabase"
        Write-Ok "使用系统 PATH 中的 Supabase CLI"
    }
} catch { }

if (-not $script:SUPABASE_CMD) {
    $localCli = Join-Path $PSScriptRoot ".." | Join-Path -ChildPath "tools\supabase.exe"
    $localCli = [System.IO.Path]::GetFullPath($localCli)
    if (Test-Path $localCli) {
        try {
            $null = & $localCli --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $script:SUPABASE_CMD = $localCli
                Write-Ok "使用项目本地 CLI: tools\supabase.exe"
            }
        } catch { }
    }
}

if (-not $script:SUPABASE_CMD) {
    Write-Err "未检测到 Supabase CLI"
    Write-Host "    Windows 安装方式（任选其一）:" -ForegroundColor Gray
    Write-Host "      方式 A（推荐）: 项目已附带 tools\supabase.exe，可直接使用" -ForegroundColor Gray
    Write-Host "      方式 B: scoop install supabase" -ForegroundColor Gray
    Write-Host "      方式 C: winget install Supabase.CLI" -ForegroundColor Gray
    Write-Host "      方式 D: 下载 https://github.com/supabase/cli/releases/latest" -ForegroundColor Gray
    exit 1
}

# -----------------------------------------------------------
# 3) 获取 NVIDIA_API_KEY（优先级：参数 > .env.local > 交互）
# -----------------------------------------------------------
Write-Step "获取 NVIDIA API 密钥"
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    if ($envMap.ContainsKey("NVIDIA_API_KEY") -and $envMap["NVIDIA_API_KEY"]) {
        $ApiKey = $envMap["NVIDIA_API_KEY"]
        Write-Ok "从 $EnvFile 读取（长度 $($ApiKey.Length)）"
    } else {
        Write-Host "    获取 Key: https://build.nvidia.com/explore/discover → 选任意模型 → Get API Key" -ForegroundColor Gray
        $secureKey = Read-Host -AsSecureString "    请输入 NVIDIA_API_KEY（nvapi- 开头）"
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
        $ApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Err "NVIDIA_API_KEY 为空，无法继续"
    exit 1
}
if (-not $ApiKey.StartsWith("nvapi-")) {
    Write-Warn "Key 不以 nvapi- 开头，请确认是否正确（脚本会继续推送）"
}

# BASE_URL
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    if ($envMap.ContainsKey("NVIDIA_BASE_URL")) {
        $BaseUrl = $envMap["NVIDIA_BASE_URL"]
    } else {
        $BaseUrl = "https://integrate.api.nvidia.com/v1"
    }
}

# -----------------------------------------------------------
# 4) 检查项目链接（优先从 frontend/.env.local 自动提取 project ref）
# -----------------------------------------------------------
Write-Step "检查 Supabase 项目链接"

function Get-SupabaseProjectRef {
    $envLocal = Join-Path $PSScriptRoot ".." | Join-Path -ChildPath "frontend\.env.local"
    $envLocal = [System.IO.Path]::GetFullPath($envLocal)
    if (Test-Path $envLocal) {
        $line = Get-Content $envLocal | Where-Object { $_ -match '^VITE_SUPABASE_URL\s*=' } | Select-Object -First 1
        if ($line) {
            $url = ($line -split '=', 2)[1].Trim()
            if ($url -match 'https://([a-z0-9]+)\.supabase\.co') {
                return $matches[1]
            }
        }
    }
    return $null
}

$linkOk = $false
try {
    $null = & $script:SUPABASE_CMD link --project-ref (Get-SupabaseProjectRef) 2>&1
    if ($LASTEXITCODE -eq 0) { $linkOk = $true }
} catch { }

if (-not $linkOk) {
    $detectedRef = Get-SupabaseProjectRef
    if ($detectedRef) {
        Write-Ok "从 frontend\.env.local 检测到 project-ref: $detectedRef"
        $projectRef = $detectedRef
    } else {
        Write-Warn "未自动检测到 project-ref"
        $projectRef = Read-Host "    请输入 Supabase 项目 Ref（Dashboard - Project Settings - Reference ID）"
    }
    & $script:SUPABASE_CMD link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Err "supabase link 失败"
        Write-Warn "可能原因：尚未登录。请先运行：$script:SUPABASE_CMD login"
        exit 1
    }
}
Write-Ok "项目已链接"

# -----------------------------------------------------------
# 5) 推送 Secrets
# -----------------------------------------------------------
Write-Step "推送 Edge Function Secrets（加密存储于 Supabase 后端）"

# 必推
$mustPush = [ordered]@{
    "NVIDIA_API_KEY"   = $ApiKey
    "NVIDIA_BASE_URL"  = $BaseUrl
}

# 可选模型映射（从 .env.local 读；若无则脚本提供默认）
$optionalKeys = @(
    "SPARK_MODEL_DEFAULT",
    "SPARK_MODEL_THINKING",
    "SPARK_MODEL_FAST",
    "SPARK_MODEL_STANDARD",
    "SPARK_FALLBACK_DEFAULT",
    "SPARK_FALLBACK_THINKING",
    "SPARK_FALLBACK_FAST",
    "SPARK_FALLBACK_STANDARD",
    "SPARK_GENERAL_MODEL",
    "SPARK_GENERAL_FALLBACK",
    "NVIDIA_EMBED_MODEL"
)

foreach ($key in $mustPush.Keys) {
    $value = $mustPush[$key]
    & $script:SUPABASE_CMD secrets set "$key=$value" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "$key 推送失败"
        exit 1
    }
    Write-Ok "$key 已设置"
}

foreach ($key in $optionalKeys) {
    if ($envMap.ContainsKey($key) -and $envMap[$key]) {
        $value = $envMap[$key]
        & $script:SUPABASE_CMD secrets set "$key=$value" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "$key = $value"
        } else {
            Write-Warn "$key 推送失败（可忽略，Edge Function 会用默认值）"
        }
    }
}

# -----------------------------------------------------------
# 6) 部署 Edge Functions
# -----------------------------------------------------------
if (-not $SkipDeploy) {
    Write-Step "重新部署 assistant-chat Edge Function"
    & $script:SUPABASE_CMD functions deploy assistant-chat
    if ($LASTEXITCODE -ne 0) {
        Write-Err "assistant-chat 部署失败"
        Write-Warn "Secrets 已成功推送，稍后手动运行：$script:SUPABASE_CMD functions deploy assistant-chat"
        exit 1
    }
    Write-Ok "assistant-chat 已部署"

    $extraFunctions = @("spark-ai-general", "tarot-reading", "spark-rag", "ai-schedule-import")
    foreach ($fn in $extraFunctions) {
        $fnPath = Join-Path "supabase\functions" $fn
        if (Test-Path $fnPath) {
            & $script:SUPABASE_CMD functions deploy $fn 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { Write-Ok "$fn 已同步部署" }
            else { Write-Warn "$fn 部署失败（不影响主功能）" }
        }
    }
} else {
    Write-Warn "已跳过部署（-SkipDeploy），手动运行：$script:SUPABASE_CMD functions deploy assistant-chat"
}

# -----------------------------------------------------------
# 7) 清理内存
# -----------------------------------------------------------
$ApiKey = $null
$envMap = $null
[System.GC]::Collect()

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  [OK] 配置完成！星火助手 AI 已就绪            " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "  1) 启动前端：cd frontend; npm run dev" -ForegroundColor Gray
Write-Host "  2) 登录 -> 打开 /app/chat -> 发送一条测试消息" -ForegroundColor Gray
Write-Host "  3) 切换顶栏 4 模式（均衡 / 深度思考 / 极速 / 标准-Gemma3）验证" -ForegroundColor Gray
Write-Host "  4) 查看 Supabase Dashboard -> Edge Functions -> Logs 确认无错误" -ForegroundColor Gray
Write-Host ""
Write-Host "安全提醒：" -ForegroundColor Yellow
Write-Host "  • supabase/.env.local 已被 .gitignore 排除，不会进入 git 历史" -ForegroundColor Gray
Write-Host "  • 如果 Key 曾在对话中暴露，建议到 NVIDIA 控制台 rotate 一次" -ForegroundColor Gray
Write-Host ""

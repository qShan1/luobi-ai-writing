/**
 * LLM 请求公共工具：超时、重试退避、SSE 行缓冲
 *
 * 修复要点：
 * 1. 所有 fetch 都带超时（AbortSignal.timeout 与外部取消信号合并），杜绝挂起
 * 2. 429 / 5xx / 网络错误指数退避重试（流式仅在「未产出任何 chunk」前重试）
 * 3. SSE 数据按行缓冲累积，跨 reader.read() 分片的 data: 行不再丢失
 */

/** 非流式单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 180_000
/** 流式首字节（建立连接 + 首个 chunk）等待超时（毫秒） */
export const STREAM_FIRST_BYTE_TIMEOUT_MS = 60_000
/** 流式整体最长时长（毫秒），防止长时间无输出的僵尸流 */
export const STREAM_TOTAL_TIMEOUT_MS = 30 * 60_000

/** 可重试的 HTTP 状态码：429 限流、5xx 服务端错误 */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

/** 网络层错误是否可重试（AbortError 不算，是主动取消） */
export function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return false
  return true
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 合并「外部取消信号」与「内部超时信号」为一个 AbortSignal。
 * 调用方负责在请求结束后调用 cleanup() 释放定时器与监听。
 */
export function createTimeoutSignal(
  external: AbortSignal | undefined | null,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`请求超时 (${timeoutMs}ms)`)), timeoutMs)
  const onExternalAbort = () => controller.abort(external?.reason)

  if (external) {
    if (external.aborted) onExternalAbort()
    else external.addEventListener('abort', onExternalAbort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onExternalAbort)
    },
  }
}

/**
 * SSE 行缓冲解析器
 *
 * 浏览器 fetch 的 reader.read() 分片并不保证以 `\n` 为界，
 * 若直接用 `text.split('\n')` 逐块解析，跨分片的 data: 行会丢失或被截断。
 * 此解析器累积不完整行，只在换行符处产出完整行。
 */
export class SSELineBuffer {
  private buffer = ''
  private readonly decoder = new TextDecoder()

  /** 输入一个二进制分片，返回该分片内完整解析出的行（不含行尾换行符） */
  push(value: Uint8Array): string[] {
    this.buffer += this.decoder.decode(value, { stream: true })
    const lines: string[] = []
    let newlineIndex: number
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex)
      this.buffer = this.buffer.slice(newlineIndex + 1)
      // 跳过空行；若末尾是 \r 则去掉（SSE 规范使用 CRLF）
      lines.push(line.endsWith('\r') ? line.slice(0, -1) : line)
    }
    return lines
  }

  /** 刷新残留缓冲（流结束时调用），返回剩余未换行的内容（如最后一个 data: 行） */
  flush(): string[] {
    if (this.buffer.length === 0) return []
    const rest = this.buffer
    this.buffer = ''
    return [rest.endsWith('\r') ? rest.slice(0, -1) : rest]
  }
}

/** 从 SSE 行中提取 data: 载荷，非 data: 行返回 null */
export function extractSSEData(line: string): string | null {
  if (line.startsWith('data:')) return line.slice(5).trimStart()
  return null
}

/**
 * 带超时与退避重试的 POST 请求（非流式）
 *
 * @param url 请求地址
 * @param init fetch 初始化参数
 * @param options.retries 重试次数（默认 2）
 * @param options.timeoutMs 单次超时（默认 REQUEST_TIMEOUT_MS）
 * @returns 最终 Response（未做 ok 检查，交由调用方处理 status）
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options?: { retries?: number; timeoutMs?: number },
): Promise<Response> {
  const maxRetries = options?.retries ?? 2
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS
  let lastError: Error | null = null
  let lastStatus = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { signal, cleanup } = createTimeoutSignal(init.signal, timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal })
      if (!isRetryableStatus(res.status) || attempt >= maxRetries) {
        return res
      }
      lastStatus = res.status
      // 读取并丢弃响应体，避免连接未释放
      try { await res.text() } catch { /* ignore */ }
      // 未到最大重试次数：退避后继续
      if (attempt < maxRetries) {
        await sleep(500 * 2 ** attempt)
      }
    } catch (error) {
      if (!isRetryableNetworkError(error) || attempt >= maxRetries) {
        throw error
      }
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries) {
        await sleep(500 * 2 ** attempt)
      }
    } finally {
      cleanup()
    }
  }

  if (lastStatus) {
    throw Object.assign(new Error(`API 请求失败 (HTTP ${lastStatus})`), { status: lastStatus })
  }
  throw lastError ?? new Error('请求失败')
}

/**
 * 读取错误响应体并格式化为错误信息
 */
export async function readErrorBody(res: Response, prefix: string): Promise<string> {
  try {
    const text = await res.text()
    return `${prefix} (${res.status}): ${text.slice(0, 500)}`
  } catch {
    return `${prefix} (${res.status})`
  }
}

/** 提取错误信息为可读字符串 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

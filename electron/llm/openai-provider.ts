import { ILLMProvider, LLMGenerateOptions, LLMResponse, LLMStreamOptions } from './provider.interface'
import { ModelProfile } from '../../src/shared/ipc-channels'
import {
  fetchWithRetry,
  SSELineBuffer,
  extractSSEData,
  isRetryableNetworkError,
  sleep,
  createTimeoutSignal,
  STREAM_FIRST_BYTE_TIMEOUT_MS,
  STREAM_TOTAL_TIMEOUT_MS,
  readErrorBody,
} from './http-utils'
/**
 * OpenAI 兼容协议 Provider（DeepSeek / 智谱 / Ollama / SiliconFlow / 自定义）
 *
 * 统一语义：
 * - 非流式与流式都剥离 <think> 思维链标签，保证落盘纯净
 * - thinking 模式下不传 temperature
 * - Ollama（provider === 'ollama'）不发送 Authorization 头
 * - 请求带超时 + 指数退避重试
 * - SSE 行缓冲，避免跨分片丢数据
 */
export class OpenAIProvider implements ILLMProvider {
  private isOllama(model: ModelProfile): boolean {
    return model.provider === 'ollama'
  }

  private buildUrl(baseUrl: string, isOllama: boolean): string {
    const base = baseUrl.replace(/\/$/, '')
    // Ollama 原生聊天端点（不走 OpenAI 兼容层时）
    if (isOllama && /\/api\/chat$/.test(base)) {
      return base
    }
    // 已包含完整路径
    if (base.endsWith('/chat/completions')) {
      return base
    }
    // 已包含 /chat 但缺 /completions
    if (base.endsWith('/chat')) {
      return `${base}/completions`
    }
    // 已包含版本号路径（/v1, /v4 等），直接补全 chat/completions
    if (/\/v\d+$/.test(base)) {
      return `${base}/chat/completions`
    }
    // 无版本号路径，补全 /v1/chat/completions
    return `${base}/v1/chat/completions`
  }

  private buildBody(
    model: ModelProfile,
    messages: Array<{ role: string; content: string }>,
    opts: LLMGenerateOptions,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: model.modelName,
      messages,
      max_tokens: opts.maxTokens ?? model.maxTokens,
      stream,
    }

    // 思考模式下 temperature/top_p 等参数不生效（DeepSeek 会静默忽略），仅在非思考模式下传递
    if (opts.thinking) {
      body.thinking = { type: 'enabled' }
    } else {
      body.temperature = opts.temperature ?? model.temperature
    }

    if (opts.responseFormat?.type === 'json_object') {
      body.response_format = { type: 'json_object' }
    }

    return body
  }

  private buildHeaders(model: ModelProfile): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (!this.isOllama(model) && model.apiKey) {
      headers['Authorization'] = `Bearer ${model.apiKey}`
    }
    return headers
  }

  /** 剥离 <think> 标签（含未闭合的情况） */
  private stripThinkingTags(text: string): string {
    return text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim()
  }

  async generate(model: ModelProfile, messages: Array<{ role: string; content: string }>, opts: LLMGenerateOptions): Promise<LLMResponse> {
    try {
      const url = this.buildUrl(model.baseUrl, this.isOllama(model))
      const body = this.buildBody(model, messages, opts, false)

      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: this.buildHeaders(model),
        body: JSON.stringify(body),
        signal: opts.signal,
      })

      if (!res.ok) {
        return { success: false, content: '', error: await readErrorBody(res, 'API 调用失败') }
      }

      const data = await res.json() as {
        choices: Array<{ message: { content: string; reasoning_content?: string } }>
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
      }

      let finalContent = data.choices?.[0]?.message?.content ?? ''
      finalContent = this.stripThinkingTags(finalContent)

      return {
        success: true,
        content: finalContent,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      }
    } catch (error) {
      if (opts.signal?.aborted || (error instanceof Error && error.name === 'AbortError' && opts.signal?.aborted)) {
        return { success: false, content: '', error: '已取消生成' }
      }
      return { success: false, content: '', error: error instanceof Error ? error.message : String(error) }
    }
  }

  async generateStream(model: ModelProfile, messages: Array<{ role: string; content: string }>, opts: LLMStreamOptions): Promise<void> {
    const totalSignal = createTimeoutSignal(opts.signal, STREAM_TOTAL_TIMEOUT_MS)
    try {
      const url = this.buildUrl(model.baseUrl, this.isOllama(model))
      const body = this.buildBody(model, messages, opts, true)

      // 流式：仅在「尚未产出任何 chunk」时对连接失败 / 限流 / 5xx 做有限重试。
      // 每次尝试使用独立的首字节超时信号，避免一次超时毒化后续重试。
      let res: Response | null = null
      let activeCleanup: (() => void) | null = null
      for (let attempt = 0; attempt <= 2; attempt++) {
        const { signal, cleanup } = createTimeoutSignal(totalSignal.signal, STREAM_FIRST_BYTE_TIMEOUT_MS)
        activeCleanup?.()
        activeCleanup = cleanup
        try {
          res = await fetch(url, {
            method: 'POST',
            headers: this.buildHeaders(model),
            body: JSON.stringify(body),
            signal,
          })
          if (res.ok || attempt >= 2) break
          // 可重试状态码：读取并丢弃响应体释放连接后重试
          await res.text().catch(() => {})
          res = null
          await sleep(500 * 2 ** attempt)
        } catch (error) {
          if (attempt < 2 && isRetryableNetworkError(error) && !totalSignal.signal.aborted) {
            await sleep(500 * 2 ** attempt)
            continue
          }
          throw error
        }
      }

      if (!res) throw new Error('无法建立连接')

      if (!res.ok) {
        activeCleanup?.()
        opts.onError(await readErrorBody(res, 'API 调用失败'))
        return
      }

      activeCleanup?.()
      activeCleanup = null

      const reader = res.body?.getReader()
      if (!reader) {
        opts.onError('无法读取响应流')
        return
      }

      const lineBuffer = new SSELineBuffer()
      let fullText = ''
      let isThinking = false
      let finishReason: string | null = null

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = lineBuffer.push(value)
        for (const rawLine of lines) {
          const data = extractSSEData(rawLine)
          if (data === null) continue
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data) as {
              choices: Array<{ delta: { content?: string, reasoning_content?: string, finish_reason?: string | null }, finish_reason?: string | null }>
            }
            const choice = parsed.choices?.[0]
            const finish = choice?.finish_reason ?? choice?.delta?.finish_reason
            if (finish) finishReason = finish
            const delta = choice?.delta

            let emitChunk = ''

            // 如果存在思维链内容
            if (delta?.reasoning_content) {
              if (!isThinking) {
                isThinking = true
                emitChunk += '<think>\n'
              }
              emitChunk += delta.reasoning_content
            }

            // 如果开始输出正文
            if (delta?.content !== undefined && delta?.content !== null) {
              if (isThinking) {
                isThinking = false
                emitChunk += '\n</think>\n\n'
              }
              if (delta?.content) {
                emitChunk += delta.content
              }
            }

            if (emitChunk) {
              fullText += emitChunk
              opts.onChunk(emitChunk)
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }

      const tailLines = lineBuffer.flush()
      for (const rawLine of tailLines) {
        const data = extractSSEData(rawLine)
        if (!data || data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string, finish_reason?: string | null }, finish_reason?: string | null }>
          }
          const choice = parsed.choices?.[0]
          const finish = choice?.finish_reason ?? choice?.delta?.finish_reason
          if (finish) finishReason = finish
          const delta = choice?.delta
          if (delta?.content) {
            fullText += delta.content
            opts.onChunk(delta.content)
          }
        } catch {
          // ignore
        }
      }

      if (isThinking) {
        const closeTag = '\n</think>\n\n'
        fullText += closeTag
        opts.onChunk(closeTag)
      }

      if (finishReason === 'length') {
        opts.onError('输出达到 max_tokens 上限被截断')
      } else {
        opts.onDone(this.stripThinkingTags(fullText))
      }
    } catch (error) {
      if (opts.signal?.aborted || (error instanceof Error && error.name === 'AbortError' && opts.signal?.aborted)) {
        opts.onError('已取消生成')
      } else {
        opts.onError(error instanceof Error ? error.message : String(error))
      }
    } finally {
      totalSignal.cleanup()
    }
  }
}

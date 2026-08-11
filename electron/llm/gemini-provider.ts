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
  readErrorBody,
} from './http-utils'

/**
 * Google Gemini Provider
 *
 * 统一语义：
 * - responseFormat: json_object → generationConfig.responseMimeType = 'application/json'
 * - 剥离 <think> 思维链标签，与非流式/流式行为一致
 * - 请求带超时 + 指数退避重试
 * - SSE 行缓冲，避免跨分片丢数据
 */
export class GeminiProvider implements ILLMProvider {
  private stripThinkingTags(text: string): string {
    return text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim()
  }

  private toGeminiContents(messages: Array<{ role: string; content: string }>) {
    let systemInstruction: string | undefined
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content
        continue
      }
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }
    return { contents, systemInstruction }
  }

  private buildBody(
    model: ModelProfile,
    messages: Array<{ role: string; content: string }>,
    opts: LLMGenerateOptions,
  ): Record<string, unknown> {
    const { contents, systemInstruction } = this.toGeminiContents(messages)

    const generationConfig: Record<string, unknown> = {
      temperature: opts.temperature ?? model.temperature,
      maxOutputTokens: opts.maxTokens ?? model.maxTokens,
    }
    if (opts.responseFormat?.type === 'json_object') {
      generationConfig.responseMimeType = 'application/json'
    }

    const body: Record<string, unknown> = { contents, generationConfig }
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }
    return body
  }

  private buildHeaders(model: ModelProfile): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': model.apiKey,
    }
  }

  private parseUsage(data: {
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
  }): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
    if (!data.usageMetadata) return undefined
    return {
      promptTokens: data.usageMetadata.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata.totalTokenCount ?? 0,
    }
  }

  async generate(model: ModelProfile, messages: Array<{ role: string; content: string }>, opts: LLMGenerateOptions): Promise<LLMResponse> {
    try {
      const baseUrl = model.baseUrl.replace(/\/$/, '')
      const url = `${baseUrl}/v1beta/models/${model.modelName}:generateContent`
      const body = this.buildBody(model, messages, opts)

      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: this.buildHeaders(model),
        body: JSON.stringify(body),
        signal: opts.signal,
      })

      if (!res.ok) {
        return { success: false, content: '', error: await readErrorBody(res, 'Gemini API 调用失败') }
      }

      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      return { success: true, content: this.stripThinkingTags(text), usage: this.parseUsage(data) }
    } catch (error) {
      if (opts.signal?.aborted || (error instanceof Error && error.name === 'AbortError' && opts.signal?.aborted)) {
        return { success: false, content: '', error: '已取消生成' }
      }
      return { success: false, content: '', error: error instanceof Error ? error.message : String(error) }
    }
  }

  async generateStream(model: ModelProfile, messages: Array<{ role: string; content: string }>, opts: LLMStreamOptions): Promise<void> {
    try {
      const baseUrl = model.baseUrl.replace(/\/$/, '')
      const url = `${baseUrl}/v1beta/models/${model.modelName}:streamGenerateContent?alt=sse`
      const body = this.buildBody(model, messages, opts)

      // 流式：仅在「尚未产出任何 chunk」时对连接失败 / 限流 / 5xx 做有限重试。
      // 每次尝试使用独立的首字节超时信号，避免一次超时毒化后续重试。
      let res: Response | null = null
      let activeCleanup: (() => void) | null = null
      for (let attempt = 0; attempt <= 2; attempt++) {
        const { signal, cleanup } = createTimeoutSignal(opts.signal, STREAM_FIRST_BYTE_TIMEOUT_MS)
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
          await res.text().catch(() => {})
          res = null
          await sleep(500 * 2 ** attempt)
        } catch (error) {
          if (attempt < 2 && isRetryableNetworkError(error) && !opts.signal?.aborted) {
            await sleep(500 * 2 ** attempt)
            continue
          }
          throw error
        }
      }

      if (!res) throw new Error('无法建立连接')

      if (!res.ok) {
        activeCleanup?.()
        opts.onError(await readErrorBody(res, 'Gemini API 调用失败'))
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        activeCleanup?.()
        opts.onError('无法读取 Gemini 响应流')
        return
      }

      const lineBuffer = new SSELineBuffer()
      let fullText = ''
      let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = lineBuffer.push(value)
        for (const rawLine of lines) {
          const data = extractSSEData(rawLine)
          if (data === null) continue
          try {
            const parsed = JSON.parse(data) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
              usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
            }
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (chunk) {
              fullText += chunk
              opts.onChunk(chunk)
            }
            if (parsed.usageMetadata) {
              usage = {
                promptTokens: parsed.usageMetadata.promptTokenCount ?? 0,
                completionTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
                totalTokens: parsed.usageMetadata.totalTokenCount ?? 0,
              }
            }
          } catch {
            // ignore
          }
        }
      }

      const tailLines = lineBuffer.flush()
      for (const rawLine of tailLines) {
        const data = extractSSEData(rawLine)
        if (!data) continue
        try {
          const parsed = JSON.parse(data) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
            usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
          }
          const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
          if (chunk) {
            fullText += chunk
            opts.onChunk(chunk)
          }
          if (parsed.usageMetadata) {
            usage = {
              promptTokens: parsed.usageMetadata.promptTokenCount ?? 0,
              completionTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: parsed.usageMetadata.totalTokenCount ?? 0,
            }
          }
        } catch {
          // ignore
        }
      }

      activeCleanup?.()
      opts.onDone(this.stripThinkingTags(fullText), usage)
    } catch (error) {
      if (opts.signal?.aborted || (error instanceof Error && error.name === 'AbortError' && opts.signal?.aborted)) {
        opts.onError('已取消生成')
      } else {
        opts.onError(error instanceof Error ? error.message : String(error))
      }
    }
  }
}

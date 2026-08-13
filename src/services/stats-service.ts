/**
 * stats-service — LLM 调用统计数据访问服务
 *
 * 封装 BottomPanel ModelsView 中的 IPC 调用。
 */

import { ipc } from './ipc-client'

/** LLM 调用统计 */
export interface LLMStats {
  totalCalls: number
  totalTokens: number
  totalPromptTokens: number
  totalCompletionTokens: number
  /** 统计归属的当前项目路径 */
  projectPath: string | null
}

/** LLM 调用记录 */
export interface LLMCallRecord {
  id: number
  modelName: string
  purpose: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  durationMs: number
  success: boolean
  createdAt: string
}

/** 获取 LLM 调用统计（当前项目）。无打开项目时返回 null，明确不显示。 */
export async function getLLMStats(): Promise<LLMStats | null> {
  const current = await ipc.invoke('project:get-current')
  if (!current?.path) return null
  const stats = await ipc.invoke('db:get-llm-stats')
  return {
    totalCalls: stats.totalCalls,
    totalTokens: stats.totalTokens,
    totalPromptTokens: stats.totalPromptTokens,
    totalCompletionTokens: stats.totalCompletionTokens,
    projectPath: current.path,
  }
}

/** 获取最近 LLM 调用记录（当前项目）。无打开项目时返回空。 */
export async function getLLMHistory(limit = 30): Promise<LLMCallRecord[]> {
  const current = await ipc.invoke('project:get-current')
  if (!current?.path) return []
  return (await ipc.invoke('db:get-llm-history', limit)) as unknown as LLMCallRecord[]
}

/** 同时加载统计和历史（常用组合） */
export async function loadLLMData(limit = 30): Promise<{ stats: LLMStats | null; history: LLMCallRecord[] }> {
  const current = await ipc.invoke('project:get-current')
  if (!current?.path) return { stats: null, history: [] }
  const [stats, history] = await Promise.all([
    getLLMStats(),
    getLLMHistory(limit),
  ])
  return { stats, history }
}

/**
 * Luobi 知识库管理 — 主进程使用
 *
 * 管理文档导入、向量化和检索
 * 底层存储已从 vectors.json 迁移至 LanceDB（{projectPath}/.luobi/lancedb/）
 *
 * 检索模式：
 * - 默认：BM25 全文检索（FTS），零配置即可用
 * - 增强：FTS + 向量近邻混合检索（需配置 Embedding 模型）
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { chunkText, generateEmbeddings } from './embedding'
import { ensureProjectStorage } from './utils/project-storage'
import {
  addChunks,
  removeDocument as removeDocFromStore,
  searchWithScope as storeSearchWithScope,
  listDocuments as storeListDocuments,
  getStats as storeGetStats,
  migrateFromJSON,
  getChunksWithoutVectors as storeGetChunksWithoutVectors,
  getChunksForBackfill,
  updateChunkVectors,
} from './vector-store'

// ===== 迁移状态跟踪 =====

/** 已执行过迁移检查的项目路径集合 */
const migratedProjects = new Set<string>()

/** 确保旧数据已迁移 */
async function ensureMigration(projectPath: string): Promise<void> {
  if (migratedProjects.has(projectPath)) return
  migratedProjects.add(projectPath)

  const jsonPath = path.join(ensureProjectStorage(projectPath), 'vectors.json')
  if (fs.existsSync(jsonPath)) {
    await migrateFromJSON(projectPath)
  }
}

// ===== 导出函数（保持旧签名，IPC 层零改动） =====

/**
 * 导入文档到知识库（单文件，从磁盘读取）
 * 始终建立 FTS 索引；有 Embedding 配置时额外生成向量
 */
export async function importDocument(
  filePath: string,
  projectPath: string,
  protocol: 'openai' | 'gemini',
  model: { baseUrl: string; apiKey: string },
  onProgress?: (progress: number, message: string) => void,
): Promise<{ success: boolean; docId?: string; chunkCount?: number; error?: string }> {
  try {
    await ensureMigration(projectPath)

    // 1. 读取文件
    const fileName = path.basename(filePath)
    const ext = path.extname(filePath).toLowerCase()
    if (!['.txt', '.md', '.markdown'].includes(ext)) {
      return { success: false, error: `不支持的文件类型: ${ext}，仅支持 .txt / .md` }
    }

    onProgress?.(5, `正在读取 ${fileName}...`)
    const content = fs.readFileSync(filePath, 'utf-8')
    if (!content.trim()) {
      return { success: false, error: '文件内容为空' }
    }

    // 2. 分块
    onProgress?.(10, '正在分块...')
    const chunks = chunkText(content, 500, 50)
    const docId = randomUUID()

    // 3. 可选：生成向量（如果有 Embedding 配置）
    let vectors: number[][] | undefined
    if (model.apiKey) {
      try {
        onProgress?.(20, `正在向量化 ${chunks.length} 个块...`)
        vectors = await generateEmbeddings(chunks, protocol, model)
      } catch (e) {
        console.warn('[Luobi KB] Embedding 调用失败，降级为 FTS-only:', e)
        // 不影响导入，仅 FTS
      }
    }

    // 4. 写入 LanceDB（text + 元数据 + 可选向量）
    onProgress?.(80, '正在保存...')
    const result = await addChunks(projectPath, docId, fileName, chunks, vectors, filePath)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    onProgress?.(100, `✅ 已导入 ${fileName}（${chunks.length} 个块）`)
    return { success: true, docId, chunkCount: chunks.length }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * 检索知识库
 * 有 Embedding 配置时 → 混合检索（FTS + 向量）
 * 无 Embedding 配置时 → 纯 FTS 检索
 */
export async function searchKnowledge(
  query: string,
  projectPath: string,
  protocol: 'openai' | 'gemini',
  model: { baseUrl: string; apiKey: string },
  topK: number = 5,
  chapterScope?: [number, number],
): Promise<Array<{ text: string; score: number; fileName: string }>> {
  await ensureMigration(projectPath)

  // 可选：生成查询向量
  let queryVector: number[] | undefined
  if (model.apiKey && query.trim()) {
    try {
      const [vec] = await generateEmbeddings([query], protocol, model)
      if (vec && vec.length > 0) {
        queryVector = vec
      }
    } catch {
      // Embedding 不可用，降级为 FTS
    }
  }

  return storeSearchWithScope(projectPath, query, queryVector, topK, chapterScope)
}

/**
 * 列出已导入文档
 */
export function listDocuments(projectPath: string) {
  return storeListDocuments(projectPath)
}

/**
 * 删除文档
 */
export async function removeDocument(docId: string, projectPath: string): Promise<boolean> {
  return removeDocFromStore(projectPath, docId)
}

/**
 * 获取知识库统计
 */
export async function getKnowledgeStats(projectPath: string): Promise<{
  documentCount: number
  totalChunks: number
  vectorDimension: number
}> {
  const stats = await storeGetStats(projectPath)
  return {
    documentCount: stats.documentCount,
    totalChunks: stats.totalChunks,
    vectorDimension: stats.vectorDimension,
  }
}

/**
 * 批量导入文件夹到知识库（递归扫描所有 .txt / .md 文件）
 */
export async function importFolder(
  folderPath: string,
  projectPath: string,
  protocol: 'openai' | 'gemini',
  model: { baseUrl: string; apiKey: string },
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<{
  success: boolean
  importedCount: number
  failedFiles: string[]
  error?: string
}> {
  try {
    // 递归收集所有 .txt / .md 文件
    const collectFiles = (dir: string): string[] => {
      const result: string[] = []
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          result.push(...collectFiles(fullPath))
        } else if (/\.(txt|md|markdown)$/i.test(entry.name)) {
          result.push(fullPath)
        }
      }
      return result
    }

    const files = collectFiles(folderPath)
    if (files.length === 0) return { success: true, importedCount: 0, failedFiles: [] }

    const failedFiles: string[] = []
    let importedCount = 0

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i]
      const fileName = path.basename(filePath)
      onProgress?.(i + 1, files.length, fileName)

      const result = await importDocument(filePath, projectPath, protocol, model)
      if (result.success) {
        importedCount++
      } else {
        failedFiles.push(fileName)
      }
    }

    return { success: true, importedCount, failedFiles }
  } catch (error) {
    return { success: false, importedCount: 0, failedFiles: [], error: String(error) }
  }
}

/**
 * 直接将文本字符串内容导入知识库
 * 用于定稿后自动导入、按章推演等无文件场景
 */
/**
 * 从文件名解析章节元数据
 * 支持格式：第{N}章 {title} xxx.md
 */
function parseChapterMetaFromFileName(fileName: string): { chapterNumber?: number; chapterTitle?: string } | undefined {
  const match = fileName.match(/^第(\d+)章\s+(.+?)\s+(正文|要点|蓝图)\.md$/)
  if (match) {
    return {
      chapterNumber: parseInt(match[1]),
      chapterTitle: match[2],
    }
  }
  return undefined
}

export async function importText(
  text: string,
  fileName: string,
  projectPath: string,
  protocol: 'openai' | 'gemini',
  model: { baseUrl: string; apiKey: string },
): Promise<{ success: boolean; docId?: string; chunkCount?: number; error?: string }> {
  try {
    if (!text.trim()) return { success: false, error: '文本内容为空' }

    await ensureMigration(projectPath)

    // 分块
    const chunks = chunkText(text)
    const docId = randomUUID()

    // 解析章节元数据（从文件名提取）
    const chapterMeta = parseChapterMetaFromFileName(fileName)

    // 可选：生成向量
    let vectors: number[][] | undefined
    if (model.apiKey) {
      try {
        vectors = await generateEmbeddings(chunks, protocol, model)
      } catch (e) {
        console.warn('[Luobi KB] importText Embedding 失败，降级 FTS-only:', e)
      }
    }

    // 先删除同名旧文档（幂等性由 vector-store 的 addChunks 内部处理 documents 表）
    // 但 chunks 表需要手动清理旧的同名文档块
    const existingDocs = await storeListDocuments(projectPath)
    const existingDoc = existingDocs.find(d => d.fileName === fileName)
    if (existingDoc) {
      await removeDocFromStore(projectPath, existingDoc.id)
    }

    const result = await addChunks(projectPath, docId, fileName, chunks, vectors, undefined, chapterMeta)
    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, docId, chunkCount: chunks.length }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ===== 向量回填相关 =====

/**
 * 获取缺少向量的块数量
 */
export async function getVectorlessCount(projectPath: string): Promise<{ count: number }> {
  return storeGetChunksWithoutVectors(projectPath)
}

/**
 * 批量回填向量（为无向量的块生成 Embedding 并写回）
 * 分批增量处理：复用 vector-store 的 getChunksForBackfill / updateChunkVectors，
 * 避免 drop 整表重建导致中途崩溃丢库。
 */
export async function backfillVectors(
  projectPath: string,
  protocol: 'openai' | 'gemini',
  model: { baseUrl: string; apiKey: string },
): Promise<{ success: boolean; processed: number; failed: number; error?: string }> {
  try {
    const { count: total } = await storeGetChunksWithoutVectors(projectPath)
    if (total === 0) return { success: true, processed: 0, failed: 0 }

    const BATCH_SIZE = 50
    let processed = 0
    let failed = 0

    while (true) {
      const missing = await getChunksForBackfill(projectPath, BATCH_SIZE)
      if (missing.length === 0) break

      const vectors = await generateEmbeddings(missing.map(m => m.text), protocol, model)
      const updates = missing
        .map((m, i) => ({ id: m.id, vector: vectors[i] }))
        .filter(u => u.vector && u.vector.length > 0)

      if (updates.length > 0) {
        const res = await updateChunkVectors(projectPath, updates)
        if (!res.success) return { success: false, processed, failed: failed + missing.length, error: '向量写回失败' }
        processed += res.count
      }
      failed += missing.length - updates.length
      // embedding 全部失败时不再死循环
      if (updates.length === 0) break
    }

    return { success: true, processed, failed }
  } catch (error) {
    console.error('[Luobi KB] 向量回填异常:', error)
    return { success: false, processed: 0, failed: 0, error: String(error) }
  }
}

/**
 * FTS-only 检索（不需要 Embedding 配置）
 * 用于 IPC 层在无 Embedding 模型时直接调用
 */
export async function searchKnowledgeFTS(
  query: string,
  projectPath: string,
  topK: number = 5,
  chapterScope?: [number, number],
): Promise<Array<{ text: string; score: number; fileName: string }>> {
  await ensureMigration(projectPath)
  return storeSearchWithScope(projectPath, query, undefined, topK, chapterScope)
}

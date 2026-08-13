/**
 * ManuscriptGroup — 正文章节折叠组（已定稿章节列表）
 */

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, FileText, FolderOpen, Copy, PenTool, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FileNode } from '../../../shared/ipc-channels'
import { ipc } from '../../../services/ipc-client'
import { useProjectStore } from '../../../stores/project-store'
import i18n from '../../../i18n'

import { showSidebarMenu, openChapterFile } from './SidebarSharedUtils'
import { chapterTitleCache } from './chapter-title-cache'
import { useDraftStore } from '../../../stores/draft-store'
import { confirm } from '../../ui/Confirm'

// ===== 章节标题缓存 =====

/** 章节标题内存缓存：path → 显示名（进程内常驻，避免大量重复 IPC 读取） */

/** 清除特定文件的章节标题缓存 */

/**
 * 优先从蓝图 JSON 读取章节标题，fallback 到文件首行
 *
 * @param filePath    manuscript 文件路径
 * @param fallback    兜底显示名（如 "第1章"）
 * @param chapterNumber 章节号（用于定位蓝图文件）
 */
async function readChapterTitle(filePath: string, fallback: string, chapterNumber?: number): Promise<string> {
  if (chapterTitleCache.has(filePath)) return chapterTitleCache.get(filePath)!

  // 优先从蓝图 JSON 读取标题
  if (chapterNumber) {
    try {
      const project = useProjectStore.getState().currentProject
      if (project) {
        const bpResult = await ipc.invoke('db:blueprint-get', chapterNumber)
        if (bpResult) {
          const display = i18n.t('manuscript.chapterFormatWithTitle', { number: chapterNumber, title: bpResult.title, ns: 'panels' })
          chapterTitleCache.set(filePath, display)
          return display
        }
      }
    } catch { /* 蓝图读取失败时 fallback 到文件首行 */ }
  }

  // fallback: 读取正文首行
  let fileContent = ''
  if (filePath.startsWith('luobi://')) {
    const { readLuobiContent } = await import('../../../services/luobi-protocol')
    fileContent = await readLuobiContent(filePath)
  } else {
    const result = await ipc.invoke('fs:read-file', filePath)
    if (result.success) fileContent = result.content
  }

  if (!fileContent) return fallback
  const firstLine = fileContent.split('\n').find((l: string) => l.trim())
  if (!firstLine) return fallback
  const title = firstLine.replace(/^#+\s*/, '').trim()
  const display = title || fallback
  chapterTitleCache.set(filePath, display)
  return display
}

// ===== 正文章节组件 =====

export default function ManuscriptGroup({ files }: { files: FileNode[]; projectPath: string }) {
  const { t } = useTranslation('panels')
  const [open, setOpen] = useState(true)
  // 文件路径 → 显示名称的映射（异步加载）
  const [titleMap, setTitleMap] = useState<Record<string, string>>({})

  // 每次 files 变化时异步读取各文件标题（命中缓存的路径直接跳过 IPC）
  const filesDep = files.map(f => f.path).join(',')
  useEffect(() => {
    if (files.length === 0) return
    let cancelled = false
    const load = async () => {
      // 只读取当前 state 中还没有的路径（增量更新，避免重复 IPC 调用）
      const missing = files.filter(f => !f.name.includes('_notes') && !titleMap[f.path])
      if (missing.length === 0) return
      const entries: Record<string, string> = {}
      await Promise.all(
        missing.map(async (f) => {
          const rawName = f.name.replace(/\.[^.]+$/, '')
          const chMatch = rawName.match(/^chapter_(\d+)$/)
          const fallback = chMatch ? i18n.t('manuscript.chapterFormat', { number: parseInt(chMatch[1], 10), ns: 'panels' }) : rawName
          const chNum = chMatch ? parseInt(chMatch[1], 10) : undefined
          entries[f.path] = await readChapterTitle(f.path, fallback, chNum)
        })
      )
      if (!cancelled) setTitleMap(prev => ({ ...prev, ...entries }))
    }
    load()
    return () => { cancelled = true }
  }, [files, filesDep, titleMap])

  const getDisplay = (f: FileNode) => {
    if (titleMap[f.path]) return titleMap[f.path]
    const rawName = f.name.replace(/\.[^.]+$/, '')
    const chMatch = rawName.match(/^chapter_(\d+)$/)
    return chMatch ? i18n.t('manuscript.chapterFormat', { number: parseInt(chMatch[1], 10), ns: 'panels' }) : rawName
  }

  /** 删除正文章节：将对应已定稿草稿移入垃圾桶（可恢复），从正文列表移除 */
  const deleteChapter = async (filePath: string, name: string) => {
    const ok = await confirm(
      t('manuscript.deleteConfirm', { name }),
      { title: t('manuscript.deleteTitle'), confirmText: t('manuscript.deleteConfirmBtn'), danger: true }
    )
    if (!ok) return
    const idMatch = filePath.match(/^luobi:\/\/manuscript\/(\d+)$/)
    if (!idMatch) return
    const draftId = Number(idMatch[1])
    await ipc.invoke('db:draft-update-status', draftId, 'archived')
    await useDraftStore.getState().loadAllDrafts()
  }

  // 只显示正文章节（过滤掉旧的 _notes 文件）
  const chapterFiles = files.filter(f => !f.name.includes('_notes'))

  return (
    <div>
      <button
        type="button"
        className="tree-item gap-1.5 cursor-pointer select-none w-full bg-transparent border-none py-0 text-left"
        style={{ paddingLeft: 10 }}
        onClick={() => setOpen(v => !v)}
      >
        {open
          ? <ChevronDown size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        }
        <PenTool size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('manuscript.chapters')}</span>
        {chapterFiles.length > 0 && (
          <span className="ml-auto text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
            {chapterFiles.length} {t('common:chapters')}
          </span>
        )}
      </button>
      {open && (
        <div>
          {chapterFiles.length === 0 ? (
            <div className="text-xs py-1" style={{ paddingLeft: 34, color: 'var(--color-text-muted)' }}>
              {t('manuscript.noFinalizedChapters')}
            </div>
          ) : (
            chapterFiles.map(f => {
              const displayName = getDisplay(f)
              return (
                <button
                  key={f.path}
                  type="button"
                  className="tree-item gap-1.5 cursor-pointer w-full bg-transparent border-none py-0 text-left"
                  style={{ paddingLeft: 30 }}
                  onClick={() => openChapterFile(f.path, displayName)}
                  onContextMenu={e => showSidebarMenu([
                    {
                      key: 'open',
                      label: t('manuscript.openChapter'),
                      icon: <FolderOpen size={13} />,
                      onClick: () => openChapterFile(f.path, displayName),
                    },
                    { key: 'div1', type: 'divider' as const },
                    {
                      key: 'copy-path',
                      label: t('manuscript.copyPath'),
                      icon: <Copy size={13} />,
                      onClick: () => navigator.clipboard.writeText(f.path).catch(() => { }),
                    },
                    { key: 'div2', type: 'divider' as const },
                    {
                      key: 'delete',
                      label: t('manuscript.deleteChapter'),
                      icon: <Trash2 size={13} />,
                      danger: true,
                      onClick: () => deleteChapter(f.path, displayName),
                    },
                  ], e)}
                  title={`${t('manuscript.clickToOpen')} — ${displayName}`}
                >
                  <FileText size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <span className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {displayName}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

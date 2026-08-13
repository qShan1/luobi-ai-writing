/**
 * DraftBoxGroup — 草稿箱折叠组（含章节分组和单条草稿条目）
 */

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, CheckCircle2, Circle, FileText, FolderOpen, Copy, Trash2, FilePen, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DraftMeta } from '../../../stores/draft-store'
import { useDraftStore, readDraftBody } from '../../../stores/draft-store'
import { useEditorStore } from '../../../stores/editor-store'
import { confirm } from '../../ui/Confirm'
import { DRAFT_STATUS_LABEL, DRAFT_STATUS_COLOR } from '../../../shared/draft-status'
import { showSidebarMenu } from './SidebarSharedUtils'
import { ipc } from '../../../services/ipc-client'

// ===== 草稿箱折叠组 =====

export default function DraftBoxGroup({
  draftsByChapter,
}: {
  draftsByChapter: Record<number, DraftMeta[]>
}) {
  const { t } = useTranslation('panels')
  const [open, setOpen] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // 所有章节号排序
  const chapterNums = Object.keys(draftsByChapter)
    .map(Number)
    .sort((a, b) => a - b)

  // 筛选出包含非保留（活跃）草稿的实际章节数
  const activeChapterCount = chapterNums.filter(n =>
    (draftsByChapter[n] || []).some(d => d.status !== 'archived' && d.status !== 'finalized')
  ).length

  const toggleSelected = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const archiveSelected = async () => {
    const selected = Object.values(draftsByChapter).flat().filter(d => selectedIds.has(d.id) && d.status !== 'finalized')
    if (selected.length === 0) return
    const ok = await confirm(t('draftBox.batchArchiveConfirm', { count: selected.length }), {
      title: t('draftBox.batchArchiveTitle'),
      confirmText: t('draftBox.batchArchive'),
      danger: true,
    })
    if (!ok) return
    for (const draft of selected) {
      await useDraftStore.getState().markDraftStatus(draft.filePath, draft.chapterNumber, 'archived')
    }
    setSelectedIds(new Set())
    await useDraftStore.getState().loadAllDrafts()
  }

  return (
    <div>
      {/* 草稿箱标题行 */}
      <div className="flex items-center">
        <button
          type="button"
          className="tree-item flex-1 gap-1.5 cursor-pointer select-none bg-transparent border-none py-0 text-left"
          style={{ paddingLeft: 10 }}
          onClick={() => setOpen(v => !v)}
          title={t('draftBox.tooltip')}
        >
          {open
            ? <ChevronDown size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            : <ChevronRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          }
          <FilePen size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('draftBox.title')}</span>
          {activeChapterCount > 0 && (
            <span className="ml-auto text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
              {activeChapterCount} {t('common:chapters')}
            </span>
          )}
        </button>
        {selectedIds.size > 0 && (
          <button
            type="button"
            className="mr-2 flex items-center gap-1 rounded px-1.5 py-1 text-[0.65rem] text-[var(--color-accent)] hover:bg-[var(--color-hover)]"
            onClick={archiveSelected}
            title={t('draftBox.batchArchive')}
          >
            <Archive size={12} /> {selectedIds.size}
          </button>
        )}
      </div>

      {open && (
        <div>
          {chapterNums.length === 0 ? (
            <div
              className="text-xs py-1"
              style={{ paddingLeft: 34, color: 'var(--color-text-muted)' }}
            >
              {t('draftBox.noDrafts')}
            </div>
          ) : (
            chapterNums.map(chNum => (
              <DraftChapterGroup
                key={chNum}
                chapterNumber={chNum}
                drafts={draftsByChapter[chNum] || []}
                t={t}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ===== 单章草稿分组 =====

function DraftChapterGroup({
  chapterNumber,
  drafts,
  t,
  selectedIds,
  onToggleSelected,
}: {
  chapterNumber: number
  drafts: DraftMeta[]
  t: (key: string, opts?: Record<string, unknown>) => string
  selectedIds: Set<number>
  onToggleSelected: (id: number) => void
}) {
  const [open, setOpen] = useState(true)

  // 将 archived 草稿折叠，只显示活跃草稿（非 archived）
  const activeDrafts = drafts.filter(d => d.status !== 'archived' && d.status !== 'finalized')
  const archivedDrafts = drafts.filter(d => d.status === 'archived')
  const [showArchived, setShowArchived] = useState(false)
  const [bpTitle, setBpTitle] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ipc.invoke('db:blueprint-get', chapterNumber).then(bp => {
      if (!cancelled && bp?.title) {
        setBpTitle(bp.title)
      }
    }).catch(() => { })
    return () => { cancelled = true }
  }, [chapterNumber])

  // 已定稿的草稿存在时，章节显示绿色标记
  const hasFinalized = drafts.some(d => d.status === 'finalized')
  const baseTitle = bpTitle || drafts[0]?.chapterTitle || ''
  const chapterPrefix = t('manuscript.chapterFormat', { number: chapterNumber })
  const displayTitle = baseTitle.startsWith(chapterPrefix) ? baseTitle : (baseTitle ? `${chapterPrefix} ${baseTitle}` : chapterPrefix)

  return (
    <div>
      {/* 章节行 */}
      <button
        type="button"
        className="tree-item gap-1.5 cursor-pointer select-none w-full bg-transparent border-none py-0 text-left"
        style={{ paddingLeft: 26 }}
        onClick={() => setOpen(v => !v)}
        title={displayTitle}
      >
        {open
          ? <ChevronDown size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        }
        {hasFinalized
          ? <CheckCircle2 size={10} style={{ flexShrink: 0, color: 'var(--color-success)' }} />
          : <Circle size={6} style={{ flexShrink: 0, fill: 'transparent', stroke: 'var(--color-text-muted)' }} />
        }
        <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {displayTitle}
        </span>
        <span className="ml-auto text-[0.7rem] flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {t('drafts.draftsCount', { count: activeDrafts.length })}
        </span>
      </button>

      {/* 草稿列表 */}
      {open && (
        <div>
          {activeDrafts.map(draft => (
            <DraftItem
              key={draft.filePath}
              draft={draft}
              chapterTitleText={displayTitle}
              t={t}
              selected={selectedIds.has(draft.id)}
              onToggleSelected={() => onToggleSelected(draft.id)}
            />
          ))}

          {/* 显示归档草稿的切换按钮 */}
          {archivedDrafts.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1 cursor-pointer select-none w-full bg-transparent border-none py-0 text-left rounded-[var(--radius-sm)] transition-[background-color,transform] duration-150 ease-out hover:bg-[var(--color-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              style={{ paddingLeft: 54 }}
              onClick={() => setShowArchived(v => !v)}
            >
              <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                {showArchived ? t('drafts.hide') : t('drafts.archived', { count: archivedDrafts.length })}
              </span>
            </button>
          )}
          {showArchived && archivedDrafts.map(draft => (
            <DraftItem
              key={draft.filePath}
              draft={draft}
              chapterTitleText={displayTitle}
              archived
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ===== 单条草稿条目 =====

function DraftItem({
  draft,
  chapterTitleText,
  archived = false,
  t,
  selected = false,
  onToggleSelected,
}: {
  draft: DraftMeta
  chapterTitleText: string
  archived?: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
  selected?: boolean
  onToggleSelected?: () => void
}) {
  /** 打开草稿到编辑器 */
  const openDraft = async () => {
    const content = await readDraftBody(draft.filePath)
    useEditorStore.getState().openFile({
      id: draft.filePath,
      name: `${chapterTitleText} v${draft.version}`,
      type: 'chapter',
      filePath: draft.filePath,
      content,
    })
  }

  /** 将草稿标记为归档（软删除） */
  const deleteDraft = async () => {
    if (isFinalized) return
    const ok = await confirm(
      t('drafts.confirmArchive', { title: `${chapterTitleText} v${draft.version}` }),
      { title: t('drafts.confirmArchiveTitle'), confirmText: t('drafts.confirmArchiveBtn'), danger: true }
    )
    if (!ok) return
    await useDraftStore.getState().markDraftStatus(draft.filePath, draft.chapterNumber, 'archived')
  }

  const isFinalized = draft.status === 'finalized'

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-hover)] w-full rounded-[var(--radius-sm)] transition-[background-color,transform] duration-150 ease-out"
      style={{
        paddingLeft: 50,
        paddingRight: 8,
        paddingTop: 3,
        paddingBottom: 3,
        opacity: archived ? 0.45 : 1,
      }}
      onClick={openDraft}
      onContextMenu={e => showSidebarMenu([
        {
          key: 'open',
          label: t('drafts.openDraft'),
          icon: <FolderOpen size={13} />,
          onClick: openDraft,
        },
        { key: 'div1', type: 'divider' as const },
        {
          key: 'copy-path',
          label: t('drafts.copyFilePath'),
          icon: <Copy size={13} />,
          onClick: () => navigator.clipboard.writeText(draft.filePath).catch(() => { }),
        },
        { key: 'div2', type: 'divider' as const },
        {
          key: 'delete',
          label: t('drafts.deleteDraft'),
          icon: <Trash2 size={13} />,
          danger: true,
          disabled: isFinalized,
          onClick: deleteDraft,
        },
      ], e)}
      title={t('drafts.clickToOpenTitle', { title: `${chapterTitleText} v${draft.version}`, status: DRAFT_STATUS_LABEL[draft.status] || draft.status })}
    >
      {!archived && onToggleSelected && (
        <input
          type="checkbox"
          checked={selected}
          disabled={isFinalized}
          onChange={onToggleSelected}
          onClick={e => e.stopPropagation()}
          aria-label={t('draftBox.selectDraft', { version: draft.version })}
          className="ml-1 h-3 w-3 flex-shrink-0 accent-[var(--color-accent)]"
        />
      )}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-1.5 bg-transparent border-none text-left"
        onClick={openDraft}
      >
      <FileText size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
        {t('drafts.draftVersion', { version: draft.version })}
      </span>
      {/* 状态标签（始终显示） */}
      <span
        className="text-[0.7rem] flex-shrink-0"
        style={{ color: DRAFT_STATUS_COLOR[draft.status] || 'var(--color-text-muted)' }}
      >
        {DRAFT_STATUS_LABEL[draft.status] || draft.status}
      </span>
      {/* 已定稿图标 */}
      {isFinalized && (
        <CheckCircle2 size={10} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
      )}
      </button>
    </div>
  )
}

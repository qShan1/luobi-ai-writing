import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Trash2, ChevronsDown, Loader2, CheckCircle2, XCircle, Clock,
  Play, X, ChevronDown, ChevronRight, Zap, RefreshCw, RotateCcw, Download,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLayoutStore } from '../../stores/layout-store'
import {
  useWorkflowStore,
  type WorkflowStep, type WorkflowRun, type WorkflowType, type WorkflowDefinition,
} from '../../stores/workflow-store'
import { Button } from '../ui/Button'
import { IconBtn } from '../ui/IconBtn'
import { Skeleton } from '../ui/Skeleton'
import { toast } from '../ui/Toast'
import { ipc } from '../../services/ipc-client'
import { createArchitectureWorkflow } from '../../services/workflows/architecture-workflow'
import { createDirectoryWorkflow } from '../../services/workflows/directory-workflow'

/** 下方工具窗口 */
export default function BottomPanel() {
  const { t } = useTranslation('panels')
  const bottomPanelOpen = useLayoutStore(s => s.bottomPanelOpen)
  const bottomTab = useLayoutStore(s => s.bottomTab)
  const toggleBottomPanel = useLayoutStore(s => s.toggleBottomPanel)
  const activeRuns = useWorkflowStore(s => s.activeRuns)

  const TAB_LABELS: Record<string, string> = {
    tasks: t('bottomPanel.tabs.tasks'),
    log: t('bottomPanel.tabs.log'),
    models: t('bottomPanel.tabs.models'),
  }

  if (!bottomPanelOpen) return null

  const activeTab = bottomTab || 'tasks'
  const label = TAB_LABELS[activeTab] ?? activeTab
  // 任何活跃任务运行中
  const hasRunning = activeRuns.some(r => r.status === 'running')
  const hasWaiting = activeRuns.some(r => r.status === 'waiting')

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--color-panel)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* 面板标题头 */}
      <div
        className="no-select flex items-center justify-between flex-shrink-0 px-3"
        style={{ height: 'var(--height-panel-header)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* 左侧：面板名称 + 可选状态点 */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {label}
          </span>
          {/* 运行中指示 */}
          {activeTab === 'tasks' && hasRunning && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)' }} />
          )}
          {activeTab === 'tasks' && hasWaiting && !hasRunning && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-warning)' }} />
          )}
          {/* 活跃任务数徽章 */}
          {activeTab === 'tasks' && activeRuns.length > 0 && (
            <span
              className="text-[0.68rem] font-mono px-1.5 rounded-full"
              style={{ backgroundColor: 'color-mix(in_srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)' }}
            >
              {activeRuns.length}
            </span>
          )}
        </div>

        {/* 右侧：关闭按钮 */}
        <IconBtn onClick={toggleBottomPanel} title={t('common.closePanel')} size={18}>
          <X size={12} strokeWidth={1.5} />
        </IconBtn>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            className="w-full h-full"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {activeTab === 'tasks'  && <TaskRunView />}
            {activeTab === 'log'    && <LogsView />}
            {activeTab === 'models' && <ModelsView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}


// ===== ⚡ 任务视图（工作流进度主视图）— 支持多任务 =====

function TaskRunView() {
  const { t } = useTranslation('panels')
  const activeRuns = useWorkflowStore(s => s.activeRuns)
  const history = useWorkflowStore(s => s.history)
  const waitingRuns = useWorkflowStore(s => s.waitingRuns)
  const cancelWorkflow = useWorkflowStore(s => s.cancelWorkflow)
  const confirmContinue = useWorkflowStore(s => s.confirmContinue)

  if (activeRuns.length === 0 && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="rounded-full p-3" style={{ backgroundColor: 'color-mix(in_srgb, var(--color-border) 40%, transparent)' }}>
          <Zap size={24} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {t('bottomPanel.noTasks')}
          </span>
          <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            {t('bottomPanel.noTasksHint')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pb-4">
      {/* 活跃任务列表（支持多个并行） */}
      {activeRuns.length > 0 && (
        <div className="flex-shrink-0" style={{ borderBottom: history.length > 0 ? '1px solid var(--color-border)' : undefined }}>
          <AnimatePresence initial={false}>
            {activeRuns.map((run, idx) => {
              const runWaiting = waitingRuns[run.id]
              return (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ borderBottom: idx < activeRuns.length - 1 ? '1px solid var(--color-border)' : undefined }}
                >
                  <ActiveRunPanel
                    run={run}
                    waitingForConfirm={runWaiting?.waitingForConfirm ?? false}
                    waitingAfterStepIndex={runWaiting?.waitingAfterStepIndex ?? -1}
                    onConfirm={() => confirmContinue(run.id)}
                    onCancel={() => cancelWorkflow(run.id)}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 历史记录（可展开详情 + 快捷操作） */}
      {history.length > 0 && (
        <div className="flex-shrink-0">
          <div className="px-4 pt-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            {t('bottomPanel.historyTasks')}
          </div>
          <div className="px-2 pb-2">
            <AnimatePresence initial={false}>
              {history.map((run) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <HistoryRunRow run={run} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 可从历史重跑的工作流类型（无参数工厂，安全重建定义） =====

function rebuildDefinition(type: WorkflowType): WorkflowDefinition | null {
  switch (type) {
    case 'architecture_generation': return createArchitectureWorkflow()
    case 'directory': return createDirectoryWorkflow()
    default: return null
  }
}

/** 将一次运行导出为 Markdown 文本 */
function buildRunMarkdown(run: WorkflowRun, labels: Record<WorkflowStep['status'], string>): string {
  const lines = [`# ${run.title}`, '', `> ${labels[run.status as WorkflowStep['status']] ?? run.status} · ${new Date(run.createdAt).toLocaleString()}`, '', '---', '']
  for (const [i, step] of run.steps.entries()) {
    lines.push(`## ${i + 1}. ${step.name}`, '')
    const duration = step.startedAt && step.completedAt
      ? ` · ${((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000).toFixed(1)}s`
      : ''
    lines.push(`${labels[step.status]}${duration}`, '')
    if (step.result) lines.push(step.result, '')
    if (step.error) lines.push(`> ${step.error}`, '')
    lines.push('---', '')
  }
  return lines.join('\n')
}

// ===== 历史任务行（点击展开详情 + hover 快捷操作） =====

function HistoryRunRow({ run }: { run: WorkflowRun }) {
  const { t } = useTranslation('panels')
  const startWorkflow = useWorkflowStore(s => s.startWorkflow)
  const [expanded, setExpanded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const failed = run.status === 'failed'
  const completedCount = run.steps.filter(s => s.status === 'completed').length
  const definition = rebuildDefinition(run.type)
  const rerunnable = definition !== null

  const statusLabels: Record<WorkflowStep['status'], string> = {
    pending: t('toolCall.pending'),
    running: t('toolCall.running'),
    completed: t('toolCall.completed'),
    failed: t('toolCall.failed'),
    skipped: t('bottomPanel.skipped'),
  }

  const rerun = async () => {
    if (!definition) return
    await startWorkflow(definition)
    toast.info(t('bottomPanel.historyRerunStarted', { title: run.title }))
  }

  const handleExport = async () => {
    if (exporting) return
    const dir = await ipc.invoke('dialog:select-folder')
    if (!dir) return
    setExporting(true)
    try {
      const safeName = run.title.replace(/[\\/:*?"<>|]/g, '_')
      const filePath = `${dir}/${safeName}.md`
      const res = await ipc.invoke('fs:write-file', filePath, buildRunMarkdown(run, statusLabels))
      if (res.success) toast.success(t('bottomPanel.historyExported', { path: filePath }))
      else toast.error(t('bottomPanel.historyExportFailed', { error: res.error ?? '' }))
    } catch (err) {
      toast.error(t('bottomPanel.historyExportFailed', { error: String(err) }))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="rounded" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div
        className="group flex items-center gap-2.5 px-3 py-2.5 rounded cursor-pointer select-none transition-colors hover:bg-[var(--color-hover)]"
        onClick={() => setExpanded(v => !v)}
      >
        {failed
          ? <XCircle size={13} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
          : <CheckCircle2 size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        }
        <span className="flex-1 min-w-0 text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {run.title}
        </span>
        <span className="text-[0.68rem] font-mono flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {completedCount}/{run.steps.length}
        </span>
        <span
          className="text-[0.68rem] flex-shrink-0 px-1.5 py-px rounded"
          style={{
            backgroundColor: `color-mix(in_srgb, ${failed ? 'var(--color-error)' : 'var(--color-success)'} 10%, transparent)`,
            color: failed ? 'var(--color-error)' : 'var(--color-success)',
          }}
        >
          {failed ? t('toolCall.failed') : t('toolCall.completed')}
        </span>
        <span className="text-[0.68rem] flex-shrink-0 w-14 text-right" style={{ color: 'var(--color-text-muted)' }}>
          {new Date(run.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div
          className="flex items-center gap-0.5 flex-shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <IconBtn
            size={18}
            title={rerunnable ? t('bottomPanel.historyRerun') : t('bottomPanel.historyRerunUnavailable')}
            disabled={!rerunnable}
            onClick={rerun}
          >
            <RefreshCw size={11} />
          </IconBtn>
          {failed && (
            <IconBtn
              size={18}
              title={rerunnable ? t('bottomPanel.historyRetry') : t('bottomPanel.historyRerunUnavailable')}
              disabled={!rerunnable}
              onClick={rerun}
            >
              <RotateCcw size={11} />
            </IconBtn>
          )}
          <IconBtn size={18} title={t('bottomPanel.historyExport')} disabled={exporting} onClick={handleExport}>
            <Download size={11} />
          </IconBtn>
        </div>

        {expanded
          ? <ChevronDown size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        }
      </div>

      {expanded && (
        <motion.div
          initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
          animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
          exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <HistoryRunDetail run={run} />
        </motion.div>
      )}
    </div>
  )
}

// ===== 历史任务详情（步骤状态 / 耗时 / 输出摘要） =====

function HistoryRunDetail({ run }: { run: WorkflowRun }) {
  const { t } = useTranslation('panels')

  const statusLabel = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return t('toolCall.completed')
      case 'failed': return t('toolCall.failed')
      case 'running': return t('toolCall.running')
      case 'pending': return t('toolCall.pending')
      case 'skipped': return t('bottomPanel.skipped')
    }
  }

  return (
    <div className="px-3 pb-2.5 pt-0.5 space-y-2">
      {run.steps.map((step, i) => {
        const duration = step.startedAt && step.completedAt
          ? ((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000).toFixed(1)
          : null
        const preview = step.result && step.result.length > 200
          ? step.result.slice(0, 200) + '…'
          : step.result
        return (
          <div key={step.id} className="flex items-start gap-2.5">
            <div className="mt-1 flex-shrink-0"><StepStatusIcon status={step.status} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {i + 1}. {step.name}
                </span>
                <span
                  className="text-[0.68rem] flex-shrink-0"
                  style={{ color: step.status === 'failed' ? 'var(--color-error)' : 'var(--color-text-muted)' }}
                >
                  {statusLabel(step.status)}
                </span>
                {duration && (
                  <span className="text-[0.68rem] font-mono flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {duration}s
                  </span>
                )}
              </div>
              {preview && (
                <p className="text-[0.7rem] leading-4 whitespace-pre-wrap break-words mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {preview}
                </p>
              )}
              {step.error && (
                <p className="text-[0.7rem] leading-4 mt-0.5" style={{ color: 'var(--color-error)' }}>{step.error}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ===== 当前任务进度面板（接收 run 参数，支持多实例） =====

function ActiveRunPanel({
  run,
  waitingForConfirm,
  waitingAfterStepIndex,
  onConfirm,
  onCancel,
}: {
  run: WorkflowRun
  waitingForConfirm: boolean
  waitingAfterStepIndex: number
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation('panels')
  const [expanded, setExpanded] = useState(true)

  // 需要确认时自动展开
  useEffect(() => {
    let mounted = true
    if (waitingForConfirm) {
      Promise.resolve().then(() => {
        if (mounted) setExpanded(true)
      })
    }
    return () => { mounted = false }
  }, [waitingForConfirm])

  const runningStep = run.steps.find(s => s.status === 'running')
  const completedCount = run.steps.filter(s => s.status === 'completed').length
  const totalCount = run.steps.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const nextStepName = run.steps[waitingAfterStepIndex + 1]?.name
  const isActive = run.status === 'running' || run.status === 'waiting'

  return (
    <div>
      {/* ── 状态条（始终可见，点击折叠/展开） ── */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* 状态图标 */}
        <div className="flex-shrink-0">
          {run.status === 'running' && (
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          )}
          {run.status === 'waiting' && (
            <Clock size={13} style={{ color: 'var(--color-warning)' }} />
          )}
        </div>

        {/* 标题 + 进度条 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-1">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
              {runningStep && isActive ? runningStep.name : run.title}
            </p>
            <span className="text-[0.68rem] font-mono flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
              {progress}%
            </span>
          </div>
          {/* 2px 进度条 */}
          <div className="h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent)' }}
            />
          </div>
        </div>

        {/* 右侧：步骤计数 + 折叠箭头 + 取消 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[0.68rem] font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {completedCount}/{totalCount}
          </span>
          {expanded
            ? <ChevronDown size={11} style={{ color: 'var(--color-text-muted)' }} />
            : <ChevronRight size={11} style={{ color: 'var(--color-text-muted)' }} />
          }
          {/* 取消按钮——阻止冒泡到折叠点击 */}
          <div onClick={(e) => e.stopPropagation()}>
            <IconBtn
              onClick={onCancel}
              title={t('bottomPanel.cancelTask', '取消任务')}
              size={18}
            >
              <X size={11} />
            </IconBtn>
          </div>
        </div>
      </div>

      {/* ── 步骤详情列表（展开时显示） ── */}
      {expanded && (
        <motion.div
          initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
          animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
          exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="pb-2"
        >
          {/* 步骤列表——扁平连接器风格 */}
          <div className="px-4">
            {run.steps.map((step, i) => (
              <WorkflowStepItem key={step.id} step={step} index={i} isLast={i === run.steps.length - 1} />
            ))}
          </div>

          {/* ── 等待确认操作区 ── */}
          {waitingForConfirm && nextStepName && (
            <div
              className="mx-4 mt-2 px-3 py-2 rounded flex items-center gap-2"
              style={{
                backgroundColor: 'rgba(var(--color-accent-rgb), 0.07)',
                border: '1px solid rgba(var(--color-accent-rgb), 0.25)',
              }}
            >
              <Clock size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {t('bottomPanel.nextStep')}{nextStepName}
              </span>
              <Button variant="default" size="sm" onClick={onConfirm} className="flex-shrink-0">
                <Play size={10} /> {t('bottomPanel.continue')}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── 折叠时若等待确认：状态条下方显示简洁提示 ── */}
      {waitingForConfirm && !expanded && nextStepName && (
        <div
          className="mx-3 mb-2 px-2.5 py-1.5 rounded flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(var(--color-accent-rgb), 0.07)',
            border: '1px solid rgba(var(--color-accent-rgb), 0.25)',
          }}
        >
          <Clock size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {t('bottomPanel.nextStep')}{nextStepName}
          </span>
          <Button
            variant="default" size="sm"
            onClick={(e) => { e.stopPropagation(); onConfirm() }}
            className="flex-shrink-0"
          >
            <Play size={10} /> {t('bottomPanel.continue')}
          </Button>
        </div>
      )}
    </div>
  )
}

// ===== 工作流步骤项（扁平连接器风格） =====

function WorkflowStepItem({
  step,
  index,
  isLast,
}: {
  step: WorkflowStep
  index: number
  isLast: boolean
}) {
  const { t } = useTranslation('panels')
  const [expanded, setExpanded] = useState(false)
  const hasDetail = !!step.error || step.logs.length > 0

  // 运行中自动展开
  useEffect(() => {
    let mounted = true
    if (step.status === 'running') {
      Promise.resolve().then(() => {
        if (mounted) setExpanded(true)
      })
    }
    return () => { mounted = false }
  }, [step.status])

  return (
    <div className="relative flex gap-2.5">
      {/* ── 左侧：图标 + 竖线连接器 ── */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ paddingTop: 8 }}>
        {/* 状态图标 */}
        <div className="flex-shrink-0">
          <StepStatusIcon status={step.status} />
        </div>
        {/* 竖线（非最后一步时显示） */}
        {!isLast && (
          <div
            className="w-px flex-1 mt-1"
            style={{
              minHeight: 12,
              backgroundColor: step.status === 'completed'
                ? 'var(--color-success)'
                : 'var(--color-border)',
              opacity: step.status === 'completed' ? 0.4 : 0.6,
            }}
          />
        )}
      </div>

      {/* ── 右侧：内容 ── */}
      <div
        className="flex-1 min-w-0 pb-2"
        style={{ minHeight: isLast ? undefined : 28 }}
      >
        {/* 步骤标题行 */}
        <div
          className={`flex items-center gap-1 py-1 ${hasDetail ? 'cursor-pointer' : ''}`}
          onClick={hasDetail ? () => setExpanded(v => !v) : undefined}
        >
          {hasDetail && (
            expanded
              ? <ChevronDown size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              : <ChevronRight size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          )}
          <span
            className="text-xs flex-1 truncate"
            style={{
              color: step.status === 'running'
                ? 'var(--color-text)'
                : step.status === 'pending'
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-secondary)',
              fontWeight: step.status === 'running' ? 500 : 400,
            }}
          >
            {index + 1}. {step.name}
          </span>
          {/* 进度百分比 */}
          {step.progress !== undefined && step.status === 'running' && (
            <span className="text-[0.68rem] font-mono flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
              {step.progress}%
            </span>
          )}
          {/* 完成耗时（若有时间戳）或简单标记 */}
          {step.status === 'skipped' && (
            <span className="text-[0.68rem] flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{t('bottomPanel.skipped')}</span>
          )}
        </div>

        {/* 详情区（展开时显示：日志 + 错误） */}
        {expanded && hasDetail && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
            animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
            exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mb-1"
          >
            {step.error && (
              <div
                className="text-[0.7rem] px-2 py-1 rounded mb-1"
                style={{ backgroundColor: 'rgba(192,57,74,0.08)', color: 'var(--color-error)' }}
              >
                {step.error}
              </div>
            )}
            {step.logs.length > 0 && (
              <div className="max-h-16 overflow-y-auto space-y-0.5">
                {step.logs.slice(-6).map((log, i) => (
                  <div key={i} className="text-[0.68rem] font-mono leading-4" style={{ color: 'var(--color-text-muted)' }}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

/** 步骤状态图标（对齐竖线连接器） */
function StepStatusIcon({ status }: { status: WorkflowStep['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
    case 'running':
      return <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
    case 'failed':
      return <XCircle size={13} style={{ color: 'var(--color-error)' }} />
    case 'skipped':
      return (
        <div
          className="w-3 h-3 rounded-full flex items-center justify-center"
          style={{ border: '1.5px dashed var(--color-text-muted)' }}
        />
      )
    default:
      // pending
      return (
        <div
          className="w-3 h-3 rounded-full"
          style={{ border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-panel)' }}
        />
      )
  }
}


// ===== 日志视图 =====

function LogsView() {
  const { t } = useTranslation('panels')
  const globalLogs = useWorkflowStore(s => s.globalLogs)
  const clearLogs = useWorkflowStore(s => s.clearLogs)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [globalLogs.length, autoScroll])

  const levelColor = (level: string) => {
    switch (level) {
      case 'error': return 'var(--color-error)'
      case 'warn':  return 'var(--color-warning)'
      default:      return 'var(--color-text-secondary)'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-1 px-2 py-1 flex-shrink-0">
        <Button
          variant="ghost" size="icon"
          onClick={() => setAutoScroll(!autoScroll)}
          title={autoScroll ? t('common.autoScrollOn') : t('common.autoScrollOff')}
          className={autoScroll ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}
        >
          <ChevronsDown size={13} />
        </Button>
        <Button variant="ghost" size="icon" onClick={clearLogs} title={t('common.clearLogs')}>
          <Trash2 size={13} />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-2 font-mono text-xs leading-5">
        {globalLogs.length === 0 && (
          <div className="text-center py-8 opacity-30">{t('common.noLogs')}</div>
        )}
        {globalLogs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex gap-2"
          >
            <span style={{ color: 'var(--color-text-muted)' }}>{log.time}</span>
            <span style={{ color: levelColor(log.level) }}>{log.message}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ===== 模型调用视图 =====

function ModelsView() {
  const { t } = useTranslation('panels')
  const [stats, setStats] = useState<{
    totalCalls: number; totalTokens: number
    totalPromptTokens: number; totalCompletionTokens: number
  } | null>(null)
  const [history, setHistory] = useState<Array<{
    id: number; modelName: string; purpose: string
    promptTokens: number; completionTokens: number; totalTokens: number
    durationMs: number; success: boolean; createdAt: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { loadLLMData } = await import('../../services/stats-service')
      const { stats: s, history: h } = await loadLLMData(30)
      setStats(s)
      setHistory(h)
    } catch { /* 忽略 */ }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex-1 px-4 py-3 space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-[70%]" />
          <Skeleton className="h-4 w-[90%]" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {stats && (
        <div
          className="flex items-center gap-4 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="text-[0.7rem] text-[var(--color-text-muted)]">
            <span className="font-bold text-sm text-[var(--color-text)]">{stats.totalCalls}</span> {t('common.calls')}
          </div>
          <div className="text-[0.7rem] text-[var(--color-text-muted)]">
            <span className="font-bold text-sm text-[var(--color-text)]">{(stats.totalTokens / 1000).toFixed(1)}k</span> {t('common.tokens')}
          </div>
          <div className="text-[0.7rem] text-[var(--color-text-muted)]">
            {t('common.input')} <span className="font-mono text-[var(--color-text-secondary)]">{(stats.totalPromptTokens / 1000).toFixed(1)}k</span>
          </div>
          <div className="text-[0.7rem] text-[var(--color-text-muted)]">
            {t('common.output')} <span className="font-mono text-[var(--color-text-secondary)]">{(stats.totalCompletionTokens / 1000).toFixed(1)}k</span>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-full opacity-30 text-sm">{t('common.noRecords')}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                className="text-[0.7rem] text-[var(--color-text-muted)]"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <th className="text-left px-4 py-1 font-medium">{t('common.time')}</th>
                <th className="text-left px-2 py-1 font-medium">{t('common.model')}</th>
                <th className="text-left px-2 py-1 font-medium">{t('common.purpose')}</th>
                <th className="text-right px-2 py-1 font-medium">{t('common.tokens')}</th>
                <th className="text-right px-2 py-1 font-medium">{t('common.duration')}</th>
                <th className="text-center px-2 py-1 font-medium">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-[var(--color-hover)] transition-colors"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-1 text-[var(--color-text-muted)]">
                    {new Date(row.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-2 py-1 text-[var(--color-text-secondary)]">{row.modelName || '-'}</td>
                  <td className="px-2 py-1 text-[var(--color-text-secondary)]">{row.purpose || '-'}</td>
                  <td className="px-2 py-1 text-right text-[var(--color-text)]">{row.totalTokens.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right text-[var(--color-text-muted)]">{(row.durationMs / 1000).toFixed(1)}s</td>
                  <td className="px-2 py-1 text-center">{row.success ? <CheckCircle2 size={12} style={{ color: 'var(--color-success)', display: 'inline' }} /> : <XCircle size={12} style={{ color: 'var(--color-error)', display: 'inline' }} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

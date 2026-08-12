import { useEffect, useRef } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelImperativeHandle } from 'react-resizable-panels'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from './stores/theme-store'
import { useLayoutStore } from './stores/layout-store'
import { useLLMStore } from './stores/llm-store'
import { useProjectStore } from './stores/project-store'
import { useMCPStore } from './stores/mcp-store'
import { useWorkflowStore } from './stores/workflow-store'
import { useWindowStore } from './stores/window-store'
import { ipc } from './services/ipc-client'
import TitleBar from './components/layout/TitleBar'
import StatusBar from './components/layout/StatusBar'
import LeftToolWindowBar from './components/layout/LeftToolWindowBar'
import RightToolWindowBar from './components/layout/RightToolWindowBar'
import Sidebar from './components/panels/Sidebar'
import EditorArea from './components/panels/EditorArea'
import AIPanel from './components/panels/AIPanel'
import AIOutputPanel from './components/panels/AIOutputPanel'
import BottomPanel from './components/panels/BottomPanel'
import NewProjectDialog from './components/dialogs/NewProjectDialog'
import ImportNovelDialog from './components/dialogs/ImportNovelDialog'
import ChapterCreationDialog from './components/dialogs/ChapterCreationDialog'
import ExportDialog from './components/dialogs/ExportDialog'
import SettingsModal from './components/settings/SettingsModal'
import CloseBehaviorDialog from './components/dialogs/CloseBehaviorDialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { actionToast } from './components/ui/ActionToast'
import { globalEventBus } from './shared/event-bus'

/**
 * 底部面板宿主：始终挂载 Panel，但通过 collapsible + panelRef 真折叠
 * （关闭时折叠到 0，不保留死区；开启时还原上次尺寸）
 */
function BottomPanelHost() {
  const ref = useRef<PanelImperativeHandle>(null)
  const bottomPanelOpen = useLayoutStore(s => s.bottomPanelOpen)
  const bottomPanelHeight = useLayoutStore(s => s.bottomPanelHeight)

  useEffect(() => {
    const panel = ref.current
    if (!panel) return
    if (bottomPanelOpen) panel.expand()
    else panel.collapse()
  }, [bottomPanelOpen])

  return (
    <Panel
      panelRef={ref}
      id="bottom"
      collapsible
      collapsedSize={0}
      minSize={8}
      defaultSize={bottomPanelHeight}
    >
      <BottomPanel />
    </Panel>
  )
}

/**
 * Luobi 主应用组件
 * 使用 react-resizable-panels 实现可拖拽调整大小的四区布局
 */
export default function App() {
  const { t } = useTranslation('common')
  const initTheme = useThemeStore((s) => s.initTheme)
  const sidebarOpen = useLayoutStore(s => s.sidebarOpen)
  const sidebarWidth = useLayoutStore(s => s.sidebarWidth)
  const aiPanelOpen = useLayoutStore(s => s.aiPanelOpen)
  const aiPanelWidth = useLayoutStore(s => s.aiPanelWidth)
  const bottomPanelHeight = useLayoutStore(s => s.bottomPanelHeight)
  const rightView = useLayoutStore(s => s.rightView)
  const settingsOpen = useLayoutStore(s => s.settingsOpen)
  const closeSettings = useLayoutStore(s => s.closeSettings)
  const newProjectOpen = useLayoutStore(s => s.newProjectOpen)
  const closeNewProject = useLayoutStore(s => s.closeNewProject)
  const exportOpen = useLayoutStore(s => s.exportOpen)
  const closeExport = useLayoutStore(s => s.closeExport)
  const importNovelOpen = useLayoutStore(s => s.importNovelOpen)
  const closeImportNovel = useLayoutStore(s => s.closeImportNovel)
  const chapterCreationOpen = useLayoutStore(s => s.chapterCreationOpen)
  const chapterCreationPrefill = useLayoutStore(s => s.chapterCreationPrefill)
  const closeChapterCreation = useLayoutStore(s => s.closeChapterCreation)
  const initLLM = useLLMStore((s) => s.init)
  const loadRecentProjects = useProjectStore((s) => s.loadRecentProjects)
  const loadCloseBehavior = useWindowStore((s) => s.loadCloseBehavior)

  // 初始化：主题 + LLM 模型 + 最近项目 + 缩放级别
  useEffect(() => {
    initTheme()
    initLLM()
    loadRecentProjects()
    loadCloseBehavior()
    // 初始化 MCP Store
    useMCPStore.getState().init().catch(e => console.warn('[MCP] 初始化失败:', e))
    if (ipc.isElectron) {
      const savedZoom = localStorage.getItem('luobi-zoom-level')
      if (savedZoom) ipc.setZoomLevel(parseFloat(savedZoom))
    }
    // 初始化 ProjectService — 注册全局事件监听（生命周期与 App 一致）
    import('./services/project-service').then(({ initProjectService }) => {
      initProjectService()
    }).catch(e => console.warn('[ProjectService] 初始化失败:', e))

    // C) 工作流完成时弹出 ActionToast 通知（不依赖任何面板状态）
    const unsubActionToast = globalEventBus.on('WORKFLOW_COMPLETE', () => {
      const { history } = useWorkflowStore.getState()
      const latest = history.find(r => r.status === 'completed')
      if (!latest) return
      const shortTitle = latest.title.replace(/^[^\s]+\s/, '')
      actionToast.workflowComplete(
        `✅ 「${shortTitle}」${t('completed')}`,
        () => useLayoutStore.getState().openRightPanel('ai-output')
      )
    })

    return () => {
      // App 卸载时销毁 ProjectService（开发环境 HMR 时会触发）
      import('./services/project-service').then(({ disposeProjectService }) => {
        disposeProjectService()
      }).catch(() => {})
      unsubActionToast()
    }
  }, [initTheme, initLLM, loadRecentProjects, loadCloseBehavior, t])

  // 全局快捷键: Cmd+N 新建项目，Cmd+O 打开项目
  // 注意：Cmd+=/- 缩放已由 TitleBar.tsx 统一处理，此处不重复注册
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        useLayoutStore.getState().openNewProject()
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault()
        const folder = await ipc.invoke('dialog:select-folder')
        if (folder) {
          useProjectStore.getState().openProject(folder)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* 标题栏 */}
      <TitleBar />

      {/*
        主体：flex 行 = LeftBar | 纵向PanelGroup | RightBar
        ┌───┬──────────────────────────────┬───┐
        │   │  Sidebar | Editor | AIPanel  │   │
        │ L │──────────────────────────────│ R │
        │   │     BottomPanel (全宽)        │   │
        └───┴──────────────────────────────┴───┘
      */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左侧工具窗口栏（全高，包括底部面板区域） */}
        <LeftToolWindowBar />

        {/* 纵向 PanelGroup：上层主区域 + 下层底部面板 */}
        <PanelGroup
          orientation="vertical"
          className="flex-1"
          onLayoutChanged={(layout) => {
            // layout = [top%, bottom%]，仅在有底部面板时持久化
            if (layout.length >= 2) {
              useLayoutStore.getState().setBottomPanelHeight(layout[1])
            }
          }}
        >

          {/* 上层：侧边栏 | 编辑区 | AI 面板（水平分割） */}
          <Panel id="top" defaultSize={100 - bottomPanelHeight} minSize={30}>
            <PanelGroup
              orientation="horizontal"
              className="flex-1 h-full"
              onLayoutChanged={(layout) => {
                // layout 顺序随开闭变化：根据当前状态映射到 sidebar / editor / ai-panel
                const { sidebarOpen: so, aiPanelOpen: ao } = useLayoutStore.getState()
                if (so) {
                  useLayoutStore.getState().setSidebarWidth(layout[0])
                  if (ao && layout.length >= 3) {
                    useLayoutStore.getState().setAIPanelWidth(layout[2])
                  }
                } else if (ao && layout.length >= 2) {
                  useLayoutStore.getState().setAIPanelWidth(layout[1])
                }
              }}
            >

              {/* 左侧边栏 */}
              {sidebarOpen && (
                <>
                  <Panel id="sidebar" collapsible collapsedSize={0} minSize={10} defaultSize={sidebarWidth}>
                    <ErrorBoundary fallbackLabel={t('sidebarRenderError')}>
                      <Sidebar />
                    </ErrorBoundary>
                  </Panel>
                  <PanelResizeHandle />
                </>
              )}

              {/* 编辑区 */}
              <Panel id="editor" defaultSize={60} minSize={10}>
                <ErrorBoundary fallbackLabel={t('editorRenderError')}>
                  <EditorArea onNewProject={() => useLayoutStore.getState().openNewProject()} />
                </ErrorBoundary>
              </Panel>

              {/* 右侧面板（Agent 对话 / AI 输出） */}
              {aiPanelOpen && (
                <>
                  <PanelResizeHandle />
                  <Panel id="ai-panel" collapsible collapsedSize={0} minSize={10} defaultSize={aiPanelWidth}>
                    <ErrorBoundary fallbackLabel={t('aiPanelRenderError')}>
                      {rightView === 'ai-output' ? <AIOutputPanel /> : <AIPanel />}
                    </ErrorBoundary>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* 下层：底部面板 — 始终挂载但可折叠到 0，不保留死区 */}
          <PanelResizeHandle />
          <BottomPanelHost />
        </PanelGroup>

        {/* 右侧工具窗口栏（全高，包括底部面板区域） */}
        <RightToolWindowBar />
      </div>


      {/* 状态栏（全宽） */}
      <StatusBar />

      {/* 全局对话框 — 由 layout-store 控制开关，不再依赖 window.dispatchEvent */}
      <NewProjectDialog
        open={newProjectOpen}
        onClose={closeNewProject}
      />
      <ImportNovelDialog
        open={importNovelOpen}
        onClose={closeImportNovel}
      />
      <ChapterCreationDialog
        isOpen={chapterCreationOpen}
        prefill={chapterCreationPrefill}
        onClose={closeChapterCreation}
      />
      <ExportDialog
        isOpen={exportOpen}
        onClose={closeExport}
      />
      {/* 全屏设置弹窗 */}
      <SettingsModal
        open={settingsOpen}
        onClose={closeSettings}
      />

      {/* 关闭行为「询问」弹窗 — 监听主进程 close-requested 事件 */}
      <CloseBehaviorDialog />

    </div>
  )
}

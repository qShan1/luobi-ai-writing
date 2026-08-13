import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 左侧活动栏的视图类型 */
export type SidebarView = 'home' | 'project' | 'knowledge' | 'characters' | 'settings'

/** 下方工具窗口 Tab */
export type BottomTab = 'tasks' | 'log' | 'models'

/** 右侧面板视图类型 */
export type RightView = 'agent' | 'ai-output'

/** 章节创建对话框的预填参数 */
export type ChapterCreationPrefill = Record<string, unknown> | null

interface LayoutState {
  // ===== 侧边栏 =====
  sidebarOpen: boolean
  sidebarView: SidebarView
  /** 侧边栏宽度百分比 (10-40) */
  sidebarWidth: number

  // ===== AI 对话面板 =====
  aiPanelOpen: boolean
  /** 右侧面板宽度百分比 (10-40) */
  aiPanelWidth: number
  /** 右侧面板当前视图：Agent 对话 / AI 输出 */
  rightView: RightView

  // ===== 底部面板 =====
  bottomPanelOpen: boolean
  bottomTab: BottomTab
  /** 底部面板高度百分比 (10-60) */
  bottomPanelHeight: number

  // ===== 全局弹窗状态（替代 window.dispatchEvent 事件总线）=====
  /** 设置弹窗是否打开 */
  settingsOpen: boolean
  /** 新建项目对话框是否打开 */
  newProjectOpen: boolean
  /** 导出对话框是否打开 */
  exportOpen: boolean
  /** 导入小说对话框是否打开 */
  importNovelOpen: boolean
  /** 章节创建对话框是否打开 */
  chapterCreationOpen: boolean
  /** 章节创建对话框的预填参数 */
  chapterCreationPrefill: ChapterCreationPrefill

  // ===== Actions =====
  toggleSidebar: () => void
  setSidebarView: (view: SidebarView) => void
  setSidebarWidth: (width: number) => void
  toggleAIPanel: () => void
  setAIPanelOpen: (open: boolean) => void
  setAIPanelWidth: (width: number) => void
  setRightView: (view: RightView) => void
  /** 打开右侧面板并切换到指定视图 */
  openRightPanel: (view: RightView) => void
  toggleBottomPanel: () => void
  setBottomTab: (tab: BottomTab) => void
  setBottomPanelHeight: (height: number) => void
  openBottomTab: (tab: BottomTab) => void

  // ===== 全局弹窗 Actions =====
  /** 打开设置弹窗，可选指定初始侧边栏区块（如 'about'） */
  openSettings: (section?: string) => void
  closeSettings: () => void
  /** 当前设置侧边栏区块（受控） */
  settingsSection: string | null
  setSettingsSection: (section: string) => void
  openNewProject: () => void
  closeNewProject: () => void
  openExport: () => void
  closeExport: () => void
  openImportNovel: () => void
  closeImportNovel: () => void
  openChapterCreation: (prefill?: ChapterCreationPrefill) => void
  closeChapterCreation: () => void
}

const DEFAULT_STATE = {
  sidebarOpen: true,
  sidebarView: 'project' as SidebarView,
  sidebarWidth: 20,
  aiPanelOpen: true,
  aiPanelWidth: 20,
  rightView: 'agent' as RightView,
  bottomPanelOpen: true,
  bottomTab: 'tasks' as BottomTab,
  bottomPanelHeight: 25,
  settingsOpen: false,
  settingsSection: null,
  newProjectOpen: false,
  exportOpen: false,
  importNovelOpen: false,
  chapterCreationOpen: false,
  chapterCreationPrefill: null,
}

/**
 * 面板尺寸钳制：输入必须是有限数字，否则回退到 fallback。
 * 防止 onLayoutChanged 偶发传入 undefined/NaN 污染状态，
 * 进而被 persist 序列化成 null 写进 localStorage（曾导致 defaultSize=null 白屏）。
 */
function clampNum(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, value))
}

/** 从持久化数据中安全读取数字字段（null/NaN/缺失都回退默认） */
function readNum(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      // Actions
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarView: (view) =>
        set((s) => ({
          sidebarView: view,
          sidebarOpen: s.sidebarView === view ? !s.sidebarOpen : true,
        })),
      setSidebarWidth: (width) => set((s) => ({ sidebarWidth: clampNum(width, 10, 40, s.sidebarWidth) })),

      toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
      setAIPanelWidth: (width) => set((s) => ({ aiPanelWidth: clampNum(width, 10, 40, s.aiPanelWidth) })),
      setRightView: (view) => set({ rightView: view }),
      openRightPanel: (view) => set({ aiPanelOpen: true, rightView: view }),

      toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
      setBottomTab: (tab) =>
        set((s) => ({
          bottomTab: tab,
          bottomPanelOpen: s.bottomTab === tab ? !s.bottomPanelOpen : true,
        })),
      setBottomPanelHeight: (height) => set((s) => ({ bottomPanelHeight: clampNum(height, 10, 60, s.bottomPanelHeight) })),
      openBottomTab: (tab) => set({ bottomPanelOpen: true, bottomTab: tab }),

      // 全局弹窗 Actions
      openSettings: (section) => set({ settingsOpen: true, settingsSection: typeof section === 'string' ? section : null }),
      closeSettings: () => set({ settingsOpen: false, settingsSection: null }),
      setSettingsSection: (section) => set({ settingsSection: typeof section === 'string' ? section : null }),
      openNewProject: () => set({ newProjectOpen: true }),
      closeNewProject: () => set({ newProjectOpen: false }),
      openExport: () => set({ exportOpen: true }),
      closeExport: () => set({ exportOpen: false }),
      openImportNovel: () => set({ importNovelOpen: true }),
      closeImportNovel: () => set({ importNovelOpen: false }),
      openChapterCreation: (prefill = null) => set({ chapterCreationOpen: true, chapterCreationPrefill: prefill }),
      closeChapterCreation: () => set({ chapterCreationOpen: false, chapterCreationPrefill: null }),
    }),
    {
      name: 'luobi-layout',
      // 弹窗状态每次启动重置，不持久化
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        sidebarView: s.sidebarView,
        sidebarWidth: s.sidebarWidth,
        aiPanelOpen: s.aiPanelOpen,
        aiPanelWidth: s.aiPanelWidth,
        rightView: s.rightView,
        bottomPanelOpen: s.bottomPanelOpen,
        bottomTab: s.bottomTab,
        bottomPanelHeight: s.bottomPanelHeight,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LayoutState>
        return {
          ...current,
          ...p,
          // 净化面板尺寸：历史数据可能被写成 null/NaN（JSON.stringify(NaN)=null），
          // 若直接透传会导致 react-resizable-panels defaultSize=null 崩溃白屏
          sidebarWidth: readNum(p.sidebarWidth, current.sidebarWidth),
          aiPanelWidth: readNum(p.aiPanelWidth, current.aiPanelWidth),
          bottomPanelHeight: readNum(p.bottomPanelHeight, current.bottomPanelHeight),
          // 弹窗状态永远从默认值开始
          settingsOpen: false,
          settingsSection: null,
          newProjectOpen: false,
          exportOpen: false,
          importNovelOpen: false,
          chapterCreationOpen: false,
          chapterCreationPrefill: null,
        }
      },
    },
  ),
)

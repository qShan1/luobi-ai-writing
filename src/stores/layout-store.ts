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
  openSettings: () => void
  closeSettings: () => void
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
  newProjectOpen: false,
  exportOpen: false,
  importNovelOpen: false,
  chapterCreationOpen: false,
  chapterCreationPrefill: null,
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
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(10, Math.min(40, width)) }),

      toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
      setAIPanelWidth: (width) => set({ aiPanelWidth: Math.max(10, Math.min(40, width)) }),
      setRightView: (view) => set({ rightView: view }),
      openRightPanel: (view) => set({ aiPanelOpen: true, rightView: view }),

      toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
      setBottomTab: (tab) =>
        set((s) => ({
          bottomTab: tab,
          bottomPanelOpen: s.bottomTab === tab ? !s.bottomPanelOpen : true,
        })),
      setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(10, Math.min(60, height)) }),
      openBottomTab: (tab) => set({ bottomPanelOpen: true, bottomTab: tab }),

      // 全局弹窗 Actions
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
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
          // 弹窗状态永远从默认值开始
          settingsOpen: false,
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

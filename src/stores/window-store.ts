import { create } from 'zustand'
import { ipc } from '../services/ipc-client'
import type { CloseBehavior } from '../shared/ipc-channels'

interface WindowStore {
  /** 关闭窗口时的行为策略 */
  closeBehavior: CloseBehavior
  /** 是否已从主进程加载 */
  loaded: boolean
  /** 「询问」弹窗是否打开（主进程发送 close-requested 时置 true） */
  askOpen: boolean
  /** 加载关闭行为策略 */
  loadCloseBehavior: () => Promise<void>
  /** 设置并持久化关闭行为策略 */
  setCloseBehavior: (behavior: CloseBehavior) => Promise<void>
  /** 打开「询问」弹窗 */
  openAsk: () => void
  /** 关闭「询问」弹窗 */
  closeAsk: () => void
  /** 最小化到系统托盘 */
  minimizeToTray: () => Promise<void>
  /** 退出应用 */
  quitApp: () => Promise<void>
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  closeBehavior: 'ask',
  loaded: false,
  askOpen: false,

  loadCloseBehavior: async () => {
    if (get().loaded) return
    try {
      const behavior = await ipc.invoke('window:get-close-behavior')
      set({ closeBehavior: behavior, loaded: true })
    } catch {
      // 非 Electron 环境：保持默认
      set({ loaded: true })
    }
  },

  setCloseBehavior: async (behavior) => {
    set({ closeBehavior: behavior })
    try {
      await ipc.invoke('config:set', { closeBehavior: behavior })
    } catch {
      // 忽略非 Electron 环境错误
    }
  },

  openAsk: () => set({ askOpen: true }),
  closeAsk: () => set({ askOpen: false }),

  minimizeToTray: async () => {
    set({ askOpen: false })
    try {
      await ipc.invoke('window:minimize-to-tray')
    } catch {
      // 非 Electron：忽略
    }
  },

  quitApp: async () => {
    set({ askOpen: false })
    try {
      await ipc.invoke('window:quit')
    } catch {
      // 非 Electron：忽略
    }
  },
}))

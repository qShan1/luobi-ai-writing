import { create } from 'zustand'
import { ipc } from '../services/ipc-client'
import type { CloseBehavior } from '../shared/ipc-channels'

interface WindowStore {
  /** 关闭窗口时的行为策略 */
  closeBehavior: CloseBehavior
  /** 是否已从主进程加载 */
  loaded: boolean
  /** 开机自启 */
  autoLaunch: boolean
  /** 开机自启是否已从主进程加载 */
  autoLaunchLoaded: boolean
  /** 「询问」弹窗是否打开（主进程发送 close-requested 时置 true） */
  askOpen: boolean
  /** 加载关闭行为策略 */
  loadCloseBehavior: () => Promise<void>
  /** 设置并持久化关闭行为策略 */
  setCloseBehavior: (behavior: CloseBehavior) => Promise<void>
  /** 加载开机自启状态 */
  loadAutoLaunch: () => Promise<void>
  /** 设置开机自启 */
  setAutoLaunch: (enable: boolean) => Promise<void>
  /** 启动卸载程序；返回是否找到卸载程序 */
  uninstall: () => Promise<boolean>
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
  autoLaunch: false,
  autoLaunchLoaded: false,
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

  loadAutoLaunch: async () => {
    if (get().autoLaunchLoaded) return
    try {
      const enabled = await ipc.invoke('window:get-auto-launch')
      set({ autoLaunch: !!enabled, autoLaunchLoaded: true })
    } catch {
      set({ autoLaunchLoaded: true })
    }
  },

  setAutoLaunch: async (enable) => {
    set({ autoLaunch: enable })
    try {
      await ipc.invoke('window:set-auto-launch', enable)
    } catch {
      // 忽略非 Electron 环境错误
    }
  },

  uninstall: async () => {
    try {
      return !!(await ipc.invoke('window:uninstall'))
    } catch {
      return false
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

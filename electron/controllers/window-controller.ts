import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { readJsonFile, writeJsonFile, GLOBAL_CONFIG_PATH, DEFAULT_GLOBAL_CONFIG } from '../utils/config-utils'
import { GlobalConfig, CloseBehavior } from '../../src/shared/ipc-channels'

let tray: Tray | null = null
let isQuitting = false

/** 读取关闭行为策略（从全局配置） */
export function getCloseBehavior(): CloseBehavior {
  const cfg = readJsonFile<GlobalConfig>(GLOBAL_CONFIG_PATH, DEFAULT_GLOBAL_CONFIG)
  return cfg.closeBehavior ?? 'ask'
}

/** 持久化关闭行为策略 */
export function setCloseBehavior(behavior: CloseBehavior) {
  const cfg = readJsonFile<GlobalConfig>(GLOBAL_CONFIG_PATH, DEFAULT_GLOBAL_CONFIG)
  writeJsonFile(GLOBAL_CONFIG_PATH, { ...cfg, closeBehavior: behavior })
}

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null
}

/** 隐藏主窗口到托盘（不退出进程） */
export function hideToTray() {
  const win = getMainWindow()
  if (win) {
    ensureTray()
    win.hide()
    win.setSkipTaskbar(true)
  }
}

/** 显示/还原主窗口 */
export function showMainWindow() {
  const win = getMainWindow()
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  win.setSkipTaskbar(false)
}

/** 强制退出应用 */
export function quitApp() {
  isQuitting = true
  app.quit()
}

function ensureTray() {
  if (tray) return tray
  const iconPath = path.join(process.env.APP_ROOT!, 'build', 'luobi.ico')
  let icon = nativeImage.createFromPath(iconPath)
  icon = icon.resize({ width: 16, height: 16 })

  tray = new Tray(icon)
  tray.setToolTip('落笔 — AI 小说创作 IDE')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '打开主程序',
        click: () => showMainWindow(),
      },
      {
        type: 'separator',
      },
      {
        label: '退出软件',
        click: () => quitApp(),
      },
    ]),
  )
  // 左键 / 双击托盘图标还原窗口
  tray.on('click', () => showMainWindow())
  tray.on('double-click', () => showMainWindow())
  return tray
}

/** 判断是否处于真正退出流程（供 main.ts 的 window-all-closed 使用） */
export function isQuittingFlag() {
  return isQuitting
}

/** 读取是否开机自启（系统登录项） */
export function getAutoLaunch(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

/** 设置开机自启 */
export function setAutoLaunch(enable: boolean) {
  app.setLoginItemSettings({ openAtLogin: enable })
}

/** 启动 Windows 卸载程序（nsis 安装版）；便携版/找不到时返回 false */
export function launchUninstaller(): boolean {
  const exePath = app.getPath('exe')
  const dir = path.dirname(exePath)
  let uninstaller: string | undefined
  try {
    uninstaller = fs.readdirSync(dir).find((f) => f.toLowerCase().startsWith('uninstall') && f.endsWith('.exe'))
  } catch {
    return false
  }
  if (!uninstaller) return false
  try {
    spawn(path.join(dir, uninstaller), [], { detached: true, stdio: 'ignore' }).unref()
    return true
  } catch {
    return false
  }
}

/**
 * 拦截窗口关闭：根据 closeBehavior 决定最小化到托盘 / 询问 / 退出。
 * 在 createWindow 后调用，绑定到主窗口。
 */
export function registerWindowCloseBehavior(win: BrowserWindow) {
  win.on('close', (event) => {
    if (isQuitting) return // 真正退出时放行默认关闭

    const behavior = getCloseBehavior()
    if (behavior === 'quit') return // 直接退出，放行默认关闭

    // minimize 或 ask：拦截默认关闭
    event.preventDefault()
    if (behavior === 'ask') {
      // 通知渲染进程弹出「最小化 / 退出」选择弹窗，由用户在弹窗内决定
      ensureTray()
      win.webContents.send('window:close-requested')
    } else {
      // minimize：直接最小化到托盘
      hideToTray()
    }
  })
}

export function registerWindowController() {
  ipcMain.handle('window:quit', () => {
    quitApp()
    return { success: true }
  })

  ipcMain.handle('window:minimize-to-tray', () => {
    hideToTray()
    return { success: true }
  })

  ipcMain.handle('window:show', () => {
    showMainWindow()
    return { success: true }
  })

  ipcMain.handle('window:get-close-behavior', () => {
    return getCloseBehavior()
  })

  ipcMain.handle('window:get-auto-launch', () => {
    return getAutoLaunch()
  })

  ipcMain.handle('window:set-auto-launch', (_e, enable: boolean) => {
    setAutoLaunch(!!enable)
    return { success: true }
  })

  ipcMain.handle('window:uninstall', () => {
    return launchUninstaller()
  })
}

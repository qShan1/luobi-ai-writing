import { ipcMain } from 'electron'
import { execFileSync } from 'node:child_process'
import { readJsonFile, writeJsonFile, GLOBAL_CONFIG_PATH, DEFAULT_GLOBAL_CONFIG, LUOBI_HOME } from '../utils/config-utils'
import { GlobalConfig } from '../../src/shared/ipc-channels'

export function registerConfigController() {
  /** 读取全局配置 */
  ipcMain.handle('config:get', async () => {
    return readJsonFile<GlobalConfig>(GLOBAL_CONFIG_PATH, DEFAULT_GLOBAL_CONFIG)
  })

  /** 保存全局配置 */
  ipcMain.handle('config:set', async (_event, config: Partial<GlobalConfig>) => {
    try {
      const existing = readJsonFile<GlobalConfig>(GLOBAL_CONFIG_PATH, DEFAULT_GLOBAL_CONFIG)
      const updated = { ...existing, ...config }
      writeJsonFile(GLOBAL_CONFIG_PATH, updated)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  /** 获取 ~/.luobi 路径 */
  ipcMain.handle('config:get-luobi-home', async () => {
    return LUOBI_HOME
  })

  /** Windows 读取已安装字体名称；其他系统交由浏览器默认字体回退。 */
  ipcMain.handle('config:list-system-fonts', async () => {
    if (process.platform !== 'win32') return []
    try {
      const script = "$p=Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'; $p.PSObject.Properties | Where-Object {$_.Name -notmatch '^PS'} | ForEach-Object {$_.Name -replace ' \\(TrueType\\)| \\(OpenType\\)| \\(All res\\)$',''} | Sort-Object -Unique"
      return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true })
        .split(/\r?\n/).map((name) => name.trim()).filter(Boolean).slice(0, 180)
    } catch {
      return []
    }
  })
}

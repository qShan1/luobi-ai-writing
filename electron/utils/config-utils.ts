import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { GlobalConfig } from '../../src/shared/ipc-channels'

export const LUOBI_HOME = path.join(os.homedir(), '.luobi')
export const LEGACY_HOME_PATH = path.join(os.homedir(), '.vela')

function copyMissingEntries(sourceDir: string, targetDir: string) {
  if (!fs.existsSync(sourceDir) || fs.existsSync(targetDir)) return
  fs.cpSync(sourceDir, targetDir, { recursive: true, errorOnExist: false, force: false })
}

function migrateLegacyHome() {
  copyMissingEntries(LEGACY_HOME_PATH, LUOBI_HOME)
}

export function ensureLuobiHome() {
  migrateLegacyHome()
  const dirs = [
    LUOBI_HOME,
    path.join(LUOBI_HOME, 'prompts'),
    path.join(LUOBI_HOME, 'logs'),
  ]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      // JSON files created by Windows tools may begin with a UTF-8 BOM.
      const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
      return JSON.parse(raw)
    }
  } catch (error) {
    console.warn(`[Luobi] 读取 ${filePath} 失败:`, error)
  }
  return fallback
}

export function writeJsonFile(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export const GLOBAL_CONFIG_PATH = path.join(LUOBI_HOME, 'config.json')
export const MODELS_CONFIG_PATH = path.join(LUOBI_HOME, 'models.json')
export const RECENT_PROJECTS_PATH = path.join(LUOBI_HOME, 'recent-projects.json')

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  theme: 'dark',
  defaultModelId: null,
  editorFontSize: 16,
  editorFontFamily: 'Noto Serif SC',
  autoSaveInterval: 30,
  proxy: {
    enabled: false,
    type: 'http',
    host: '',
    port: 7890,
  },
}

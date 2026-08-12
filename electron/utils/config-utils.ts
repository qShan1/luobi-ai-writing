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
      return JSON.parse(raw) as T
    }
  } catch (error) {
    console.warn(`[Luobi] 读取 ${filePath} 失败:`, error)
  }
  return fallback
}

/** 读取 JSON 并强制校验为数组，损坏/非数组数据回退为空数组（防止 .filter 崩溃） */
export function readJsonArray<T>(filePath: string): T[] {
  const value = readJsonFile<T[]>(filePath, [])
  return Array.isArray(value) ? value : []
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
  closeBehavior: 'ask',
  proxy: {
    enabled: false,
    type: 'http',
    host: '',
    port: 7890,
  },
}

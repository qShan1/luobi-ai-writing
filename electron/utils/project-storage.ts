import fs from 'node:fs'
import path from 'node:path'
import { DIR_LEGACY_INTERNAL, DIR_LUOBI_INTERNAL } from '../../src/shared/project-paths'

/** Resolve the new project data directory and copy legacy data once when needed. */
export function ensureProjectStorage(projectPath: string): string {
  const currentDir = path.join(projectPath, DIR_LUOBI_INTERNAL)
  const legacyDir = path.join(projectPath, DIR_LEGACY_INTERNAL)
  if (!fs.existsSync(currentDir) && fs.existsSync(legacyDir)) {
    fs.cpSync(legacyDir, currentDir, { recursive: true, errorOnExist: false, force: false })
  }
  fs.mkdirSync(currentDir, { recursive: true })
  const currentDb = path.join(currentDir, 'luobi.db')
  const legacyDb = path.join(currentDir, 'vela.db')
  if (!fs.existsSync(currentDb) && fs.existsSync(legacyDb)) {
    fs.copyFileSync(legacyDb, currentDb)
  }
  return currentDir
}

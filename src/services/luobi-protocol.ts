/**
 * luobi-protocol — 统一管理 luobi:// 伪协议路径解析
 *
 * 所有 luobi:// 路径的常量映射和解析逻辑集中在此，
 * 新增架构字段或路径协议时只需修改此文件。
 */

import { ipc } from './ipc-client'

// ===== luobi://core/ 架构字段映射 =====

/** 路径 key → ProjectCoreData 中的驼峰字段名 */
export const CORE_FIELD_MAP: Record<string, string> = {
    premise: 'premise',
    worldbuilding: 'worldbuilding',
    characters: 'charactersArch',
    synopsis: 'synopsis',
}

/** 从 luobi://core/ 路径中解析出 DB 字段名 */
export function parseCoreField(luobiPath: string): string | null {
    if (!luobiPath.startsWith('luobi://core/')) return null
    const key = luobiPath.replace('luobi://core/', '')
    return CORE_FIELD_MAP[key] ?? null
}

/** 从 DB 读取 luobi://core/ 路径对应的内容 */
export async function readCoreContent(luobiPath: string): Promise<string> {
    const key = luobiPath.replace('luobi://core/', '')
    const core = await ipc.invoke('db:project-core-get')
    if (!core) return ''
    const fieldMap: Record<string, string> = {
        premise: core.premise || '',
        worldbuilding: core.worldbuilding || '',
        characters: core.charactersArch || '',
        synopsis: core.synopsis || '',
    }
    return fieldMap[key] || ''
}

/** 将内容写入 luobi://core/ 对应的 DB 字段 */
export async function writeCoreContent(luobiPath: string, content: string): Promise<boolean> {
    const dbField = parseCoreField(luobiPath)
    if (!dbField) return false
    const res = await ipc.invoke('db:project-core-update', { [dbField]: content })
    return res.success !== false
}

// ===== luobi://draft/ | luobi://revision/ | luobi://review/ 内容读取 =====

/** 读取 luobi:// 伪协议路径的内容（统一入口） */
export async function readLuobiContent(filePath: string): Promise<string> {
    if (filePath.startsWith('luobi://draft/') || filePath.startsWith('luobi://manuscript/')) {
        const prefix = filePath.startsWith('luobi://draft/') ? 'luobi://draft/' : 'luobi://manuscript/'
        const draftId = parseInt(filePath.replace(prefix, ''))
        const full = await ipc.invoke('db:draft-get-full', draftId)
        return full?.content ?? ''
    }

    if (filePath.startsWith('luobi://revision/')) {
        const revId = parseInt(filePath.replace('luobi://revision/', ''))
        const full = await ipc.invoke('db:revision-get-full', revId)
        return full?.content ?? ''
    }

    if (filePath.startsWith('luobi://review/')) {
        const revId = parseInt(filePath.replace('luobi://review/', ''))
        const full = await ipc.invoke('db:review-get-full', revId)
        return full?.content ?? ''
    }

    if (filePath.startsWith('luobi://core/')) {
        return readCoreContent(filePath)
    }

    console.warn('[readLuobiContent] 不支持的路径协议:', filePath)
    return ''
}

/** 判断路径是否为 luobi:// 伪协议 */
export function isLuobiProtocol(path: string): boolean {
    return path.startsWith('luobi://')
}

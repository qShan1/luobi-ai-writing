import React from 'react'
import {
  Target, Users, Globe, Map, BookOpen, FolderTree, LayoutList,
  FilePen, PenTool, BrainCircuit, Sparkles, FolderOpen, Zap,
  FileText, MessageCircle, RefreshCw, GitCompare,
} from 'lucide-react'
import i18n from '../../../i18n'
import type { ContextMenuEntry } from '../../ui/ContextMenu'
import { useEditorStore } from '../../../stores/editor-store'
import { ipc } from '../../../services/ipc-client'

export interface SidebarMenuState {
  items: ContextMenuEntry[]
  position: { x: number; y: number }
}

let sidebarMenuSetter: ((value: SidebarMenuState | null) => void) | null = null

export function registerMenuSetter(setter: (value: SidebarMenuState | null) => void) {
  sidebarMenuSetter = setter
}

export function unregisterMenuSetter() {
  sidebarMenuSetter = null
}

export function showSidebarMenu(items: ContextMenuEntry[], event: React.MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  sidebarMenuSetter?.({ items, position: { x: event.clientX, y: event.clientY } })
}

export async function openArchFile(filePath: string, name: string) {
  let content = ''
  if (filePath.startsWith('luobi://core/')) {
    const { readCoreContent } = await import('../../../services/luobi-protocol')
    content = await readCoreContent(filePath)
  } else {
    const result = await ipc.invoke('fs:read-file', filePath)
    content = result.success ? result.content : ''
  }
  const store = useEditorStore.getState()
  const existingTab = store.tabs.find(tab => tab.id === filePath)
  if (existingTab) {
    store.setActiveTab(filePath)
    store.syncTabContent(filePath, content)
  } else {
    store.openFile({ id: filePath, name, type: 'arch-file', filePath, content })
  }
}

export function openBuiltinEditor(id: string, name: string, type: 'chapter-card' | 'character' | 'world-building') {
  useEditorStore.getState().openFile({ id, name, type })
}

export async function openChapterFile(filePath: string, name: string) {
  let content = ''
  if (filePath.startsWith('luobi://')) {
    const { readLuobiContent } = await import('../../../services/luobi-protocol')
    content = await readLuobiContent(filePath)
  } else {
    const result = await ipc.invoke('fs:read-file', filePath)
    content = result.success ? result.content : ''
  }
  useEditorStore.getState().openFile({ id: filePath, name, type: 'chapter', filePath, content })
}

export interface ArchFile {
  key: string
  fileName: string
  label: string
  iconName: string
  desc: string
}

export const getArchFiles = (): ArchFile[] => [
  { key: 'premise', fileName: 'premise.md', label: i18n.t('sidebar.premise', { ns: 'panels' }), iconName: 'target', desc: i18n.t('sidebar.premiseDesc', { ns: 'panels' }) },
  { key: 'characters', fileName: 'characters.md', label: i18n.t('sidebar.characterMap', { ns: 'panels' }), iconName: 'users', desc: i18n.t('sidebar.characterMapDesc', { ns: 'panels' }) },
  { key: 'worldbuilding', fileName: 'worldbuilding.md', label: i18n.t('sidebar.worldbuilding', { ns: 'panels' }), iconName: 'globe', desc: i18n.t('sidebar.worldbuildingDesc', { ns: 'panels' }) },
  { key: 'synopsis', fileName: 'synopsis.md', label: i18n.t('sidebar.synopsis', { ns: 'panels' }), iconName: 'map', desc: i18n.t('sidebar.synopsisDesc', { ns: 'panels' }) },
]

export const ARCH_FILES: ArchFile[] = [
  { key: 'premise', fileName: 'premise.md', label: 'Premise', iconName: 'target', desc: 'Logline, core conflict, golden finger' },
  { key: 'characters', fileName: 'characters.md', label: 'Character Map', iconName: 'users', desc: 'Character arcs, relationship web' },
  { key: 'worldbuilding', fileName: 'worldbuilding.md', label: 'Worldbuilding', iconName: 'globe', desc: 'Core rules, class fractures' },
  { key: 'synopsis', fileName: 'synopsis.md', label: 'Synopsis', iconName: 'map', desc: 'Three-act plot skeleton' },
]

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  target: Target, users: Users, globe: Globe, map: Map, 'book-open': BookOpen,
  'folder-tree': FolderTree, 'layout-list': LayoutList, 'file-pen': FilePen,
  'pen-tool': PenTool, 'brain-circuit': BrainCircuit, sparkles: Sparkles,
  'folder-open': FolderOpen, zap: Zap, 'file-text': FileText,
  'message-circle': MessageCircle, 'refresh-cw': RefreshCw, 'git-compare': GitCompare,
}

export function renderIcon(iconName: string, size = 14, style?: React.CSSProperties) {
  const Icon = ICON_MAP[iconName]
  if (!Icon) return <span style={{ width: size, height: size, display: 'inline-block', flexShrink: 0, ...style }} />
  return <Icon size={size} style={{ flexShrink: 0, ...style }} />
}

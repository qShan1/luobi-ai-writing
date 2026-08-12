/**
 * Sidebar — 左侧导航面板容器
 *
 * 纯路由容器，根据 sidebarView 切换子视图。
 * 所有子视图已拆分到 sidebar/ 子目录。
 */

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useLayoutStore } from '../../stores/layout-store'
import { ContextMenu } from '../ui/ContextMenu'
import KnowledgePanel from './KnowledgePanel'
import HomeSidebarPanel from './sidebar/HomeSidebarPanel'
import ProjectTree from './sidebar/ProjectTree'
import CharactersView from './sidebar/CharactersView'
import {
  registerMenuSetter, unregisterMenuSetter,
  type SidebarMenuState,
} from './sidebar/SidebarSharedUtils'

/** 左侧面板 */
export default function Sidebar() {
  const { t } = useTranslation('panels')
  const sidebarView = useLayoutStore(s => s.sidebarView)
  // 全局右键菜单状态
  const [sidebarMenu, setSidebarMenu] = useState<SidebarMenuState | null>(null)

  // 注册 / 注销右键菜单 setter
  useEffect(() => {
    registerMenuSetter(setSidebarMenu)
    return () => { unregisterMenuSetter() }
  }, [])

  const viewTitles: Record<string, string> = {
    home:       t('sidebar.home'),
    project:    t('sidebar.project'),
    knowledge:  t('sidebar.knowledge'),
    characters: t('sidebar.characters'),
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* 知识库 / 角色视图自带标题头，避免重复 */}
      {sidebarView !== 'knowledge' && sidebarView !== 'characters' && (
        <div className="panel-header">
          <span>{viewTitles[sidebarView]}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sidebarView}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {sidebarView === 'home'       && <HomeSidebarPanel />}
            {sidebarView === 'project'    && <ProjectTree />}
            {sidebarView === 'knowledge'  && <KnowledgePanel />}
            {sidebarView === 'characters' && <CharactersView />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 动态右键菜单 */}
      {sidebarMenu && (
        <ContextMenu
          items={sidebarMenu.items}
          position={sidebarMenu.position}
          onClose={() => setSidebarMenu(null)}
        />
      )}
    </div>
  )
}

// 保持向后兼容的 re-export（外部引用了 chapterTitleCache）

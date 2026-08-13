import { Plus, MoreHorizontal, X, Server, Sparkles, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAgentStore } from '../../../stores/agent-store'
import { useLayoutStore } from '../../../stores/layout-store'
import { useMCPStore } from '../../../stores/mcp-store'
import { skillRegistry, type LoadedSkill } from '../../../services/agent/skill-registry'
import { useRef, useState, useMemo } from 'react'
import { confirm } from '../../ui/Confirm'
import { IconBtn } from '../../ui/IconBtn'
import { MenuItem } from '../../ui/MenuItem'
import { Button } from '../../ui/Button'
import { useOutsideClick } from '../../../hooks/useOutsideClick'

/**
 * Agent 面板顶部工具栏
 */
export default function AgentHeader() {
  const { t } = useTranslation('panels')
  const { createConversation, toggleHistory, showHistory, getActiveConversation } = useAgentStore()
  const toggleAIPanel = useLayoutStore(s => s.toggleAIPanel)
  const [showMore, setShowMore] = useState(false)
  const [subView, setSubView] = useState<'main' | 'mcp' | 'skills'>('main')
  const moreRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭更多菜单
  useOutsideClick(moreRef, () => { setShowMore(false); setSubView('main') }, showMore)

  // MCP 状态
  const { servers: mcpServers, tools: mcpTools } = useMCPStore()
  const connectedCount = mcpServers.filter(s => s.status === 'connected').length

  // Skill 列表
  const skills = useMemo(() => skillRegistry.listAll(), [])

  /** 新建会话 */
  const handleNew = () => {
    createConversation()
  }

  /** 关闭 AI 面板 */
  const handleClose = () => {
    toggleAIPanel()
  }

  // 当前会话为空（无消息）时禁止新建
  const activeConv = getActiveConversation()
  const isCurrentEmpty = !activeConv || activeConv.messages.filter(m => m.role !== 'system').length === 0

  return (
    <div
      className="no-select flex items-center justify-between gap-1.5 px-2 flex-shrink-0"
      style={{
        height: 'var(--height-panel-header)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-hover) 45%, transparent)',
      }}
    >
      {/* 标题 */}
      <div
        className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5"
        style={{
          color: 'var(--color-accent)',
          fontSize: 'var(--text-2xs)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
        }}
      >
        <Sparkles size={11} strokeWidth={2} className="flex-shrink-0" />
        <span className="select-none">AGENT</span>
      </div>

      {/* 右侧工具按钮组 */}
      <div className="flex items-center gap-1.5 px-0.5 flex-shrink-0">

        {/* 新建对话按钮 */}
        <IconBtn
          title={isCurrentEmpty ? t('agent.emptyConversationHint') : t('agent.newConversation')}
          disabled={isCurrentEmpty}
          onClick={handleNew}
          size={18}
        >
          <Plus size={13} strokeWidth={1.5} />
        </IconBtn>

        {/* 历史记录按钮 */}
        <IconBtn
          title={t('agent.historyConversation')}
          onClick={toggleHistory}
          active={showHistory}
          size={18}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
        </IconBtn>

        {/* 更多菜单 */}
        <div className="relative" ref={moreRef}>
          <IconBtn
            title={t('agent.moreOptions')}
            onClick={() => { setShowMore(v => !v); setSubView('main') }}
            active={showMore}
            size={18}
          >
            <MoreHorizontal size={15} strokeWidth={1.5} />
          </IconBtn>

          {/* 更多菜单下拉 */}
          {showMore && (
            <div
              className="menu-pop-top absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg"
              style={{
                width: subView === 'main' ? 200 : 260,
                backgroundColor: 'var(--color-sidebar)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              }}
            >
              {/* ===== 主菜单视图 ===== */}
              {subView === 'main' && (
                <>
                  <MenuItem
                    label={t('agent.mcpServers')}
                    icon={<Server size={13} />}
                    shortcut={connectedCount > 0 ? t('agent.onlineCount', { connected: connectedCount, total: mcpServers.length }) : ''}
                    onClick={() => setSubView('mcp')}
                  />
                  <MenuItem
                    label={t('agent.skillList')}
                    icon={<Sparkles size={13} />}
                    shortcut={skills.length > 0 ? t('agent.skillCount', { count: skills.length }) : ''}
                    onClick={() => setSubView('skills')}
                  />
                  <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
                  <MenuItem
                    label={t('agent.clearAllConversations')}
                    danger
                    onClick={async () => {
                      setShowMore(false)
                      const ok = await confirm(t('agent.confirmClearMessage'), {
                        title: t('agent.confirmClearTitle'),
                        confirmText: t('agent.confirmClearBtn'),
                        danger: true,
                      })
                      if (ok) useAgentStore.getState().clearAll()
                    }}
                  />
                </>
              )}

              {/* ===== MCP 子视图 ===== */}
              {subView === 'mcp' && (
                <MCPSubView
                  servers={mcpServers}
                  toolCount={mcpTools.length}
                  onBack={() => setSubView('main')}
                />
              )}

              {/* ===== Skill 子视图 ===== */}
              {subView === 'skills' && (
                <SkillSubView
                  skills={skills}
                  onBack={() => setSubView('main')}
                />
              )}
            </div>
          )}
        </div>

        {/* 关闭面板按钮 */}
        <IconBtn title={t('agent.closeAgentPanel')} onClick={handleClose} size={18}>
          <X size={15} strokeWidth={1.5} />
        </IconBtn>
      </div>
    </div>
  )
}

// ===== MCP 子视图 =====

// ===== 子视图返回按钮 =====

function SubViewBackButton({
  label,
  countText,
  onClick,
}: {
  label: string
  countText: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-sm)] transition-[background-color,color,transform] duration-200 ease-out hover:bg-[var(--color-hover)] hover:text-[var(--color-text)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] focus-visible:ring-[var(--color-accent)] cursor-pointer"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <ChevronRight size={12} style={{ transform: 'rotate(180deg)' }} />
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-2xs opacity-50">{countText}</span>
    </button>
  )
}

function MCPSubView({
  servers,
  toolCount,
  onBack,
}: {
  servers: { id: string; name: string; status: string; toolCount: number; error?: string }[]
  toolCount: number
  onBack: () => void
}) {
  const { t } = useTranslation('panels')
  const connectedCount = servers.filter(s => s.status === 'connected').length

  const handleConnect = async (server: { id: string; name: string }) => {
    const config = useMCPStore.getState().getServerConfig(server.id)
    if (!config) return
    await useMCPStore.getState().connectServer(config)
  }

  const handleDisconnect = async (serverId: string) => {
    await useMCPStore.getState().disconnectServer(serverId)
  }

  const handleDisconnectAll = async () => {
    await useMCPStore.getState().disconnectAll()
  }

  return (
    <>
      {/* 返回按钮 */}
      <SubViewBackButton
        label={t('agent.mcpServers')}
        countText={t('agent.onlineCount', { connected: connectedCount, total: servers.length })}
        onClick={onBack}
      />

      <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '2px 0' }} />

      {/* 服务器列表 */}
      {servers.length === 0 ? (
        <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          <div className="mb-1">{t('agent.noMcpServers')}</div>
          <div className="text-2xs opacity-60">
            {t('agent.mcpConfigHint')}
          </div>
        </div>
      ) : (
        <div className="py-1 max-h-[200px] overflow-y-auto">
          {servers.map(server => (
            <div
              key={server.id}
              className="flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              {/* 状态灯 */}
              <span
                className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    server.status === 'connected' ? 'var(--color-success)'
                    : server.status === 'connecting' ? 'var(--color-warning)'
                    : server.status === 'error' ? 'var(--color-error)'
                    : 'var(--color-text-muted)',
                }}
              />
              <span
                className="flex-1 truncate font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {server.name}
              </span>
              {server.status === 'connected' && server.toolCount > 0 && (
                <span className="text-2xs opacity-50 flex-shrink-0">
                  {server.toolCount} tools
                </span>
              )}
              {server.status === 'error' && (
                <span className="text-2xs text-red-400 truncate max-w-[80px]" title={server.error}>
                  {t('agent.error')}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0"
                disabled={
                  server.status === 'connecting' ||
                  (server.status !== 'connected' && !useMCPStore.getState().getServerConfig(server.id))
                }
                onClick={() =>
                  server.status === 'connected'
                    ? handleDisconnect(server.id)
                    : handleConnect(server)
                }
              >
                {server.status === 'connected'
                  ? t('agent.mcpDisconnect')
                  : server.status === 'connecting'
                    ? t('agent.mcpConnecting')
                    : t('agent.mcpConnect')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 全部断开 */}
      <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '2px 0' }} />
      <div className="px-3 py-1.5">
        <Button
          variant="ghost"
          className="w-full"
          disabled={connectedCount === 0}
          onClick={handleDisconnectAll}
        >
          {t('agent.mcpDisconnectAll')}
        </Button>
      </div>

      {/* 底部统计 */}
      {toolCount > 0 && (
        <>
          <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '2px 0' }} />
          <div className="px-3 py-1.5 text-2xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('agent.mcpToolsRegistered', { count: toolCount })}
          </div>
        </>
      )}
    </>
  )
}

// ===== Skill 子视图 =====

function SkillSubView({
  skills,
  onBack,
}: {
  skills: LoadedSkill[]
  onBack: () => void
}) {
  const { t } = useTranslation('panels')

  /** 来源徽章颜色 */
  const sourceBadge = (source: string) => {
    switch (source) {
      case 'builtin': return { bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)', label: t('agent.builtin') }
      case 'user': return { bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)', label: t('agent.userScope') }
      case 'project': return { bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)', label: t('agent.projectScope') }
      default: return { bg: 'var(--color-hover)', color: 'var(--color-text-muted)', label: source }
    }
  }

  return (
    <>
      {/* 返回按钮 */}
      <SubViewBackButton
        label={t('agent.skillList')}
        countText={t('agent.skillCount', { count: skills.length })}
        onClick={onBack}
      />

      <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '2px 0' }} />

      {/* Skill 列表 */}
      {skills.length === 0 ? (
        <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          <div className="mb-1">{t('agent.noAvailableSkills')}</div>
          <div className="text-2xs opacity-60">
            {t('agent.skillsDirHint')}
          </div>
        </div>
      ) : (
        <div className="py-1 max-h-[240px] overflow-y-auto">
          {skills.map(skill => {
            const badge = sourceBadge(skill.source)
            return (
              <div
                key={skill.metadata.name}
                className="flex items-start gap-2 px-3 py-1.5 text-xs"
              >
                <Sparkles size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {skill.metadata.displayName ?? skill.metadata.name}
                    </span>
                    <span
                      className="text-2xs px-1 py-0 rounded flex-shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div
                    className="text-caption truncate mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {skill.metadata.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 底部提示 */}
      <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '2px 0' }} />
      <div className="px-3 py-1.5 text-2xs" style={{ color: 'var(--color-text-muted)' }}>
        {t('agent.skillSlashHint')}
      </div>
    </>
  )
}

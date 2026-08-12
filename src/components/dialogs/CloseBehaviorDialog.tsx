import { useEffect, useState } from 'react'
import { Minus, LogOut, PanelBottomClose } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWindowStore } from '../../stores/window-store'
import { ipc } from '../../services/ipc-client'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'

/**
 * 关闭行为询问弹窗
 *
 * 当用户点击窗口关闭按钮且关闭策略为「询问」时，主进程会发送
 * `window:close-requested` 事件。本组件监听该事件并弹出选择：
 *   - 最小化到托盘
 *   - 直接退出
 * 勾选「记住我的选择」后，会将所选行为持久化为默认策略。
 */
export default function CloseBehaviorDialog() {
  const { t } = useTranslation('window')
  const askOpen = useWindowStore((s) => s.askOpen)
  const closeAsk = useWindowStore((s) => s.closeAsk)
  const minimizeToTray = useWindowStore((s) => s.minimizeToTray)
  const quitApp = useWindowStore((s) => s.quitApp)
  const setCloseBehavior = useWindowStore((s) => s.setCloseBehavior)
  const [remember, setRemember] = useState(false)

  useEffect(() => {
    if (!ipc.isElectron) return
    const unsub = ipc.on('window:close-requested', () => {
      useWindowStore.getState().openAsk()
    })
    return unsub
  }, [])

  if (!askOpen) return null

  const handleMinimize = async () => {
    if (remember) await setCloseBehavior('minimize')
    await minimizeToTray()
  }

  const handleQuit = async () => {
    if (remember) await setCloseBehavior('quit')
    await quitApp()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{
          backgroundColor: 'var(--color-editor-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-hover)' }}
          >
            <PanelBottomClose size={17} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {t('title')}
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {t('description')}
            </p>
          </div>
        </div>

        {/* 选项按钮 */}
        <div className="mt-4 space-y-2">
          <Button
            className="w-full justify-start"
            onClick={handleMinimize}
            autoFocus
          >
            <Minus size={14} />
            {t('minimizeToTray')}
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={handleQuit}
          >
            <LogOut size={14} />
            {t('quit')}
          </Button>
        </div>

        {/* 记住选择 */}
        <div
          className="flex items-center justify-between mt-4 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-hover)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('remember')}
          </span>
          <Switch
            checked={remember}
            onCheckedChange={setRemember}
            aria-label={t('remember')}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={closeAsk}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}

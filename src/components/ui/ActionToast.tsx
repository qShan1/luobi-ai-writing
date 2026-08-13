import i18n from '../../i18n'
import { toastHost, type ToastAction } from './ToastHost'

export type ActionToastType = 'success' | 'info' | 'warning' | 'ai'

export type ActionToastAction = ToastAction

export interface ActionToastOptions {
  type?: ActionToastType
  title?: string
  message: string
  actions?: ActionToastAction[]
  duration?: number
}

export const actionToast = {
  show: (options: ActionToastOptions) => {
    toastHost({
      type: options.type ?? 'info',
      title: options.title,
      message: options.message,
      actions: options.actions,
      duration: options.duration ?? 8000,
    })
  },

  workflowComplete: (message: string, openAction?: () => void | Promise<void>) => {
    const actions: ActionToastAction[] = []
    if (openAction) {
      actions.push({ label: i18n.t('openAndView', { ns: 'common', defaultValue: '打开查看' }), onClick: openAction })
      actions.push({ label: i18n.t('ignore', { ns: 'common', defaultValue: '忽略' }), variant: 'ghost' })
    }
    toastHost({
      type: 'ai',
      message,
      actions,
      duration: openAction ? 10000 : 6000,
    })
  },
}

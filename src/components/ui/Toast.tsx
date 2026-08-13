import { toastHost } from './ToastHost'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

function show(message: string, type: ToastType, duration: number) {
  toastHost({ type, message, duration })
}

export const toast = {
  success: (msg: string, duration = 3500) => show(msg, 'success', duration),
  error:   (msg: string, duration = 5000) => show(msg, 'error', duration),
  warning: (msg: string, duration = 4500) => show(msg, 'warning', duration),
  info:    (msg: string, duration = 4000) => show(msg, 'info', duration),
}

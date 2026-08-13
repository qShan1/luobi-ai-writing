import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 液态玻璃（Liquid Glass）效果设置。
 * 面板级液态玻璃（.liquid-enabled 下的 .liquid-glass-panel）是固定 CSS 材质，
 * 这里只保留总开关。
 */
interface EffectsState {
  /** 是否启用液态玻璃效果 */
  enabled: boolean
  toggle: () => void
}

export const useEffectsStore = create<EffectsState>()(
  persist(
    (set) => ({
      enabled: true,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    {
      name: 'luobi-effects',
      partialize: (s) => ({ enabled: s.enabled }),
    },
  ),
)

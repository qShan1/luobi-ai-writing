import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 液态玻璃（Liquid Glass）效果设置。
 * 控制全局玻璃质感的开关、折射强度、模糊与弹性。
 */
export type GlassMode = 'standard' | 'polar' | 'prominent'

export interface GlassEffectConfig {
  /** 是否启用液态玻璃效果 */
  enabled: boolean
  /** 折射位移强度（8-140） */
  displacementScale: number
  /** 磨砂模糊强度（0.02-0.2） */
  blurAmount: number
  /** 颜色饱和度（100-220） */
  saturation: number
  /** 边缘色差强度（0-6） */
  aberrationIntensity: number
  /** 弹性手感（0-0.4，0 = 刚性） */
  elasticity: number
  /** 折射模式 */
  mode: GlassMode
}

interface EffectsState extends GlassEffectConfig {
  setGlass: (patch: Partial<GlassEffectConfig>) => void
  toggle: () => void
  reset: () => void
}

export const DEFAULT_GLASS: GlassEffectConfig = {
  enabled: true,
  displacementScale: 35,
  blurAmount: 0.08,
  saturation: 150,
  aberrationIntensity: 2,
  elasticity: 0.15,
  mode: 'standard',
}

export const useEffectsStore = create<EffectsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_GLASS,

      setGlass: (patch) => set({ ...get(), ...patch }),

      toggle: () => set((s) => ({ enabled: !s.enabled })),

      reset: () => set({ ...DEFAULT_GLASS }),
    }),
    {
      name: 'luobi-effects',
      partialize: (s) => ({
        enabled: s.enabled,
        displacementScale: s.displacementScale,
        blurAmount: s.blurAmount,
        saturation: s.saturation,
        aberrationIntensity: s.aberrationIntensity,
        elasticity: s.elasticity,
        mode: s.mode,
      }),
    },
  ),
)

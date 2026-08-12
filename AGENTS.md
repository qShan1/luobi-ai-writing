# AGENTS.md — AI 编码助手工作指南

> 落笔 (Luobi AI Writing) 项目的开发规范速查。
> 完整规范见 `rule.md`。

## 项目基本信息

- **名称**: 落笔 LUOBI AI WRITING
- **版本**: 0.1.0
- **技术栈**: Electron 41 + Vite 8 + React 19 + TypeScript 5 (strict) + Zustand 5 + CodeMirror 6 + TailwindCSS 3
- **包管理器**: pnpm（不要用 npm/yarn，已删除 package-lock.json）
- **Node**: v24.16.0

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 完整打包（tsc + vite build + electron-builder）
pnpm exec tsc --noEmit  # 仅类型检查
pnpm lint         # ESLint 检查
pnpm test         # Vitest 测试
```

## 目录结构速查

```
src/
├── components/
│   ├── ui/          # 公共 UI（Button, Dialog, Toast, Tooltip 等）
│   ├── layout/      # 布局（TitleBar, StatusBar, ToolWindowBar）
│   ├── panels/      # 面板（Sidebar, EditorArea, BottomPanel, AIOutputPanel）
│   ├── editor/      # 编辑器（CodeMirrorEditor, DraftEditor, ThreeWayMerge）
│   ├── effects/     # 视觉特效（GlassSurface）
│   ├── settings/    # 设置面板
│   ├── pages/       # 页面（WelcomePage）
│   └── dialogs/     # 业务对话框
├── stores/          # Zustand 状态仓库
├── services/        # 业务服务（LLM, 工作流, 叙事一致性）
├── styles/          # 补充 CSS
├── vendor/          # 第三方源码副本（liquid-glass）
├── shared/          # 主进程/渲染进程共享类型
└── lib/             # 工具函数
electron/            # 主进程代码
```

## 开发规范要点

### 代码风格
- TypeScript strict 模式，不用 `any`
- 组件用函数式 + hooks，不用 class
- 状态管理用 Zustand（不要引入 Redux）
- 样式用 TailwindCSS + CSS 变量主题系统（`var(--color-*)`）
- 图标用 `lucide-react`

### 动画规范（基于 Emil Kowalski 标准）
- **Easing**: 使用 `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`，不要用 `ease-in`
- **Duration**: UI 动画 < 300ms，按钮反馈 100-160ms
- **Properties**: 只动画 `transform` 和 `opacity`，不要动画 `width/height/margin/padding`
- **Scale**: 入场从 `scale(0.95)` 开始，不要从 `scale(0)`
- **Hover**: 必须加 `@media (hover: hover) and (pointer: fine)` 门控
- **Reduced motion**: 必须尊重 `prefers-reduced-motion`
- **No `transition: all`**: 始终指定具体属性

### Git 规范
- 提交信息用英文，简短描述改动
- 每个大功能完成后推送到 GitHub main
- 不要自动打 tag/release，等用户指示

### 打包
- 打包路径: `release/0.1.0/`
- 安装版: `落笔-0.1.0-setup.exe`
- 便携版: `落笔-0.1.0-portable.exe`
- 打包前确保 `tsc --noEmit` 和 `vite build` 通过

## 关键文件

| 文件 | 作用 |
|------|------|
| `src/index.css` | 全局样式 + CSS 变量 + 动画 keyframes |
| `src/App.tsx` | 根组件，四区布局 |
| `src/stores/layout-store.ts` | 面板布局持久化 |
| `src/stores/effects-store.ts` | 视觉特效设置 |
| `src/components/effects/GlassSurface.tsx` | 玻璃表面组件 |
| `vite.config.ts` | Vite 配置 |
| `electron-builder.json5` | 打包配置 |
| `rule.md` | 完整开发规范 |

## 注意事项

- liquid-glass-react 已 vendor 到 `src/vendor/liquid-glass/`，修改玻璃效果时注意同步
- motion@13 已安装，import 路径是 `motion/react`（不是 `framer-motion`）
- react-resizable-panels v4: Panel 用 `panelRef`（非 `ref`），Group 用 `onLayoutChanged`
- Layout store 用 `clampNum`/`readNum` 防脏写（localStorage 可能存 NaN → null）

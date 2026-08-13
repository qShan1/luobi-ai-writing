# DEVLOG — 开发记录

> 记录每次重要改动，方便回溯。

---

## 2026-08-12: Animation & Design Audit

**基于 [emilkowalski/skills](https://github.com/emilkowalski/skills) 审查标准优化动画和交互**

### 改动文件
- `src/index.css` — easing tokens、keyframes、hover 门控、reduced-motion、stagger
- `src/styles/agent-tools.css` — transition: all 修复、tool-spin duration
- `src/components/editor/three-way-merge.css` — transition: all 修复
- `src/components/panels/BottomPanel.tsx` — height 动画改 clip-path
- `src/components/pages/WelcomePage.tsx` — stagger 间隔调整
- `AGENTS.md` — 新建 AI 编码助手工作指南
- `plans/animation-design-polish.md` — 审查计划文档

### HIGH 修复（6 项）
1. **bounce-in keyframe**: `scale(0.3)` → `scale(0.95)`，不再凭空弹出
2. **transition: all × 5**: icon-btn / cm-search / confirm-card-btn / artifact-card / twm-adopt → 具体属性列表
3. **prefers-reduced-motion**: 全局 `@media (prefers-reduced-motion: reduce)` 规则
4. **@media (hover: hover)**: 所有含 transform 的 `:hover` 效果加门控
5. **Easing tokens**: `cubic-bezier(0.16,1,0.3,1)` → `(0.23,1,0.32,1)` 强 ease-out
6. **icon-btn hover scale**: 1.1 → 1.05

### MEDIUM 修复（5 项）
7. **BottomPanel height**: `height: 0→'auto'` → `clipPath: inset(0 0 100% 0)` 消除 layout thrashing
8. **Stagger 间隔**: CSS `.stagger-enter` 50ms → 35ms
9. **Spring 曲线降级**: tool-btn / btn-primary / ai-glow 的 `cubic-bezier(0.175,0.885,0.32,1.275)` → `var(--ease-out)`
10. **WelcomePage stagger**: Framer Motion 70ms → 50ms
11. **capsule-complete**: 1.8s → 0.5s

### LOW 修复（1 项）
12. **tool-spin**: 1s → 0.6s

### 验证
- `tsc --noEmit` ✅
- `pnpm build` ✅ 安装版 + 便携版打包成功
- Commit: `d0429d5`

---

## 2026-08-12: GlassSurface 花屏修复

**删除 SVG 滤镜层（chromatic aberration + displacement map），保留 backdrop-filter 磨砂**

### 根因
GlassFilter 的色差 + 位移折射在红色卡片上产生严重 RGB 通道分离 → 彩虹重影 / 花屏 / 文字扭曲

### 改动
- `src/components/effects/GlassSurface.tsx`: 移除 SVG GlassFilter、filter: url()、ResizeObserver、mouse tracking
- 玻璃质感完全靠 CSS `backdrop-filter: blur + saturate` 实现
- 保留顶部高光层和 box-shadow

### 验证
- Commit: `415f21e`

---

## 2026-08-12: GlassSurface tint 层修复

**删除 tint 叠加层，不再搅浑卡片背景色**

### 改动
- `src/components/effects/GlassSurface.tsx`: 删除 `color-mix(var(--color-panel) 45%)` tint span

### 验证
- Commit: `56ff7f0`

---

## 2026-08-12: 白屏修复

**layout-store 脏写防护 — 防止 localStorage 存 NaN → null 导致面板崩溃**

### 根因
`JSON.stringify(NaN)` → `null` → `defaultSize={null}` → react-resizable-panels 解构崩溃

### 改动
- `src/stores/layout-store.ts`: 新增 `clampNum`/`readNum` 辅助函数，setter 拒绝非有限数字，merge 阶段净化数字字段
- `vite.config.ts`: sourcemap 恢复为 false
- `src/main.tsx`: 移除临时 debug 日志

### 验证
- Commit: `70a316b`

---

## 2026-08-12: M4b — lancedb 平台包裁剪

**安装包 337MB → 172MB**

### 改动
- 移除 lancedb 平台特定二进制包（darwin-arm64、linux-x64 等）

### 验证
- Commit: `c7a66a7`

---

## 2026-08-12: M5 — motion 微交互

**Framer Motion (motion@13) 全局微交互动画**

### 改动
- StreamingCursor: 呼吸脉冲
- BottomPanel: tab 切换、任务列表进出场、步骤展开
- Agent 新消息淡入
- AIOutputPanel 步骤块淡入
- Sidebar 视图切换过渡
- WelcomePage 交错进场

### 验证
- Commit: `6f6a07d`

---

## 2026-08-12: M4b — lancedb 裁剪 + M4 — Monaco 移除

**Monaco Editor 移除（省 ~100MB asar）+ electronLanguages 精简（省 ~40MB locales）**

### 验证
- Commit: `f8154d9` (M4) + `c7a66a7` (M4b)

---

## 2026-08-12: M3 — computeBatchSize + runWithConcurrency

**批量处理优化 + 并发控制**

### 验证
- Commit: `18fd0a7`

---

## 2026-08-12: M2 — 布局优化

**BottomPanel 真折叠、面板尺寸持久化、删死代码、CSS 变量修复、Sidebar 去重、硬编码色值迁移**

### 验证
- Commit: `57c8077`

---

## 2026-08-12: M1 — AI 框架加固

**llm-controller/stream/error/watchdog/http-utils/providers/prompt/workflow/MCP/LLM 调用日志**

### 验证
- Commit: `ab39fb9`

---

## 2026-08-12: M0 — 统一包管理器

**删除 package-lock.json，统一 pnpm**

### 验证
- Commit: `9cd95cb`

---

## 2026-08-12: 按钮样式与可访问性统一

**统一 StatusBar 与 EditorArea 的按钮交互、键盘可达与焦点样式**

### 改动文件
- `src/components/layout/StatusBar.tsx`
- `src/components/panels/EditorArea.tsx`

### 内容
1. **StatusBarSegment**: 可点击段改 `<button>`（type=button），非可点击段保留 `<div>`；JS hover → `hover:bg-[rgba(var(--color-accent-rgb),0.08)]`，补 `active:scale-[0.98]` + `focus-visible` 焦点环。
2. **AITaskCapsule**: 完成/多任务/单任务三个可点击胶囊 `<div>` → `<button>`，保留 `ai-task-capsule` 样式类，补 active 缩放与 focus-visible。
3. **EditorArea 标签 hover**: 移除 `onMouseEnter/onMouseLeave` 手写 style，非激活 tab 用 `hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]` CSS，激活 tab 仍走内联背景。
4. **EditorArea 关闭按钮**: JS hover → `hover:bg-[var(--color-hover)]`，补 `active:scale-[0.96]` + focus-visible；dirty 关闭圆点 `span` → `<button>`（键盘可达）。

### 验证
- `pnpm exec tsc --noEmit` ✅
- `pnpm lint` ✅

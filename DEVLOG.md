# DEVLOG — 开发记录

> 记录每次重要改动，方便回溯。

---

## 2026-08-13: UI 质感提升 — 三区层次、磨砂状态栏、控件与圆角规范统一

**拉平三区底色层次、加磨砂状态栏与柔和投影，统一状态标签/复选框/按钮 hover 与圆角规范。**

### 实现
- `src/index.css`
  - `@theme` 新增 `--radius-sm/md/lg/xl` 映射，让全局 `rounded-*` 直接对齐项目 token（4/6/10/14px），消除零散硬编码圆角。
  - 各主题三区背景递进重构（不动 `--color-accent` 与语义色）：`activity-bar < bg < sidebar < editor < panel`；light 主题冷蓝调统一为暖白莫兰迪（`bg #F1EDE7 / sidebar #EAE5DB / editor-bg #FAF8F4 / panel #FFFFFF`），galaxy/paper/dark 的 `sidebar` 与 `panel` 由同色拆开（如 galaxy `#1C2521 / #25302A`），并微调 `hover/active` 对比度。
  - light 主题冷色残留（statusbar/titlebar-text/activity-icon）统一为暖灰。
  - `--height-statusbar` 28→30px。
  - 新增 `.statusbar-frost`（半透明材质 + blur + 上浮柔和投影）与升级 `.glass`（blur 14px + saturate），均带 `@media (prefers-reduced-transparency: reduce)` 实心降级。
  - 全局 `input[type="checkbox"/"radio"]` 统一 `accent-color: var(--color-accent)` + `cursor: pointer`。
  - `.ai-task-capsule` 由直角改圆角 pill（22px、soft 底色）。
- `src/components/layout/StatusBar.tsx` — 改用 `.statusbar-frost`，移除硬 borderTop，分段留白加大（`px-2.5 gap-1.5`）。
- `src/components/panels/BottomPanel.tsx` — 活跃任务徽章改 pill（`color-mix` soft 底），状态条行距加大（`px-3.5 py-2.5`）。
- `src/components/panels/sidebar/SidebarShared.tsx` — 树节点 badge 改为统一 soft pill（`color-mix` 12% 底 + 状态色文字）。
- `src/components/pages/KnowledgeOverview.tsx` — 修复 StatCard badge 背景 `${badgeColor}20`（对 `var(--x)` 失效）→ `color-mix` 12% 底色。
- `src/components/ui/Button.tsx` — `outline` 变体 hover 增加微抬升 + `shadow-sm` 悬浮反馈。
- `src/components/panels/AIOutputPanel.tsx` — 悬浮停止按钮改为半透明磨砂底（`color-mix` 82% + `backdrop-blur`），对滚动内容真实起雾。

### 验证
- `pnpm exec tsc --noEmit` ✅
- `pnpm lint` ✅

---

## 2026-08-13: 弹窗升级液态玻璃质感 + 统一入场动效

**DialogContent / Confirm / AlertDialog / SettingsModal 主体由纯色改为高透液态玻璃，保持 Radix 逻辑与可访问性不动。**

### 实现
- `src/components/ui/Dialog.tsx` — `DialogContent` 从 `bg-[var(--color-bg)]` 纯色改为 `color-mix(in srgb, var(--color-panel) 70%, transparent)` + `backdrop-filter: blur(24px) saturate(160%)`（含 `-webkit-`），boxShadow 叠加顶部白高光 `inset 0 1px 0 0 rgba(255,255,255,0.35)` 与大投影 `0 25px 50px -12px rgba(0,0,0,0.25)`；保留 `rounded-2xl border`、`zoom-in-95 + fade-in-0` 入场与 `duration-200 ease-out`。
- `src/components/ui/Confirm.tsx` — 弹窗主体独立容器同样玻璃化（`--color-panel` 70% + blur 24px + 白高光顶边 + 大投影，叠加 `--shadow-popover`）。
- `src/components/ui/AlertDialog.tsx` — 弹窗主体同样玻璃化（与 Confirm 同参数）。
- `src/components/settings/SettingsModal.tsx` — 主容器由 `--color-editor-bg` 改为 `color-mix(in srgb, var(--color-editor-bg) 80%, transparent)` + `blur(28px) saturate(160%)` + 白高光顶边 + 大投影；遮罩 blur 4px→12px，与 DialogOverlay 一致。
- 遮罩 `DialogOverlay` 保持 `bg-black/30 backdrop-blur-sm`（内联已是 blur(12px)），不动。

### 验证
- `pnpm exec tsc --noEmit` ✅
- `pnpm lint` ✅

---

## 2026-08-13: 修复「故事架构生成自动停止、无法生成完整」— 移除三处 60s 硬超时叠加

**架构四步流水线（前提→角色→世界观→大纲）任一步 LLM 输出超约 60s 被掐断致整条 workflow 失败，移除渲染端/主进程的 60s 看门狗叠加，并补流中途重试、max_tokens 截断检测与架构步骤大 maxTokens。**

### 实现
- `src/stores/llm-store.ts` — 渲染端看门狗改为「首事件后总超时」：新增 `receivedChunk` 标记，首个 chunk 到达时 `clearTimeout` 60s 看门狗并重启 10 分钟看门狗，保证长输出不被 60s 掐断；`onDone`/`onError` 维持 `clearTimeout`。
- `electron/llm/openai-provider.ts`、`electron/llm/gemini-provider.ts` — 主进程流式超时分层：
  - 外层新增 `STREAM_TOTAL_TIMEOUT_MS`（30 分钟）总超时信号 `totalSignal`，重试循环/`reader.read()` 读取全程生效，`finally` 中 `cleanup()`；首字节 60s 信号改以 `totalSignal.signal` 为外部信号，实现总超时穿透 abort 整个流。
  - `fetch` 拿到 `res.ok` 响应后立即 `activeCleanup?.()` 并置空，清掉 60s 首字节计时器，流读取阶段不再被其误掐。
  - SSE 结束检测 `finish_reason`：OpenAI 流 `finish_reason === 'length'`（choice 与 delta 双通道），Gemini 流 `finishReason === 'MAX_TOKENS'` → `onError('输出达到 max_tokens 上限被截断')`，不再静默 `onDone`。
- `src/services/workflows/workflow-utils.ts` — `streamToFullText` 包 1 次整流重试：单次流中途错误（超时 AbortError 等）重试一次；用户取消（`options.cancelled?.()` / `workflowCancelled` / `已取消生成`）直接抛出不重试。
- `src/services/workflows/commands/base-command.ts` — `callLLM`/`callLLMWithBuilder` 的 options 新增 `maxTokens`；新增 `callLLMWithBuilderForLongOutput`，按 `Math.max(model.maxTokens ?? 0, 8192)` 显式传大 `maxTokens`。
- `src/services/workflows/commands/architecture.command.ts` — 四步命令（`GenerateCoreSeedCommand`/`GenerateCharactersCommand`/`GenerateWorldBuildingCommand`/`GeneratePlotArchitectureCommand`）改用 `callLLMWithBuilderForLongOutput`。

### 验证
- `pnpm exec tsc --noEmit` ✅
- `pnpm lint` ✅

---

## 2026-08-13: 底部任务列表历史行 — 快捷操作 + 详情 + 留白

**为历史任务行新增 hover 快捷操作（重新生成/一键重试/导出文本）与点击展开的步骤详情，并优化行内留白。**

### 实现
- `src/components/panels/BottomPanel.tsx`
  - 新增 `HistoryRunRow`：历史任务行改为「点击行展开/收起详情 + hover 浮现操作按钮」；行间距加大（`px-3 py-2.5`、`gap-2.5`）、标题 `truncate`、新增状态胶囊标签（完成/失败，`color-mix` 10% 底色，用 token 不写死 hex）、步骤计数与时间分列对齐。
  - 操作按钮（`IconBtn` 18，`opacity-0 group-hover:opacity-100`，按钮区 `stopPropagation` 避免误触展开）：
    - **重新生成**（`RefreshCw`）：仅对无参数工厂可安全重建的类型（`architecture_generation` → `createArchitectureWorkflow()`、`directory` → `createDirectoryWorkflow()`）接入 `startWorkflow` 真实重跑，成功后 toast 提示；其余类型按钮禁用并 tooltip 说明「无法从历史重跑」。
    - **一键重试**（`RotateCcw`）：仅失败任务显示；与重新生成同一 `startWorkflow` 路径（工作流无部分断点续跑能力，失败即整任务重跑）。
    - **导出文本**（`Download`）：复用现有 IPC `dialog:select-folder` + `fs:write-file`，把 run 的步骤状态/耗时/输出/错误导出为 .md，成功/失败用 toast 反馈；无需新 IPC。
  - 新增 `HistoryRunDetail`：展开后逐步骤展示状态图标 + 名称 + 状态文案 + 耗时（由 startedAt/completedAt 计算）+ 输出摘要（`result` 截断 200 字）+ 错误。
  - 新增 `rebuildDefinition()`（类型→工厂映射，仅覆盖可安全重跑的类型）与 `buildRunMarkdown()`（导出 md 组装）。
  - 复用 `StepStatusIcon`；任务数据流/状态机零改动，仅增强展示与操作入口。
- `src/i18n/locales/{zh-CN,en,ru}/panels.json` — `bottomPanel` 下新增 `historyRerun`/`historyRetry`/`historyExport`/`historyRerunStarted`/`historyExported`/`historyExportFailed`/`historyRerunUnavailable`。

### 验证
- `pnpm exec tsc --noEmit` ✅（src 无错误；`electron/llm/*-provider.ts` 的 3 个错误为工作区遗留、与本改动无关）
- `pnpm lint` ✅

---

## 2026-08-13: AI 输出分板块卡片 + 排版优化

**右侧 AI 输出区由长段纯文本滚动框改为分板块卡片归类，并优化排版。**

### 实现
- `src/components/ui/MarkdownContent.tsx` — 新增 `splitIntoSections()`：按 Markdown 标题（`#`/`##`/`###`）或分隔线（`---`/`===`）把内容切成小节（代码块内不切分，少于 2 节视为无结构）；`renderMarkdownContent()` 将各小节渲染为卡片（标题行 + 正文，复用原 `renderLines`，Markdown 表格/代码块能力不变）。AI 输出面板与 Agent 对话共用此组件，一处生效。
- `src/index.css` — `@layer components` 下新增 `.assistant-section-card`（`--color-panel` 底 + `--color-border` 细边框 + `--radius-lg` 圆角 + `--shadow-sm`）与 `.assistant-section-title`（下分隔线标题行）。
- 排版：标题按层级加大字号/字重并拉开边距，段落 `my-1 leading-relaxed`，列表/引用/分隔线间距增大。

### 验证
- `pnpm exec tsc --noEmit` ✅
- `pnpm lint` ✅

---

## 2026-08-13: 统一面板/Agent/工具栏按钮

**将面板/Agent/工具栏类手写 `<button>` 收敛到统一 `<Button>` / `<IconBtn>` 组件。**

### 改动文件
- `src/components/panels/EditorArea.tsx` — 保存/切Tab 图标按钮 → `IconBtn`(18)
- `src/components/panels/AIOutputPanel.tsx` — 关闭 → `IconBtn`(18)；run 切换补 focus-visible
- `src/components/panels/BottomPanel.tsx` — 关闭/取消 → `IconBtn`(18)；继续 ×2 → `Button default sm`
- `src/components/panels/agent/AgentConversation.tsx` — 查看全部 → `Button ghost sm`；删除补 focus-visible
- `src/components/panels/agent/AgentInputBox.tsx` — 模式/模型触发器补 focus-visible
- `src/components/panels/agent/ConfirmCard.tsx` — 拒绝/批准 → `Button outline/success sm`
- `src/components/panels/agent/ToolCallBlock.tsx` — 复制 → `Button ghost sm`
- `src/components/panels/agent/SlashCommandMenu.tsx` / `MentionMenu.tsx` — 选项补 focus-visible
- `src/components/panels/KnowledgePanel.tsx` — 删除补 focus-visible
- `src/components/pages/KnowledgeOverview.tsx` — 清除 → `Button ghost sm`

### 保留原样（特殊结构）
- EditorArea 的 dirty/非 dirty Tab 关闭按钮（dot↔X 结构）、more 菜单按钮（需 ref 定位）
- AgentConversation 的浮动 scrollToBottom、会话列表项、hover 删除按钮
- AIOutputPanel 的折叠头/历史列表项
- AgentHeader 的 SubViewBackButton、AgentInputBox 的发送按钮与菜单项

### 验证
- `pnpm exec tsc --noEmit`：仅剩 `TitleBar.tsx(192)` 既有错误（`cycleTheme` 需事件参数与 `IconBtn` 的 `() => void` 冲突，非本次改动引入）
- `pnpm lint`：通过

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

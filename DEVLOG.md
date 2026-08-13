# DEVLOG — 开发记录

> 记录每次重要改动，方便回溯。

---

## 2026-08-13: 四线并行修复 — 数据丢失 / AI 工作流 / 后端持久化 / UI-i18n

**经四路 Agent 审查后按文件域隔离并行修复，全部问题落地，tsc / i18n 测试 / build 通过。**

### A. 前端写作路径（数据丢失）
- 修稿/审稿/定稿改用编辑器当前内容，不再读取磁盘旧稿；正文章节保存改走 draft-update 并只读；章节蓝图写回 tab.content 标 dirty 并容错；打开项目/退出前对 dirty Tab 确认；定稿后 Tab 按 draftId 刷新；重复点击侧栏同步最新内容；diff Tab 携带真实 draftId/revisionPath；合并前确认未保存修改；config Tab 标 dirty；只读草稿 ⌘S 不保存；三栏合并改用 textContent；删除死代码 DiffViewer。

### B. AI / Agent / 工作流
- 工具启动工作流不再等待完整循环（消除 30s 超时误判）；定稿 BLOCK 改 throw、写稿 BLOCK 保留全文；确认卡片加 60s 超时 + 切会话自动取消、生成改为 per-conversation；对话改流式并显示推理轮次；工具结果上限提到 12000、修复 @file/@chapter 预取；会话裁剪加摘要前缀 + 每轮消息预算裁剪；仅可重试错误重试；看门狗对齐主进程 30min 且触发时 cancel；等 skill 加载完成再初始化工具；错误信息截断、未知命令提示。

### C. Electron 后端 / 持久化
- 向量维度改为动态获取（修复默认 embedding 模型导入）；repository 跳过 undefined 防 NULL 覆盖；代理 env 每次请求前重建；迁移索引失败醒目提示且去重不依赖索引；IPC 校验扩展到 draft/revision/blueprint/character/config/llm/fs；API Key 用 safeStorage 加密并兼容旧明文；统计标注当前项目；新增 project:set-current；向量回填改增量不丢库；draft 状态加枚举校验；大文件异步读取；fs 写失败清理 tmp、list-dir 加深度上限；损坏 DB 明确报错；导出文件名净化；无模型时用 BUILTIN_PRESETS 填充默认。

### D. UI / i18n / 清理
- 修复 LeftToolWindowBar raw key、document.title 乱码、critical 失败徽章文案；删除 Tooltip/Badge/Icon/GlassSurface 等死代码与一批死 CSS 类；Confirm/ContextMenu/Toast/IconBtn a11y 补缺；浮层玻璃统一走 .glass-overlay-panel 门控与降级；--font-sans 双源与重复动效 keyframes 合并；About 区与 FontSelect 硬编码 i18n 化；z-index 统一 token；gold/tab-indicator token 对齐。

### 验证
- `pnpm exec tsc --noEmit` 通过；`vitest run src/i18n/__tests__/i18n.test.ts` 68/68 通过；`pnpm build` 通过。

---

## 2026-08-13: 小说配置持久化、Agent 尺寸与设置字体修复

**根据实际运行截图修复四个用户路径问题，不更换架构、不新增依赖。**

- 核心大纲新增独立 `project_core.core_outline` 字段，数据库 schema 升级到 v2；保存/更新/打开均使用该字段，不再错误复用架构 `synopsis`。
- 情节结构说明浮层改用现有 Portal `Popover`，不再被配置编辑器的滚动容器裁剪。
- Agent 面板最小宽度提升到 18%，默认宽度 24%，并给横向 PanelGroup 补 `min-w-0`，避免窄窗口下标题、模型和输入工具栏互相挤压。
- 设置弹窗固定为视口高度，降低遮罩压暗程度；移除启动时遗留的 `setZoomLevel` 缩放覆盖，只保留 `setZoomFactor`。
- 系统字体 `system:<name>` 现在可被主题 store 解析并写入 `--font-sans`，界面字体设置真正生效。
- 强化液态玻璃环境光、输入控件、NovelConfig 分组和设置模型卡材质；Portal 浮层通过 `html.liquid-enabled` 继承玻璃状态。

### 验证
- `pnpm build` 通过。
- 未运行完整测试套件；本次按用户要求以真实使用路径和构建结果为主。

---

## 2026-08-13: 液态玻璃覆盖补齐 + 浮层裁剪修复

**用户反馈此前只有外围面板有玻璃质感，欢迎页、知识库、Agent 输入区、编辑器 Chrome 和弹窗仍是实体块。本次沿用现有液态玻璃实现，不新增依赖；正文编辑画布保持实心以保证阅读可读性。**

- 欢迎页次级操作、知识库统计/搜索/回填区、Agent 输入/菜单、编辑器顶部信息栏与 Tab、设置弹窗、通用 Dialog 接入现有 `liquid-glass-panel`/控件材质。
- Agent 工具调用、确认卡、产物卡改为低对比半透明层，减少卡片墙效果。
- Slash/mention/context menu 统一玻璃菜单材质；侧栏右键菜单改为 Portal 到 `document.body`，避免被 `overflow-hidden` 和 `backdrop-filter` 裁剪。
- 通用 Dialog 增加视口内最大高度和内部滚动，避免小窗口/大字体下底部不可达。
- 修复 Welcome 页面 `welcome-action-*` 与 CSS `welcome-*` 类名断链，使主次操作尺寸样式重新生效。
- 保留 `prefers-reduced-transparency` 降级路径。
- 根据运行截图修复 `panels` 组件误用 `common.*` key 的 namespace 问题，底部模型调用统计/表头、日志按钮、知识库刷新和章节创建取消按钮不再显示 raw key。

### 验证
- `pnpm build` 通过。
- 未运行完整测试套件；本轮以实际界面路径和构建结果为主。

---

## 2026-08-13: AI 面板浮层遮挡/裁剪修复 + 工具栏按钮挤压修复

**AI 助手面板下拉（上下文/模式/模型/斜杠/提及/更多）被 `overflow-hidden` 链与 `backdrop-filter` stacking context 裁剪遮挡，改为 Portal 到 body 的 fixed 浮层；修复模型名/模式文字导致的按钮被撑大换行。不改变交互与数据流。**

### A. 遮挡修复（根因）
- **根因**：`AIPanel` 根 `overflow-hidden` + `flex-1 overflow-hidden` + `EmptyState` 的 `overflow-y-auto` 会裁剪向上弹出的绝对定位下拉；`.liquid-glass-panel` 的 `backdrop-filter` 又让整个面板自成 stacking context，下拉的 `z-50` 被困在面板内。
- 新增 `src/components/ui/Popover.tsx`：`createPortal` 到 `document.body` + `position: fixed`，用 `getBoundingClientRect` 计算相对触发器的坐标，监听 `scroll`/`resize`/触发器 `ResizeObserver` 自动重定位，并自管外部点击关闭（同时判定触发器与浮层）。
- `AgentInputBox.tsx`：上下文菜单、模式菜单、模型菜单、SlashCommandMenu、MentionMenu 全部改由 Popover 承载；移除三个 `useOutsideClick` 调用。
- `AgentHeader.tsx`：更多菜单改由 Popover 承载，移除 `useOutsideClick`。
- `SlashCommandMenu.tsx` / `MentionMenu.tsx`：去掉绝对定位（由 Popover 的 fixed 容器承载）。
- `ui/Tooltip.tsx` 本就用 radix `Portal` 渲染到 body，不受 overflow 影响，未改动。

### B. 按钮挤压/换行修复
- 模型按钮文字 `truncate` 补 `min-w-0`（flex item 否则无法收缩省略）。
- 模式按钮文字补 `whitespace-nowrap`（避免窄面板下文字换行把按钮撑高）。
- `AgentHeader` 标题补 `whitespace-nowrap`。

### 验证
- `pnpm exec tsc --noEmit` 通过
- `pnpm lint` 通过

---

## 2026-08-13: 设置界面动效 + 切换卡顿修复

**设置弹窗：补 section 切换过渡与弹窗入场动画；用懒加载缓存 + `React.memo` 消除快速切换侧边栏时的延迟。不改变设置功能与交互。**

### A. 动效（`src/components/settings/SettingsModal.tsx`）
- 弹窗本体入场：遮罩淡入（0.2s）+ 面板 `scale(0.97)`→1 + 透明度（0.22s，`motion/react`，`useReducedMotion` 时跳过动画）。
- section 内容区切换：每个已访问的 section 用 `.animate-fade-in-up`（淡入 + 上移 12px，0.25s `--ease-out`），`display` 切换时 CSS 动画自动重放；`prefers-reduced-motion` 由全局规则降级。

### B. 卡顿根因与修复
- **根因**：切换 section 时旧 section 卸载、新 section 挂载，每次挂载都重跑 `useEffect` 的 IPC 调用（`config:list-system-fonts`/`config:get`/`loadModels`/`loadCloseBehavior`）并同步渲染重列表，快速点击形成 IPC + 重渲染风暴。
- **修复**：
  - 懒加载缓存：section 首次访问才挂载，之后保持挂载（`display:none` 隐藏），切回不再重新渲染/重新拉取。
  - 各 section 组件包 `React.memo`，父组件因导航状态重渲染时，已缓存（隐藏）的 section 不再重渲染；`LLMSection` 的 `purposes` 数组提升为模块常量，保证 memo 生效。
- 只改 `SettingsModal.tsx`，未动 `index.css` 配色与交互逻辑。

### 验证
- `pnpm exec tsc --noEmit` 通过
- `pnpm exec eslint src/components/settings/SettingsModal.tsx` 通过
- `pnpm lint` 整体失败为既有 WIP 文件 `Toast.tsx` 的 unused eslint-disable 问题（非本次改动引入）

---

## 2026-08-13: 交互按压反馈查漏补缺 + 用户可见英文标识符清理
**在既有键盘可达/ARIA 基础上，补齐剩余可点元素的按压反馈（active:scale）与 TW4 下缺失的 pointer 光标；并将侧边栏架构名等硬编码英文接入 i18n。不改变交互与数据流。**

### A. 交互反馈
- 按压反馈 `active:scale-[0.98]` + transform 过渡补齐到：`CharactersView` 角色卡片、`ChapterCardEditor`/`VersionHistory` 章节列表项、`ExportDialog` 导出格式卡、`DirectoryConfigDialog` `RadioOption`、`ArchitectureConfirmDialog` 步骤勾选与「逐步指导」折叠按钮、`BottomPanel` 历史任务行/活跃状态条/步骤标题行、`SettingsModal` 左侧导航与语言选择、`AIOutputPanel` 多任务切换按钮。
- `DraftBoxGroup`：草稿条目与「显示归档」切换按钮补 `rounded` + hover/active/focus-visible/过渡（此前仅有 hover）。
- Tailwind v4 preflight 已移除 button 默认 `cursor:pointer`：`.icon-btn` CSS 补 `cursor: pointer`；`EditorArea` Tab 关闭按钮、`KnowledgePanel` 删除按钮、`AgentConversation` 删除按钮、`AIOutputPanel` 思考/历史行、`MentionMenu`/`SlashCommandMenu` 选项、`SettingsModal` 导航/模型卡/字体下拉/玻璃模式/关闭行为按钮、`ArchitectureConfirmDialog`「全选」补 `cursor-pointer`。
- `agent-tools.css`：`.tool-call-header` 增加 `:active` 按压；`.tool-call-name` 增加 `max-width/overflow/text-overflow` 截断。

### B. 英文标识符
- `SidebarSharedUtils`：删除硬编码英文的 `ARCH_FILES`（Premise/Character Map/…），`ProjectTree` 改用 i18n 化的 `getArchFiles()`。
- `KnowledgeOverview`「Top」、`AgentHeader`「{{count}} tools」、`SlashCommandMenu`/`ToolCallBlock`「Skill」徽章、`HomeSidebarPanel`「No other recent projects」、`SettingsModal` `Close`/`Show|Hide API Key` tooltip 全部接入 i18n；`ToolCallBlock` tool 名加 `title` 悬停 + 截断。

### 新增 i18n key
- `panels.agent.toolsCount`、`panels.agent.skill`
- `pages.knowledgeOverview.top`
- `settings.models.showApiKey`、`settings.models.hideApiKey`
（zh-CN / en / ru 三语齐全）

### 验证
- `pnpm exec tsc --noEmit` 通过
- `pnpm lint` 通过
- `vitest run src/i18n/__tests__/i18n.test.ts` 通过（三语 key 一致性）

---

## 2026-08-13: 可访问性查漏补缺（第二轮）— 键盘可达 + ARIA 状态

**在既有树/卡片/菜单键盘化的基础上，补齐剩余 onClick 元素的焦点环、键盘操作与 ARIA 状态，不改变交互与布局。**

### 实现
- `src/components/panels/EditorArea.tsx` — 编辑器 Tab 由纯 `<div>` 改为 `role="tablist"` + `role="tab"`、`tabIndex`、`aria-selected`、Enter/Space 激活、focus-visible 焦点环（带 `!important` 覆盖激活指示线）；三点菜单按钮补 `aria-expanded`/`aria-haspopup="menu"`。
- `src/components/panels/AIOutputPanel.tsx` — 步骤摘要头部补 `role="button"`/`tabIndex`/Enter/Space/`aria-expanded`/焦点环；思考区折叠按钮补 `aria-expanded`。
- `src/components/panels/BottomPanel.tsx` — 历史任务行、活跃任务状态条、步骤标题行三个可折叠 `<div>` 全部补 `role="button"`/`tabIndex`/`aria-expanded`/Enter/Space/焦点环。
- `src/components/panels/agent/AgentInputBox.tsx` — 模式/模型下拉触发器补 `aria-expanded`/`aria-haspopup`；「+」按钮补 `aria-expanded`。
- `src/components/panels/agent/AgentHeader.tsx` — 更多菜单按钮补 `aria-expanded`/`aria-haspopup`。
- `src/components/panels/agent/ToolCallBlock.tsx` — 折叠头部补 `aria-expanded`。
- `src/components/ui/IconBtn.tsx` — 组件支持 `aria-expanded`/`aria-haspopup` 透传（此前不可传）。
- `src/components/layout/LeftToolWindowBar.tsx`、`RightToolWindowBar.tsx` — 视图/底部面板切换按钮补 `aria-pressed` 激活态。
- `src/components/dialogs/ArchitectureConfirmDialog.tsx` — 步骤勾选用 `<label>` 补 `role="checkbox"`/`aria-checked`/`tabIndex`/Enter/Space/焦点环；「全选」与「逐步指导」按钮补焦点环、`aria-expanded`。
- `src/components/dialogs/ExportDialog.tsx` — 导出格式单选 `<div>` 补 `role="radio"`/`aria-checked`/`tabIndex`/Enter/Space/焦点环。
- `src/components/dialogs/DirectoryConfigDialog.tsx` — `RadioOption` 补 `role="radio"`/`aria-checked`/`tabIndex`/Enter/Space/焦点环。
- `src/components/editor/VersionHistory.tsx`、`ChapterCardEditor.tsx`、`WorldBuildingEditor.tsx`、`CharactersView.tsx` — 列表项/卡片补 `role="button"`/`tabIndex`/Enter/Space/焦点环。
- `src/components/editor/DraftEditor.tsx` — 审稿维度勾选 `<label>` 补 `role="checkbox"`/`aria-checked`/`tabIndex`/Enter/Space/焦点环。
- `src/components/editor/ThreeWayMerge.tsx` — 采纳按钮补 `aria-label`/`aria-pressed`/焦点环。
- `src/components/ui/MarkdownContent.tsx`、`PostProcessStatusPanel.tsx`、`settings/PromptSettings.tsx` — 折叠按钮补 `aria-expanded`。
- `src/components/settings/SettingsModal.tsx` — 字体下拉触发器补 `aria-expanded`/`aria-haspopup="listbox"`。

### 验证
- `pnpm exec tsc --noEmit` ✅
- `pnpm lint` ✅

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

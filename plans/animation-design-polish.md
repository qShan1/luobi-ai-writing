# Animation & Design Polish Plan
> 基于 Emil Kowalski 的 design engineering 技能体系审查
> 审查日期: 2026-08-12
> 基线: 项目已 commit 415f21e

---

## 审查概要

对项目全部 CSS/TSX 文件进行了 motion 代码审计，对照 Emil Kowalski 的 10 项不可妥协标准（review-animations）和动画决策框架（animate skill）进行检查。

**现状**：项目已有较完善的动画体系（29 个 keyframe 定义、Framer Motion 入场/出场、CSS 变量 token 化）。但存在多处违反 Emil 高标准的问题，主要集中在性能、物理正确性和可访问性三个维度。

---

## Findings Table

| # | Severity | Category | Location | Finding | Fix |
|---|----------|----------|----------|---------|-----|
| 1 | **HIGH** | Physicality | `index.css:147,914` | `@keyframes bounce-in` 从 `scale(0.3)` 开始 — 违反 "Never animate from scale(0)"，元素凭空出现 | 改为 `scale(0.95)` + `opacity: 0`，保留弹跳 overshoot |
| 2 | **HIGH** | Performance | `index.css:618` | `.icon-btn { transition: all var(--transition-fast) }` — `all` 动画所有属性，包含非 GPU 属性 | 改为 `transition: background var(--transition-fast), color var(--transition-fast), transform 0.15s cubic-bezier(...)` |
| 3 | **HIGH** | Performance | `index.css:1024` | `.cm-search button { transition: all var(--transition-fast) }` | 改为 `transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)` |
| 4 | **HIGH** | Performance | `agent-tools.css:192` | `.confirm-card-btn { transition: all 0.15s ease }` | 改为 `transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease` |
| 5 | **HIGH** | Performance | `agent-tools.css:227` | `.artifact-card { transition: all 0.15s ease }` | 改为 `transition: border-color 0.15s ease, background-color 0.15s ease` |
| 6 | **HIGH** | Performance | `three-way-merge.css:164` | `.twm-adopt { transition: all 0.15s ease }` | 改为 `transition: background 0.15s ease, color 0.15s ease` |
| 7 | **HIGH** | Accessibility | 全局 | `prefers-reduced-motion` 仅在 `TitleBar.tsx:35` 处理（View Transition），所有其他动画不尊重 reduced motion | 在 CSS 变量层添加 `@media (prefers-reduced-motion: reduce)` 规则，将 duration 设为 0.01s 或移除 transform |
| 8 | **HIGH** | Accessibility | 全局 | 零个 `@media (hover: hover) and (pointer: fine)` 查询 — 所有 hover 效果在触屏设备上会误触发 | 为所有含 `:hover` transform 效果的规则添加 hover media query 门控 |
| 9 | **MEDIUM** | Performance | `BottomPanel.tsx:135,166,295-297,451-453` | `height: 0 -> 'auto'` 动画触发 layout thrashing | 改用 `clip-path: inset(0 0 100% 0)` → `inset(0)` 或 `transform: scaleY(0)` + `transform-origin: top` |
| 10 | **MEDIUM** | Easing | `index.css:268-270` | 当前 `--transition-fast: 0.12s cubic-bezier(0.16, 1, 0.3, 1)` — 曲线不够强，Emil 推荐 `cubic-bezier(0.23, 1, 0.32, 1)` | 更新 token 值为更强的 ease-out 曲线 |
| 11 | **MEDIUM** | Timing | `index.css:1141-1150` | `.stagger-enter` 子元素间隔 50ms — Emil 推荐 30-40ms，50ms 偏慢导致列表入场感觉迟缓 | 改为 35ms 间隔（0ms, 35ms, 70ms, ...） |
| 12 | **MEDIUM** | Easing | `index.css:658,625,670,769,797,1154,1163` | 多处使用 `cubic-bezier(0.175, 0.885, 0.32, 1.275)` (spring-like bounce) 用于普通 hover/transition — bounce 应仅用于 momentum-driven 交互 | hover 效果改用 `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out)；bounce 仅保留在 drag-to-dismiss 和弹性交互 |
| 13 | **MEDIUM** | Performance | `LiquidGlass.tsx:212,452,575,589,605` | vendor LiquidGlass 使用 `transition: "all 0.2s ..."` | vendor 文件不修改，但 note: 此为第三方代码 |
| 14 | **MEDIUM** | Physicality | `index.css:625` | `.icon-btn:hover { transform: scale(1.1) }` — scale 1.1 过于夸张，Emil 建议 hover scale 1.02-1.05 | 改为 `scale(1.05)` |
| 15 | **MEDIUM** | Timing | `index.css:737` | `.ai-task-capsule` 的 `capsule-complete` 动画 1.8s — 过长，UI 动画应 <300ms；完成反馈可以稍长但也应 <600ms | 缩短到 0.5s |
| 16 | **LOW** | Timing | `agent-tools.css:265` | `tool-spin` 旋转 1s — 加载 spinner 应更快以提升感知速度 | 改为 0.6s |
| 17 | **LOW** | Polish | 全局 | 缺少 blur-masked crossfade — 多处状态切换缺少 `filter: blur(2px)` 过渡桥接 | 为 dialog/toast 的 backdrop 进出场添加 blur 过渡 |
| 18 | **LOW** | Polish | 全局 | 缺少 `@starting-style` — 所有入场动画用 JS `useEffect` + `mounted` 状态或 `animation` 属性 | 现有方案可工作，暂不改 |

---

## Easing Token 更新

当前 vs 推荐：

```css
/* 当前 */
--transition-fast: 0.12s cubic-bezier(0.16, 1, 0.3, 1);
--transition-normal: 0.25s cubic-bezier(0.16, 1, 0.3, 1);
--transition-spring: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

/* 推荐（Emil Kowalski 的曲线） */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* 强 ease-out，UI 交互主力 */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* 屏幕内移动 */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like drawer */

/* 保留 spring 曲线仅用于 momentum/bounce 交互 */
--transition-spring: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

---

## Duration 预算表（Emil 标准）

| 元素 | 推荐时长 | 当前时长 | 状态 |
|------|---------|---------|------|
| 按钮按下反馈 | 100-160ms | 120ms (`--transition-fast`) | ✅ OK |
| Tooltip | 125-200ms | 150ms | ✅ OK |
| Dropdown/Select | 150-250ms | — | N/A |
| Modal/Dialog | 200-500ms | 300ms | ✅ OK |
| Toast | 200-500ms | 300ms enter / 250ms exit | ✅ OK |
| Hover 效果 | 100-200ms | 120ms (`--transition-fast`) | ✅ OK |
| Stagger 列表 | 30-40ms 间隔 | 50ms | ⚠️ 偏慢 |
| Capsule complete | <300ms | 1800ms | ❌ 过长 |
| Tool spin | 600-800ms | 1000ms | ⚠️ 偏慢 |

---

## Execution Plan

### Step 1: CSS Token 更新
- 更新 `--transition-fast` 和 `--transition-normal` 的 cubic-bezier 值
- 添加 `--ease-out` 和 `--ease-in-out` 别名

### Step 2: 修复 bounce-in keyframe
- `index.css:147` 和 `index.css:914` 的 `scale(0.3)` → `scale(0.95)`

### Step 3: 消除 `transition: all`
- 逐一替换 5 处 `transition: all` 为具体属性列表

### Step 4: 添加 `prefers-reduced-motion` 全局规则
- 在 CSS 变量层添加 `@media (prefers-reduced-motion: reduce)` 规则

### Step 5: 添加 `@media (hover: hover)` 门控
- 为所有含 transform 的 `:hover` 效果添加 hover media query

### Step 6: 修复 height 动画
- BottomPanel 的 `height: 0 -> 'auto'` 改用 `clip-path` 方案

### Step 7: 调整 stagger 间隔
- `.stagger-enter` 从 50ms 改为 35ms

### Step 8: 微调 duration
- `capsule-complete` 1.8s → 0.5s
- `tool-spin` 1s → 0.6s
- `icon-btn:hover scale(1.1)` → `scale(1.05)`

### Step 9: 替换非必要 spring 曲线
- 普通 hover/transition 的 `cubic-bezier(0.175, 0.885, 0.32, 1.275)` → `cubic-bezier(0.23, 1, 0.32, 1)`
- 仅保留 spring 曲线在 momentum-driven 交互上

---

## Verification

1. `tsc --noEmit` 编译通过
2. `vite build` 打包成功
3. 视觉验证：
   - bounce-in 动画不再从 scale(0.3) 凭空弹出
   - hover 效果感觉更 crisp（强 ease-out）
   - stagger 列表入场更快更流畅
   - 开启系统 reduced motion 后所有动画降级为 opacity 过渡
   - 触屏设备上 hover 效果不再误触发
4. `pnpm build` 最终打包供用户测试

---

## Impact Summary

- **HIGH 修复 (6项)**：消除 `transition: all` 性能隐患 + `scale(0)` 物理错误 + accessibility 基础
- **MEDIUM 修复 (7项)**：easing 曲线升级 + stagger 优化 + height 动画 GPU 化
- **LOW 修复 (2项)**：duration 微调 + polish
- **不改 (1项)**：vendor LiquidGlass.tsx 的 `transition: all`（第三方代码）

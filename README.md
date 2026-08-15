<div align="center">

# 落笔 LUOBI AI WRITING — AI 小说创作 IDE

**为网文作者、独立作家与创意写作者设计的下一代 AI 驱动小说创作集成开发环境。**

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-41-black.svg)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6.svg)](https://www.typescriptlang.org/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPLv3-yellow.svg)](https://opensource.org/licenses/GPL-3.0)

[🚀 下载客户端 / Download](#-安装与使用--installation)

</div>

---

> **落笔** 是一款开源、隐私优先、本地优先的 AI 写作 IDE，专为**长篇小说创作 (Novel Writing)**、**网文写手 (Web Fiction)** 与**创意写作 (Creative Writing)** 而生。它将大语言模型驱动的全流程工作流（大纲生成、章节起草、智能重写、自动审阅）与本地 RAG 知识库深度融合，为作者提供 IDE 级别的沉浸式创作体验——所有数据和模型调用都运行在您自己的计算机上，使用您自己的 API Key (BYOK)。

<!-- SEO: Luobi is an open-source, privacy-first, local-first AI writing IDE purpose-built for novel writing, fiction writing, web novel creation, and long-form creative writing. -->

> **⚠️ 维护状态 / Maintenance Notice**
>
> 本项目当前**暂时不进行主动维护**（处于低活跃维护状态）。如果您在使用过程中遇到问题，欢迎通过 Issues 反馈，我们会记录问题并在后续版本中逐步修复。
>
> This project is currently **not under active maintenance**. If you encounter any issues, please feel free to report them via Issues — we log every report and will address them gradually in future releases.

---

## ✨ 核心特性 / Key Features

落笔不是又一个带对话框的文本编辑器——它是一套深度融合了**大语言模型能力、长文本上下文检索 (RAG)、自动化创作管线**的专业级小说写作引擎。

### 🧬 AI 小说创作全流程 / AI Novel Writing Pipeline

| 能力 / Capability | 说明 / Description |
|---|---|
| 🌍 世界观与设定管理 (Worldbuilding) | 自定义全局世界观背景、核心剧情主轴、角色人设档案（含跨章节动态状态追踪） |
| 📋 自动大纲与细纲生成 (Auto Outline) | AI 一键生成「结构骨架 → 章节细纲 → 场景/情绪/节奏段落要求」，支持三幕式、英雄之旅等多种叙事结构 |
| ✍️ 流式章节正文生成 (Chapter Drafting) | 单章流式打字机生成，精准响应前文上下文与预设提纲，随时可中止 |
| 🔄 AI 智能重写 (Rewrite) | 支持选中段落局部重写或整章全局重写，保持人设与剧情一致性 |
| ✨ 语病与错别字精修 (Refine) | AI 自动检测语法错误、错别字、逻辑漏洞，输出精修建议 |
| 📝 剧情自评审阅 (Review) | AI 以读者/编辑视角对章节进行质量自评，指出节奏、人物弧光、伏笔等问题 |
| 🔁 三重后期管线 (Post-Process) | Rewrite → Refine → Review 三级串联闭环，确保每章高质量出稿 |

### 🧠 百万字级本地知识库 / Million-Word Local RAG Knowledge Base

| 能力 / Capability | 说明 / Description |
|---|---|
| 📂 海量设定导入 (Bulk Import) | 一键导入数百万字的参考小说、世界观文档、角色设定集 |
| 🔍 语义向量检索 (Vector Search) | 写作时根据当前章节语义自动召回最相关的设定切片 (Chunk)，告别人设崩塌与设定遗忘 |
| 🔒 纯本地存储 (Local-Only) | 内置 SQLite + 轻量向量引擎，所有数据存储在您的本地计算机，断网依然可用 |

### 🔌 极致可扩展架构 / Extensible Architecture

| 能力 / Capability | 说明 / Description |
|---|---|
| 🤖 自带模型 BYOK (Bring Your Own Key) | 原生兼容 OpenAI、DeepSeek、Gemini、Claude、Ollama (本地离线)、智谱 GLM 等。支持智能分流：用 DeepSeek 写大纲，用 Claude 润色，用本地模型做隐私审查 |
| 🔗 MCP 协议 (Model Context Protocol) | 原生集成 MCP 协议，随时外挂自定义工具服务器，扩展 AI 能力边界 |
| 📊 用量统计 (Usage Analytics) | 内置 LLM 调用量、Token 消耗、成本趋势的完整统计面板 |

### 🛠️ 极客级生产力 UI / IDE-Grade Productivity UI

| 能力 / Capability | 说明 / Description |
|---|---|
| 🖥️ 可拖拽四分屏布局 (Resizable Panels) | 文件树 + 编辑器 + AI 面板 + 底部终端，像 VSCode/JetBrains 一样灵活组合 |
| 🌙 沉浸深色主题 (Dark Theme) | 极致优化的暗色模式，自定义悬浮标题栏与状态栏微交互 |
| ⌨️ 快捷键体系 (Keyboard Shortcuts) | 全局快捷键：Cmd+N 新建、Cmd+O 打开、Cmd+=/- 缩放 |
| 📦 跨平台桌面端 (Cross-Platform Desktop) | macOS (dmg) / Windows (nsis & portable) / Linux (AppImage)，开箱即用的原生桌面应用 |

---

## 🚀 安装与使用 / Installation

### 方式一：直接下载 / Direct Download

前往 [Releases](https://github.com/qShan1/luobi-ai-writing/releases) 下载对应操作系统的最新版本：
- **macOS**: `.dmg` 安装包
- **Windows**: `.exe` 安装程序 (NSIS) 或 `.exe` 免安装便携版 (Portable)
- **Linux**: `.AppImage`

### 方式二：源码构建 / Build from Source

```bash
# 环境要求：Node.js >= 20, pnpm >= 9

# 1. 克隆项目
git clone https://github.com/qShan1/luobi-ai-writing.git
cd luobi-ai-writing

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器 (含热更新)
pnpm dev

# 4. 打包桌面端分发
pnpm build
```

> **Note**: 落笔直接构建为原生桌面应用（Electron），无需 Docker 或其他服务端依赖，本地构建后即可分发。需要确保本地系统安装了构建 SQLite 的前置依赖（macOS: Xcode Command Line Tools, Windows: Visual Studio Build Tools）。

---

## ⚙️ 模型配置 / Model Configuration

落笔支持接入多种主流 LLM 服务商，以下是快速配置步骤：

1. 打开应用 → 点击左下角 **⚙️ 设置**
2. 进入 **「模型配置」** 页面
3. 点击 **「新增模型」**：
   - 选择服务商：OpenAI / DeepSeek / Gemini / Ollama / 智谱 / 自定义
   - 填入 `API Key` 和 `Base URL`（如使用代理）
   - 为不同任务（写作 / 润色 / Embedding 检索）指派推荐模型
4. **开始创作！** 🎉

**支持的 LLM 服务商 / Supported LLM Providers:**

`OpenAI` · `DeepSeek` · `Google Gemini` · `Anthropic Claude` · `Ollama (Local)` · `智谱 GLM (Zhipu)` · `MiniMax` · `SiliconFlow` · `Any OpenAI-compatible API`

---

## 🏗️ 技术架构 / Tech Stack

| 层级 / Layer | 技术 / Technology |
|---|---|
| **UI 框架** | React 19 + TypeScript + Zustand |
| **样式** | Tailwind CSS v4 + Radix UI + Lucide Icons |
| **桌面端** | Electron 41 + Vite 8 |
| **本地存储** | better-sqlite3 (关系型) + 轻量向量引擎 (RAG) |
| **IPC 通信** | 强类型频道契约 (Type-safe IPC Channels) |
| **AI 集成** | OpenAI-compatible + Gemini Protocol + MCP |

---

## 🙋‍♂️ 参与贡献 / Contributing

我们欢迎来自社区的代码贡献，包括但不限于：
- 🐛 Bug 修复
- 🤖 新 AI 服务商适配
- 🎨 UI/UX 改进
- 🌐 国际化 (i18n) 翻译
- 📖 文档完善

> 重大功能重构请先在 [Issues](https://github.com/qShan1/luobi-ai-writing/issues) 中与维护者探讨，以避免方向冲突。

---

## 📄 开源协议 / License

本项目采用 [GPL-3.0 License](LICENSE) 开源。您可以自由地运行、研究、分享和修改代码，但基于此修改分发的新软件**必须同样遵循 GPL-3.0 协议开源**。上游来源与版权声明见 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)。

---

<div align="center">

*落笔 — 你的 AI 小说创作伙伴。让写作更智能，而非更辛苦。*

*LUOBI — Your AI-powered novel writing companion. Write smarter, not harder.*

</div>

<!--
  SEO Keywords (GitHub indexed):
  AI novel writing, AI writer, novel writing tool, fiction writing software,
  web novel, 网文写作, AI小说, 小说创作工具, creative writing IDE,
  AI story generator, novel outline generator, RAG knowledge base,
  LLM writing assistant, Electron writing app, open source writing tool,
  DeepSeek writing, Claude writing, Ollama writing, BYOK AI,
  AI 写作助手, 网文生成器, 小说大纲生成, AI创作, 长篇小说写作
-->

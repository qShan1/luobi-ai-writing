# Luobi Control

这是 Luobi 小说工程的本地控制层。它直接读取项目 `.luobi/luobi.db`，不依赖 Electron 窗口。
运行要求：Node.js 18+ 和 Python 3.9+（仅使用 Python 标准库 `sqlite3`，不需要额外安装包）。

## CLI

```powershell
node tools/luobi-control.mjs --project "D:\Novels\我的小说" status
node tools/luobi-control.mjs --project "D:\Novels\我的小说" chapters
node tools/luobi-control.mjs --project "D:\Novels\我的小说" export --format md --output "D:\Exports"
node tools/luobi-control.mjs --project "D:\Novels\我的小说" prepare-publish --platform qimao
node tools/luobi-control.mjs --project "D:\Novels\我的小说" prepare-publish --platform fanqie
node tools/luobi-control.mjs --project "D:\Novels\我的小说" prepare-publish --platform qimao --from 1 --to 10 --author "作者名" --synopsis "作品简介" --cover "D:\Novels\我的小说\cover.jpg"
```

`export` 和 `prepare-publish` 支持 `--from` / `--to` 章节范围。`prepare-publish` 还支持作者、分类、简介和封面路径元数据，并额外生成 `publish-task.json`，记录待审核状态、提交尝试和失败信息。它只生成 `manifest.json`、章节 TXT 和人工审核清单，不登录七猫/番茄，也不自动提交公开发布。

## MCP

在支持 stdio MCP 的客户端配置：

```json
{
  "mcpServers": {
    "luobi-control": {
      "command": "node",
      "args": ["E:/Agent/Project/小说/luobi-ai-writing/tools/luobi-control.mjs", "mcp"]
    }
  }
}
```

可用工具：`novel_status`、`novel_list_chapters`、`novel_export`、`novel_prepare_publish`。
每个工具都接收 `project_path`，不会隐式操作其它小说工程。

#!/usr/bin/env node

/**
 * Luobi project control layer.
 *
 * The CLI and MCP server intentionally share the same read/export functions.
 * Nothing here mutates the Luobi database or submits content to a platform.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const VERSION = '0.1.0'
const PLATFORMS = new Set(['qimao', 'fanqie'])

function fail(message, code = 1) {
  throw Object.assign(new Error(message), { exitCode: code })
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      args._.push(token)
      continue
    }
    const [key, inlineValue] = token.slice(2).split('=', 2)
    if (inlineValue !== undefined) args[key] = inlineValue
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) args[key] = argv[++i]
    else args[key] = true
  }
  return args
}

function requireProject(projectPath) {
  const resolved = path.resolve(projectPath || process.cwd())
  const currentDir = path.join(resolved, '.luobi')
  const legacyDir = path.join(resolved, '.vela')
  if (!fs.existsSync(currentDir) && fs.existsSync(legacyDir)) {
    fs.cpSync(legacyDir, currentDir, { recursive: true, errorOnExist: false, force: false })
  }
  fs.mkdirSync(currentDir, { recursive: true })
  const dbPath = path.join(currentDir, 'luobi.db')
  const legacyDbPath = path.join(currentDir, 'vela.db')
  if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) fs.copyFileSync(legacyDbPath, dbPath)
  if (!fs.existsSync(dbPath)) {
    fail(`不是有效的 Luobi 项目，找不到 ${dbPath}`)
  }
  return { root: resolved, dbPath }
}

function openProject(projectPath) {
  const project = requireProject(projectPath)
  return project
}

function closeProject(_project) {
  // Python's sqlite3 connection is short-lived per read and closes itself.
}

function query(project, sql, params = []) {
  const script = [
    'import sqlite3, json, sys',
    'db, sql, raw = sys.argv[1], sys.argv[2], sys.argv[3]',
    'con = sqlite3.connect(db)',
    'con.row_factory = sqlite3.Row',
    'rows = con.execute(sql, json.loads(raw)).fetchall()',
    'print(json.dumps([dict(row) for row in rows], ensure_ascii=False))',
    'con.close()',
  ].join('; ')
  const result = spawnSync('python', ['-c', script, project.dbPath, sql, JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  })
  if (result.status !== 0) fail((result.stderr || 'sqlite 查询失败').trim())
  try { return JSON.parse(result.stdout || '[]') } catch { fail('sqlite 查询返回了无效 JSON。') }
}

function queryOne(project, sql, params = []) {
  return query(project, sql, params)[0] || null
}

function getCore(project) {
  return queryOne(project, 'SELECT * FROM project_core WHERE id = ?', ['main']) || {}
}

function getChapterNumbers(project) {
  const blueprintRows = query(project, 'SELECT chapter_number FROM blueprints')
  const draftRows = query(project, 'SELECT chapter_number FROM drafts')
  return [...new Set([...blueprintRows, ...draftRows].map(row => row.chapter_number))].sort((a, b) => a - b)
}

function getChapter(project, chapterNumber, includeContent = false) {
  const blueprint = queryOne(project, 'SELECT * FROM blueprints WHERE chapter_number = ?', [chapterNumber]) || {}
  const draft = queryOne(project, `
    SELECT d.*, c.body AS content
    FROM drafts d
    JOIN contents c ON c.id = d.content_id
    WHERE d.chapter_number = ? AND d.status IN ('draft', 'revised', 'finalized')
    ORDER BY d.version DESC LIMIT 1
  `, [chapterNumber]) || null
  return {
    chapterNumber,
    title: blueprint.title || `第${chapterNumber}章`,
    purpose: blueprint.purpose || '',
    suspenseHook: blueprint.suspense_hook || '',
    status: draft?.status || (Object.keys(blueprint).length ? 'planned' : 'missing'),
    draftId: draft?.id ?? null,
    version: draft?.version ?? null,
    wordCount: draft?.word_count ?? 0,
    content: includeContent ? (draft?.content || '') : undefined,
  }
}

function listChapters(projectPath) {
  const project = openProject(projectPath)
  try {
    return getChapterNumbers(project).map(number => getChapter(project, number))
  } finally {
    closeProject(project)
  }
}

function status(projectPath) {
  const project = openProject(projectPath)
  try {
    const core = getCore(project)
    const chapters = getChapterNumbers(project).map(number => getChapter(project, number))
    const finalized = chapters.filter(chapter => chapter.status === 'finalized')
    return {
      version: VERSION,
      projectPath: project.root,
      title: core.project_name || path.basename(project.root),
      genre: core.genre || '',
      totalChapters: core.total_chapters || 0,
      plannedChapters: chapters.filter(chapter => ['planned', 'draft', 'revised', 'finalized'].includes(chapter.status)).length,
      finalizedChapters: finalized.length,
      finalizedWords: finalized.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0),
      chapters,
    }
  } finally {
    closeProject(project)
  }
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^---+$/gm, '')
    .trim()
}

function finalizedChapters(project) {
  return getChapterNumbers(project)
    .map(number => getChapter(project, number, true))
    .filter(chapter => chapter.status === 'finalized' && chapter.content)
}

function selectChapterRange(chapters, options) {
  const from = options.from === undefined ? null : Number(options.from)
  const to = options.to === undefined ? null : Number(options.to)
  if ((from !== null && !Number.isInteger(from)) || (to !== null && !Number.isInteger(to))) {
    fail('from 和 to 必须是整数章节号。')
  }
  if (from !== null && to !== null && from > to) fail('from 不能大于 to。')
  return chapters.filter(chapter => (from === null || chapter.chapterNumber >= from) && (to === null || chapter.chapterNumber <= to))
}

function safeName(value) {
  return String(value || 'untitled').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'untitled'
}

function exportNovel(projectPath, options) {
  const project = openProject(projectPath)
  try {
    const core = getCore(project)
    const chapters = selectChapterRange(finalizedChapters(project), options)
    if (!chapters.length) fail('没有已定稿章节，不能导出。')

    const outputDir = path.resolve(options.output || path.join(project.root, '.luobi', 'exports'))
    fs.mkdirSync(outputDir, { recursive: true })
    const title = core.project_name || path.basename(project.root)
    const format = options.format || 'md'
    if (!['md', 'txt', 'split-md'].includes(format)) fail('format 只能是 md、txt 或 split-md。')

    if (format === 'split-md') {
      const splitDir = path.join(outputDir, safeName(title))
      fs.mkdirSync(splitDir, { recursive: true })
      for (const chapter of chapters) {
        const filename = `chapter-${String(chapter.chapterNumber).padStart(4, '0')}.md`
        fs.writeFileSync(path.join(splitDir, filename), chapter.content, 'utf8')
      }
      return { output: splitDir, chapters: chapters.length, format }
    }

    const body = chapters.map(chapter => chapter.content).join('\n\n---\n\n')
    const content = format === 'txt'
      ? `${title}\n\n${stripMarkdown(body)}\n`
      : `# ${title}\n\n${body}\n`
    const output = path.join(outputDir, `${safeName(title)}.${format}`)
    fs.writeFileSync(output, content, 'utf8')
    return { output, chapters: chapters.length, words: stripMarkdown(body).length, format }
  } finally {
    closeProject(project)
  }
}

function preparePublish(projectPath, options) {
  const platform = options.platform
  if (!PLATFORMS.has(platform)) fail('platform 只能是 qimao 或 fanqie。')

  const project = openProject(projectPath)
  try {
    const core = getCore(project)
    const chapters = selectChapterRange(finalizedChapters(project), options)
    if (!chapters.length) fail('没有已定稿章节，不能生成发布包。')

    const outputDir = path.resolve(options.output || path.join(project.root, '.luobi', 'publish', platform))
    const chapterDir = path.join(outputDir, 'chapters')
    fs.mkdirSync(chapterDir, { recursive: true })
    const manifest = {
      schema: 'luobi-publish-task/v1',
      platform,
      mode: 'manual-review-required',
      title: core.project_name || path.basename(project.root),
      author: options.author || '',
      genre: options.genre || core.genre || '',
      targetAudience: core.target_audience || '',
      synopsis: options.synopsis || core.synopsis || core.premise || '',
      cover: options.cover ? path.resolve(options.cover) : '',
      chapterRange: { from: options.from ? Number(options.from) : null, to: options.to ? Number(options.to) : null },
      sourceProject: project.root,
      generatedAt: new Date().toISOString(),
      chapters: chapters.map(chapter => ({
        number: chapter.chapterNumber,
        title: chapter.title,
        wordCount: chapter.wordCount,
        file: `chapters/chapter-${String(chapter.chapterNumber).padStart(4, '0')}.txt`,
      })),
      publishingChecklist: [
        '人工确认书名、作者名、简介、分类和封面',
        '人工登录平台并完成实名认证/验证码等平台要求',
        '逐章抽查正文与章节标题后再提交',
        '平台发布结果回填到本任务记录，不写入账号凭据',
      ],
    }

    for (const chapter of chapters) {
      const file = path.join(chapterDir, `chapter-${String(chapter.chapterNumber).padStart(4, '0')}.txt`)
      fs.writeFileSync(file, stripMarkdown(chapter.content), 'utf8')
    }
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    fs.writeFileSync(path.join(outputDir, 'publish-task.json'), `${JSON.stringify({
      schema: 'luobi-publish-task-state/v1',
      status: 'ready-for-manual-review',
      platform,
      createdAt: manifest.generatedAt,
      attempts: [],
      lastError: null,
      submittedAt: null,
    }, null, 2)}\n`, 'utf8')
    fs.writeFileSync(path.join(outputDir, 'REVIEW-BEFORE-PUBLISH.md'), [
      `# ${manifest.title} - ${platform} 发布任务`,
      '',
      '> 此目录只是一份待人工审核的发布包，Luobi 不会自动提交公开发布。',
      '',
      `- 章节数：${manifest.chapters.length}`,
      `- 来源项目：${manifest.sourceProject}`,
      `- 生成时间：${manifest.generatedAt}`,
      '',
      '## 发布前检查',
      ...manifest.publishingChecklist.map(item => `- [ ] ${item}`),
      '',
    ].join('\n'), 'utf8')

    return { output: outputDir, platform, chapters: chapters.length, manifest: path.join(outputDir, 'manifest.json') }
  } finally {
    closeProject(project)
  }
}

function help() {
  return `Luobi Control ${VERSION}

Usage:
  node tools/luobi-control.mjs --project <path> status
  node tools/luobi-control.mjs --project <path> chapters
  node tools/luobi-control.mjs --project <path> export --format md|txt|split-md --output <dir> [--from N --to N]
  node tools/luobi-control.mjs --project <path> prepare-publish --platform qimao|fanqie --output <dir> [--from N --to N]
    [--author NAME --genre GENRE --synopsis TEXT --cover PATH]
  node tools/luobi-control.mjs --project <path> mcp
`
}

function jsonRpcResult(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result })
}

const toolDefinitions = [
  { name: 'novel_status', description: '读取 Luobi 小说项目状态和定稿进度。', inputSchema: { type: 'object', properties: { project_path: { type: 'string' } }, required: ['project_path'] } },
  { name: 'novel_list_chapters', description: '列出章节蓝图、定稿状态和字数。', inputSchema: { type: 'object', properties: { project_path: { type: 'string' } }, required: ['project_path'] } },
  { name: 'novel_export', description: '导出已定稿章节，不修改 Luobi 数据库。', inputSchema: { type: 'object', properties: { project_path: { type: 'string' }, format: { type: 'string', enum: ['md', 'txt', 'split-md'] }, output: { type: 'string' }, from: { type: 'integer' }, to: { type: 'integer' } }, required: ['project_path'] } },
  { name: 'novel_prepare_publish', description: '生成七猫或番茄的人工审核发布包，不自动登录或提交。', inputSchema: { type: 'object', properties: { project_path: { type: 'string' }, platform: { type: 'string', enum: ['qimao', 'fanqie'] }, output: { type: 'string' }, from: { type: 'integer' }, to: { type: 'integer' }, author: { type: 'string' }, genre: { type: 'string' }, synopsis: { type: 'string' }, cover: { type: 'string' } }, required: ['project_path', 'platform'] } },
]

async function runMcp(defaultProject) {
  let buffer = ''
  for await (const chunk of process.stdin) {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      let request
      try { request = JSON.parse(line) } catch { continue }
      if (request.method === 'notifications/initialized') continue
      if (request.method === 'initialize') {
        process.stdout.write(jsonRpcResult(request.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'luobi-control', version: VERSION } }) + '\n')
        continue
      }
      if (request.method === 'tools/list') {
        process.stdout.write(jsonRpcResult(request.id, { tools: toolDefinitions }) + '\n')
        continue
      }
      if (request.method === 'tools/call') {
        try {
          const name = request.params?.name
          const args = request.params?.arguments || {}
          const project = args.project_path || defaultProject
          let value
          if (name === 'novel_status') value = status(project)
          else if (name === 'novel_list_chapters') value = listChapters(project)
          else if (name === 'novel_export') value = exportNovel(project, args)
          else if (name === 'novel_prepare_publish') value = preparePublish(project, args)
          else fail(`未知工具：${name}`)
          process.stdout.write(jsonRpcResult(request.id, { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }) + '\n')
        } catch (error) {
          process.stdout.write(jsonRpcResult(request.id, { isError: true, content: [{ type: 'text', text: error.message }] }) + '\n')
        }
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const command = args._[0]
  if (!command || command === 'help' || args.help) {
    console.log(help())
    return
  }
  const project = args.project || process.cwd()
  let result
  if (command === 'status') result = status(project)
  else if (command === 'chapters') result = listChapters(project)
  else if (command === 'export') result = exportNovel(project, args)
  else if (command === 'prepare-publish') result = preparePublish(project, args)
  else if (command === 'mcp') return runMcp(args.project)
  else fail(`未知命令：${command}\n\n${help()}`)

  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(`[luobi-control] ${error.message}`)
  process.exitCode = error.exitCode || 1
})

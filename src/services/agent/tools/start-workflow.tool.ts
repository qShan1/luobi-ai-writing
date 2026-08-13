/**
 * start_workflow — 触发创作工作流（真正启动，而非仅返回指导文本）
 */
import i18n from '../../../i18n'
import { buildAgentTool } from '../tool-registry'
import { useLayoutStore } from '../../../stores/layout-store'
import { useWorkflowStore } from '../../../stores/workflow-store'
import { ipc } from '../../ipc-client'

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, { ns: 'panels', ...opts })

/** 需要章节号的工作流 */
const CHAPTER_WORKFLOWS = ['generate_draft', 'review', 'refine', 'finalize'] as const

export const startWorkflowTool = buildAgentTool({
  name: 'start_workflow',
  description: t('agent.tools.startWorkflow.desc'),
  source: 'builtin',
  inputSchema: {
    type: 'object',
    properties: {
      workflow: {
        type: 'string',
        description: t('agent.tools.startWorkflow.workflowDesc'),
        enum: ['generate_draft', 'review', 'refine', 'finalize', 'generate_blueprint', 'generate_architecture'],
      },
      chapter_number: {
        type: 'number',
        description: t('agent.tools.startWorkflow.chapterNumberDesc'),
      },
    },
    required: ['workflow'],
  },
  requiresConfirmation: true,
  isReadOnly: false,
  execute: async (args) => {
    const workflow = args.workflow as string
    const chapterNumber = args.chapter_number as number | undefined

    if (!workflow) {
      return { success: false, content: '', error: t('agent.tools.startWorkflow.missingWorkflow') }
    }

    // 需要章节号的工作流
    if ((CHAPTER_WORKFLOWS as readonly string[]).includes(workflow) && chapterNumber === undefined) {
      return { success: false, content: '', error: t('agent.tools.startWorkflow.needsChapter', { workflow }) }
    }

    try {
      // 打开右侧面板到 AI 输出视图
      useLayoutStore.getState().openRightPanel('ai-output')

      const { createChapterWorkflow, createReviewOnlyWorkflow, createRefineOnlyWorkflow, createFinalizeWorkflow } = await import('../../workflows/chapter-workflow')

      // 构造工作流定义
      let definition: ReturnType<typeof createChapterWorkflow>

      if (workflow === 'generate_blueprint') {
        const { createDirectoryWorkflow } = await import('../../workflows/directory-workflow')
        definition = createDirectoryWorkflow({ mode: 'full' }) as unknown as ReturnType<typeof createChapterWorkflow>
        void useWorkflowStore.getState().startWorkflow(definition as never)
        return {
          success: true,
          content: t('agent.tools.startWorkflow.started', { name: t('agent.tools.startWorkflow.generateBlueprint') }),
          artifacts: [{ type: 'workflow_started', name: t('agent.tools.startWorkflow.generateBlueprint') }],
        }
      }

      if (workflow === 'generate_architecture') {
        const { createArchitectureWorkflow } = await import('../../workflows/architecture-workflow')
        void useWorkflowStore.getState().startWorkflow(createArchitectureWorkflow() as never)
        return {
          success: true,
          content: t('agent.tools.startWorkflow.started', { name: t('agent.tools.startWorkflow.generateArchitecture') }),
          artifacts: [{ type: 'workflow_started', name: t('agent.tools.startWorkflow.generateArchitecture') }],
        }
      }

      // 章节级工作流：先从数据库读取蓝图构建 ChapterInfo
      const chapter = chapterNumber as number
      const blueprint = await ipc.invoke('db:blueprint-get', chapter)
      const draftPath = `luobi://drafts/ch${chapter}/v1/body.md`

      const base = {
        chapterNumber: chapter,
        title: blueprint?.title ?? t('agent.tools.startWorkflow.chapterDefault', { chapter }),
        role: blueprint?.role ?? '',
        purpose: blueprint?.purpose ?? '',
        characters: blueprint?.characters ?? [],
        keyEvents: blueprint?.keyEvents ?? '',
        suspenseHook: blueprint?.suspenseHook,
      }

      if (workflow === 'generate_draft') {
        definition = createChapterWorkflow(base) as ReturnType<typeof createChapterWorkflow>
        void useWorkflowStore.getState().startWorkflow(definition as never)
        return {
          success: true,
          content: t('agent.tools.startWorkflow.started', { name: t('agent.tools.startWorkflow.writeDraft', { chapter }) }),
          artifacts: [{ type: 'workflow_started', name: `${t('agent.tools.startWorkflow.writeDraft', { chapter })}` }],
        }
      }

      // 其余章节级工作流需要草稿正文
      const drafts = await ipc.invoke('db:draft-list', chapter)
      const latest = Array.isArray(drafts) ? drafts[0] : null
      const full = latest?.id ? await ipc.invoke('db:draft-get-full', latest.id) : null
      const draftContent = full?.content ?? ''

      if (workflow === 'review') {
        definition = createReviewOnlyWorkflow({
          chapterNumber: chapter,
          chapterTitle: base.title,
          draftPath,
          draftContent,
        }) as ReturnType<typeof createChapterWorkflow>
        void useWorkflowStore.getState().startWorkflow(definition as never)
        return {
          success: true,
          content: t('agent.tools.startWorkflow.started', { name: t('agent.tools.startWorkflow.review', { chapter }) }),
          artifacts: [{ type: 'workflow_started', name: `${t('agent.tools.startWorkflow.review', { chapter })}` }],
        }
      }

      if (workflow === 'refine') {
        definition = createRefineOnlyWorkflow({
          chapterNumber: chapter,
          chapterTitle: base.title,
          draftPath,
          draftContent,
        }) as ReturnType<typeof createChapterWorkflow>
        void useWorkflowStore.getState().startWorkflow(definition as never)
        return {
          success: true,
          content: t('agent.tools.startWorkflow.started', { name: t('agent.tools.startWorkflow.refine', { chapter }) }),
          artifacts: [{ type: 'workflow_started', name: `${t('agent.tools.startWorkflow.refine', { chapter })}` }],
        }
      }

      if (workflow === 'finalize') {
        definition = createFinalizeWorkflow({
          chapterNumber: chapter,
          chapterTitle: base.title,
          draftPath,
          draftContent,
        }) as ReturnType<typeof createChapterWorkflow>
        void useWorkflowStore.getState().startWorkflow(definition as never)
        return {
          success: true,
          content: t('agent.tools.startWorkflow.started', { name: t('agent.tools.startWorkflow.finalize', { chapter }) }),
          artifacts: [{ type: 'workflow_started', name: `${t('agent.tools.startWorkflow.finalize', { chapter })}` }],
        }
      }

      return { success: false, content: '', error: t('agent.tools.startWorkflow.unknownWorkflow', { workflow }) }
    } catch (error) {
      return {
        success: false,
        content: '',
        error: t('agent.tools.startWorkflow.failed', { error: String(error) }),
      }
    }
  },
})

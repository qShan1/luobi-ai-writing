/**
 * update_config — 更新小说配置
 */
import i18n from '../../../i18n'
import { buildAgentTool } from '../tool-registry'
import { ipc } from '../../ipc-client'
import { useProjectStore } from '../../../stores/project-store'
import type { NovelConfig } from '../../../shared/ipc-channels'

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, { ns: 'panels', ...opts })

/** novelConfig 中为数值的字段，update_config 传入的 value 是 string，需要转换 */
const NUMERIC_FIELDS = new Set(['totalChapters', 'wordsPerChapter'])

export const updateConfigTool = buildAgentTool({
  name: 'update_config',
  description: t('agent.tools.updateConfig.desc'),
  source: 'builtin',
  inputSchema: {
    type: 'object',
    properties: {
      field: {
        type: 'string',
        description: t('agent.tools.updateConfig.fieldDesc'),
        enum: ['genre', 'subGenre', 'targetAudience', 'totalChapters', 'wordsPerChapter',
               'coreOutline', 'worldSetting', 'goldenFinger', 'protagonistProfile',
               'globalGuidance', 'writingStyle', 'referenceWorks'],
      },
      value: {
        type: 'string',
        description: t('agent.tools.updateConfig.valueDesc'),
      },
    },
    required: ['field', 'value'],
  },
  requiresConfirmation: true,
  isReadOnly: false,
  execute: async (args) => {
    const field = args.field as string
    const value = args.value as string

    if (!field || value === undefined) {
      return { success: false, content: '', error: t('agent.tools.updateConfig.missingParams') }
    }

    const project = useProjectStore.getState().currentProject
    if (!project) {
      return { success: false, content: '', error: t('agent.tools.noProject') }
    }

    // 数值字段转 number，其余保持 string
    const typedValue = NUMERIC_FIELDS.has(field) ? (parseInt(value, 10) || 0) : value

    // 构造更新数据
    const updateData = {
      novelConfig: { ...project.novelConfig, [field]: typedValue },
    }

    const result = await ipc.invoke('project:update-config', project.id, updateData)
    if (!result.success) {
      return { success: false, content: '', error: result.error ?? t('agent.tools.updateConfig.updateFailed') }
    }

    // 同步前端 store，让 NovelConfigEditor 等界面即时刷新（IPC 只更新了主进程/DB）
    useProjectStore.getState().updateNovelConfig({ [field]: typedValue } as Partial<NovelConfig>)

    return {
      success: true,
      content: t('agent.tools.updateConfig.updated', { field, value: typeof value === 'string' && value.length > 50 ? value.slice(0, 50) + '…' : value }),
    }
  },
})

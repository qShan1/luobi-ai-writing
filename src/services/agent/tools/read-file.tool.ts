/**
 * read_file — 读取项目内的文件内容
 */
import i18n from '../../../i18n'
import { buildAgentTool } from '../tool-registry'
import { ipc } from '../../ipc-client'
import { useProjectStore } from '../../../stores/project-store'
import { validatePath } from './safe-path'

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, { ns: 'panels', ...opts })

export const readFileTool = buildAgentTool({
  name: 'read_file',
  description: t('agent.tools.readFile.desc'),
  source: 'builtin',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: t('agent.tools.readFile.filePathDesc'),
      },
    },
    required: ['file_path'],
  },
  requiresConfirmation: false,
  execute: async (args) => {
    let filePath = (args.file_path as string) ?? ''
    const project = useProjectStore.getState().currentProject
    if (!project) {
      return { success: false, content: '', error: t('agent.tools.noProject') }
    }

    // @file 预取未传路径时：回退到当前编辑器打开的文件
    if (!filePath) {
      const { useEditorStore } = await import('../../../stores/editor-store')
      const editor = useEditorStore.getState()
      const active = editor.tabs.find(t => t.id === editor.activeTabId)
      if (active?.content) {
        return { success: true, content: active.content }
      }
      filePath = active?.filePath ?? ''
    }

    // 路径安全校验
    const pathCheck = validatePath(project.path, filePath)
    if (!pathCheck.valid) {
      return { success: false, content: '', error: pathCheck.error }
    }

    const result = await ipc.invoke('fs:read-file', pathCheck.fullPath)
    if (!result.success) {
      return { success: false, content: '', error: result.error ?? t('agent.tools.readFile.readFailed') }
    }

    return { success: true, content: result.content }
  },
})

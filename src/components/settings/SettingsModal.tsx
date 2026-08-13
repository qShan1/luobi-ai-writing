import { useState, useEffect, useRef } from 'react'
import {
  X, Plus, Trash2, Check, Save, Globe, Cpu, Database,
  Type, Settings2, Zap, Eye, EyeOff, ChevronDown, MessageSquare,
  Languages, Sparkles, PanelBottomClose, Minus, LogOut, Search,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import PromptSettings from './PromptSettings'
import { useLLMStore } from '../../stores/llm-store'
import { useThemeStore, FONT_OPTIONS, type FontId } from '../../stores/theme-store'
import { useEffectsStore } from '../../stores/effects-store'
import { useWindowStore } from '../../stores/window-store'
import { useLayoutStore } from '../../stores/layout-store'
import type { ModelProfile, CloseBehavior } from '../../shared/ipc-channels'
import type { ProviderPreset } from '../../shared/provider-presets'
import { BUILTIN_PRESETS } from '../../shared/provider-presets'
import { randomUUID } from '../../utils/id'
import { Button } from '../ui/Button'
import { IconBtn } from '../ui/IconBtn'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { NativeSelect } from '../ui/NativeSelect'
import { cn } from '../../lib/utils'
import { ipc } from '../../services/ipc-client'
import { Switch } from '../ui/Switch'

// ==================== 分类定义 ====================

type SettingsSection = 'language' | 'llm' | 'embedding' | 'proxy' | 'editor' | 'effects' | 'prompts' | 'window' | 'about'

interface SectionItem {
  id: SettingsSection
  label: string
  icon: React.ReactNode
  descriptionKey: string
}

const SECTIONS: SectionItem[] = [
  { id: 'language', label: 'Language', icon: <Languages size={16} />, descriptionKey: 'general.languageDesc' },
  { id: 'llm', label: 'AI Models', icon: <Cpu size={16} />, descriptionKey: 'general.llmDesc' },
  { id: 'embedding', label: 'Embedding Models', icon: <Database size={16} />, descriptionKey: 'general.embeddingDesc' },
  { id: 'proxy', label: 'Network Proxy', icon: <Globe size={16} />, descriptionKey: 'general.proxyDesc' },
  { id: 'editor', label: 'Editor', icon: <Type size={16} />, descriptionKey: 'general.editorDesc' },
  { id: 'effects', label: 'Visual Effects', icon: <Sparkles size={16} />, descriptionKey: 'general.effectsDesc' },
  { id: 'prompts', label: 'Prompt Templates', icon: <MessageSquare size={16} />, descriptionKey: 'general.promptsDesc' },
  { id: 'window', label: 'Window & Tray', icon: <PanelBottomClose size={16} />, descriptionKey: 'general.windowDesc' },
  { id: 'about', label: 'About & Support', icon: <span style={{ color: 'var(--color-error)', fontSize: 14 }}>❤️</span>, descriptionKey: 'general.aboutDesc' },
]

// ==================== 主组件 ====================

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

/** 全屏设置弹窗 */
export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useTranslation('settings')
  const section = (useLayoutStore(s => s.settingsSection) ?? 'llm') as SettingsSection
  const setSettingsSection = useLayoutStore(s => s.setSettingsSection)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex w-full max-w-[880px] max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--color-editor-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* 左侧导航 */}
        <aside
          className="flex flex-col w-60 flex-shrink-0 py-5 gap-1"
          style={{
            backgroundColor: 'var(--color-sidebar)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          {/* 标题 */}
          <div className="flex items-center gap-2 px-4 mb-4">
            <Settings2 size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {t('general.title')}
            </span>
          </div>

          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSettingsSection(s.id)}
              className={cn(
                'flex items-center gap-2.5 mx-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                section === s.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]',
              )}
            >
              <span className="flex-shrink-0">{s.icon}</span>
              <span className="truncate">{t(`general.${s.id === 'llm' ? 'models' : s.id}`)}</span>
            </button>
          ))}
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 区域标题栏 */}
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                {t(`general.${section}`)}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {t(SECTIONS.find((s) => s.id === section)?.descriptionKey ?? '')}
              </p>
            </div>
            <IconBtn title="Close" size={18} onClick={onClose}>
              <X size={16} />
            </IconBtn>
          </div>

          {/* 区域内容 */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {section === 'language' && <LanguageSection />}
            {section === 'llm' && <LLMSection purposes={['generation', 'refinement', 'summary']} purposeLabel={t('general.models')} />}
            {section === 'embedding' && <LLMSection purposes={['embedding']} purposeLabel={t('general.embedding')} />}
            {section === 'proxy' && <ProxySection />}
            {section === 'editor' && <EditorSection />}
            {section === 'effects' && <EffectsSection />}
            {section === 'prompts' && <PromptSettings />}
            {section === 'window' && <WindowSection />}
            {section === 'about' && <AboutSection />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ==================== Language Section ====================

function LanguageSection() {
  const { t } = useTranslation('settings')
  const currentLang = i18n.language

  const languages = [
    { code: 'zh-CN', label: '简体中文', nativeLabel: '简体中文' },
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'ru', label: 'Русский', nativeLabel: 'Русский' },
  ]

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode)
    localStorage.setItem('luobi-locale', langCode)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          {t('language.label')}
        </h3>
        <div className="space-y-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                'flex items-center justify-between w-full px-4 py-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                currentLang === lang.code
                  ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30'
                  : 'border border-[var(--color-border)] hover:bg-[var(--color-hover)]',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {lang.label}
                </span>
                {lang.label !== lang.nativeLabel && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {lang.nativeLabel}
                  </span>
                )}
              </div>
              {currentLang === lang.code && (
                <Check size={16} style={{ color: 'var(--color-accent)' }} />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('language.hint')}
        </p>
      </div>
    </div>
  )
}

// ==================== LLM & Embedding 通用区 ====================

function LLMSection({
  purposes,
  purposeLabel,
}: {
  purposes: ModelProfile['purposes']
  purposeLabel: string
}) {
  const { t } = useTranslation('settings')
  const models = useLLMStore(s => s.models)
  const defaultModelId = useLLMStore(s => s.defaultModelId)
  const defaultEmbeddingModelId = useLLMStore(s => s.defaultEmbeddingModelId)
  const loaded = useLLMStore(s => s.loaded)
  const loadModels = useLLMStore(s => s.loadModels)
  const saveModel = useLLMStore(s => s.saveModel)
  const deleteModel = useLLMStore(s => s.deleteModel)
  const setDefaultModel = useLLMStore(s => s.setDefaultModel)
  const setDefaultEmbeddingModel = useLLMStore(s => s.setDefaultEmbeddingModel)
  const [editingModel, setEditingModel] = useState<ModelProfile | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!loaded) loadModels()
  }, [loaded, loadModels])

  // 预设直接使用内置常量，无需 IPC 加载
  const presets = BUILTIN_PRESETS

  // 按用途过滤
  const filtered = models.filter((m) =>
    m.purposes?.some((p) => purposes.includes(p as ModelProfile['purposes'][number]))
  )

  /** 创建新模型，使用预设中 openai 的默认属性 */
  const handleAdd = () => {
    const isEmbedding = purposes.includes('embedding')
    const openaiPreset = presets.find((p) => p.provider === 'openai') ?? presets[0]
    setEditingModel({
      id: randomUUID(),
      name: '',
      provider: 'openai',
      protocol: (openaiPreset?.protocol ?? 'openai') as 'openai' | 'gemini',
      modelName: isEmbedding
        ? (openaiPreset?.embeddingModels[0] ?? 'text-embedding-3-small')
        : (openaiPreset?.models[0]?.name ?? 'gpt-4o'),
      apiKey: '',
      baseUrl: openaiPreset?.baseUrl ?? 'https://api.openai.com',
      temperature: 0.7,
      maxTokens: openaiPreset?.models[0]?.maxTokens ?? 4096,
      purposes: [...purposes],
    })
  }

  const isEmbeddingSection = purposes.includes('embedding')

  /** 保存模型；若是该分类第一个则自动设为默认 */
  const handleSave = async () => {
    if (!editingModel) return
    setSaving(true)
    await saveModel(editingModel)
    // 新增模型后，如果该分类还没有默认则自动设为默认
    const countBefore = filtered.length
    if (countBefore === 0) {
      if (isEmbeddingSection) {
        setDefaultEmbeddingModel(editingModel.id)
      } else {
        setDefaultModel(editingModel.id)
      }
    }
    setEditingModel(null)
    setSaving(false)
  }


  return (
    <div className="space-y-4">
      {/* 模型编辑表单 */}
      {editingModel && (
        <ModelForm
          model={editingModel}
          onChange={setEditingModel}
          onSave={handleSave}
          onCancel={() => setEditingModel(null)}
          saving={saving}
          purposeOptions={purposes}
          presets={presets}
        />
      )}

      {/* 模型列表 */}
      {!editingModel && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {t('models.configuredCount', { count: filtered.length, label: purposeLabel })}
            </span>
            <Button size="sm" onClick={handleAdd}>
              <Plus size={13} />
              {t('models.addModel', { label: purposeLabel })}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl"
              style={{ border: '1.5px dashed var(--color-border)' }}
            >
              <Zap size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t('models.noModels', { label: purposeLabel })}
              </span>
              <Button size="sm" variant="outline" onClick={handleAdd}>
                <Plus size={13} />
                {t('models.addFirstModel', { label: purposeLabel })}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isDefault={isEmbeddingSection
                    ? defaultEmbeddingModelId === model.id
                    : defaultModelId === model.id}
                  onSetDefault={() => isEmbeddingSection
                    ? setDefaultEmbeddingModel(model.id)
                    : setDefaultModel(model.id)}
                  onEdit={() => setEditingModel({ ...model })}
                  onDelete={() => deleteModel(model.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** 模型卡片 */
function ModelCard({
  model, isDefault, onSetDefault, onEdit, onDelete,
}: {
  model: ModelProfile
  isDefault: boolean
  onSetDefault: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('settings')
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl group transition-colors',
        isDefault
          ? 'border border-[var(--color-accent)]'
          : 'border border-[var(--color-border)] hover:border-[var(--color-accent)]',
      )}
      style={{ backgroundColor: isDefault ? 'color-mix(in srgb, var(--color-accent) 5%, var(--color-panel))' : 'var(--color-panel)' }}
    >
      {/* 图标 */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
        style={{ backgroundColor: 'var(--color-hover)' }}
      >
        {providerEmoji(model.provider)}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
            {model.name || model.modelName}
          </span>
          {isDefault && (
            <span className="text-[0.7rem] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white flex-shrink-0">
              {t('models.default')}
            </span>
          )}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {model.provider} · {model.modelName} · {model.baseUrl}
        </p>
      </div>

      {/* 操作按钮（hover 显示） */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isDefault && (
          <button
            onClick={onSetDefault}
            title={t('models.setDefault')}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[var(--color-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <Check size={14} />
          </button>
        )}
        <button
          onClick={onEdit}
          title={t('models.editModel')}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[var(--color-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <Settings2 size={14} />
        </button>
        <button
          onClick={onDelete}
          title={t('models.removeModel')}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ==================== 模型编辑表单 ====================


/** 模型编辑表单 */
function ModelForm({
  model, onChange, onSave, onCancel, saving, presets,
}: {
  model: ModelProfile
  onChange: (m: ModelProfile) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  purposeOptions: ModelProfile['purposes']
  /** 服务商预设（来自 BUILTIN_PRESETS 常量） */
  presets: ProviderPreset[]
}) {
  const { t } = useTranslation('settings')
  const [showKey, setShowKey] = useState(false)
  // 标记"模型标识"是否使用自定义输入模式
  const [customModelName, setCustomModelName] = useState(false)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean, error?: string } | null>(null)
  const testConnection = useLLMStore(s => s.testConnection)

  const isEmbedding = model.purposes?.includes('embedding')
  // 将预设数组转换为以 provider 为键的 Map 方便查找
  const presetMap = new Map(presets.map((p) => [p.provider, p]))
  const preset = presetMap.get(model.provider)
  // 生成模型列表为 ModelPreset[]，embedding 模型为 string列表转换过来的 ModelPreset
  const presetModels: import('../../shared/provider-presets').ModelPreset[] = isEmbedding
    ? (preset?.embeddingModels ?? []).map((name) => ({ name, maxTokens: 0 }))
    : (preset?.models ?? [])

  /** 更新单个字段 */
  const up = <K extends keyof ModelProfile>(key: K, val: ModelProfile[K]) =>
    onChange({ ...model, [key]: val })

  /**
   * 切换服务商：从持久化预设中自动填充 baseUrl / protocol
   * 并将模型名重置为该服务商的第一个预设模型
   */
  const handleProviderChange = (provider: ModelProfile['provider']) => {
    const p = presetMap.get(provider)
    const firstModel = isEmbedding ? null : (p?.models[0] ?? null)
    const defaultModelName = isEmbedding
      ? (p?.embeddingModels[0] ?? '')
      : (firstModel?.name ?? '')
    setCustomModelName(false)
    onChange({
      ...model,
      provider,
      protocol: (p?.protocol ?? 'openai') as 'openai' | 'gemini',
      baseUrl: p?.baseUrl ?? '',
      modelName: defaultModelName,
      maxTokens: firstModel?.maxTokens ?? 4096,
    })
  }

  /** 选择预设模型或切换到自定义输入 */
  const handleModelSelect = (val: string) => {
    if (val === '__custom__') {
      setCustomModelName(true)
      up('modelName', '')
    } else {
      setCustomModelName(false)
      // 找到对应的 ModelPreset，同时更新 modelName 和 maxTokens
      const matched = presetModels.find((m) => m.name === val)
      onChange({
        ...model,
        modelName: val,
        maxTokens: matched?.maxTokens ?? model.maxTokens,
      })
    }
  }


  // 当前模型名是否在预设列表里（决定下拉框显示）
  const isPresetValue = presetModels.some((m) => m.name === model.modelName)
  const selectValue = customModelName || (!isPresetValue && presetModels.length > 0)
    ? '__custom__'
    : model.modelName

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection(model)
    setTestResult(result)
    setTesting(false)
    setTimeout(() => setTestResult(null), 3000)
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ border: '1.5px solid var(--color-accent)', backgroundColor: 'var(--color-panel)' }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {model.name ? t('models.editModelName', { name: model.name }) : t('models.newModelConfig')}
      </h3>

      {/* 显示名称 */}
      <div>
        <Label>{t('models.modelName')}</Label>
        <Input
          value={model.name}
          onChange={(e) => up('name', e.target.value)}
          placeholder={t('models.modelNamePlaceholder')}
        />
      </div>

      {/* 服务商 + 协议 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('models.provider')}</Label>
          <NativeSelect
            value={model.provider}
            onChange={(e) => handleProviderChange(e.target.value as ModelProfile['provider'])}
          >
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Google Gemini</option>
            <option value="ollama">{t('modelsProviders.ollama')}</option>
            <option value="bigmodel">{t('modelsProviders.bigmodel')}</option>
            <option value="custom">{t('modelsProviders.custom')}</option>
          </NativeSelect>
        </div>
        <div>
          <Label>{t('models.protocol')}</Label>
          <NativeSelect
            value={model.protocol}
            onChange={(e) => up('protocol', e.target.value as 'openai' | 'gemini')}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </NativeSelect>
        </div>
      </div>

      {/* 模型标识：有预设时显示下拉，否则纯输入 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="mb-0">{t('models.modelName')}</Label>
          {presetModels.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (customModelName) {
                  // 切回预设列表
                  const first = presetModels[0]
                  setCustomModelName(false)
                  onChange({ ...model, modelName: first.name, maxTokens: first.maxTokens ?? model.maxTokens })
                } else {
                  // 切换到自定义输入
                  setCustomModelName(true)
                  up('modelName', '')
                }
              }}
              className="text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              style={{ color: 'var(--color-accent)' }}
            >
              {customModelName ? t('models.presetModelSelect') : t('models.customModelInput')}
            </button>
          )}
        </div>

        {/* 有预设模型 且 未切到手动输入 → 显示下拉 */}
        {presetModels.length > 0 && !customModelName ? (
          <NativeSelect
            value={selectValue}
            onChange={(e) => handleModelSelect(e.target.value)}
          >
            {presetModels.map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
            <option value="__custom__">{t('models.customModelSelect')}</option>
          </NativeSelect>
        ) : (
          <div>
            <Input
              value={model.modelName}
              onChange={(e) => up('modelName', e.target.value)}
              placeholder={isEmbedding ? 'text-embedding-3-small' : 'gpt-4o'}
              autoFocus={customModelName}
            />
          </div>
        )}
      </div>

      {/* API 地址 */}
      <div>
        <Label>{t('models.baseUrl')}</Label>
        <Input
          value={model.baseUrl}
          onChange={(e) => up('baseUrl', e.target.value)}
          placeholder={t('models.baseUrlPlaceholder')}
        />
        {model.provider !== 'custom' && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('models.baseUrlHint', { provider: model.provider })}
          </p>
        )}
      </div>

      {/* API Key */}
      <div>
        <Label>{t('models.apiKey')}</Label>
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={model.apiKey}
            onChange={(e) => up('apiKey', e.target.value)}
            placeholder={model.provider === 'ollama' ? t('models.apiKeyOllamaPlaceholder') : t('models.apiKeyPlaceholder')}
            className="pr-9"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <IconBtn
              title={showKey ? 'Hide API Key' : 'Show API Key'}
              size={18}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </IconBtn>
          </div>
        </div>
      </div>

      {/* 温度 / Token（仅生成模型） */}
      {!isEmbedding && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('models.temperature')}</Label>
            <Input
              type="number" min={0} max={2} step={0.1}
              value={model.temperature}
              onChange={(e) => up('temperature', (e.target.value === '' ? '' : parseFloat(e.target.value)) as number)}
              onBlur={() => {
                const v = Number(model.temperature);
                if (isNaN(v)) up('temperature', 0.7)
              }}
            />
          </div>
          <div>
            <Label>{t('models.maxTokens')}</Label>
            <Input
              type="number"
              value={model.maxTokens}
              onChange={(e) => up('maxTokens', (e.target.value === '' ? '' : parseInt(e.target.value)) as number)}
              onBlur={() => {
                const v = Number(model.maxTokens);
                if (!v || v < 1) up('maxTokens', 4096)
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testing || !model.baseUrl || (!model.apiKey && model.provider !== 'ollama')}
        >
          <Zap size={13} />
          {testing ? t('models.testing') : t('models.testConnection')}
        </Button>
        <Button
          className="flex-1"
          onClick={onSave}
          disabled={saving || !model.name || (!model.apiKey && model.provider !== 'ollama')}
        >
          <Save size={13} />
          {saving ? t('models.saving') : t('models.saveConfig')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>{t('draftEditor.cancel')}</Button>
      </div>
      {testResult && (
        <div className={`text-xs p-2 rounded ${testResult.success ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'} break-all`}>
          {testResult.success ? t('models.connectionSuccess') : t('models.connectionFailed', { error: testResult.error })}
        </div>
      )}
    </div>
  )
}


// ==================== 代理设置 ====================

function ProxySection() {
  const { t } = useTranslation('settings')
  const [proxy, setProxy] = useState<{
    enabled: boolean; type: 'http' | 'socks5'; host: string; port: number
  }>({ enabled: false, type: 'http', host: '', port: 7890 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ipc.invoke('config:get').then((cfg) => {
      if (cfg?.proxy) {
        setProxy({
          enabled: cfg.proxy.enabled ?? false, // 明确默认关闭
          type: cfg.proxy.type ?? 'http',
          host: cfg.proxy.host ?? '',
          port: cfg.proxy.port ?? 7890,
        })
      }
    }).catch(() => { })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await ipc.invoke('config:set', { proxy }).catch(() => { })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-[480px] space-y-5">
      {/* 启用开关 */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-panel)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('models.proxy.enableProxy')}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('models.proxy.enableProxyDesc')}
          </p>
        </div>
        <Switch
          checked={proxy.enabled}
          onCheckedChange={(checked) => setProxy({ ...proxy, enabled: checked })}
          aria-label={t('models.proxy.enableProxy')}
        />
      </div>

      {/* 代理详情 */}
      {proxy.enabled && (
        <div
          className="space-y-3 p-4 rounded-xl"
          style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-panel)' }}
        >
          <div>
            <Label>{t('models.proxy.proxyType')}</Label>
            <NativeSelect
              value={proxy.type}
              onChange={(e) => setProxy({ ...proxy, type: e.target.value as 'http' | 'socks5' })}
            >
              <option value="http">HTTP</option>
              <option value="socks5">SOCKS5</option>
            </NativeSelect>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <Label>{t('models.proxy.proxyHost')}</Label>
              <Input
                value={proxy.host}
                onChange={(e) => setProxy({ ...proxy, host: e.target.value })}
                placeholder="127.0.0.1"
              />
            </div>
            <div>
              <Label>{t('models.proxy.proxyPort')}</Label>
              <Input
                type="number"
                value={proxy.port}
                onChange={(e) => setProxy({ ...proxy, port: (e.target.value === '' ? '' : parseInt(e.target.value)) as number })}
                onBlur={() => {
                  const v = Number(proxy.port);
                  if (!v) setProxy({ ...proxy, port: 7890 })
                }}
              />
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saved ? <Check size={13} /> : <Save size={13} />}
        {saved ? t('models.saved') : saving ? t('models.saving') : t('models.proxy.saveProxy')}
      </Button>
    </div>
  )
}

// ==================== 编辑器设置 ====================

/** 字体下拉菜单（界面字体 + 写作字体共用） */
function FontSelect({
  value,
  onChange,
}: {
  value: FontId
  onChange: (id: FontId) => void
}) {
  const { t } = useTranslation('settings')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState(FONT_OPTIONS)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.id === value) ?? FONT_OPTIONS[0]

  // 按关键字过滤字体（大小写不敏感，匹配名称 / 英文名 / 描述）
  const q = search.trim().toLowerCase()
  const filtered = q
    ? options.filter((o) => `${o.label} ${o.labelEn} ${o.desc}`.toLowerCase().includes(q))
    : options

  useEffect(() => {
    ipc.invoke('config:list-system-fonts').then((fonts) => {
      const known = new Set(FONT_OPTIONS.map((item) => item.label.toLowerCase()))
      const detected = fonts.filter((name) => !known.has(name.toLowerCase())).map((name) => ({
        id: `system:${name}`, label: name, labelEn: 'Local font', desc: '当前电脑已安装',
        family: `'${name.replace(/'/g, "\\'")}', sans-serif`, preview: '中文小说 Aa 123',
      }))
      setOptions([...FONT_OPTIONS, ...detected])
    }).catch(() => undefined)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* 触发按鈕 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 h-9 rounded-lg transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: open ? 'var(--color-hover)' : 'var(--color-panel)',
          color: 'var(--color-text)',
        }}
      >
        {/* 当前字体预览 */}
        <span
          className="flex-1 text-sm truncate"
          style={{ fontFamily: current.family }}
        >
          {current.label}
        </span>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {current.preview}
        </span>
        <ChevronDown
          size={13}
          className="flex-shrink-0 transition-transform"
          style={{
            color: 'var(--color-text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* 下拉选项列表 */}
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-xl overflow-hidden"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-panel)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* 搜索框 */}
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <Search size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('settingsFont.searchPlaceholder')}
              autoFocus
              className="w-full bg-transparent outline-none text-xs"
              style={{ color: 'var(--color-text)' }}
            />
          </div>

          {/* 列表 */}
          <div className="max-h-[260px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              {t('settingsFont.noMatch')}
            </div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false) }}
              className="w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-[var(--color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              style={{
                backgroundColor: value === opt.id
                  ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                  : 'transparent',
              }}
            >
              {/* 选中标记 */}
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: value === opt.id ? 'var(--color-accent)' : 'transparent',
                  border: value === opt.id ? 'none' : '1.5px solid var(--color-border)',
                }}
              >
                {value === opt.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>

              {/* 字体名 + 描述 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)', fontFamily: opt.family }}>
                    {opt.label}
                  </span>
                  <span className="text-[0.65rem]" style={{ color: 'var(--color-text-muted)' }}>
                    {opt.labelEn}
                  </span>
                </div>
                <p className="text-[0.65rem] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {opt.desc}
                </p>
              </div>

              {/* 预览文字 */}
              <span
                className="text-sm flex-shrink-0"
                style={{ fontFamily: opt.family, color: 'var(--color-text-secondary)' }}
              >
                {opt.preview}
              </span>
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EditorSection() {
  const { writingFont, setWritingFont, uiFont, setUiFont } = useThemeStore()
  const { t } = useTranslation('settings')

  return (
    <div className="max-w-md space-y-5">
      {/* 界面字体 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{t('appearance.uiFont')}</p>
            <p className="text-[0.68rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {t('appearance.uiFontDesc')}
            </p>
          </div>
        </div>
        <FontSelect value={uiFont} onChange={setUiFont} />
      </div>

      {/* 写作字体 */}
      <div className="space-y-1.5">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{t('appearance.writingFont')}</p>
          <p className="text-[0.68rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('appearance.writingFontDesc')}
          </p>
        </div>
        <FontSelect value={writingFont} onChange={setWritingFont} />
      </div>

      {/* 说明 */}
      <div
        className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
        style={{ backgroundColor: 'var(--color-hover)', color: 'var(--color-text-muted)' }}
      >
        <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('appearance.hint')}</span>
        <span>{t('appearance.fontsBuiltIn')}</span>
      </div>
    </div>
  )
}

// ==================== 视觉效果设置 ====================

/** 数值滑杆（带实时值显示） */
function EffectSlider({
  label, desc, min, max, step, value, onChange,
}: {
  label: string
  desc: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{label}</p>
          <p className="text-[0.68rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
        </div>
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ backgroundColor: 'var(--color-hover)', color: 'var(--color-text-secondary)' }}
        >
          {Math.round(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          'w-full mt-2 accent-[var(--color-accent)] transition-opacity duration-150 ease-out hover:opacity-100',
          value !== min ? 'opacity-100' : 'opacity-[0.85]',
        )}
      />
    </div>
  )
}

function EffectsSection() {
  const { t } = useTranslation('settings')
  const {
    enabled, displacementScale, blurAmount, saturation, aberrationIntensity, elasticity, mode,
    setGlass, toggle, reset,
  } = useEffectsStore()

  return (
    <div className="max-w-md space-y-6">
      {/* 启用开关 */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-panel)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('glass.enabled')}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('glass.enabledDesc')}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} aria-label={t('glass.enabled')} />
      </div>

      {enabled && (
        <>
          {/* 折射模式 */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('glass.mode')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['standard', 'polar', 'prominent'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setGlass({ mode: m })}
                  className="active-press px-2 py-2 rounded-lg text-xs transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  style={{
                    border: mode === m ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    color: mode === m ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    backgroundColor: mode === m ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                  }}
                >
                  {t(`glass.mode_${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <EffectSlider
              label={t('glass.displacement')}
              desc={t('glass.displacementDesc')}
              min={8} max={140} step={1} value={displacementScale}
              onChange={(v) => setGlass({ displacementScale: v })}
            />
            <EffectSlider
              label={t('glass.blur')}
              desc={t('glass.blurDesc')}
              min={0.02} max={0.2} step={0.005} value={blurAmount}
              onChange={(v) => setGlass({ blurAmount: v })}
            />
            <EffectSlider
              label={t('glass.saturation')}
              desc={t('glass.saturationDesc')}
              min={100} max={220} step={1} value={saturation}
              onChange={(v) => setGlass({ saturation: v })}
            />
            <EffectSlider
              label={t('glass.aberration')}
              desc={t('glass.aberrationDesc')}
              min={0} max={6} step={0.1} value={aberrationIntensity}
              onChange={(v) => setGlass({ aberrationIntensity: v })}
            />
            <EffectSlider
              label={t('glass.elasticity')}
              desc={t('glass.elasticityDesc')}
              min={0} max={0.4} step={0.01} value={elasticity}
              onChange={(v) => setGlass({ elasticity: v })}
            />
          </div>

          <Button variant="outline" size="sm" onClick={reset}>
            <Settings2 size={13} />
            {t('glass.reset')}
          </Button>
        </>
      )}
    </div>
  )
}

// ==================== 窗口与托盘设置 ====================

function WindowSection() {
  const windowT = useTranslation('window').t
  const closeBehavior = useWindowStore((s) => s.closeBehavior)
  const loaded = useWindowStore((s) => s.loaded)
  const setCloseBehavior = useWindowStore((s) => s.setCloseBehavior)
  const autoLaunch = useWindowStore((s) => s.autoLaunch)
  const autoLaunchLoaded = useWindowStore((s) => s.autoLaunchLoaded)
  const setAutoLaunch = useWindowStore((s) => s.setAutoLaunch)
  const uninstall = useWindowStore((s) => s.uninstall)
  const [uninstallHint, setUninstallHint] = useState<string | null>(null)

  useEffect(() => {
    useWindowStore.getState().loadCloseBehavior()
    useWindowStore.getState().loadAutoLaunch()
  }, [])

  const handleUninstall = async () => {
    const found = await uninstall()
    setUninstallHint(windowT(found ? 'uninstallStarted' : 'uninstallPortable'))
  }

  const options: { value: CloseBehavior; icon: React.ReactNode }[] = [
    { value: 'ask', icon: <MessageSquare size={15} /> },
    { value: 'minimize', icon: <Minus size={15} /> },
    { value: 'quit', icon: <LogOut size={15} /> },
  ]

  return (
    <div className="max-w-md space-y-5">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
          {windowT('closeBehaviorLabel')}
        </p>
        <p className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
          {windowT('closeBehaviorDesc')}
        </p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const active = closeBehavior === opt.value
          return (
            <button
              key={opt.value}
              disabled={!loaded}
              onClick={() => setCloseBehavior(opt.value)}
              className={cn(
                'flex items-start gap-3 w-full px-4 py-3 rounded-xl text-left transition-[background-color,border-color] duration-200 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                active
                  ? 'border border-[var(--color-accent)]'
                  : 'border border-[var(--color-border)] hover:bg-[var(--color-hover)]',
              )}
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-panel))'
                  : 'var(--color-panel)',
              }}
            >
              <span
                className="mt-0.5 flex-shrink-0"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              >
                {opt.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block text-sm font-medium"
                  style={{ color: active ? 'var(--color-accent)' : 'var(--color-text)' }}
                >
                  {windowT(`option_${opt.value}`)}
                </span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {windowT(`option_${opt.value}Desc`)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
        {windowT('hint')}
      </p>

      {/* 系统：开机自启 + 卸载 */}
      <div className="space-y-5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
            {windowT('autoLaunchLabel')}
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
              {windowT('autoLaunchDesc')}
            </p>
            <Switch
              checked={autoLaunch}
              disabled={!autoLaunchLoaded}
              onCheckedChange={setAutoLaunch}
              aria-label={windowT('autoLaunchLabel')}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              {windowT('uninstallLabel')}
            </p>
            <p className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
              {windowT('uninstallDesc')}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleUninstall}>
            {windowT('uninstallAction')}
          </Button>
        </div>
        {uninstallHint && (
          <p className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
            {uninstallHint}
          </p>
        )}
      </div>
    </div>
  )
}

// ==================== 关于与支持区 ====================

function AboutSection() {
  return (
    <div className="space-y-6 max-w-[600px] p-2">
      <div className="flex flex-col items-center justify-center py-8 rounded-xl space-y-2" style={{ backgroundColor: 'var(--color-sidebar)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold brand-gradient tracking-wider">落笔</h1>
        <p className="text-sm opacity-80" style={{ color: 'var(--color-text)' }}>v{__APP_VERSION__}</p>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>本地优先的 AI 小说创作工作台</p>
      </div>

      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold pb-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>创作方式</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          落笔将项目设定、章节蓝图、人物状态和草稿保存在本地。模型配置由你自己掌控；正文生成后先进入草稿，再由你决定是否定稿或导出。
        </p>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-semibold pb-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>当前版本</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          支持本地小说项目、章节草稿、模型配置、导出和发布前整理。平台登录、验证码与最终发布仍由你确认。
        </p>
      </div>

      {/* 支持与赞助 — 收款码 */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-semibold pb-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>支持与赞助</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          如果落笔对你有帮助，欢迎扫码支持作者。
        </p>
        <div className="flex items-start gap-6 pt-2">
          <div className="flex flex-col items-center gap-2">
            <img
              src="./buyme/alipay.jpg"
              alt="支付宝收款码"
              style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--color-border)' }}
            />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>支付宝</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <img
              src="./buyme/wepay.jpg"
              alt="微信收款码"
              style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--color-border)' }}
            />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>微信支付</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== 工具函数 ====================

function providerEmoji(provider: string) {
  const map: Record<string, string> = {
    openai: '🤖', deepseek: '🐬', gemini: '✨', ollama: '🦙', bigmodel: '🧠', custom: '⚙️',
  }
  return map[provider] ?? '🔧'
}

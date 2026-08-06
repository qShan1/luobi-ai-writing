import { FolderOpen, Clock, BookOpen, FileUp, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/project-store'

interface WelcomePageProps {
  onNewProject: () => void
  onOpenProject: () => void
  onImportNovel?: () => void
}

/** 欢迎页面 — 无项目打开时显示 */
export default function WelcomePage({ onNewProject, onOpenProject, onImportNovel }: WelcomePageProps) {
  const { t } = useTranslation('pages')
  const recentProjects = useProjectStore(s => s.recentProjects)
  const openProject = useProjectStore(s => s.openProject)
  const currentProject = useProjectStore(s => s.currentProject)

  return (
    <div className="welcome-shell w-full h-full overflow-y-auto">
      <div className="welcome-content max-w-4xl w-full mx-auto px-10 py-12">
        <div className="welcome-hero mb-12">
          <div className="welcome-brand-row">
            <img className="welcome-logo" src="./luobi-logo.svg" alt="落笔 LUOBI AI WRITING" />
            <div>
              <div className="welcome-kicker">LUOBI / AI WRITING DESK</div>
              <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-text)' }}>
            {currentProject ? currentProject.name : t('welcome.title')}
              </h1>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            {currentProject ? currentProject.path : t('welcome.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="welcome-actions mb-12">
          <button
            onClick={onNewProject}
            className="welcome-primary group"
          >
            <span>
              <span className="welcome-action-label">{t('welcome.newProject')}</span>
              <span className="welcome-action-desc">{t('welcome.newProjectDesc')}</span>
            </span>
            <ArrowRight size={20} strokeWidth={1.8} />
          </button>

          <button
            onClick={onOpenProject}
            className="welcome-secondary group"
          >
            <FolderOpen size={18} strokeWidth={1.8} />
            <span><span className="welcome-action-label">{t('welcome.openProject')}</span><span className="welcome-action-desc">{t('welcome.openProjectDesc')}</span></span>
          </button>

          <button
            onClick={onImportNovel}
            className="welcome-secondary group"
          >
            <FileUp size={18} strokeWidth={1.8} />
            <span><span className="welcome-action-label">{t('welcome.importNovel')}</span><span className="welcome-action-desc">{t('welcome.importNovelDesc')}</span></span>
          </button>
        </div>

        {/* 最近项目 */}
        {recentProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3 welcome-section-label">
              <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {t('welcome.recentProjects')}
              </span>
            </div>
            <div className="space-y-1">
              {recentProjects.map((p, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                  style={{ backgroundColor: 'transparent', borderLeft: '2px solid transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                    e.currentTarget.style.borderLeftColor = 'var(--color-accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderLeftColor = 'transparent'
                  }}
                  onClick={() => openProject(p.path)}
                >
                  <BookOpen size={14} style={{ color: 'var(--color-accent)', opacity: 0.6 }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block truncate" style={{ color: 'var(--color-text)' }}>
                      {p.name}
                    </span>
                    <span className="text-xs block truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {p.path}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            {t('welcome.footer')}
          </p>
        </div>
      </div>
    </div>
  )
}

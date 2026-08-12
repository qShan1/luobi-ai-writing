import { FolderOpen, Clock, BookOpen, FileUp, Plus } from 'lucide-react'
import { useProjectStore } from '../../stores/project-store'
import GlassSurface from '../effects/GlassSurface'

interface WelcomePageProps {
  onNewProject: () => void
  onOpenProject: () => void
  onImportNovel?: () => void
}

/** 欢迎页面 — 无项目打开时显示 */
export default function WelcomePage({ onNewProject, onOpenProject, onImportNovel }: WelcomePageProps) {
  const recentProjects = useProjectStore(s => s.recentProjects)
  const openProject = useProjectStore(s => s.openProject)
  const currentProject = useProjectStore(s => s.currentProject)

  return (
    <div className="welcome-shell w-full h-full overflow-y-auto">
      <div className="welcome-content max-w-4xl w-full mx-auto px-10 py-12">
        <div className="welcome-hero mb-8">
          <div className="welcome-brand-row">
            <img className="welcome-logo" src="./luobi-icon.svg" alt="落笔" />
            <div>
              <h1 className="welcome-title" style={{ color: 'var(--color-text)' }}>
                {currentProject ? currentProject.name : '开始一部作品'}
              </h1>
              <p className="welcome-subtitle" style={{ color: 'var(--color-text-secondary)' }}>
                {currentProject ? currentProject.path : '创建、续写或导入一个小说项目'}
              </p>
            </div>
          </div>
        </div>

        <div className="welcome-actions mb-10">
          <GlassSurface
            className="welcome-primary group"
            cornerRadius={10}
            padding="18px 22px"
            onClick={onNewProject}
          >
            <span>
              <span className="welcome-action-label">新建作品</span>
              <span className="welcome-action-desc">从题材、设定和章节蓝图开始</span>
            </span>
            <Plus size={20} strokeWidth={1.8} />
          </GlassSurface>

          <GlassSurface
            className="welcome-secondary group"
            cornerRadius={10}
            padding="18px 22px"
            onClick={onOpenProject}
          >
            <FolderOpen size={18} strokeWidth={1.8} />
            <span><span className="welcome-action-label">打开项目</span><span className="welcome-action-desc">继续本地作品</span></span>
          </GlassSurface>

          <GlassSurface
            className="welcome-secondary group"
            cornerRadius={10}
            padding="18px 22px"
            onClick={onImportNovel}
          >
            <FileUp size={18} strokeWidth={1.8} />
            <span><span className="welcome-action-label">导入旧稿</span><span className="welcome-action-desc">把现有章节带入工作台</span></span>
          </GlassSurface>
        </div>

        {/* 最近项目 */}
        {recentProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3 welcome-section-label">
              <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                最近项目
              </span>
            </div>
            <div className="space-y-1">
              {recentProjects.map((p, i) => (
                <GlassSurface
                  key={i}
                  className="group"
                  cornerRadius={8}
                  padding="10px 14px"
                  onClick={() => openProject(p.path)}
                >
                  <div className="flex items-center gap-3">
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
                </GlassSurface>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            落笔将项目文件保存在本地目录中
          </p>
        </div>
      </div>
    </div>
  )
}

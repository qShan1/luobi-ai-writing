import { motion, useReducedMotion, type Variants } from 'motion/react'
import { FolderOpen, Clock, BookOpen, FileUp, Plus } from 'lucide-react'
import { useProjectStore } from '../../stores/project-store'
import { useThemeStore } from '../../stores/theme-store'

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
  const theme = useThemeStore(s => s.theme)
  const logoSrc = theme === 'dark' || theme === 'galaxy' ? './luobi-logo-white.svg' : './luobi-logo.svg'
  const reduce = useReducedMotion()

  // 玻璃材质化入场（apple §12）：blur + scale 一起，像真实材质到达，而非纯淡入
  const enterCard: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } } }
    : {
        hidden: { opacity: 0, y: 12, scale: 0.98, filter: 'blur(8px)' },
        show: {
          opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
          transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] },
        },
      }

  return (
    <div className="welcome-shell w-full h-full overflow-y-auto">
      <div className="welcome-content max-w-4xl w-full mx-auto px-10 py-12">
        <div className="welcome-hero mb-8">
          <div className="welcome-brand-row">
            <img className="welcome-logo" src={logoSrc} alt="落笔" />
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

        <motion.div
          className="flex flex-wrap gap-3 mb-10"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } } }}
        >
          <motion.div
            variants={enterCard}
          >
            <div
              className="welcome-action-button welcome-action-primary group flex items-center justify-between gap-5 rounded-[var(--radius-lg)] px-5 py-3.5 min-w-[250px] cursor-pointer text-left bg-[var(--color-accent)] text-white border border-transparent shadow-[var(--shadow-sm)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)] hover:shadow-[0_8px_20px_-6px_rgba(var(--color-accent-rgb),0.45)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
              onClick={onNewProject}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNewProject() } }}
            >
              <span>
                <span className="welcome-action-label">新建作品</span>
                <span className="welcome-action-desc">从题材、设定和章节蓝图开始</span>
              </span>
              <Plus size={20} strokeWidth={1.8} />
            </div>
          </motion.div>

          <motion.div
            variants={enterCard}
          >
            <div
              className="welcome-action-button welcome-action-secondary group flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 min-w-[190px] cursor-pointer text-left bg-[var(--color-panel)] text-[var(--color-text)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:bg-[var(--color-hover)] hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
              onClick={onOpenProject}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenProject() } }}
            >
              <FolderOpen size={18} strokeWidth={1.8} />
              <span><span className="welcome-action-label">打开项目</span><span className="welcome-action-desc">继续本地作品</span></span>
            </div>
          </motion.div>

          <motion.div
            variants={enterCard}
          >
            <div
              className="welcome-action-button welcome-action-secondary group flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 min-w-[190px] cursor-pointer text-left bg-[var(--color-panel)] text-[var(--color-text)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:bg-[var(--color-hover)] hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
              onClick={onImportNovel}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImportNovel?.() } }}
            >
              <FileUp size={18} strokeWidth={1.8} />
              <span><span className="welcome-action-label">导入旧稿</span><span className="welcome-action-desc">把现有章节带入工作台</span></span>
            </div>
          </motion.div>
        </motion.div>

        {/* 最近项目 */}
        {recentProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3 welcome-section-label">
              <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                最近项目
              </span>
            </div>
            <motion.div
              className="space-y-1"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            >
              {recentProjects.map((p, i) => (
                <motion.div
                  key={i}
                  variants={enterCard}
                >
                  <div
                    className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 shadow-[var(--shadow-sm)] cursor-pointer transition-[transform,border-color,background-color] duration-150 hover:-translate-y-[1px] hover:border-[var(--color-accent)] hover:bg-[var(--color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                    onClick={() => openProject(p.path)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(p.path) } }}
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
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        <div className="mt-12">
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            落笔将项目文件保存在本地目录中
          </p>
        </div>
      </div>
    </div>
  )
}

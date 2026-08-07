import fs from 'node:fs'
import path from 'node:path'

const project = 'E:/Agent/Project/小说/我在末世建了个国'
const config = JSON.parse(fs.readFileSync('C:/Users/21115/.luobi/models.json', 'utf8').replace(/^\uFEFF/, ''))
const model = config.find((item) => item.id === 'deepseek-v4-flash' && item.modelName === 'deepseek-v4-flash')
if (!model) throw new Error('本机 Flash 配置未生效')

const blueprints = [
  ['避难所断水', '避难所水源被切断，林砚发现守卫囤水并准备抛弃老弱。', '天亮前，外面的武装车队要求交出避难所。'],
  ['第一条规矩', '林砚公开水源库存，按劳分配并解除守卫武装。', '车队提出用一台净水机交换十个人。'],
  ['不能卖的人', '林砚拒绝交易，带人修复废弃管网并准备夜袭取水。', '管网另一端藏着一座仍有电的地下农场。'],
  ['水井里的电', '林砚带队进入地下农场，发现电力来自一台仍在运行的旧反应堆。', '农场主人留下的广播要求避难所交出一名孩子。'],
  ['十个人的价钱', '武装车队封锁避难所，林砚用粮食库存和地形组织第一次反击。', '车队首领手里有灾变前的城市地图。'],
  ['地图上的空白', '地图显示附近还有六个聚落，林砚决定先建立交换路线而非贸然扩张。', '第一个聚落派来的人，带着避难所失踪者的身份证。'],
  ['夜里的迁徙', '林砚接回愿意加入的幸存者，安置、分工和粮食分配引发内部冲突。', '有人在水箱里投毒，所有人都怀疑新来者。'],
  ['谁动了水箱', '林砚不靠审讯，利用出水记录和脚印找出真正的投毒者。', '投毒者承认自己受命于一座更大的城。'],
  ['灰墙城', '林砚带人前往灰墙城谈判，见识到以人口和武力维持的旧秩序。', '灰墙城提出让林砚交出全部技术人员。'],
  ['避难所不是国家', '林砚拒绝屈服，带回一台净水设备和一份联盟契约，正式宣布建立新秩序。', '契约的最后一页写着：第一任国主必须在三十天内攻下灰墙城。'],
]

const usage = []
const clean = (text) => text.replace(/^```[\s\S]*?\n|```$/g, '').trim()
function isMeta(text) { return /我们需要|我需要|用户希望|以下是|写作要求|作为.*作者|本章.*将/.test(text.slice(0, 800)) }

async function generate(number, title, events, hook, previousEnding, state) {
  const messages = [
    { role: 'system', content: '你是中文男频长篇小说作者。只输出可直接发表的小说正文，不输出标题、分析、提纲、写作说明、任务复述或元话语。关闭思考，直接写场景。' },
    { role: 'user', content: `小说：《我在末世建了个国》\n第${number}章《${title}》\n本章目标：${events}\n章末钩子：${hook}\n前章结尾：${previousEnding.slice(-900)}\n当前状态：${state}\n要求：约2200-2800字；第一句必须是动作或现场；本章必须有具体资源、人物选择和可验证结果；不靠旁白解释世界；结尾必须落到钩子。` },
  ]
  const response = await fetch(`${model.baseUrl}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${model.apiKey}` }, body: JSON.stringify({ model: model.modelName, messages, max_tokens: 4200, temperature: 0.72, thinking: { type: 'disabled' }, stream: false }) })
  const data = await response.json()
  if (!response.ok) throw new Error(`第${number}章 API ${response.status}: ${JSON.stringify(data).slice(0, 500)}`)
  const text = clean(data.choices?.[0]?.message?.content || '')
  usage.push({ chapter: number, usage: data.usage || null, finishReason: data.choices?.[0]?.finish_reason || '' })
  if (text.length < 1600 || isMeta(text)) throw new Error(`第${number}章正文门禁失败：${text.length}字，finish=${data.choices?.[0]?.finish_reason}`)
  return text
}

fs.mkdirSync(path.join(project, 'manuscript'), { recursive: true })
let previous = ''
let state = '林砚；避难所约60人；饮水即将耗尽；没有稳定外援；主角目标是让避难所活过下一周。'
const report = { title: '我在末世建了个国', model: model.modelName, status: 'running', startedAt: new Date().toISOString(), chapters: [] }
for (let i = 0; i < blueprints.length; i += 1) {
  const number = i + 1
  const [title, events, hook] = blueprints[i]
  const text = await generate(number, title, events, hook, previous, state)
  fs.writeFileSync(path.join(project, 'manuscript', `chapter-${String(number).padStart(4, '0')}.md`), `# 第${number}章 ${title}\n\n${text}\n`, 'utf8')
  previous = text
  state = `已完成第${number}章：${events}；下一章钩子：${hook}；人物与资源必须承接，不重置。`
  report.chapters.push({ number, title, chars: text.length })
  report.usage = usage
  fs.writeFileSync(path.join(project, 'generation-ten-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ chapter: number, title, chars: text.length, usage: usage.at(-1) }, null, 2))
}
report.status = 'completed'; report.completedAt = new Date().toISOString(); report.usage = usage
fs.writeFileSync(path.join(project, 'generation-ten-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

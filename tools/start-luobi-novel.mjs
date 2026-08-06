import fs from 'node:fs'
import path from 'node:path'

const target = 'E:/Agent/Project/小说/落笔首作'
const configPath = 'C:/Users/21115/.vela/models.json'
const models = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const flash = models.find((model) => model.modelName === 'deepseek-v4-flash')
if (!flash) throw new Error('未找到 DeepSeek Flash 配置')

async function ask(messages, maxTokens, jsonMode = false) {
  const response = await fetch(`${flash.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${flash.apiKey}` },
    body: JSON.stringify({ model: flash.modelName, messages, max_tokens: maxTokens, temperature: 0.82, stream: false, ...(jsonMode ? { response_format: { type: 'json_object' } } : {}) }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`DeepSeek ${response.status}: ${JSON.stringify(data)}`)
  const message = data.choices?.[0]?.message || {}
  const output = message.content?.trim() || message.reasoning_content?.trim() || ''
  if (!output) throw new Error(`DeepSeek 返回空内容：finish_reason=${data.choices?.[0]?.finish_reason ?? 'unknown'}，响应字段=${Object.keys(data).join(',')}`)
  return output
}

function looksLikeMeta(text) {
  return /用户希望|我们需要|我需要|关键元素|根据设定写|小说第一章|以下是|作为.*作者|第一章场景|我们需要构思/.test(text.slice(0, 1200))
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error(`模型没有返回 JSON：${text.slice(0, 300)}`)
  return JSON.parse(cleaned.slice(start, end + 1))
}

const beats = [
  ['车上不能留下活人','广播发布规则，陆沉发现自己被判定死亡','乘客抢门，第一名下车者消失','车门外有人叫出陆沉的名字'],
  ['第十八位乘客','陆沉核对人数，找出多出来的人','后排座椅出现湿脚印','司机镜里多出一张脸'],
  ['代价可见','陆沉首次看见规则代价','他用一根头发换取十秒安全','代价栏写着“记忆”'],
  ['不要回答','乘客收到失踪家属来电','有人接听后变成车票','电话里传来下一站名'],
  ['雾港服务区','客车驶入封闭服务区','规则要求购买不存在的食物','收银员说陆沉已经来过'],
  ['死者的零钱','陆沉获得第一枚代价币','他识破找零规则救下女孩苏晚','零钱日期是明天'],
  ['车票背面','众人发现车票有不同终点','陆沉的车票没有终点','车票背面印着母亲笔迹'],
  ['司机不下车','司机首次现身','他提出交换一名活人','司机叫陆沉“检票员”'],
  ['雾里的加油站','众人必须给不存在的油箱加油','赵野私藏代价币','油枪开始抽取人的影子'],
  ['影子欠费','陆沉用规则漏洞追回影子','赵野失去一段记忆','影子里站着另一个陆沉'],
  ['高速封路','前方出现九条出口','每条出口标注不同死亡方式','第十条出口没有编号'],
  ['失物招领处','苏晚寻找失踪的哥哥','陆沉找到自己的死亡证明','死亡时间是三年前'],
  ['请勿回头','车厢广播要求全员闭眼','有人在每排座椅后数数','数到十八时车开始倒退'],
  ['死者座位','陆沉坐上本不该存在的十八号座','看见规则灾害的源头碎片','他被列入“回收名单”'],
  ['雾港收费站','收费员索要“通行理由”','众人互相揭短换取通行','陆沉付出一段童年记忆'],
  ['被删掉的名字','陆沉从记忆空洞里找到母亲线索','苏晚承认自己认识陆沉','赵野向雾中人交易'],
  ['夜班乘务员','新的乘务员上车发放晚餐','晚餐必须由死人先吃','陆沉发现乘务员没有影子'],
  ['活人餐盒','陆沉借死者身份破局','苏晚吞下代价币获得听见规则的能力','餐盒里有一把收费站钥匙'],
  ['车速一百二十','客车失控加速，减速会触发清退','陆沉必须决定保谁下车','前方路牌写着“雾港市，已注销”'],
  ['注销城市','众人踏入无人的雾港','城市规则：日落前必须找到住址','陆沉的住址是殡仪馆'],
  ['门牌号404','陆沉进入旧居找线索','母亲留下录音机','录音说“别相信车上的你”'],
  ['同名者','另一个陆沉出现并索要车票','两人共享痛觉与记忆','真陆沉的手背浮出检票章'],
  ['末班公交','众人必须搭乘城市公交返回高速','赵野带走苏晚','公交司机的脸是空白的'],
  ['错误站台','陆沉以死亡证明进入禁区','找到雾港规则档案室','档案显示全球有九十九条公路'],
  ['第一条公路','陆沉得知自己父母是早期检票员','赵野被规则寄生','寄生体宣布收费站即将开闸'],
  ['收费员上岗','陆沉被迫担任临时收费员','每放行一人就要承担其代价','苏晚主动留下帮他'],
  ['十七张车票','所有乘客的真实目的曝光','赵野抢走无终点车票','车外雾潮开始倒灌'],
  ['活人不能下车','陆沉反转首条规则，让寄生体被判活人','客车回到起点，乘客选择归途','赵野开着另一辆车冲入雾海'],
  ['检票员序列','陆沉清算代价并获得序列能力','苏晚听到母亲的坐标','系统外的广播称他为“错误乘客”'],
  ['下一站：人间','雾港高速暂时开放','陆沉看见九十九条公路汇向现实','其中一辆车上坐着三年前的自己'],
]
const architecture = {
  title: '末日公路：我能看见规则的代价', genre: '科幻末世', subGenre: '规则怪谈·公路求生·序列升级', targetAudience: '番茄男频读者',
  premise: '规则灾害降临后，陆沉在一辆无人驾驶客车上醒来。他是唯一被规则判定为死亡的人，也因此能看见每条规则索取的真实代价。',
  worldbuilding: '九十九条异常公路连接被注销的城市。每座城市都由一套可推理的规则维持；违反规则不一定死亡，支付代价也不一定存活。',
  goldenFinger: '代价视界：看见规则的触发条件、隐藏代价和可转移漏洞。主动承担并结算代价，可积累为检票员序列能力。',
  protagonistProfile: '陆沉，26岁，前事故调查员，冷静但不冷漠，擅长从细节和人性中建立推理链。他不追求救世，先要确认自己到底为何“已死亡”。',
  characters: [{name:'陆沉',role:'protagonist',personality:'冷静、克制、行动果断',motivation:'找回死亡真相与母亲下落',arc:'从求生者成为规则制定者'},{name:'苏晚',role:'supporting',personality:'敏锐、嘴硬、重情',motivation:'寻找失踪哥哥',arc:'从幸存者成长为规则聆听者'},{name:'赵野',role:'antagonist',personality:'强势、现实、擅长煽动',motivation:'用任何代价离开公路',arc:'逐渐成为规则寄生体宿主'}],
  synopsis: '第一卷从客车规则开始，陆沉以死者身份看破“活人不能下车”的真正筛选目标，带着十六名乘客进入雾港高速。他在服务区、收费站和注销城市连续支付记忆、影子与信任，换取线索和能力；苏晚成为同伴，赵野则在求生压力下背叛。卷末陆沉反转首条规则，完成检票员序列晋升，发现自己的死亡与九十九条公路有关，而三年前的自己仍在其中一辆车上。',
  writingGuidance: '每章前段抛异常，中段给可推理线索，末段反转或资源结算；规则公平且代价具体；避免大段设定解释。',
  chapterBlueprints: beats.map(([title, purpose, keyEvents, suspenseHook], index) => ({ number: index + 1, title, purpose, keyEvents, suspenseHook })),
}

const chapterPrompt = `直接写小说正文，第一句必须是场景或人物动作，不能先解释任务。标题《第一章 车上不能留下活人》，目标2200-2800字。
硬指标：前300字出现异常规则；800字前出现第一次死亡危险；主角在本章内做出主动选择并利用“看见规则代价”的能力；规则线索可推理，不直接长篇讲设定；章末必须出现一个改变读者认知的强钩子。男频爽点来自判断、反杀和资源争夺，不写低智辱骂，不把配角写成木偶。
只输出正文段落，不要输出标题、提纲、分析、任务复述、创作说明或“我需要”。设定：${JSON.stringify({ ...architecture, chapterBlueprints: [architecture.chapterBlueprints[0]] }, null, 2)}`
let chapterText = ''
let generationError = ''
try {
  chapterText = await ask([
    { role: 'system', content: '你是成熟的中文男频网文作者。只输出可直接出版的小说正文，不做分析，不复述要求。' },
    { role: 'user', content: chapterPrompt },
  ], 3200)
  if (chapterText.length < 1800 || looksLikeMeta(chapterText)) generationError = `模型输出未通过正文门禁：${chapterText.length}字`
} catch (error) {
  generationError = error.message
}

if (generationError) {
  fs.mkdirSync(target, { recursive: true })
  fs.writeFileSync(path.join(target, 'generation-report.json'), `${JSON.stringify({ title: architecture.title, model: flash.modelName, generatedAt: new Date().toISOString(), chapter: 1, status: 'failed-validation', error: generationError, preview: chapterText.slice(0, 1000) }, null, 2)}\n`, 'utf8')
  throw new Error(generationError)
}
fs.mkdirSync(path.join(target, '.vela'), { recursive: true })
fs.mkdirSync(path.join(target, 'manuscript'), { recursive: true })
fs.writeFileSync(path.join(target, 'architecture.json'), `${JSON.stringify(architecture, null, 2)}\n`, 'utf8')
fs.writeFileSync(path.join(target, '选题卡.md'), `# ${architecture.title}\n\n- 类型：${architecture.genre} / ${architecture.subGenre}\n- 目标读者：${architecture.targetAudience}\n- 核心卖点：规则怪谈 × 末日公路求生 × 代价可视化升级\n\n## 故事前提\n${architecture.premise}\n\n## 金手指\n${architecture.goldenFinger}\n\n## 创作指导\n${architecture.writingGuidance}\n`, 'utf8')
fs.writeFileSync(path.join(target, '第一卷蓝图.json'), `${JSON.stringify(architecture.chapterBlueprints, null, 2)}\n`, 'utf8')
fs.writeFileSync(path.join(target, 'manuscript', 'chapter-0001.md'), `# 第一章 车上不能留下活人\n\n${chapterText}\n`, 'utf8')
fs.writeFileSync(path.join(target, 'generation-report.json'), `${JSON.stringify({ title: architecture.title, model: flash.modelName, generatedAt: new Date().toISOString(), chapter: 1, chapterChars: chapterText.length, chaptersPlanned: architecture.chapterBlueprints?.length ?? 0 }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ target, title: architecture.title, model: flash.modelName, chapterChars: chapterText.length, chaptersPlanned: architecture.chapterBlueprints?.length ?? 0 }, null, 2))

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const project = 'E:/Agent/Project/小说/我在末世建了个国'
const blueprints = [
  [4,'水井里的电','林砚带队进入地下农场，发现电力来自旧反应堆。','农场主人留下广播，要求交出一名孩子。'],
  [5,'十个人的价钱','武装车队封锁避难所，林砚用粮食和地形组织反击。','车队首领手里有灾变前城市地图。'],
  [6,'地图上的空白','林砚决定建立交换路线，调查失踪者身份证。','身份证背面留下白水街药房地址。'],
  [7,'夜里的迁徙','林砚接回幸存者，安置、分工和粮食分配产生冲突。','有人在水箱里投毒。'],
  [8,'谁动了水箱','林砚用出水记录和脚印找出投毒者。','投毒者受命于一座更大的城。'],
  [9,'灰墙城','林砚赴灰墙城谈判，见识以人口和武力维持的旧秩序。','灰墙城要求交出全部技术人员。'],
  [10,'避难所不是国家','林砚拒绝屈服，带回净水设备和联盟契约。','契约要求三十天内攻下灰墙城。'],
]
const script = `import sqlite3, pathlib, json
root=pathlib.Path(r'''${project}'''); db=root/'.luobi'/'luobi.db'; con=sqlite3.connect(db)
items=json.loads(r'''${JSON.stringify(blueprints)}''')
for n,t,p,h in items: con.execute('INSERT OR REPLACE INTO blueprints (chapter_number,title,purpose,suspense_hook) VALUES (?,?,?,?)',(n,t,p,h))
for n in range(1,11):
 f=root/'manuscript'/f'chapter-{n:04d}.md'; body=f.read_text(encoding='utf-8'); cur=con.execute('INSERT INTO contents(body) VALUES (?)',(body,)); cid=cur.lastrowid; con.execute('INSERT INTO drafts(chapter_number,version,status,source,content_id,word_count) VALUES (?,?,?,?,?,?)',(n,1,'draft','flash-batch',cid,len(body)))
con.commit(); print(json.dumps({'drafts':10,'blueprints':10},ensure_ascii=False)); con.close()`
const result = spawnSync('python', ['-X', 'utf8', '-c', script], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
if (result.status !== 0) throw new Error(result.stderr || '导入失败')
console.log(result.stdout)

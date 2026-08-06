import json
import re
from pathlib import Path

import requests

headers = {'User-Agent': 'Mozilla/5.0'}
categories = {
    '都市高武': '/rank/1_2_1014',
    '都市脑洞': '/rank/1_2_262',
    '科幻末世': '/rank/1_2_8',
    '悬疑脑洞': '/rank/1_2_539',
}
result = {}
for category, suffix in categories.items():
    html = requests.get('https://fanqienovel.com' + suffix, headers=headers, timeout=20).text
    Path(__file__).resolve().parents[1].joinpath('docs', f'fanqie-{category}.html').write_text(html, encoding='utf-8')
    text = re.sub(r'<[^>]+>', '\n', html)
    text = re.sub(r'\n+', '\n', text)
    result[category] = text[:8000]

output = Path(__file__).resolve().parents[1].joinpath('docs', 'fanqie-male-newbook-research.json')
output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(output)

#!/usr/bin/env python3
# 直近7日のページ表示数（Cloudflare Web Analytics）を出す：python3 tests/traffic.py
# 注意：自動チェック（tests/live.cjs）の表示も1回の公開につき数件含まれる。
import os, json, datetime, urllib.request
tok = os.environ['CLAUDFLARE_API_TOKEN']
def api(url, data=None):
    req = urllib.request.Request(url, data=data, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())
acc = api('https://api.cloudflare.com/client/v4/accounts')['result'][0]['id']
since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
q = {'query': 'query($a:String!,$s:Time!){viewer{accounts(filter:{accountTag:$a}){rumPageloadEventsAdaptiveGroups(limit:50,filter:{datetime_geq:$s,requestHost:"aidev.k-web-lab.com"},orderBy:[count_DESC]){count dimensions{requestPath}}}}}',
     'variables': {'a': acc, 's': since}}
rows = api('https://api.cloudflare.com/client/v4/graphql', json.dumps(q).encode())['data']['viewer']['accounts'][0]['rumPageloadEventsAdaptiveGroups']
total = sum(r['count'] for r in rows)
print(f'直近7日のページ表示：合計 {total}（' + ' ／ '.join(f"{r['dimensions']['requestPath']} {r['count']}" for r in rows) + '）')
print('販売準備の目安（週100）：' + ('到達' if total >= 100 else f'未到達（あと {100 - total}）'))

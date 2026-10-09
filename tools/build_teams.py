import json, urllib.request, re
import time
def get(u):
    for a in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent':'Mozilla/5.0'}), timeout=30))
        except Exception as e:
            print('retry', u, e); time.sleep(2*(a+1))
    raise SystemExit('failed '+u)
out = {}
paths = {'nfl':'football/nfl','mlb':'baseball/mlb','nba':'basketball/nba'}
def logo(t):
    for l in t.get('logos',[]):
        if 'default' in l.get('rel',[]): return l['href']
    return t['logos'][0]['href'] if t.get('logos') else ''
def dark(t):
    for l in t.get('logos',[]):
        if 'dark' in l.get('rel',[]) and 'scoreboard' not in l.get('rel',[]): return l['href']
    return ''
for k,p in paths.items():
    d = get(f'https://site.api.espn.com/apis/site/v2/sports/{p}/teams?limit=1000')
    teams = {t['team']['id']: t['team'] for t in d['sports'][0]['leagues'][0]['teams']}
    ids = list(teams)
    out[k] = sorted([{
        'id': i, 'name': teams[i]['displayName'], 'short': teams[i].get('shortDisplayName') or teams[i].get('location'),
        'nick': teams[i].get('name') or teams[i].get('nickname',''), 'loc': teams[i].get('location',''), 'abbr': teams[i].get('abbreviation',''),
        'color': teams[i].get('color','333333'), 'alt': teams[i].get('alternateColor','777777'),
        'logo': logo(teams[i]), 'logoDark': dark(teams[i])
    } for i in ids], key=lambda t: t['name'])
    print(k, len(out[k]))
json.dump(out, open('teams.json','w'), separators=(',',':'))

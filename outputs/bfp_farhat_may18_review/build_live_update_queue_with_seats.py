import csv, json, re
from pathlib import Path
BASE=Path('/Users/tai/Documents/GitHub/taiyzun.com/outputs/bfp_farhat_may18_review')
SRC=BASE/'farhat_may18_decision_queue.csv'
OUT=BASE/'farhat_may18_ready_safe_live_updates_with_seats.json'
HON_PATTERNS=[
 'Hon\'ble Shri','Hon\'ble Smt','Hon\'ble Mr','Hon\'ble Ms','Hon\'ble','H.E. Hon.','H.E. Mr','H.E.','HE','H.H.','HH','Professor','Prof.','Prof','Most Venerable Dr','Most Venerable','Rt Rev Dr','Rt Rev','Respected Sardar','Padma Shri','Sr (Dr)','Sr. Dr.','Dr.','Dr','CA','Adv.','Adv','Mr.','Mr','Mrs.','Mrs','Ms.','Ms','Miss','Shri','Smt','Molvi'
]
HON_PATTERNS=sorted(HON_PATTERNS,key=len,reverse=True)

def split_name(s):
    s=(s or '').strip()
    for h in HON_PATTERNS:
        if s.lower().startswith(h.lower()+' '):
            return h, s[len(h):].strip()
    return '', s

def target_status_code(label):
    return {
        'Chief Guest':'chief_guest',
        'Nobel Peace Laureates':'nobel_laureate',
        'Guest of Honour':'guest_of_honour',
        'I Am Peacekeeper Champion':'champion',
        'VIP I Am Peacekeeper Partner':'vip_partner',
    }.get(label,'')

queue=[]
with open(SRC,encoding='utf-8-sig',newline='') as f:
    for r in csv.DictReader(f):
        if r['Action']!='READY_SAFE_UPDATE':
            continue
        h,n=split_name(r['FANS Name'])
        target={
            'honorific':h,
            'name':n,
            'status_label':r['Target Status'],
            'status_code':target_status_code(r['Target Status']),
            'seat_no':r['FANS Seat 18th 3am'].strip(),
            'award_category':'',
            'champion_category':r['Target Champion Category'].strip() if r['Target Status']=='I Am Peacekeeper Champion' else '',
        }
        # For live save only: if Farhat phone exists, use it only when system phone is blank.
        if r.get('FANS Cell'):
            digits=re.sub(r'\D+','',r['FANS Cell'])
            if len(digits)==10: target['phone']='+91'+digits
            elif digits: target['phone']='+'+digits
        queue.append({
            'id':r['System ID'],
            'fans_row':r['FANS Row'],
            'fans_name':r['FANS Name'],
            'target':target,
            'source':{k:r[k] for k in ['FANS Category Final','FANS Category','FANS Award Category','FANS Seat 18th 3am','FANS Cell','FANS Email','System Name','System Status']}
        })
OUT.write_text(json.dumps(queue,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'queue':len(queue),'out':str(OUT),'sample':queue[:5]},ensure_ascii=False,indent=2))

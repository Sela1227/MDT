#!/usr/bin/env python3
"""
MDT 上線前檢查 —— 唯一入口(V5.70.0 起)

用法:  python3 preflight.py              # 全部跑
       python3 preflight.py --quick      # 只跑靜態(不跑 jsdom / Worker,約 5 秒)
       python3 preflight.py --no-jshint  # 明確略過 jshint(沒裝時不加這個會 🔴)
       python3 preflight.py --no-layout  # 明確略過版面檢查(沒有 playwright/Chromium 時不加這個會 🔴)

取代:CLAUDE.md 裡散落的 Python 片段、每次手動拼的檢查、分開跑的 audit-render.js 與 test.mjs。
每一項後面標的是它守的「原則」(見 CLAUDE.md 第八章)與代表坑號(細節見 PITFALLS.md)。
全部 ✅ 才能打包。任何一項 🔴 → exit 1。
"""
import re, sys, os, json, subprocess, shutil, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
QUICK = '--quick' in sys.argv
H = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
results = []  # (原則, 名稱, ok, 說明)


def check(principle, name, ok, note=''):
    results.append((principle, name, bool(ok), note))


def line_of(pos):
    return H[:pos].count('\n') + 1


def script_blocks(src):
    return re.findall(r'<script[^>]*>([\s\S]*?)</script>', src)


def node_check(code):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(code)
        p = f.name
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    os.unlink(p)
    return r.returncode == 0, r.stderr.strip().split('\n')[0][:120] if r.returncode else ''


def is_lib_line(l):
    """壓縮函式庫行(內嵌 JSZip 等):以 !function( 開頭或超長。**不要用行號判斷,刪一行就漂**"""
    return l.lstrip().startswith('!function(') or len(l) > 5000


# ═══════════════ C. 字串 / 跳脫 / HTML 解析 —— node --check 看不到的 ═══════════════
C = 'C 字串跳脫'
check(C, '檔尾是 </html>', H.rstrip().endswith('</html>'), '坑#5')
blocks = script_blocks(H)
bad = []
for i, b in enumerate(blocks):
    ok, err = node_check(b)
    if not ok:
        bad.append(f'[{i}] {err}')
check(C, f'script 區塊語法({len(blocks)} 個)', not bad, '; '.join(bad) or '坑#7')

# 產出物(extraJs)語法 —— 模板字串會吃掉 \n
try:
    i = H.index('const extraJs=`')
    k = i + len('const extraJs=`'); in_tpl = True
    while k < len(H):
        c = H[k]
        if c == '\\': k += 2; continue
        if c == '`':
            in_tpl = not in_tpl; k += 1
            if not in_tpl and not H[k:k + 40].lstrip().startswith('+'): break
            continue
        k += 1
    deps = []
    for fn in ['_normTlDate', 'tlLayout', 'tlRender', '_tlInjectSrc']:
        m = re.search(r'function ' + fn + r'\(', H)
        if m:
            j = m.start(); d = 0; st = False; inb = False
            for q in range(j, len(H)):
                ch = H[q]
                if ch == '`': inb = not inb
                if ch == '{' and not inb: d += 1; st = True
                elif ch == '}' and not inb:
                    d -= 1
                    if st and d == 0: deps.append(H[j:q + 1]); break
    tt = H[H.index('const TL_TYPES=['):H.index('];', H.index('const TL_TYPES=[')) + 2]
    gen = tt + '\n' + '\n'.join(deps) + '\nconst _imgWinData={};const _tlWinData={};\n' + H[i:k + 1] + '\nprocess.stdout.write(extraJs);'
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(gen); gp = f.name
    r = subprocess.run(['node', gp], capture_output=True, text=True); os.unlink(gp)
    if r.returncode:
        check(C, '產出物 extraJs 語法', False, '產生失敗:' + r.stderr.strip()[:100])
    else:
        ok, err = node_check(r.stdout)
        check(C, '產出物 extraJs 語法', ok, err or '坑#48')
except Exception as e:
    check(C, '產出物 extraJs 語法', False, str(e)[:100])

m = re.search(r'\basync\s*(/\*|\n\s*/\*|;)', H)
check(C, '沒有孤立的 async', not m, f'L{line_of(m.start())}' if m else '坑#52 #88')
bad = [line_of(m.start()) for m in re.finditer(r'</script', H) if H[m.start():m.start() + 9] != '</script>']
check(C, 'script 內沒有 </script 字面值', not bad, f'L{bad[:5]}' if bad else '坑#79')
r = subprocess.run(['grep', '-n', '-P', r'[\x00-\x08\x0B\x0C\x0E-\x1F]', os.path.join(ROOT, 'index.html')], capture_output=True, text=True)
bad = [l.split(':')[0] for l in r.stdout.splitlines() if not is_lib_line(l.split(':', 1)[1] if ':' in l else l)]
check(C, '主程式無控制字元', not bad, f'L{bad[:5]}' if bad else '坑#84')
bad = []
for m in re.finditer(r'on(?:click|input|change|blur|keydown|focus)="([^"]{0,300}?)"', H):
    for a in re.finditer(r'[(,]\s*(\$\{[^}]+\})\s*[,)]', m.group(1)):
        if not re.match(r'^\$\{\s*(i|idx|si|pi|ci|ti|fi|j|n|rowIdx|\d+)\s*\}$', a.group(1)):
            bad.append(line_of(m.start()))
check(C, 'inline on* 無裸插值', not bad, f'L{bad[:5]}' if bad else '坑#65')
bad = [line_of(m.start()) for m in re.finditer(r'on(?:click|input|change|blur)="([^"]{0,200}?)"', H) if re.search(r'\$\{(ei|pi|ti|mi|rowIdx)\}', m.group(1))]
check(C, 'inline on* 不含列序號', not bad, f'L{bad[:5]}' if bad else '坑#78')
bad = [line_of(m.start()) for m in re.finditer(r'parseInt\([^)]*,\s*\w+\.dataset\.\w+\)', H)]
check(C, 'parseInt 第二參數不是 dataset', not bad, f'L{bad[:5]}' if bad else '坑#82')
cnt = H.count('<script id="hl-data"')
check(C, '產出物不會自我匹配 hl-data', cnt <= 1, f'{cnt} 處' if cnt > 1 else '坑#70')

# ═══════════════ B. 同步與狀態 ═══════════════
B = 'B 同步狀態'
bad = [line_of(m.start()) for m in re.finditer(r'\._pushedRev\s*=', H)]
check(B, '推送紀錄不寫進會議物件', not bad, f'L{bad}' if bad else '坑#89')
m = re.search(r'async function _loadMtg\(id\)\{\s*([^\n]*)', H)
check(B, '_loadMtg 開頭清 base', m and '_baseRev=undefined' in m.group(1) and '_baseVer=undefined' in m.group(1), 'P-1')
check(B, 'savedBy 存姓名(另有 savedById)', 'savedById=' in H and not re.search(r'savedBy=\(S\.user&&S\.user\.id\)', H), 'N-1')
m = re.search(r'const _NEVER_BACKUP=/\^mdt_\(([^)]*)\)', H)
need = ['ai_key', 'cf_token', 'upload_key', 'zoom_pwd', 'pushed_', 'conflict_toast']
miss = [n for n in need if not (m and n in m.group(1))]
check(B, '_NEVER_BACKUP 涵蓋金鑰與單機狀態', not miss, f'缺 {miss}' if miss else 'A-5 M-1 M-9')

# ═══════════════ E. 對照表與設定一致 ═══════════════
E = 'E 設定一致'
ver = re.search(r"const VERSION='(V[\d.]+)'", H).group(1)
iss = []
chg = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
if re.search(r'^## (V[\d.]+)', chg, re.M).group(1) != ver: iss.append('CHANGELOG')
cl = open(os.path.join(ROOT, 'CLAUDE.md'), encoding='utf-8').read()
m = re.search(r'\| (V[\d.]+) \|', cl)
if not m or m.group(1) != ver: iss.append('CLAUDE')
ug = open(os.path.join(ROOT, 'USER_GUIDE.md'), encoding='utf-8').read()
if ver not in set(re.findall(r'V\d+\.\d+\.\d+', ug[:400] + ug[-400:])): iss.append('USER_GUIDE')
check(E, f'版號一致({ver})', not iss, f'不一致:{iss}' if iss else 'index/CHANGELOG/CLAUDE/USER_GUIDE')
_dc = H.index('const DEFAULT_C=')  # 不能只找 'DEFAULT_C':內嵌 JSZip 有 DEFAULT_COMPRESSION
_de = H.index('\n};', _dc)  # 只看 DEFAULT_C 物件本身,不要吃到下面的 HTML_THEMES
cfg_ids = re.findall(r"^\s*(\w+):\{id:'", H[_dc:_de], re.M)  # 格式是 head_neck:{id:'head_neck',name:…
m = re.search(r'const CANCER_SHORT=\{([^}]*)\}', H)
short = re.findall(r'(\w+):', m.group(1)) if m else []
miss = [c for c in cfg_ids if c not in short]
check(E, 'CANCER_SHORT 覆蓋全部癌別', cfg_ids and not miss, f'缺 {miss}' if miss else '坑#36')
bad = [line_of(m.start()) for m in re.finditer(r"gender\|\|'M'", H)]
check(E, '性別不靜默預設 M', not bad, f'L{bad}' if bad else 'D-1 N-4')
m = re.search(r'function getOutputCid\(\)', H)
check(E, '合併會議產出不變量仍在', m and '設計不變量' in H[max(0, m.start() - 600):m.start()], '2026-09-24 定案')

# ═══════════════ F. 文件與個資(V5.71.0)═══════════════
Fd = 'F 文件個資'
# 程式裡每個 mdt_ key 都要寫在 CLAUDE.md 第五節(審核 4-3:程式有、文件沒有就 🔴)
sec5 = cl[cl.index('## 五、'):cl.index('## 六、')]
keys = set(re.findall(r"['\"`](mdt_[a-z_]+?)(?:_?['\"`+]|\{)", H))
keys = {k.rstrip('_') for k in keys if k not in ('mdt_',)}
keys -= {'mdt_sec_head_neck'}  # 遷移程式裡的具體範例,由 mdt_sec_* 涵蓋
miss = sorted(k for k in keys if k not in sec5)
check(Fd, 'mdt_ key 都在 CLAUDE.md 第五節', not miss, f'文件缺 {miss}' if miss else f'{len(keys)} 個 key')
# USER_GUIDE 對象是個管師,不寫程式用詞(審核 4-5)
BAN = ['localStorage', 'DEFAULT_', '函數', '_dirty', 'savedBy', 'getOutputCid', 'GitHub Personal Access Token']
hit = [w for w in BAN if w in ug]
check(Fd, 'USER_GUIDE 無程式用詞', not hit, f'出現 {hit}' if hit else '')
# 範例病歷號必須明顯虛構(0000/9000 開頭)。**不列黑名單** —— 列了等於把真實號碼再寫進 repo
# V5.71.1 S-1:JS 物件與 JSON 兩種寫法;號碼與遮蔽姓名間 0~3 個分隔;○+ 涵蓋四字姓名;7~8 碼;掃描含會打包的測試檔
PII_PAT = re.compile(
    r"""["']?chartNo["']?\s*:\s*["']\s*(\d{6,8})\s*["']"""  # V5.82.0:6 碼也要擋(個案匯入範例裡曾有 6 碼號碼漏網)
    r"""|(?<![\d.#vV:-])(\d{7,8})[\s_/「」]{0,3}[\u4e00-\u9fff]○+[\u4e00-\u9fff]""")
PII_FILES = ['index.html', 'README.md', 'CLAUDE.md', 'PITFALLS.md', 'USER_GUIDE.md', 'CHANGELOG.md',
             'audit-render.js', 'content-equiv.js', 'content-baseline.json', 'layout-check.js', 'preview-check.js', 'test-meeting.js', 'cloudflare-share/test.mjs', 'SELA-handoff.md']
def pii_scan(text):
    return [(m.group(1) or m.group(2)) for m in PII_PAT.finditer(text) if not (m.group(1) or m.group(2)).startswith(('0000', '9000'))]
bad = []
for fn in PII_FILES:
    fp = os.path.join(ROOT, fn)
    if os.path.exists(fp):
        bad += [f'{fn}:{n[:2]}xxxxx' for n in pii_scan(open(fp, encoding='utf-8').read())]
# 自我測試:四種寫法都必須被抓到(審核 S-1 驗收),否則檢查本身壞了
_probe = ['"chartNo":"8888888"', "chartNo: '8888888'", '8888888  王○明', '8888888/王○○華']  # 用明顯假號;絕不可用真實號碼當測試字串
_miss = [x for x in _probe if not pii_scan(x)]
check(Fd, '範例病歷號皆為虛構(0000/9000 開頭)', not bad and not _miss,
      (f'{bad[:4]}' if bad else '') + (f' 檢查本身漏抓 {_miss}' if _miss else '') or f'{len(PII_FILES)} 檔 + 四種寫法自我測試')

# jshint(坑#57 + Q-4)
# laxbreak:本專案刻意的行首 + 寫法(890 則);-W008:CSS 的 .7em(154 則)—— 關掉這兩大類,輸出只剩要看的
# 擋四類:未定義名稱(W117)、Confusing plusses(W007)、重複宣告(W004)、區塊內函式宣告(W082)
# 白名單:以「原始碼內容」比對(行號會漂),每則寫理由;數量寫死 —— 新增任何一則就 🔴
JSHINT_ALLOW = [
    ('W004', 'var _cid=postfupToggle.dataset.cid', '事件委派同一函式內各 if 分支的 var,互不影響;改名要動 index.html,延後'),
    ('W004', 'if(updspecial){var _cid=updspecial.dataset.cid', '同上(_cid)'),
    ('W004', 'if(updspecial){var _cid=updspecial.dataset.cid', '同上(_key)'),
    ('W004', 'var _cid=previewspecialimg.dataset.cid', '同上(_cid)'),
    ('W004', 'var _cid=previewspecialimg.dataset.cid', '同上(_si)'),
    ('W082', 'function updateCount(){var n=overlay.querySelectorAll(\'#pathfolder-list', '影像選取器內的區域函式,只在該區塊呼叫;延後'),
    ('W082', 'function updCnt(){var n=overlay.querySelectorAll(\'#surg-list', '同上'),
    ('W082', 'function updateCnt(){var n=overlay.querySelectorAll(\'#imgfolder-list', '同上'),
]
if shutil.which('jshint'):
    cfg = {"esversion": 11, "undef": True, "unused": False, "browser": True, "devel": True, "asi": True,
           "laxbreak": True, "-W008": True,
           "globals": {"indexedDB": True, "PptxGenJS": True, "docx": True, "XLSX": True, "JSZip": True, "ClipboardItem": True}}
    main = max(blocks, key=len)
    ML = main.split('\n'); off = H[:H.index(main)].count('\n')
    with tempfile.TemporaryDirectory() as td:
        open(os.path.join(td, 'rc'), 'w').write(json.dumps(cfg))
        open(os.path.join(td, 'm.js'), 'w', encoding='utf-8').write(main)
        r = subprocess.run(['jshint', '--verbose', '--config', os.path.join(td, 'rc'), os.path.join(td, 'm.js')], capture_output=True, text=True)
    und = sorted(set(re.findall(r"'(\w+)' is not defined", r.stdout)))
    check('D 靜態≠執行', 'jshint 無未定義名稱', not und, f'{und[:6]}' if und else '坑#57')
    hits = [(m.group(2), int(m.group(1))) for m in re.finditer(r'line (\d+), col \d+, .*? \((W007|W004|W082)\)', r.stdout)]
    hits = [(c, ln) for c, ln in [(h[0], h[1]) for h in hits]]
    pool = list(JSHINT_ALLOW); new_hits = []
    for code, ln in hits:
        src = ML[ln - 1] if 0 < ln <= len(ML) else ''
        k = next((i for i, a in enumerate(pool) if a[0] == code and a[1] in src), None)
        if k is None: new_hits.append(f'{code} L{ln + off}')
        else: pool.pop(k)
    stale = [a[0] + ' ' + a[1][:30] for a in pool]
    note = (f'新增 {new_hits[:4]}' if new_hits else '') + (f' 白名單過期(已修好請移除) {stale[:3]}' if stale else '')
    check('D 靜態≠執行', f'jshint 易錯寫法(白名單 {len(JSHINT_ALLOW)} 則)', not new_hits and not stale, note or 'Q-4:+ + / 重複宣告 / 區塊內函式')
elif '--no-jshint' in sys.argv:
    check('D 靜態≠執行', 'jshint', True, '⚠ 已用 --no-jshint 明確略過')
else:
    # V5.70.1 Q-2:工具缺席 = 失敗。上一版在這裡回 True,重演了「jshint 從沒跑過」
    check('D 靜態≠執行', 'jshint', False, '未安裝 → npm i -g jshint;或加 --no-jshint 明確略過')

# AudioSplitter
try:
    a = open(os.path.join(ROOT, 'AudioSplitter.html'), encoding='utf-8').read()
    # 檔頭註解裡寫了「<script」字樣,regex 會切錯;只檢查看起來是 JS 的區塊
    js = [b for b in script_blocks(a) if len(b) > 1000 and '<html' not in b and '<!--' not in b[:2000]]
    bad = [err for b in js for ok, err in [node_check(b)] if not ok] + ([] if js else ['找不到 JS 區塊'])
    check(C, 'AudioSplitter 語法', not bad, '; '.join(bad))
except FileNotFoundError:
    check(C, 'AudioSplitter 語法', False, '檔案不存在')

# ═══════════════ D. 執行期(jsdom / Worker)═══════════════
if not QUICK:
    D = 'D 靜態≠執行'
    r = subprocess.run(['node', os.path.join(ROOT, 'audit-render.js')], capture_output=True, text=True, cwd=ROOT, timeout=300)
    out = r.stdout
    m = re.search(r'=== 總計錯誤 ===\s*\n\s*(\d+)', out)
    tot = int(m.group(1)) if m else -1
    reds = [l.strip() for l in out.splitlines() if '🔴' in l][:4]
    nojsdom = "Cannot find module 'jsdom'" in r.stderr
    check(D, 'audit-render.js(渲染/往返/雙機 NAS)', tot == 0, '缺 jsdom → npm i jsdom' if nojsdom else (f'{tot} 錯誤 ' + ' | '.join(reds) if tot else '單機 + 雙機 + 斷線 + 跨會議 + 本機失敗'))
    # V5.75.0 內容等價:投影片上的字跟基準一樣(決策紀錄「保護網」;改內容須主任同意後 node content-equiv.js --update)
    r = subprocess.run(['node', os.path.join(ROOT, 'content-equiv.js')], capture_output=True, text=True, cwd=ROOT, timeout=120)
    m = re.search(r'結果 (-?\d+)', r.stdout)
    ce = int(m.group(1)) if m else -1
    reds = [l.strip() for l in r.stdout.splitlines() if '🔴' in l or '⚠' in l][:3]
    check(D, '投影片內容等價(content-baseline.json)', ce == 0, ' | '.join(reds) if ce else 'HTML 產出文字與基準一致')
    # V5.75.2 版面:真的 Chromium 排版,內容超出畫面又不能捲就 🔴(審核 P-1;content-equiv 只比文字看不到)
    if '--no-layout' in sys.argv:
        check(D, '投影片版面(layout-check.js)', True, '⚠ 已用 --no-layout 明確略過')
        check(D, '預覽與畫重點(preview-check.js)', True, '⚠ 已用 --no-layout 明確略過')
    else:
        r = subprocess.run(['node', os.path.join(ROOT, 'layout-check.js')], capture_output=True, text=True, cwd=ROOT, timeout=180)
        m = re.search(r'結果 (-?\d+)', r.stdout)
        lc = int(m.group(1)) if m else -1
        reds = [l.strip() for l in r.stdout.splitlines() if '🔴' in l or '⚠' in l][:3]
        note = ('沒有 playwright → npm i -g playwright;或加 --no-layout 明確略過' if lc == -2
                else (' | '.join(reds) if lc else '投影 1920×1080 與筆電 1366×768,每頁看得到或捲得到'))
        check(D, '投影片版面(layout-check.js)', lc == 0, note)
        # V5.76.0 預覽與畫重點:系統分頁 + 預覽分頁 + postMessage,只有真的瀏覽器測得到
        r = subprocess.run(['node', os.path.join(ROOT, 'preview-check.js')], capture_output=True, text=True, cwd=ROOT, timeout=240)
        m = re.search(r'結果 (-?\d+)', r.stdout)
        pc = int(m.group(1)) if m else -1
        reds = [l.strip() for l in r.stdout.splitlines() if '🔴' in l or '⚠' in l][:3]
        note = ('沒有 playwright → npm i -g playwright;或加 --no-layout 明確略過' if pc == -2
                else (' | '.join(reds) if pc else '16 情境:存標記確認、再預覽、拒存、改資料保留畫線、改到畫線文字、同頁重複字不亂跳、同文字別病人、舊格式、多份預覽、慢存檔、代班合併、負責人改個案保留代班標記、複製會議、註記與小抄、兩個網址搬家'))
        check(D, '預覽與畫重點(preview-check.js)', pc == 0, note)
    tm = os.path.join(ROOT, 'cloudflare-share', 'test.mjs')
    if os.path.exists(tm):
        r = subprocess.run(['node', tm], capture_output=True, text=True, cwd=os.path.join(ROOT, 'cloudflare-share'), timeout=60)
        m = re.search(r'(\d+)/(\d+)\s*$', r.stdout.strip())
        check('W Worker', f'Worker test.mjs', r.returncode == 0, m.group(0) if m else r.stdout[-100:])

# ═══════════════ 打包清單 ═══════════════
need = ['index.html', 'AudioSplitter.html', 'README.md', 'CLAUDE.md', 'CHANGELOG.md', 'USER_GUIDE.md', 'SELA-handoff.md',
        'PITFALLS.md', 'preflight.py', 'audit-render.js', 'content-equiv.js', 'content-baseline.json', 'layout-check.js', 'preview-check.js', 'test-meeting.js', '.gitignore',
        'cloudflare-share/index.js', 'cloudflare-share/DEPLOY.md', 'cloudflare-share/test.mjs']
miss = [f for f in need if not os.path.exists(os.path.join(ROOT, f))]
check('打包', '必帶檔案齊全', not miss, f'缺 {miss}' if miss else f'{len(need)} 檔 + favicon/')

# ═══════════════ 輸出 ═══════════════
print(f'\nMDT preflight  {ver}' + ('  (--quick)' if QUICK else ''))
print('─' * 72)
last = None
for p, n, ok, note in results:
    if p != last:
        print(f'\n[{p}]'); last = p
    print(f"  {'✅' if ok else '🔴'} {n:<34} {note}")
fails = sum(1 for r in results if not r[2])
print('\n' + '─' * 72)
print(f'  {len(results) - fails}/{len(results)} 通過' + ('  → 可以打包' if not fails else f'  → {fails} 項未過,不可打包'))
if not fails:
    print(f'\n  zip -q "MDT {ver}.zip" ' + ' '.join(need) + ' favicon/ favicon/*')
sys.exit(1 if fails else 0)

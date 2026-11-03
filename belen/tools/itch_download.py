# Descarga gratuita de un pack de itch.io ("paga lo que quieras", precio mínimo 0).
# Uso: python3 -I itch.py <url_del_pack> <dir_salida> [texto_que_debe_contener_el_nombre]
import re, sys, json, subprocess, os
game, out = sys.argv[1].rstrip('/'), sys.argv[2]; filt = sys.argv[3] if len(sys.argv) > 3 else ''
os.makedirs(out, exist_ok=True)
jar = os.path.join(out, '.jar')
def curl(*args, timeout='120'):
    return subprocess.run(['curl', '-s', '-m', timeout, '-L', '-c', jar, '-b', jar, *args], capture_output=True).stdout
page = curl(game + '/purchase').decode('utf8', 'ignore')
csrf = re.search(r'name="csrf_token" value="([^"]+)"', page).group(1)
dl = json.loads(curl('-X', 'POST', '--data-urlencode', 'csrf_token=' + csrf, game + '/download_url'))['url']
page2 = curl(dl).decode('utf8', 'ignore')
ups = re.findall(r'data-upload_id="(\d+)".{0,2000}?title="([^"]+)"', page2, re.S)
print('uploads:', [(u, n) for u, n in ups])
for uid, name in ups:
    if filt and filt not in name: continue
    fn = os.path.join(out, re.sub(r'[^A-Za-z0-9._\[\]-]', '_', name))
    if os.path.exists(fn) and os.path.getsize(fn) > 1000: print('exists', fn); continue
    r = json.loads(curl('-X', 'POST', '-H', 'X-Requested-With: XMLHttpRequest', '--data-urlencode', 'csrf_token=' + csrf, f'{game}/file/{uid}?source=view_game&as_props=1&after_download_lightbox=true'))
    print('downloading', name)
    subprocess.run(['curl', '-s', '-m', '1200', '-L', '-o', fn, r['url']])
    print(fn, os.path.getsize(fn))

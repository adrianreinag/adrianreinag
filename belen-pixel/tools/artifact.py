# Genera la versión "artifact" (sin doctype/html/head/body) de index.html.
import re, sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text()
out = pathlib.Path(sys.argv[2])
s = re.sub(r'<!doctype html>\s*', '', src, flags=re.I)
for tag in ['html[^>]*', '/html', 'head', '/head', 'body', '/body']:
    s = re.sub(r'<' + tag + r'>\s*', '', s)
s = re.sub(r'<meta charset="utf-8">\s*', '', s)
s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s)
s = s.replace('<title>', '<meta name="claude:viewport-fit-sides" content="cover">\n<title>', 1)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(s)

# Rebuilds index.html (one self-contained file) from src/.
# Every <script src="..."> in src/index.html is inlined from src/ (Astronomy Engine from node_modules).
# Commented-out <script> lines are skipped. Needs: Python 3, and `npm install astronomy-engine@2` in this folder.
import pathlib, re
root = pathlib.Path(__file__).parent
src = (root / 'src/index.html').read_text()
src = re.sub(r'<!--\s*<script[^>]*></script>\s*-->\n?', '', src)

def inline(m):
    name = m.group(1)
    path = root / 'node_modules/astronomy-engine/astronomy.browser.min.js' if name == 'astronomy.browser.min.js' else root / 'src' / name
    code = path.read_text()
    code = code.replace('</script', '<\\/script')  # keep inline code from closing the tag early
    return '<script>\n/* ' + name + ' */\n' + code + '\n</script>'

out = re.sub(r'<script src="([^"]+)"></script>', inline, src)
(root / 'index.html').write_text(out)
print('Wrote index.html,', len(out), 'bytes')

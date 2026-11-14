# Rebuilds index.html (one self-contained file) from src/.
# Every <script src="..."> in src/index.html is inlined from src/ (Astronomy Engine from node_modules).
# Commented-out <script> lines are skipped. Needs: Python 3, and `npm install astronomy-engine@2` in this folder.
import base64, pathlib, re
root = pathlib.Path(__file__).parent
src = (root / 'src/index.html').read_text()
src = re.sub(r'<!--\s*<script[^>]*></script>\s*-->\n?', '', src)

def inline(m):
    name = m.group(1)
    path = root / 'node_modules/astronomy-engine/astronomy.browser.min.js' if name == 'astronomy.browser.min.js' else root / 'src' / name
    if not path.exists():
        print(f'  note: {name} not found, skipped')
        return ''
    code = path.read_text()
    code = code.replace('</script', '<\\/script')  # keep inline code from closing the tag early
    return '<script>\n/* ' + name + ' */\n' + code + '\n</script>'

out = re.sub(r'<script src="([^"]+)"></script>', inline, src)
terrain = '<script id="moonwindow-dem" type="application/octet-stream"></script>'
if terrain in out:
    dem = (root / 'src/terrain/ldem_4.img').read_bytes()
    if len(dem) != 1440 * 720 * 2:
        raise ValueError('Invalid size for the LOLA LDEM_4 raster')
    out = out.replace(terrain, terrain.replace('</script>', base64.b64encode(dem).decode('ascii') + '</script>'))
for asset_id, filename in (('moonwindow-albedo', 'lroc-4k.jpg'), ('moonwindow-stars', 'stars-4k.jpg')):
    tag = f'<script id="{asset_id}" type="application/octet-stream">'
    if tag + '</script>' in out:
        encoded = base64.b64encode((root / 'src/terrain' / filename).read_bytes()).decode('ascii')
        out = out.replace(tag + '</script>', tag + encoded + '</script>')
(root / 'index.html').write_text(out)
print('Wrote index.html,', len(out), 'bytes')

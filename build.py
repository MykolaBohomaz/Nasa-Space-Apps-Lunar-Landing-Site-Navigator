# Rebuilds index.html (single self-contained file) from src/.
# Needs: Python 3, and `npm install astronomy-engine@2` run in this folder.
import pathlib
root = pathlib.Path(__file__).parent
src = (root / 'src/index.html').read_text()
lib = (root / 'node_modules/astronomy-engine/astronomy.browser.min.js').read_text()
eng = (root / 'src/engine.js').read_text()
app = (root / 'src/app.js').read_text()
for name, code in [('astronomy', lib), ('engine', eng), ('app', app)]:
    assert '</script' not in code.lower(), name
out = (src.replace('<script src="astronomy.browser.min.js"></script>', '<script>\n' + lib + '\n</script>')
          .replace('<script src="engine.js"></script>', '<script>\n' + eng + '\n</script>')
          .replace('<script src="app.js"></script>', '<script>\n' + app + '\n</script>'))
(root / 'index.html').write_text(out)
print('Wrote index.html,', len(out), 'bytes')

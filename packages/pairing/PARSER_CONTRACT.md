# PDF extraction contract for the wine-list fixtures

`packages/pairing/data/wine_list_fixtures/barolo.txt` and `tavernetta.txt`
are not hand-typed text. They come from PDFs (`barolo wine.pdf` and the
Tavernetta wine list PDF) that `wine_menu_lib.py` has no extraction step of
its own for. To feed the JS parser (and the Python reference it is ported
from) byte-for-byte identical text, both files were extracted with this
EXACT parameter set, which is the contract - do not re-extract with
different params, and do not change the fixture text to make a test pass:

- Library: PyMuPDF (`fitz`)
- Call: `page.get_text()` - **default args**. NOT `page.get_text("text")`,
  NOT `page.get_text("blocks")`, and NOT `sort=True`.
- Per page, then all pages joined with a single `"\n"`.

```python
import fitz

doc = fitz.open(path)
pages = [page.get_text() for page in doc]
text = "\n".join(pages)
```

With these params, `parseWineList()` on the committed fixtures returns
exactly **1832** rows for barolo and **807** for tavernetta, matching the
hand-verified acceptance numbers in `parseWineList.test.js` with no
tolerance window.

`loadWineListFixtures.js` only ever reads these committed `.txt` files -
no PDF library call happens at test time, so the fixture set does not
depend on a PyMuPDF version being installed. If the parser's row count on
these fixtures ever changes, that is a `parseWineList.js` regression to
fix, not a reason to re-extract or edit the fixture text.

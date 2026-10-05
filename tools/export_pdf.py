#!/usr/bin/env python3
"""Export the deck to PDF.

The deck is rendered, served locally and clicked through in Chrome as when
presenting: bullets build up, and every pop-up (image or embedded page) gets a
page of its own at the point where it opens. Chrome prints each state as a
vector page (text stays sharp at any size); the pages are bound into one 16:9
PDF. `--raster` uses screenshots instead, as a fallback.

A pop-up button can ask for further pages showing the embedded page after a
click, e.g. `data-pdf-click="Stopped clock"` (several targets separated by `|`;
each is a CSS selector or the start of an element's text).

Usage, from the deck folder:

    python3 tools/export_pdf.py                 # one page per click
    python3 tools/export_pdf.py --mode slides   # one page per slide; pop-ups where they open
    python3 tools/export_pdf.py --no-render     # skip `quarto render`
    python3 tools/export_pdf.py --contact-sheet # also write a thumbnail overview
    python3 tools/export_pdf.py --pages         # also keep every page as a PNG

Output goes to export/ (not tracked by git). Needs Python 3 with Playwright
(`pip install playwright`) and pypdf, plus Google Chrome or Playwright's own
Chromium; the overview and PNG pages need PyMuPDF. Google Fonts are fetched
live, so run it online.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import io
import pathlib
import subprocess
import sys
import tempfile
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1920, 1080
NO_MARGIN = {"top": "0", "right": "0", "bottom": "0", "left": "0"}
CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
]

# 'closed', 'loading' or 'ready' for the pop-up layer (image or embedded page).
MODAL_STATE = """() => {
  const m = document.querySelector('.multimodal.show');
  if (!m) return 'closed';
  if (!m.classList.contains('shown')) return 'loading';
  const img = m.querySelector('img.mm-body');
  if (img) return img.complete && img.naturalWidth > 0 ? 'ready' : 'loading';
  const frame = m.querySelector('iframe');
  if (frame) {
    try {
      const doc = frame.contentDocument;
      const styled = frame.dataset.gpEmbed === 'ready';
      return doc && doc.readyState === 'complete' && doc.fonts.status === 'loaded' && styled ? 'ready' : 'loading';
    } catch (err) { return 'ready'; }
  }
  return 'ready';
}"""

# Clicks one target inside the open iframe pop-up: a CSS selector, or else the
# first clickable element whose text starts with the given words.
CLICK_IN_POPUP = """(target) => {
  const frame = document.querySelector('.multimodal.show iframe');
  const doc = frame && frame.contentDocument;
  if (!doc) return false;
  let node = null;
  try { node = doc.querySelector(target); } catch (err) { node = null; }
  if (!node) {
    const words = target.trim().toLowerCase();
    node = Array.from(doc.querySelectorAll('th, td, a, button, label, [tabindex]'))
      .find(n => n.textContent.trim().toLowerCase().startsWith(words));
  }
  if (!node) return false;
  node.click();
  return true;
}"""

# The pop-up button that opened the current pop-up, and its `data-pdf-click`.
POPUP_CLICKS = "() => (Reveal.getCurrentSlide().querySelector('.opens-modal.current-fragment') || {dataset: {}}).dataset.pdfClick || ''"

# Points (non-button fragments) shown on the current slide.
POINTS_SHOWN = "() => Reveal.getCurrentSlide().querySelectorAll('.fragment.visible:not(.opens-modal)').length"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(root: pathlib.Path) -> http.server.ThreadingHTTPServer:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def launch(playwright):
    for path in CHROME_PATHS:
        if pathlib.Path(path).exists():
            return playwright.chromium.launch(executable_path=path)
    return playwright.chromium.launch()


def wait_for(page, js: str, timeout: float = 20.0, poll: float = 0.1) -> bool:
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(js):
            return True
        time.sleep(poll)
    return False


def open_deck(page, url: str) -> None:
    page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    page.wait_for_function("window.Reveal && Reveal.isReady && Reveal.isReady()", timeout=120_000)
    if not wait_for(page, "() => document.fonts.check('550 40px Jost') && document.fonts.check('400 40px Newsreader')", 60):
        print("warning: web fonts did not load; the PDF will use fallback fonts", file=sys.stderr)
    # Fill the page edge to edge, print what the screen shows, and drop fade-ins so
    # no capture lands mid-transition.
    page.evaluate("() => { Reveal.configure({ margin: 0 }); Reveal.layout(); }")
    page.emulate_media(media="screen")
    page.add_style_tag(content=".reveal .slides section .fragment { transition: none !important; }")
    page.evaluate("() => Reveal.slide(0, 0, -1)")
    time.sleep(1.0)


def indices(page) -> tuple:
    i = page.evaluate("() => Reveal.getIndices()")
    return (i["h"], i.get("v") or 0, i.get("f"))


def capture(page, raster: bool) -> list[tuple[str, int, int, bytes]]:
    """Click through the deck; return (kind, slide index, points shown, page) for every
    state, where a page is a one-page PDF (or a PNG with `raster`)."""
    states = []

    def snap(kind: str) -> None:
        if raster:
            data = page.screenshot(type="png")
        else:
            data = page.pdf(width=f"{WIDTH}px", height=f"{HEIGHT}px", print_background=True, margin=NO_MARGIN)
        states.append((kind, indices(page)[0], page.evaluate(POINTS_SHOWN), data))

    snap("slide")
    while True:
        if page.evaluate(MODAL_STATE) != "closed":
            page.evaluate("() => document.querySelector('.multimodal .mm-close')?.click()")
            wait_for(page, f"() => ({MODAL_STATE})() === 'closed'", 10)
            time.sleep(0.3)
            continue
        before = indices(page)
        page.evaluate("() => Reveal.next()")
        time.sleep(0.5)
        if page.evaluate(MODAL_STATE) != "closed":
            if not wait_for(page, f"() => ({MODAL_STATE})() === 'ready'", 30):
                print(f"warning: pop-up on slide {before[0] + 1} did not finish loading", file=sys.stderr)
            time.sleep(0.8)  # let embedded pages draw their charts
            snap("popup")
            for target in filter(None, (t.strip() for t in page.evaluate(POPUP_CLICKS).split("|"))):
                if page.evaluate(CLICK_IN_POPUP, target):
                    time.sleep(0.8)
                    snap("popup")
                else:
                    print(f"warning: nothing to click for '{target}' on slide {before[0] + 1}", file=sys.stderr)
            continue
        if indices(page) == before:
            break  # end of the deck
        snap("slide")
    return states


def order(states, mode: str) -> list[bytes]:
    if mode == "steps":
        return [data for *_, data in states]
    # slides: each slide as it stands when one of its pop-ups opens, followed by the
    # pop-up; then its final state, unless nothing new appeared after the last pop-up.
    pages, current, emitted, last = [], None, None, None

    def finish() -> None:
        if last is not None and (emitted is None or last[0] > emitted):
            pages.append(last[1])

    for kind, slide, shown, data in states:
        if slide != current:
            finish()
            current, emitted, last = slide, None, None
        if kind == "popup":
            if last is not None and last[0] != emitted:
                pages.append(last[1])
                emitted = last[0]
            pages.append(data)
        else:
            last = (shown, data)
    finish()
    return pages


def bind_vector(pages: list[bytes], out: pathlib.Path) -> None:
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter()
    for n, data in enumerate(pages, 1):
        reader = PdfReader(io.BytesIO(data))
        if len(reader.pages) != 1:
            print(f"warning: page {n} printed as {len(reader.pages)} pages; keeping the first", file=sys.stderr)
        writer.add_page(reader.pages[0])
    with open(out, "wb") as handle:
        writer.write(handle)


def bind_raster(browser, pages: list[bytes], out: pathlib.Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        names = []
        for n, png in enumerate(pages):
            name = f"page_{n:03d}.png"
            (tmp / name).write_bytes(png)
            names.append(name)
        style = (f"@page {{ size: {WIDTH}px {HEIGHT}px; margin: 0; }} html, body {{ margin: 0; padding: 0; }}"
                 f" img {{ display: block; width: {WIDTH}px; height: {HEIGHT}px; break-after: page; }}"
                 " img:last-child { break-after: auto; }")
        (tmp / "pages.html").write_text(
            f"<!doctype html><html><head><style>{style}</style></head><body>"
            + "".join(f'<img src="{name}">' for name in names) + "</body></html>")
        page = browser.new_page()
        page.goto((tmp / "pages.html").as_uri(), wait_until="load")
        page.pdf(path=str(out), width=f"{WIDTH}px", height=f"{HEIGHT}px", print_background=True, margin=NO_MARGIN)
        page.close()


def page_images(pdf: pathlib.Path, width: int):
    """Yield every page of the PDF as a PIL image `width` pixels wide (needs PyMuPDF)."""
    import fitz
    from PIL import Image

    with fitz.open(pdf) as doc:
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(width / page.rect.width, width / page.rect.width))
            yield Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def contact_sheet(pdf: pathlib.Path, out: pathlib.Path, columns: int = 6, thumb: int = 320) -> None:
    from PIL import Image, ImageDraw

    thumbs = list(page_images(pdf, thumb))
    th = thumb * HEIGHT // WIDTH
    rows = -(-len(thumbs) // columns)
    sheet = Image.new("RGB", (columns * (thumb + 12) + 12, rows * (th + 34) + 12), "white")
    draw = ImageDraw.Draw(sheet)
    for n, img in enumerate(thumbs):
        x, y = 12 + (n % columns) * (thumb + 12), 12 + (n // columns) * (th + 34)
        sheet.paste(img.resize((thumb, th)), (x, y))
        draw.rectangle([x - 1, y - 1, x + thumb, y + th], outline=(190, 190, 190))
        draw.text((x, y + th + 6), str(n + 1), fill=(60, 60, 60))
    sheet.save(out)


def page_pngs(pdf: pathlib.Path, folder: pathlib.Path, width: int = 2 * WIDTH) -> None:
    folder.mkdir(exist_ok=True)
    for old in folder.glob("page_*.png"):
        old.unlink()
    for n, img in enumerate(page_images(pdf, width), 1):
        img.save(folder / f"page_{n:03d}.png")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mode", choices=["steps", "slides"], default="steps",
                        help="steps: a page per click (default); slides: a page per slide, pop-ups where they open")
    parser.add_argument("--out", type=pathlib.Path, help="output PDF (default: export/ai4sci2026_<mode>.pdf)")
    parser.add_argument("--raster", action="store_true", help="bind screenshots instead of vector pages")
    parser.add_argument("--scale", type=int, default=2, help="screenshot resolution with --raster, as a multiple of 1920x1080")
    parser.add_argument("--no-render", action="store_true", help="skip `quarto render index.qmd`")
    parser.add_argument("--contact-sheet", action="store_true", help="also write a PNG overview of all pages")
    parser.add_argument("--pages", action="store_true", help="also keep every page as a PNG next to the PDF")
    args = parser.parse_args()

    out = args.out or ROOT / "export" / f"ai4sci2026_{args.mode}.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)

    if not args.no_render:
        print("rendering index.qmd …")
        subprocess.run(["quarto", "render", "index.qmd"], cwd=ROOT, check=True, capture_output=True)

    server = serve(ROOT)
    url = f"http://127.0.0.1:{server.server_address[1]}/index.html"
    try:
        with sync_playwright() as p:
            browser = launch(p)
            page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=args.scale)
            print("clicking through the deck …")
            open_deck(page, url)
            states = capture(page, args.raster)
            pages = order(states, args.mode)
            print(f"binding {len(pages)} pages ({sum(state[0] == 'popup' for state in states)} pop-up pages) …")
            if args.raster:
                bind_raster(browser, pages, out)
            else:
                bind_vector(pages, out)
            browser.close()
    finally:
        server.shutdown()

    if args.contact_sheet or args.pages:
        try:
            if args.contact_sheet:
                contact_sheet(out, out.with_name(out.stem + "_overview.png"))
            if args.pages:
                page_pngs(out, out.with_name(out.stem + "_pages"))
        except ImportError as err:
            print(f"warning: {err.name} not installed; skipping the overview and PNG pages", file=sys.stderr)
    print(f"wrote {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()

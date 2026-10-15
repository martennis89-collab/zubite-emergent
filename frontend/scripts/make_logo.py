"""Build the Zubite.bg wordmark as outlined SVG paths.

Mirrors the site header logo (frontend/components/Header.tsx):
Manrope Bold, letter-spacing -0.04em, "Zubite" #0A0A0A + ".bg" #007956.
Usage (from frontend/, needs `pip install fonttools`):
    python scripts/make_logo.py public/fonts/taste/Manrope-Bold.ttf public/brand
"""
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT_SIZE = 100          # px per em in the output coordinate space
TRACKING_EM = -0.04      # matches tracking-[-0.04em]

font = TTFont(sys.argv[1])
out_dir = Path(sys.argv[2])
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm
scale = FONT_SIZE / upm
tracking = TRACKING_EM * upm


def _kern_table(font):
    """Pair adjustments (font units) from the GPOS 'kern' feature, as browsers apply them."""
    gpos = font["GPOS"].table if "GPOS" in font else None
    if not gpos:
        return lambda a, b: 0
    order = font.getGlyphOrder()
    lookups = set()
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == "kern":
            lookups.update(fr.Feature.LookupListIndex)
    subtables = []
    for i in sorted(lookups):
        lk = gpos.LookupList.Lookup[i]
        for st in lk.SubTable:
            if lk.LookupType == 9:  # extension
                st = st.ExtSubTable
            if getattr(st, "LookupType", 2) == 2 or st.__class__.__name__ == "PairPos":
                subtables.append(st)

    def adjust(a, b):
        for st in subtables:
            cov = st.Coverage.glyphs
            if a not in cov:
                continue
            if st.Format == 1:
                idx = cov.index(a)
                for rec in st.PairSet[idx].PairValueRecord:
                    if rec.SecondGlyph == b:
                        return getattr(rec.Value1, "XAdvance", 0) or 0
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs.get(a, 0)
                c2 = st.ClassDef2.classDefs.get(b, 0)
                rec = st.Class1Record[c1].Class2Record[c2]
                v = getattr(rec.Value1, "XAdvance", 0) or 0
                if v:
                    return v
        return 0

    return adjust


kern = _kern_table(font)


def fmt(v):
    out = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if out in ("-0", "") else out


def run_paths(text, x, prev=None):
    """Return (svg path d, new x, bounds) for one colour run."""
    pen = SVGPathPen(glyphs, ntos=lambda v: fmt(v))
    bounds = BoundsPen(glyphs)
    for ch in text:
        name = cmap[ord(ch)]
        if prev:
            x += kern(prev, name)
        prev = name
        # Font units, y up -> SVG px, y down. Baseline at y=0.
        t = (scale, 0, 0, -scale, x * scale, 0)
        glyphs[name].draw(TransformPen(pen, t))
        glyphs[name].draw(TransformPen(bounds, t))
        x += glyphs[name].width + tracking
    return pen.getCommands(), x, bounds.bounds, prev


d_main, x, b1, last = run_paths("Zubite", 0)
d_tld, x, b2, _ = run_paths(".bg", x, last)
xmin = min(b1[0], b2[0]); ymin = min(b1[1], b2[1])
xmax = max(b1[2], b2[2]); ymax = max(b1[3], b2[3])
w, h = xmax - xmin, ymax - ymin


def wordmark(main_fill, tld_fill, pad=0.0, bg=None, title="Zubite.bg"):
    vb_x, vb_y = xmin - pad, ymin - pad
    vb_w, vb_h = w + 2 * pad, h + 2 * pad
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(vb_x)} {fmt(vb_y)} {fmt(vb_w)} {fmt(vb_h)}" '
        f'width="{fmt(vb_w)}" height="{fmt(vb_h)}" role="img" aria-label="{title}">',
        f"<title>{title}</title>",
    ]
    if bg:
        parts.append(bg(vb_x, vb_y, vb_w, vb_h))
    parts.append(f'<path fill="{main_fill}" d="{d_main}"/>')
    parts.append(f'<path fill="{tld_fill}" d="{d_tld}"/>')
    parts.append("</svg>\n")
    return "\n".join(parts)


def pill(x0, y0, pw, ph):
    r = ph / 2
    return (f'<rect x="{fmt(x0 + 0.75)}" y="{fmt(y0 + 0.75)}" width="{fmt(pw - 1.5)}" height="{fmt(ph - 1.5)}" '
            f'rx="{fmt(r - 0.75)}" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="1.5"/>')


out_dir.mkdir(parents=True, exist_ok=True)
files = {
    # Primary: dark text, green .bg, transparent background.
    "zubite-logo.svg": wordmark("#0A0A0A", "#007956"),
    # On dark green (#073B36) surfaces, as in the results/clinics hero.
    "zubite-logo-on-dark.svg": wordmark("#FFFFFF", "#89E0D4"),
    # Single-colour versions for print, stamps, embossing.
    "zubite-logo-black.svg": wordmark("#0A0A0A", "#0A0A0A"),
    "zubite-logo-white.svg": wordmark("#FFFFFF", "#FFFFFF"),
    # The header's white pill badge.
    "zubite-logo-pill.svg": wordmark("#0A0A0A", "#007956", pad=h * 0.75, bg=pill),
}
for name, svg in files.items():
    (out_dir / name).write_text(svg, encoding="utf-8")
    print(name, len(svg), "bytes")
print("wordmark size", fmt(w), "x", fmt(h))

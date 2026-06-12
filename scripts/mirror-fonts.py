"""
mirror-fonts.py — tải Google Fonts static instances về self-host.

Đọc google-raw.css (đã fetch với Chrome UA), lọc vietnamese/latin-ext/latin,
download woff2 → public/fonts/, sinh src/styles/fonts.css mới.

Chạy: python scripts/mirror-fonts.py  (từ thư mục site/)
"""
import re, os, urllib.request, time

# Subsets cần giữ (bỏ cyrillic*)
KEEP = {'vietnamese', 'latin-ext', 'latin'}

# Tên rút gọn cho file
SUBSET_SLUG = {
    'vietnamese': 'vn',
    'latin-ext': 'latin-ext',
    'latin': 'latin',
}

FAMILY_SLUG = {
    'Cormorant Garamond': 'cormorant',
    'Inter': 'inter',
    'JetBrains Mono': 'jetbrains',
}

RAW_CSS = 'public/fonts/google-raw.css'
OUT_DIR = 'public/fonts/'
OUT_CSS = 'src/styles/fonts.css'

# ── 1. Parse @font-face blocks ────────────────────────────────────────────────

with open(RAW_CSS, encoding='utf-8') as f:
    raw = f.read()

# Mỗi block bắt đầu bằng comment "/* subset */"
pattern = re.compile(
    r'/\*\s*(?P<subset>[^\*]+?)\s*\*/\s*'
    r'@font-face\s*\{(?P<body>[^}]+)\}',
    re.DOTALL,
)

blocks = []
for m in pattern.finditer(raw):
    subset = m.group('subset').strip()
    body = m.group('body').strip()

    if subset not in KEEP:
        continue

    # Extract fields
    def field(name, text):
        r = re.search(rf"font-{name}\s*:\s*([^;]+);", text)
        return r.group(1).strip() if r else None

    family = field('family', body)
    if family:
        family = family.strip("'\"")

    style  = field('style', body) or 'normal'
    weight = field('weight', body) or '400'
    url_m  = re.search(r"url\(([^)]+)\)", body)
    url    = url_m.group(1).strip("'\"") if url_m else None
    urange = re.search(r'unicode-range\s*:\s*([^;]+);', body)
    urange = urange.group(1).strip() if urange else None

    if not url or family not in FAMILY_SLUG:
        continue

    blocks.append({
        'subset':  subset,
        'family':  family,
        'style':   style,
        'weight':  weight,
        'url':     url,
        'urange':  urange,
    })

print(f"Filtered blocks: {len(blocks)}")

# ── 2. Tạo tên file local ─────────────────────────────────────────────────────

# Group: family+style+weight+subset → 1 file
seen_files = {}

for b in blocks:
    slug_fam  = FAMILY_SLUG[b['family']]
    slug_sub  = SUBSET_SLUG[b['subset']]
    style_s   = 'italic' if b['style'] == 'italic' else 'normal'
    weight_s  = b['weight']
    fname     = f"{slug_fam}-{style_s}-{weight_s}-{slug_sub}.woff2"
    b['local'] = fname
    seen_files[b['url']] = fname

# ── 3. Download ────────────────────────────────────────────────────────────────

os.makedirs(OUT_DIR, exist_ok=True)
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

downloaded = set()
for b in blocks:
    dest = os.path.join(OUT_DIR, b['local'])
    if b['local'] in downloaded:
        continue
    downloaded.add(b['local'])
    if os.path.exists(dest):
        print(f"  skip (exists): {b['local']}")
        continue
    print(f"  download: {b['local']} <- {b['url'][:70]}...")
    req = urllib.request.Request(b['url'], headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r, open(dest, 'wb') as out:
        out.write(r.read())
    time.sleep(0.05)  # polite

print(f"Downloaded {len(downloaded)} files → {OUT_DIR}")

# ── 4. Sinh fonts.css ─────────────────────────────────────────────────────────

lines = [
    "/* fonts.css — self-hosted static instances từ Google Fonts (mirror).",
    " * Mỗi @font-face là 1 weight cụ thể (KHÔNG gộp variable range) → fix shaping dấu VN",
    " * trên Windows Chromium. Sinh tự động bởi scripts/mirror-fonts.py.",
    " * Subsets: vietnamese + latin-ext + latin. Cyrillic bỏ (không dùng). */",
    "",
]

# Thứ tự xuất: family → style (normal trước) → weight → subset (vn trước)
SUBSET_ORDER = ['vietnamese', 'latin-ext', 'latin']
FAMILY_ORDER = ['Cormorant Garamond', 'Inter', 'JetBrains Mono']

def sort_key(b):
    fi = FAMILY_ORDER.index(b['family']) if b['family'] in FAMILY_ORDER else 99
    si = 0 if b['style'] == 'normal' else 1
    wi = int(b['weight']) if b['weight'].isdigit() else 400
    subi = SUBSET_ORDER.index(b['subset']) if b['subset'] in SUBSET_ORDER else 99
    return (fi, si, wi, subi)

prev_comment = None
for b in sorted(blocks, key=sort_key):
    comment = f"{b['family']} — {b['style']} {b['weight']}"
    if comment != prev_comment:
        lines.append(f"/* {comment} */")
        prev_comment = comment
    lines.append("@font-face {")
    lines.append(f"  font-family: '{b['family']}';")
    lines.append(f"  font-style: {b['style']};")
    lines.append(f"  font-weight: {b['weight']};")
    lines.append( "  font-display: swap;")
    lines.append(f"  src: url('/fonts/{b['local']}') format('woff2');")
    if b['urange']:
        lines.append(f"  unicode-range: {b['urange']};")
    lines.append("}")

css_out = "\n".join(lines) + "\n"
with open(OUT_CSS, 'w', encoding='utf-8') as f:
    f.write(css_out)

print(f"Written: {OUT_CSS}  ({len(lines)} lines, {len(blocks)} @font-face)")

# ── 5. Verify ─────────────────────────────────────────────────────────────────

print("\nVerification:")
sizes = {}
for fname in downloaded:
    path = os.path.join(OUT_DIR, fname)
    sizes[fname] = os.path.getsize(path)

total_kb = sum(sizes.values()) // 1024
print(f"  Total downloaded: {len(sizes)} files, {total_kb} KB")
for name, sz in sorted(sizes.items()):
    print(f"  {sz//1024:4d}KB  {name}")

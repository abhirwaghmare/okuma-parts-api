"""
Extract the GENERAL VIEW page from each machine PDF, upload to BC WebDAV,
and update toc.json with document-level overview_image paths.

Usage:
  python scripts/extract-general-views.py [--dry-run]

Requires: pymupdf  (pip install pymupdf)
"""

import os
import sys
import json
import hashlib
import urllib.request
import urllib.error
import ssl
import re
import tempfile
import fitz  # PyMuPDF

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DRY_RUN = '--dry-run' in sys.argv

# Load .env from app/.env
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', 'app', '.env')
env = {}
with open(ENV_PATH) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

STORE_HASH    = env.get('BC_STORE_HASH', 'tb0nfpch8c')
WEBDAV_USER   = env.get('BC_WEBDAV_USER')
WEBDAV_PASS   = env.get('BC_WEBDAV_PASS')
CDN_BASE      = env.get('PARTS_BOOK_CDN_BASE_URL', f'https://store-{STORE_HASH}.mybigcommerce.com/content/parts-book')
WEBDAV_BASE   = f'https://store-{STORE_HASH}.mybigcommerce.com/dav/content/parts-book'
WEBDAV_HOST   = f'store-{STORE_HASH}.mybigcommerce.com'

PARTS_PDF_DIR = r'C:\Users\llal\OneDrive - Deloitte (O365D)\Okuma Commerce - Implementation\01 Technical\Parts PDF'

# Machine ID → PDF file path (override for files not in Parts PDF dir)
PDF_OVERRIDES = {
    'ME15-230-R1': r'C:\Users\llal\OneDrive - Deloitte (O365D)\Okuma Commerce - Implementation\01 Technical\ME15-230-R1 (1).pdf',
}

MACHINES = ['GE15-039-R10', 'LE15-173-R2', 'LE15-221-R1', 'LE15-230-R5', 'ME15-181-R5', 'ME15-230-R1', 'ME15-291-R2']

# ---------------------------------------------------------------------------
# Digest auth
# ---------------------------------------------------------------------------

_digest = None
_nc = 1

def _md5(s):
    return hashlib.md5(s.encode('utf-8')).hexdigest()

def _parse_challenge(www_auth):
    def get(key):
        m = re.search(rf'{key}="([^"]+)"', www_auth)
        return m.group(1) if m else None
    qop_m = re.search(r'qop="?([^",\s]+)', www_auth)
    return {
        'realm':  get('realm'),
        'nonce':  get('nonce'),
        'opaque': get('opaque'),
        'qop':    qop_m.group(1) if qop_m else 'auth',
    }

def _fetch_challenge():
    global _digest, _nc
    ctx = ssl.create_default_context()
    req = urllib.request.Request(f'https://{WEBDAV_HOST}/dav/', method='OPTIONS')
    try:
        urllib.request.urlopen(req, context=ctx)
    except urllib.error.HTTPError as e:
        www = e.headers.get('WWW-Authenticate', '')
        if www:
            _digest = _parse_challenge(www)
            _nc = 1

def _build_auth(method, uri):
    global _nc
    r = _digest
    HA1 = _md5(f"{WEBDAV_USER}:{r['realm']}:{WEBDAV_PASS}")
    HA2 = _md5(f"{method}:{uri}")
    nc  = _nc; _nc += 1
    nc_hex  = format(nc, '08x')
    cnonce  = hashlib.md5(os.urandom(4)).hexdigest()[:8]
    resp    = _md5(f"{HA1}:{r['nonce']}:{nc_hex}:{cnonce}:{r['qop']}:{HA2}")
    return (
        f'Digest username="{WEBDAV_USER}", realm="{r["realm"]}", nonce="{r["nonce"]}", '
        f'uri="{uri}", qop={r["qop"]}, nc={nc_hex}, cnonce="{cnonce}", '
        f'response="{resp}", opaque="{r["opaque"]}"'
    )

def _webdav_request(method, url, body=None, content_type=None):
    global _digest, _nc
    if _digest is None:
        _fetch_challenge()
    ctx = ssl.create_default_context()
    from urllib.parse import urlparse
    uri = urlparse(url).path
    headers = {'Authorization': _build_auth(method, uri)}
    if content_type:
        headers['Content-Type'] = content_type
    if body is not None:
        headers['Content-Length'] = str(len(body))
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(req, context=ctx)
        return res.status
    except urllib.error.HTTPError as e:
        if e.code == 401:
            www = e.headers.get('WWW-Authenticate', '')
            if www:
                _digest = _parse_challenge(www)
                _nc = 1
                # Retry once
                headers['Authorization'] = _build_auth(method, uri)
                req2 = urllib.request.Request(url, data=body, headers=headers, method=method)
                try:
                    res2 = urllib.request.urlopen(req2, context=ctx)
                    return res2.status
                except urllib.error.HTTPError as e2:
                    return e2.code
        return e.code

# ---------------------------------------------------------------------------
# PDF extraction
# ---------------------------------------------------------------------------

def find_general_view_page(pdf_path):
    doc = fitz.open(pdf_path)
    best_page = None
    for i, page in enumerate(doc):
        text = page.get_text().upper()
        if 'GENERAL VIEW' in text:
            best_page = i
            break
    return doc, best_page

def render_page_to_png(doc, page_index, dpi=150):
    page = doc[page_index]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes('png')

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    results = {}  # machine_id -> relative CDN path or None

    for machine_id in MACHINES:
        pdf_path = PDF_OVERRIDES.get(machine_id)
        if not pdf_path:
            pdf_path = os.path.join(PARTS_PDF_DIR, f'{machine_id}.pdf')

        if not os.path.exists(pdf_path):
            print(f'[SKIP] {machine_id}: PDF not found at {pdf_path}')
            results[machine_id] = None
            continue

        print(f'\n--- {machine_id} ---')
        print(f'  PDF: {pdf_path}')

        doc, page_idx = find_general_view_page(pdf_path)
        if page_idx is None:
            print(f'  [WARN] No "GENERAL VIEW" page found')
            doc.close()
            results[machine_id] = None
            continue

        print(f'  Found GENERAL VIEW on page {page_idx + 1}')

        png_bytes = render_page_to_png(doc, page_idx, dpi=150)
        doc.close()
        print(f'  Rendered: {len(png_bytes) // 1024} KB')

        rel_path = f'{machine_id}/overview.png'
        upload_url = f'{WEBDAV_BASE}/{machine_id}/overview.png'

        if DRY_RUN:
            print(f'  [DRY-RUN] Would upload to {upload_url}')
            results[machine_id] = rel_path
            continue

        status = _webdav_request('PUT', upload_url, body=png_bytes, content_type='image/png')
        if status in (200, 201, 204):
            print(f'  Uploaded -> {CDN_BASE}/{rel_path}')
            results[machine_id] = rel_path
        else:
            print(f'  [ERROR] Upload returned HTTP {status}')
            results[machine_id] = None

    # --- Update toc.json ---
    print('\n--- Updating toc.json ---')
    toc_url = f'{CDN_BASE}/toc.json'
    ctx = ssl.create_default_context()
    toc_res = urllib.request.urlopen(toc_url, context=ctx)
    toc = json.loads(toc_res.read().decode('utf-8'))

    changed = 0
    for doc_entry in toc.get('documents', []):
        rel = results.get(doc_entry['id'])
        if rel:
            doc_entry['overview_image'] = rel
            changed += 1
            print(f'  Set overview_image for {doc_entry["id"]}')

    if changed == 0:
        print('  No changes to toc.json')
        return

    toc_json = json.dumps(toc, separators=(',', ':')).encode('utf-8')

    if DRY_RUN:
        print(f'  [DRY-RUN] Would re-upload toc.json ({len(toc_json)} bytes)')
        return

    toc_upload_url = f'{WEBDAV_BASE}/toc.json'
    status = _webdav_request('PUT', toc_upload_url, body=toc_json, content_type='application/json')
    if status in (200, 201, 204):
        print(f'  toc.json updated on BC CDN')
    else:
        print(f'  [ERROR] toc.json upload returned HTTP {status}')

    print('\nDone.')

if __name__ == '__main__':
    main()

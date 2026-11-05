"""Publishes the human docs (memo, PRD, build log) to Notion through Composio, with screenshots and videos uploaded
into Notion itself (nothing hosted publicly). Run: python3 -I scripts/publish-notion.py [--dry-run]
Needs the Composio Notion connection, with the "Getting Started" page shared. Creates pages under it; never edits other pages."""
import base64, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = '--dry-run' in sys.argv
DOCS = [('memo', 'One-page memo'), ('PRD', 'PRD'), ('build-log', 'Build log'), ('gtm', 'Go-to-market')]
ALREADY_FILLED = set(a.split('=', 1)[1] for a in sys.argv if a.startswith('--skip='))
NOTION_FREE_LIMIT = 5 * 1024 * 1024

def composio(slug, data):
    if DRY:
        return {'data': {'id': '00000000-0000-0000-0000-000000000000'}}
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(data, f)
        path = f.name
    out = subprocess.run(['composio', 'execute', slug, '-d', '@' + path], capture_output=True, text=True, timeout=300)
    os.unlink(path)
    try:
        res = json.loads(out.stdout)
    except Exception:
        raise SystemExit(f'{slug} failed: {out.stdout[:400]} {out.stderr[:400]}')
    if res.get('successful') is False or res.get('error'):
        raise SystemExit(f'{slug} error: {json.dumps(res)[:600]}')
    return res

def find_id(obj):
    """Composio wraps Notion responses; dig out the first object id."""
    if isinstance(obj, dict):
        if isinstance(obj.get('id'), str) and len(obj['id'].replace('-', '')) >= 32:
            return obj['id']
        for v in obj.values():
            r = find_id(v)
            if r: return r
    if isinstance(obj, list):
        for v in obj:
            r = find_id(v)
            if r: return r
    return None

def rt(text):
    return [{'type': 'text', 'text': {'content': text[:2000]}}]

def upload(path, mime):
    if DRY: return 'dry-upload'
    size = os.path.getsize(path)
    if size > NOTION_FREE_LIMIT:
        raise SystemExit(f'{path} is {size} bytes, over the free Notion limit')
    name = os.path.basename(path)
    up = composio('NOTION_CREATE_FILE_UPLOAD', {'mode': 'single_part', 'filename': name, 'content_type': mime})
    uid = find_id(up)
    out = subprocess.run(['composio', 'execute', 'NOTION_SEND_FILE_UPLOAD', '--file', os.path.abspath(path), '-d', json.dumps({'file_upload_id': uid})],
                         capture_output=True, text=True, timeout=300)
    if '"successful": false' in out.stdout or out.returncode != 0:
        raise SystemExit(f'upload of {name} failed: {out.stdout[:400]} {out.stderr[:200]}')
    return uid

def md_to_blocks(md):
    blocks, para = [], []
    lines = md.split('\n')
    i = 0
    def flush():
        if para:
            blocks.append({'content': ' '.join(para), 'block_property': 'paragraph'}); para.clear()
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if s.startswith('```'):
            flush(); code = []; i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code.append(lines[i]); i += 1
            blocks.append({'type': 'code', 'code': {'rich_text': rt('\n'.join(code)), 'language': 'plain text'}})
        elif s.startswith('|'):
            flush(); rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip().replace('**', '') for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            i -= 1
            width = max(len(r) for r in rows)
            blocks.append({'type': 'table', 'table': {'table_width': width, 'has_column_header': True, 'has_row_header': False,
                           'children': [{'type': 'table_row', 'table_row': {'cells': [rt(c) for c in r + [''] * (width - len(r))]}} for r in rows]}})
        elif m := re.match(r'!\[([^\]]*)\]\(([^)]+)\)', s):
            flush()
            cap = ''
            if i + 1 < len(lines) and re.fullmatch(r'\*[^*].*\*', lines[i + 1].strip()):
                cap = lines[i + 1].strip().strip('*'); i += 1
            path = os.path.normpath(os.path.join(ROOT, 'docs', m.group(2)))
            blocks.append({'_upload': path, 'mime': 'image/png', 'kind': 'image', 'caption': cap or m.group(1)})
        elif m := re.match(r'<video src="([^"]+)"', s):
            flush()
            cap = ''
            if i + 2 < len(lines) and re.fullmatch(r'\*[^*].*\*', lines[i + 2].strip()):
                cap = lines[i + 2].strip().strip('*')
            src = m.group(1).replace('videos/', '')
            small = os.path.join(ROOT, 'docs', 'videos', 'notion-' + src)
            path = small if os.path.exists(small) else os.path.join(ROOT, 'public', 'videos', src)
            blocks.append({'_upload': path, 'mime': 'video/mp4', 'kind': 'video', 'caption': cap})
        # Headings go in native Notion format: the simplified format's markdown parser turns "1. Title" into a list item.
        elif s.startswith('### '): flush(); blocks.append({'type': 'heading_3', 'heading_3': {'rich_text': rt(re.sub(r'[*`]', '', s[4:]))}})
        elif s.startswith('## '): flush(); blocks.append({'type': 'heading_2', 'heading_2': {'rich_text': rt(re.sub(r'[*`]', '', s[3:]))}})
        elif s.startswith('# '): flush()  # page title comes from the H1
        elif s.startswith('> '):
            flush(); q = [s[2:]]
            while i + 1 < len(lines) and lines[i + 1].strip().startswith('>'):
                i += 1; q.append(lines[i].strip().lstrip('>').strip())
            blocks.append({'content': ' '.join(x for x in q if x), 'block_property': 'quote'})
        elif re.match(r'[-*] ', s): flush(); blocks.append({'content': s[2:], 'block_property': 'bulleted_list_item'})
        elif re.match(r'\d+\. ', s): flush(); blocks.append({'content': re.sub(r'^\d+\. ', '', s), 'block_property': 'numbered_list_item'})
        elif s == '---': flush(); blocks.append({'block_property': 'divider'})
        elif not s or (s.startswith('*') and s.endswith('*') and blocks and blocks[-1].get('_upload')): flush()
        else: para.append(s)
        i += 1
    flush()
    # Long paragraphs: Notion's 2000-char limit is per text field.
    for b in blocks:
        if 'content' in b and len(b['content']) > 1900: b['content'] = b['content'][:1900]
    return blocks

def child_page(parent, title, create_args):
    """Return the existing page with this title under parent, or create it."""
    if not DRY:
        res = composio('NOTION_SEARCH_NOTION_PAGE', {'query': title})
        want = parent.replace('-', '')
        def walk(o):
            if isinstance(o, dict):
                par = json.dumps(o.get('parent', ''))
                if o.get('object') == 'page' and want in par.replace('-', '') and title in json.dumps(o.get('properties', o)):
                    return o.get('id')
                for v in o.values():
                    r = walk(v)
                    if r: return r
            if isinstance(o, list):
                for v in o:
                    r = walk(v)
                    if r: return r
        found = walk(res)
        if found:
            print(f'reusing "{title}" {found}')
            return found, True
    return find_id(composio('NOTION_CREATE_NOTION_PAGE', {'parent_id': parent, 'title': title, **create_args})), False

def has_content(page_id):
    if DRY: return False
    res = composio('NOTION_FETCH_BLOCK_CONTENTS', {'block_id': page_id}) if False else None
    return False

def append(page_id, blocks):
    batch = []
    def send():
        if batch:
            composio('NOTION_ADD_MULTIPLE_PAGE_CONTENT', {'parent_block_id': page_id, 'content_blocks': [{'content_block': b} for b in batch]}); batch.clear()
    for b in blocks:
        if '_upload' in b:
            send()
            uid = upload(b['_upload'], b['mime'])
            kind = b['kind']
            composio('NOTION_ADD_MULTIPLE_PAGE_CONTENT', {'parent_block_id': page_id, 'content_blocks': [{'content_block':
                {'type': kind, kind: {'type': 'file_upload', 'file_upload': {'id': uid}, 'caption': rt(b['caption']) if b['caption'] else []}}}]})
        else:
            batch.append(b)
            if len(batch) >= 80: send()
    send()

def main():
    search = composio('NOTION_SEARCH_NOTION_PAGE', {'query': 'Getting Started'})
    parent = find_id(search)
    if not parent:
        raise SystemExit('Could not find the shared "Getting Started" page')
    root, _ = child_page(parent, 'Subscription Sweep', {'icon': '🧾',
        'markdown': 'A working concept by Ayo Ahmed for the Product Builder role at Nous. Rules own every £, AI only names things.\n\nThree docs below: the one-page memo, the PRD and the build log (with screenshots, test videos and every score, first runs included).\n\nCode and evidence: `~/Career/products/subscription-sweep`'})
    print('root page', root)
    for doc, title in DOCS:
        md = open(os.path.join(ROOT, 'docs', f'{doc}.md')).read()
        h1 = re.search(r'^# (.+)$', md, re.M)
        page, reused = child_page(root, h1.group(1) if h1 else title, {})
        if reused and '--force-append' not in sys.argv and doc in ALREADY_FILLED:
            print(f'{doc}: already filled, skipping'); continue
        blocks = md_to_blocks(md)
        if f'--rebuild={doc}' in sys.argv:
            first = blocks[0]
            para = {'type': 'paragraph', 'paragraph': {'rich_text': rt(first['content'])}} if 'content' in first else first
            composio('NOTION_REPLACE_PAGE_CONTENT', {'page_id': page, 'new_children': [para], 'archive_existing_children': True, 'create_backup': False})
            print(f'{doc}: cleared and restarted from the intro')
            blocks = blocks[1:]
        elif doc == 'build-log' and any(a.startswith('--append-from=') for a in sys.argv):
            # Append only the new sections, from the first heading that starts with this text (e.g. "17.").
            want = next(a.split('=', 1)[1] for a in sys.argv if a.startswith('--append-from='))
            first = next(i for i, b in enumerate(blocks) if b.get('type') == 'heading_2' and want in json.dumps(b['heading_2'], ensure_ascii=False))
            print(f'build-log: appending from block {first} ("{want}")')
            blocks = blocks[first:]
        elif doc == 'build-log' and '--resume-build-log' in sys.argv:
            first = next(i for i, b in enumerate(blocks) if '_upload' in b)
            print(f'build-log: resuming at block {first} (text before it is already on the page)')
            blocks = blocks[first:]
        uploads = sum(1 for b in blocks if '_upload' in b)
        print(f'{doc}: {len(blocks)} blocks, {uploads} uploads → page {page}')
        append(page, blocks)
    print('published')

if __name__ == '__main__':
    main()

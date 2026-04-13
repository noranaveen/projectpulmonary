#!/usr/bin/env python3
import json
from pathlib import Path

def main():
    root = Path(__file__).resolve().parent
    config_path = root / 'site-config.json'
    if not config_path.exists():
        raise SystemExit('Missing site-config.json. Create it with siteName and siteDomain.')

    config = json.loads(config_path.read_text())
    domain = config.get('siteDomain', '').strip()
    if not domain:
        raise SystemExit('siteDomain must be set in site-config.json')

    if not domain.startswith('http://') and not domain.startswith('https://'):
        domain = 'https://' + domain

    html_files = list(root.glob('*.html'))
    if not html_files:
        raise SystemExit('No HTML files found to update.')

    replacements = {
        'https://projectpulmonary.com': domain,
        'projectpulmonary.com': domain.replace('https://', '').replace('http://', ''),
    }

    for html_file in html_files:
        text = html_file.read_text()
        for old, new in replacements.items():
            text = text.replace(old, new)
        html_file.write_text(text)
        print(f'Updated {html_file.name}')

    cname = root / 'CNAME'
    cname.write_text(domain.replace('https://', '').replace('http://', '') + '\n')
    print(f'Updated CNAME to {cname.read_text().strip()}')

if __name__ == '__main__':
    main()

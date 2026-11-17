"""Publica los Markdown docentes al terminar un reporte. Usa LIFE_GUIDE_MATH_KEY."""
import argparse
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request
import uuid


def local_key():
    key = os.environ.get('LIFE_GUIDE_MATH_KEY')
    if not key and os.name == 'nt':
        # Existing desktop sessions may predate the user environment update.
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as registry:
                key = winreg.QueryValueEx(registry, 'LIFE_GUIDE_MATH_KEY')[0]
        except OSError:
            pass
    return key


def collect(root):
    panel = (root / 'PANEL.md').read_text(encoding='utf-8-sig')
    students = []
    for path in sorted(root.glob('*/seguimiento.md')):
        students.append({'source_id': path.relative_to(root).as_posix(), 'name': path.parent.name, 'content': path.read_text(encoding='utf-8-sig')})
    plans = [{'source_id': path.relative_to(root).as_posix(), 'content': path.read_text(encoding='utf-8-sig')} for path in sorted(root.glob('*/*/plan_clase.md'))]
    if not students or not panel.strip():
        raise ValueError('Falta el panel o los seguimientos. Se conserva la última copia publicada.')
    return {'panel': panel, 'students': students, 'plans': plans}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(r'C:\Users\Bmo\Matematicas'))
    parser.add_argument('--url', default=os.environ.get('LIFE_GUIDE_URL', 'https://finance.blueberrieslab.com'))
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    payload = collect(args.root.resolve())
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode('utf-8')
    if args.dry_run:
        print(json.dumps({'students': len(payload['students']), 'plans': len(payload['plans']), 'bytes': len(encoded)}))
        return
    key = local_key()
    if not key:
        raise ValueError('Configura LIFE_GUIDE_MATH_KEY con permiso math:write.')
    if not args.url.startswith('https://') and not args.url.startswith(('http://127.0.0.1:', 'http://localhost:')):
        raise ValueError('La URL remota debe usar HTTPS.')
    identity = uuid.uuid4()
    request = urllib.request.Request(args.url.rstrip('/') + '/api/integrations/math/sync/', data=encoded, headers={'Content-Type': 'application/json', 'User-Agent': 'LifeGuide-MathSync/1.0', 'Authorization': f'Bearer {key}', 'Idempotency-Key': str(identity)})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
        print(f"Sincronizados {result['students']} alumnos. Actualización {result['updated_at']}.")
    except urllib.error.HTTPError as error:
        raise ValueError(f'La guía rechazó la sincronización (HTTP {error.code}). Revisa la clave y los permisos.') from None
    except urllib.error.URLError:
        raise ValueError('No se pudo conectar con la guía. Puedes reintentar. Se conserva la copia publicada.') from None


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)

import sys, json
sys.path.insert(0, 'backend')
import app as backend_app

c = backend_app.app.test_client()
eps = ['/api/status', '/api/users', '/api/recognitions', '/api/recognitions/latest', '/api/analytics']

for e in eps:
    r = c.get(e)
    try:
        payload = r.get_json()
    except Exception:
        payload = None
    print(e, r.status_code, json.dumps(payload, ensure_ascii=False))

train_resp = c.post('/api/train')
try:
    train_payload = train_resp.get_json()
except Exception:
    train_payload = None
print('/api/train', train_resp.status_code, json.dumps(train_payload, ensure_ascii=False))

set_resp = c.post('/api/settings', json={'recognition_threshold': 85})
try:
    set_payload = set_resp.get_json()
except Exception:
    set_payload = None
print('/api/settings', set_resp.status_code, json.dumps(set_payload, ensure_ascii=False))

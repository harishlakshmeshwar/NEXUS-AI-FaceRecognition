import base64, requests, os, time
img_path = os.path.join('..','dataset','123', os.listdir(os.path.join('..','dataset','123'))[0])
with open(img_path, 'rb') as f:
    b = base64.b64encode(f.read()).decode('utf-8')
    data = {'image': f'data:image/jpeg;base64,{b}'}

url = 'http://127.0.0.1:5000/api/recognize'
try:
    resp = requests.post(url, json=data, timeout=15)
    print('STATUS', resp.status_code)
    try:
        print(resp.json())
    except Exception:
        print(resp.text[:800])
except Exception as e:
    print('Request failed:', e)

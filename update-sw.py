"""
데이터 변경 후 실행: python update-sw.py
서비스 워커 캐시 버전을 갱신해 사용자에게 최신 버전을 전달합니다.
"""
import time, os

ver = int(time.time())
sw = f"""const CACHE='ohaeng-{ver}';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
}});
self.addEventListener('fetch',e=>{{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.pathname.includes('/assets/')){{
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{{caches.open(CACHE).then(ch=>ch.put(e.request,r.clone()));return r;}})));
  }} else {{
    e.respondWith(fetch(e.request).then(r=>{{caches.open(CACHE).then(ch=>ch.put(e.request,r.clone()));return r;}}).catch(()=>caches.match(e.request)));
  }}
}});"""

path = os.path.join(os.path.dirname(__file__), 'docs', 'sw.js')
open(path, 'w', encoding='utf-8').write(sw)
print(f'sw.js updated: version {ver}')

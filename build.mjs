import * as esbuild from './node_modules/esbuild/lib/main.js';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'fs';
import { readdir } from 'fs/promises';

// Clean docs/assets
if (existsSync('docs/assets')) {
  const old = await readdir('docs/assets');
  old.forEach(f => rmSync(`docs/assets/${f}`));
} else {
  mkdirSync('docs/assets', { recursive: true });
}

// Bundle JS (CSS imported separately, not via JS)
const jsResult = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true, minify: true, format: 'iife',
  write: false,
  loader: { '.css': 'empty' }, // skip CSS import in JS bundle
});
const jsText = new TextDecoder().decode(jsResult.outputFiles[0].contents);
const jsHash = createHash('sha256').update(jsText).digest('hex').slice(0, 8);
const jsFile = `index-${jsHash}.js`;
writeFileSync(`docs/assets/${jsFile}`, jsText);

// Bundle CSS separately
const cssResult = await esbuild.build({
  entryPoints: ['src/style.css'],
  bundle: true, minify: true,
  write: false,
});
const cssText = new TextDecoder().decode(cssResult.outputFiles[0].contents);
const cssHash = createHash('sha256').update(cssText).digest('hex').slice(0, 8);
const cssFile = `index-${cssHash}.css`;
writeFileSync(`docs/assets/${cssFile}`, cssText);

// SW version stamp
const swVersion = Date.now();

// Service worker
const sw = `const CACHE='ohaeng-${swVersion}';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.pathname.includes('/assets/')){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{caches.open(CACHE).then(ch=>ch.put(e.request,r.clone()));return r;})));
  } else {
    e.respondWith(fetch(e.request).then(r=>{caches.open(CACHE).then(ch=>ch.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request)));
  }
});`;
writeFileSync('docs/sw.js', sw);

// Manifest
const manifest = {
  name: '오행배속 암기',
  short_name: '오행배속',
  description: '오행배속표 플래시카드',
  theme_color: '#ffffff',
  background_color: '#f6f5f4',
  display: 'standalone',
  start_url: '/5hang/',
  scope: '/5hang/',
  icons: [
    { src: '/5hang/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/5hang/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
writeFileSync('docs/manifest.json', JSON.stringify(manifest, null, 2));

// Copy icons
if (existsSync('public/icon-192.png')) copyFileSync('public/icon-192.png', 'docs/icon-192.png');
if (existsSync('public/icon-512.png')) copyFileSync('public/icon-512.png', 'docs/icon-512.png');

// index.html
const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>오행배속 암기</title>
  <link rel="manifest" href="/5hang/manifest.json">
  <meta name="theme-color" content="#ffffff">
  <link rel="apple-touch-icon" href="/5hang/icon-192.png">
  <link rel="stylesheet" href="/5hang/assets/${cssFile}">
</head>
<body>
  <header>
    <span class="logo">오행배속 암기</span>
  </header>
  <main>

    <!-- HOME -->
    <div id="s-home">
      <h1 class="home-title">학습 모드를 선택하세요</h1>
      <div class="mode-list">

        <div class="mode-card">
          <div class="mc-top" onclick="startMode('hanja', null)">
            <div>
              <h3>한자 읽기</h3>
              <p>한자를 보고 음을 떠올립니다</p>
            </div>
            <span class="pill-blue" id="cnt-hanja"></span>
          </div>
          <div class="mc-filters" id="filters-hanja"></div>
        </div>

        <div class="mode-card">
          <div class="mc-top" onclick="startMode('row', null)">
            <div>
              <h3>행 암기</h3>
              <p>목(木) 항목을 보고 나머지 4개를 떠올립니다</p>
            </div>
            <span class="pill-blue" id="cnt-row"></span>
          </div>
          <div class="mc-filters" id="filters-row"></div>
        </div>

      </div>
      <div class="home-footer">
        <button class="ghost-btn" onclick="resetAll()">모든 기록 초기화</button>
      </div>
    </div>

    <!-- STUDY -->
    <div id="s-study" class="hidden">
      <div class="study-nav">
        <button class="back-btn" onclick="goHome()">← 홈</button>
        <span class="mode-label" id="mode-label"></span>
        <span class="counter" id="counter"></span>
      </div>
      <div class="badges" id="badges"></div>
      <div class="prog-bar"><div class="prog-fill" id="prog"></div></div>

      <div class="card-wrap" id="cw">
        <div class="card" id="card"></div>
      </div>

      <div class="rating-area hidden" id="rating">
        <div class="rating-lbl">얼마나 잘 기억했나요?</div>
        <div class="rating-btns">
          <button class="rbtn rb-fail"    onclick="rate('fail')">실패</button>
          <button class="rbtn rb-medium"  onclick="rate('medium')">중간</button>
          <button class="rbtn rb-perfect" onclick="rate('perfect')">완벽</button>
        </div>
      </div>
    </div>

    <!-- COMPLETE -->
    <div id="s-complete" class="hidden">
      <h2 class="comp-title">학습 완료!</h2>
      <p class="comp-sub" id="comp-sub"></p>
      <div class="stats-row">
        <div class="stat-card sc-perfect"><div class="stat-n" id="sn-p">0</div><div class="stat-l">완벽</div></div>
        <div class="stat-card sc-medium"> <div class="stat-n" id="sn-m">0</div><div class="stat-l">중간</div></div>
        <div class="stat-card sc-fail">   <div class="stat-n" id="sn-f">0</div><div class="stat-l">실패</div></div>
      </div>
      <div class="action-col">
        <button class="btn-p" onclick="restartAll()">이 세트 다시</button>
        <button class="btn-s" id="btn-mf" onclick="retryMF()">중간 + 실패만 다시</button>
        <button class="btn-s" id="btn-f"  onclick="retryF()">실패만 다시</button>
        <button class="btn-s" onclick="goHome()">홈으로</button>
      </div>
    </div>

  </main>
  <script src="/5hang/assets/${jsFile}"></script>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/5hang/sw.js', { scope: '/5hang/' });
    }
  </script>
</body>
</html>`;
writeFileSync('docs/index.html', html);

console.log(`Built: ${jsFile}, ${cssFile}, sw.js (v${swVersion})`);

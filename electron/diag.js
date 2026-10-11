// 独立诊断：npx electron electron/diag.js
// 完整播放链路测试（HTTP/2 已禁用）
const { app, BrowserWindow, session } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

app.commandLine.appendSwitch('disable-http2')
app.commandLine.appendSwitch('disable-quic')

const M3U8 = 'https://svip.high24-playback.com/20241027/9072_518eee5b/index.m3u8'
const hlsCode = fs.readFileSync(
  path.join(__dirname, '..', 'node_modules', 'hls.js', 'dist', 'hls.min.js'), 'utf8')

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="log"></div><video id="v" controls style="width:80%"></video>
<script>${hlsCode}<\/script>
<script>
window.__diag = { steps: [], errors: [] };
function log(m){ window.__diag.steps.push(m); document.getElementById('log').innerHTML += m + '<br>'; }

const video = document.getElementById('v');
const hls = new Hls({ enableWorker: true });
hls.loadSource(${JSON.stringify(M3U8)});
hls.attachMedia(video);
hls.on(Hls.Events.MEDIA_ATTACHED, () => log('MEDIA_ATTACHED'));
hls.on(Hls.Events.MANIFEST_PARSED, (e,d) => {
  log('MANIFEST_PARSED levels=' + d.levels.length);
  video.play().then(()=>log('play() OK')).catch(err=>log('play rejected: '+err.message));
});
hls.on(Hls.Events.LEVEL_LOADED, () => log('LEVEL_LOADED'));
hls.on(Hls.Events.FRAG_LOADED, () => log('FRAG_LOADED'));
hls.on(Hls.Events.ERROR, (e,data) => {
  log('ERR type=' + data.type + ' details=' + data.details + ' fatal=' + data.fatal);
  if (data.fatal) window.__diag.errors.push(data.details);
});
<\/script></body></html>`

app.whenReady().then(async () => {
  await session.defaultSession.setProxy({ proxyRules: 'direct://' })
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {}
    headers['Access-Control-Allow-Origin'] = ['*']
    callback({ responseHeaders: headers })
  })

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html)
  })
  server.listen(5891, () => {
    const win = new BrowserWindow({ width: 800, height: 600, show: false })
    win.loadURL('http://localhost:5891/')
    setTimeout(async () => {
      const diag = await win.webContents.executeJavaScript('window.__diag')
      console.log('===== FULL PLAY DIAG =====')
      console.log(JSON.stringify(diag, null, 2))
      server.close(); app.quit()
    }, 15000)
  })
})

// DPlayer 版本的播放诊断
const { app, BrowserWindow, session } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

app.commandLine.appendSwitch('disable-http2')
app.commandLine.appendSwitch('disable-quic')

const M3U8 = 'https://svip.high24-playback.com/20241027/9072_518eee5b/index.m3u8'
const hlsCode = fs.readFileSync(
  path.join(__dirname, '..', 'node_modules', 'hls.js', 'dist', 'hls.min.js'), 'utf8')

// DPlayer 从 node_modules 读
const dpCode = fs.readFileSync(
  path.join(__dirname, '..', 'node_modules', 'dplayer', 'dist', 'DPlayer.min.js'), 'utf8')

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="log"></div>
<div id="player" style="width:80%"></div>
<script>${hlsCode}<\/script>
<script>${dpCode}<\/script>
<script>
window.__diag = { steps: [], errors: [] };
function log(m){ window.__diag.steps.push(m); document.getElementById('log').innerHTML += m + '<br>'; }

try {
  log('typeof Hls=' + typeof Hls + ' typeof DPlayer=' + typeof DPlayer)
  const dp = new DPlayer({
    container: document.getElementById('player'),
    video: {
      url: ${JSON.stringify(M3U8)},
      type: 'customHls',
      customType: {
        customHls: function(video, player) {
          log('customHls called, video.src=' + video.src)
          const hls = new Hls()
          hls.loadSource(video.src)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            log('MANIFEST_PARSED')
            video.play().then(()=>log('play OK')).catch(e=>log('play reject: '+e.message))
          })
          hls.on(Hls.Events.FRAG_LOADED, () => log('FRAG_LOADED'))
          hls.on(Hls.Events.ERROR, (e,d) => {
            log('ERR type=' + d.type + ' details=' + d.details + ' fatal=' + d.fatal)
            if (d.fatal) window.__diag.errors.push(d.details)
          })
        }
      }
    }
  })
} catch(e) {
  log('INIT EXCEPTION: ' + e.message + ' ' + e.stack)
  window.__diag.errors.push(e.message)
}
<\/script></body></html>`

app.whenReady().then(async () => {
  await session.defaultSession.setProxy({ proxyRules: 'direct://' })
  session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    const h = d.responseHeaders || {}
    h['Access-Control-Allow-Origin'] = ['*']
    cb({ responseHeaders: h })
  })

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html)
  })
  server.listen(5892, () => {
    const win = new BrowserWindow({ width: 900, height: 700, show: false })
    win.loadURL('http://localhost:5892/')
    win.webContents.on('console-message', (_e, level, message) => {
      console.log('[renderer console]', message)
    })
    setTimeout(async () => {
      const diag = await win.webContents.executeJavaScript('window.__diag')
      console.log('===== DPLAYER DIAG =====')
      console.log(JSON.stringify(diag, null, 2))
      server.close(); app.quit()
    }, 15000)
  })
})

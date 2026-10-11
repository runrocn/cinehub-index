// API 接口层诊断：在 Electron renderer 里直接 fetch 三个源，捕获真实错误
const { app, BrowserWindow, session } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

app.commandLine.appendSwitch('disable-http2')
app.commandLine.appendSwitch('disable-quic')

const TESTS = [
  { id: 'yyzy', url: 'https://api.yyzy-tv.vip/inc/api_mac10.php?ac=list&pg=1' },
  { id: 'lz',   url: 'https://cj.lziapi.com/api.php/provide/vod/from/lzm3u8/?ac=list&pg=1' },
  { id: 'wsy',  url: 'https://api.wsyzy.net/api.php/provide/vod/from/wsym3u8/?ac=list&pg=1' }
]

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="log">running...</div>
<script>
const TESTS = ${JSON.stringify(TESTS)};
window.__apiDiag = [];

async function run() {
  for (const t of TESTS) {
    const rec = { id: t.id, url: t.url }
    try {
      const r = await fetch(t.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*'
        }
      })
      rec.status = r.status
      rec.ok = r.ok
      const text = await r.text()
      rec.len = text.length
      rec.head = text.slice(0, 200)
      try { JSON.parse(text); rec.isJson = true } catch { rec.isJson = false }
    } catch (e) {
      rec.error = e.message
      rec.errorName = e.name
      rec.stack = (e.stack || '').slice(0, 300)
    }
    window.__apiDiag.push(rec)
    document.getElementById('log').innerHTML += '<br>' + rec.id + ': ' + (rec.error || ('status=' + rec.status + ' len=' + rec.len))
  }
}
run()
<\/script></body></html>`

app.whenReady().then(async () => {
  await session.defaultSession.setProxy({ proxyRules: 'direct://' })
  session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    const h = d.responseHeaders || {}
    h['Access-Control-Allow-Origin'] = ['*']
    h['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS']
    h['Access-Control-Allow-Headers'] = ['*']
    cb({ responseHeaders: h })
  })

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html)
  })
  server.listen(5893, () => {
    const win = new BrowserWindow({ width: 900, height: 700, show: false })
    win.loadURL('http://localhost:5893/')
    win.webContents.on('console-message', (_e, level, message) => {
      console.log('[console]', message)
    })
    setTimeout(async () => {
      const diag = await win.webContents.executeJavaScript('window.__apiDiag')
      console.log('===== API DIAG =====')
      console.log(JSON.stringify(diag, null, 2))
      server.close(); app.quit()
    }, 20000)
  })
})

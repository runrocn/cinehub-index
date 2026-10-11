const { app, BrowserWindow, session } = require('electron')
const path = require('path')

// 播放 CDN 的 HTTP/2 / QUIC 连接会被中间网络设备重置（net::ERR_FAILED），
// 强制 HTTP/1.1，禁用 QUIC
app.commandLine.appendSwitch('disable-http2')
app.commandLine.appendSwitch('disable-quic')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#fafafa',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  if (process.argv.includes('--dev') || !app.isPackaged) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // === 调试日志：把 renderer console 和网络错误打到主进程终端 ===
  win.webContents.on('console-message', (_e, level, message) => {
    const tag = ['LOG', 'WARN', 'ERROR'][level] || 'LOG'
    console.log(`[renderer:${tag}]`, message)
  })

  const sess = win.webContents.session
  sess.webRequest.onCompleted((d) => {
    if (d.url.includes('api_mac10') || d.url.includes('provide/vod') || d.url.includes('.m3u8')) {
      console.log(`[net OK] ${d.statusCode} ${d.url.slice(0, 110)}`)
    }
  })
  sess.webRequest.onErrorOccurred((d) => {
    if (d.url.includes('api_mac10') || d.url.includes('provide/vod') || d.url.includes('.m3u8') || d.url.includes('.ts')) {
      console.log(`[net ERR] ${d.error} ${d.url.slice(0, 110)}`)
    }
  })

  // dev 模式自动打开 DevTools
  if (!app.isPackaged) win.webContents.openDevTools({ mode: 'detach' })
}

app.whenReady().then(async () => {
  // 强制直连，不继承系统代理：
  // 资源站 API 和播放 CDN 直连最稳（配合 disable-http2），
  // 走系统代理反而会把国内请求绕到国外节点导致 Failed to fetch
  await session.defaultSession.setProxy({ proxyRules: 'direct://' })

  // 统一放行 CORS：所有响应只保留一个 Access-Control-Allow-Origin:*
  // 注意：部分源（如量子）自己已返回 ACAO:*，必须先删除再设置，
  // 否则会出现两个 *,* 导致浏览器 CORS 拦截
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {}
    for (const k of Object.keys(headers)) {
      const lk = k.toLowerCase()
      if (lk === 'access-control-allow-origin' ||
          lk === 'access-control-allow-methods' ||
          lk === 'access-control-allow-headers') {
        delete headers[k]
      }
    }
    headers['Access-Control-Allow-Origin'] = ['*']
    headers['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS']
    headers['Access-Control-Allow-Headers'] = ['*']
    callback({ responseHeaders: headers })
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

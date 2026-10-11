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
}

app.whenReady().then(async () => {
  // 强制直连，不继承系统代理：
  // 资源站 API 和播放 CDN 直连最稳（配合 disable-http2），
  // 走系统代理反而会把国内请求绕到国外节点导致 Failed to fetch
  await session.defaultSession.setProxy({ proxyRules: 'direct://' })

  // 统一放行 CORS：所有响应补 Access-Control-Allow-Origin:*
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {}
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

// preload：预留后续 IPC 能力，目前 renderer 直连 HTTPS 接口即可
window.cinehub = {
  platform: process.platform,
  versions: process.versions
}

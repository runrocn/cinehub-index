import { MacV10Source } from './macv10.js'

// 资源站注册表：目前只保留一个稳定源。
// 后续加新源时，注意不同源 vod_id 不通用，需要做"按片名跨源匹配"才能切换。
export const SOURCES = [
  new MacV10Source({
    id: 'yyzy',
    name: '高清m3u8（yyzy）',
    api: 'https://api.yyzy-tv.vip/inc/api_mac10.php'
  })
]

const STORAGE_KEY = 'cinehub:source'

export function getSource(id) {
  return SOURCES.find(s => s.meta.id === id) || SOURCES[0]
}

export function getSavedSourceId() {
  try { return localStorage.getItem(STORAGE_KEY) || SOURCES[0].meta.id }
  catch { return SOURCES[0].meta.id }
}

export function saveSourceId(id) {
  try { localStorage.setItem(STORAGE_KEY, id) } catch {}
}

import { MacV10Source } from './macv10.js'

// 资源站注册表
export const SOURCES = [
  new MacV10Source({
    id: 'yyzy',
    name: '高清m3u8（yyzy）',
    api: 'https://api.yyzy-tv.vip/inc/api_mac10.php'
  }),
  new MacV10Source({
    id: 'lz',
    name: '量子m3u8（lz）',
    api: 'https://cj.lziapi.com/api.php/provide/vod/from/lzm3u8/'
  }),
  new MacV10Source({
    id: 'wsy',
    name: 'wsym3u8（wsy）',
    api: 'https://api.wsyzy.net/api.php/provide/vod/from/wsym3u8/'
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

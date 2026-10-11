// 本地存储：收藏、历史、播放进度，全部用 localStorage 持久化
const KEY_FAV = 'cinehub:fav'
const KEY_HIST = 'cinehub:history'
const KEY_PROGRESS = 'cinehub:progress'

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// ---- 收藏 ----
export function listFav() { return read(KEY_FAV) }
export function isFav(id) { return listFav().some(x => x.id === id) }
export function toggleFav(item) {
  const arr = listFav()
  const idx = arr.findIndex(x => x.id === item.id)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.unshift({ ...item, savedAt: Date.now() })
  write(KEY_FAV, arr)
  return idx < 0
}

// ---- 历史（保留最近 100 条，按时间倒序）----
export function listHistory() { return read(KEY_HIST) }
export function pushHistory(item) {
  let arr = read(KEY_HIST).filter(x => x.id !== item.id)
  arr.unshift({ ...item, watchedAt: Date.now() })
  if (arr.length > 100) arr = arr.slice(0, 100)
  write(KEY_HIST, arr)
}
export function clearHistory() { write(KEY_HIST, []) }

// ---- 播放进度：progress[vodId] = { fromIdx, epIdx, time, duration, updatedAt } ----
export function getProgress(id) {
  const all = read(KEY_PROGRESS)
  return all[id] || null
}
export function saveProgress(id, p) {
  const all = read(KEY_PROGRESS)
  all[id] = { ...p, updatedAt: Date.now() }
  write(KEY_PROGRESS, all)
}

// 客户端索引层：从托管平台拉取统一索引，提供"按 slug 反查 vodId"能力
//
// 使用方式：
//   1. 把 INDEX_URL 改成你自己的 raw / jsDelivr 地址
//   2. 调用 loadIndex() 拉取（带 localStorage 缓存）
//   3. 用 findVodId(slug, sourceId) 查当前源下的 vodId

const INDEX_URL = 'https://cdn.jsdelivr.net/gh/runrocn/cinehub-index@main/data/index.json'
const CACHE_KEY = 'cinehub:index:v1'
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 小时

let indexPromise = null

/**
 * 加载索引（带缓存）。如果 INDEX_URL 为空，返回 null。
 * @returns {Promise<{movies: Record<string, any>, updatedAt: string} | null>}
 */
export function loadIndex(force = false) {
  if (!INDEX_URL) return Promise.resolve(null)

  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (cached && Date.now() - cached._loadedAt < CACHE_TTL) {
        return Promise.resolve(cached)
      }
    } catch {}
  }

  if (indexPromise && !force) return indexPromise

  indexPromise = fetch(INDEX_URL, { headers: { 'Accept': 'application/json' } })
    .then(r => {
      if (!r.ok) throw new Error(`index HTTP ${r.status}`)
      return r.json()
    })
    .then(data => {
      const wrapped = { ...data, _loadedAt: Date.now() }
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(wrapped)) } catch {}
      return wrapped
    })
    .catch(e => {
      console.warn('[index] load failed:', e.message)
      // 失败时回退到缓存
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (cached) return cached
      } catch {}
      return null
    })
    .finally(() => { indexPromise = null })

  return indexPromise
}

/**
 * 在索引里查某源下的 vodId。
 * @param {string} slug 规范化片名 slug
 * @param {string} sourceId 源 id（如 'yyzy'）
 * @returns {Promise<string | null>}
 */
export async function findVodId(slug, sourceId) {
  const idx = await loadIndex()
  if (!idx?.movies?.[slug]) return null
  return idx.movies[slug].sources?.[sourceId]?.vodId || null
}

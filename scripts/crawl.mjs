// 采集脚本：从各资源站拉影片列表，生成统一索引 data/index.json
// 用法：node scripts/crawl.mjs
//
// 环境变量：
//   CRAWL_PAGES_PER_CATEGORY  每个分类拉取页数（默认 10）
//   CRAWL_CONCURRENCY         并发数（默认 4）

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slugify } from './normalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'data')
const OUT_FILE = path.join(OUT_DIR, 'index.json')

// 要采集的源（与客户端 src/api/index.js 保持一致）
const SOURCES = [
  {
    id: 'yyzy',
    name: '高清m3u8（yyzy）',
    api: 'https://api.yyzy-tv.vip/inc/api_mac10.php'
  }
  // 后续加新源，直接往这里 push，结构相同
]

// 屏蔽的色情/擦边分类（与客户端一致）
const BLOCKED_TYPE_IDS = new Set(['19', '61', '118'])
const EMPTY_TYPE_IDS = new Set(['1', '2', '3', '4', '83'])

const PAGES_PER_CATEGORY = Number(process.env.CRAWL_PAGES_PER_CATEGORY || 10)
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 4)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json, text/html, */*',
      'Referer': 'https://api.yyzy-tv.vip/'
    },
    timeout: 20000
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

async function fetchWithRetry(url, retries = 2) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try { return await fetchJson(url) }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 800 * (i + 1))) }
  }
  throw lastErr
}

// 简单并发池
async function pool(items, concurrency, worker) {
  const ret = []
  let i = 0
  const runners = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++
      try { ret[idx] = await worker(items[idx], idx) }
      catch (e) { ret[idx] = { __error: e.message } }
    }
  })
  await Promise.all(runners)
  return ret
}

async function crawlSource(source) {
  console.log(`\n=== 采集源: ${source.name} (${source.id}) ===`)

  // 1) 拉分类
  const list0 = await fetchWithRetry(`${source.api}?ac=list&pg=1`)
  const cats = (list0.class || [])
    .filter(c => !BLOCKED_TYPE_IDS.has(String(c.type_id)))
    .filter(c => !EMPTY_TYPE_IDS.has(String(c.type_id)))
    .map(c => ({ id: String(c.type_id), name: c.type_name }))
  console.log(`分类数: ${cats.length}`)

  // 2) 每个分类并发拉前 N 页
  const allItems = []
  const tasks = cats.flatMap(c =>
    Array.from({ length: PAGES_PER_CATEGORY }, (_, k) => ({ typeId: c.id, page: k + 1, catName: c.name }))
  )

  const results = await pool(tasks, CONCURRENCY, async ({ typeId, page }) => {
    const j = await fetchWithRetry(`${source.api}?ac=list&pg=${page}&t=${typeId}`)
    return (j.list || [])
      .filter(v => !BLOCKED_TYPE_IDS.has(String(v.type_id)))
      .map(v => ({
        vodId: String(v.vod_id),
        name: v.vod_name,
        typeName: v.type_name,
        year: v.vod_year || '',
        remarks: v.vod_remarks || '',
        typeId: String(v.type_id)
      }))
  })

  for (const arr of results) {
    if (Array.isArray(arr)) allItems.push(...arr)
  }
  console.log(`拉到影片数: ${allItems.length}`)

  return { sourceId: source.id, items: allItems }
}

function buildIndex(sourceResults) {
  /** @type {Record<string, any>} */
  const movies = {}

  for (const { sourceId, items } of sourceResults) {
    for (const it of items) {
      const slug = slugify(it.name)
      if (!slug) continue
      if (!movies[slug]) {
        movies[slug] = {
          name: it.name,
          year: it.year,
          sources: {}
        }
      }
      // 同一源同一 slug 已有记录，跳过
      if (!movies[slug].sources[sourceId]) {
        movies[slug].sources[sourceId] = {
          vodId: it.vodId,
          name: it.name,
          typeName: it.typeName,
          remarks: it.remarks
        }
      }
      // 补年份（如果当前没有）
      if (!movies[slug].year && it.year) movies[slug].year = it.year
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    version: 1,
    sources: sourceResults.map(r => r.sourceId),
    count: Object.keys(movies).length,
    movies
  }
}

async function main() {
  const started = Date.now()
  const sourceResults = []
  for (const src of SOURCES) {
    try {
      const r = await crawlSource(src)
      sourceResults.push(r)
    } catch (e) {
      console.error(`源 ${src.id} 采集失败:`, e.message)
    }
  }

  const index = buildIndex(sourceResults)
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(index), 'utf8')

  const sizeKb = (fs.statSync(OUT_FILE).size / 1024).toFixed(1)
  console.log(`\n索引已写入: ${OUT_FILE}`)
  console.log(`影片数: ${index.count}, 文件大小: ${sizeKb} KB, 耗时: ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

main().catch(e => { console.error(e); process.exit(1) })

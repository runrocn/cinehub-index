import { ResourceSource } from './source.js'

// 苹果CMS V10 MAC 协议适配器
// 接口：api_mac10.php?ac=list&pg=N&t=typeId&wd=keyword
//       api_mac10.php?ac=detail&ids=id1,id2,...

// 屏蔽的色情/擦边分类 type_id
export const BLOCKED_TYPE_IDS = ['19', '61', '118'] // 福利 / 倫理片 / 擦边剧
// 空壳顶层分类（资源站里这些 type_id 本身没有影片）
export const EMPTY_TYPE_IDS = ['1', '2', '3', '4', '83']

// type_id → 大组 映射（与 UI 分组一致）
export function groupOfTypeId(id) {
  const n = Number(id)
  if (Number.isNaN(n)) return '其他'
  if (n === 1 || (n >= 5 && n <= 11)) return '电影'
  if (n === 2 || (n >= 12 && n <= 18) || n === 54) return '电视剧'
  if (n === 3 || (n >= 62 && n <= 65)) return '综艺'
  if (n === 4 || n === 41 || (n >= 66 && n <= 70) || n === 95 || n === 117) return '动漫'
  if (n === 83 || (n >= 96 && n <= 116)) return '短剧'
  if (n === 20) return '纪录片'
  return '其他'
}

export class MacV10Source extends ResourceSource {
  constructor(meta) {
    super(meta)
    this._catCache = null
  }

  async fetch(params) {
    const url = new URL(this.meta.api)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'CineHub/1.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async categories() {
    if (this._catCache) return this._catCache
    const json = await this.fetch({ ac: 'list', pg: 1 })
    const cls = Array.isArray(json.class) ? json.class : []
    const result = cls
      .filter(c => !BLOCKED_TYPE_IDS.includes(String(c.type_id)))
      .filter(c => !EMPTY_TYPE_IDS.includes(String(c.type_id)))
      .map(c => ({ id: String(c.type_id), name: c.type_name }))
    this._catCache = result
    return result
  }

  _filterItems(list) {
    return (list || [])
      .filter(v => !BLOCKED_TYPE_IDS.includes(String(v.type_id)))
      .map(v => ({
        id: String(v.vod_id),
        name: v.vod_name,
        pic: v.vod_pic || '',
        remarks: v.vod_remarks || '',
        typeName: v.type_name || '',
        year: v.vod_year || '',
        area: v.vod_area || '',
        score: v.vod_score || '',
        typeId: String(v.type_id),
        vodTime: v.vod_time || ''
      }))
  }

  async _mergeCovers(items) {
    const needPic = items.filter(x => !x.pic)
    if (needPic.length === 0) return items
    // 分批请求 detail，避免 ids 太长被接口截断
    const BATCH = 15
    const picMap = {}
    for (let i = 0; i < needPic.length; i += BATCH) {
      const chunk = needPic.slice(i, i + BATCH)
      try {
        const ids = chunk.map(x => x.id).join(',')
        const dJson = await this.fetch({ ac: 'detail', ids })
        ;(dJson.list || []).forEach(v => { picMap[String(v.vod_id)] = v.vod_pic || '' })
      } catch (_) {}
    }
    return items.map(it => ({ ...it, pic: picMap[it.id] || it.pic }))
  }

  // 拉某个大组下所有细分分类的第 1 页，合并按时间倒序、去重，前端分页
  async listGroup(groupName, page = 1, pageSize = 20) {
    const cats = await this.categories()
    const subIds = cats.filter(c => groupOfTypeId(c.id) === groupName).map(c => c.id)
    if (subIds.length === 0) {
      return { page, pageCount: 1, total: 0, items: [] }
    }
    // 并行拉每个细分分类最新一页
    const results = await Promise.all(
      subIds.map(tid => this.fetch({ ac: 'list', pg: 1, t: tid }).catch(() => ({ list: [] })))
    )
    let merged = []
    results.forEach(r => { merged = merged.concat(this._filterItems(r.list)) })
    // 去重（按 id）
    const seen = new Set()
    merged = merged.filter(x => {
      if (seen.has(x.id)) return false
      seen.add(x.id)
      return true
    })
    // 按 vod_time 倒序
    merged.sort((a, b) => (b.vodTime || '').localeCompare(a.vodTime || ''))
    const total = merged.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(Math.max(1, page), pageCount)
    const slice = merged.slice((safePage - 1) * pageSize, safePage * pageSize)
    // 只对当前页切片补封面，省请求
    const itemsWithPic = await this._mergeCovers(slice)
    return { page: safePage, pageCount, total, items: itemsWithPic }
  }

  async list({ page = 1, typeId = '', keyword = '', group = '' } = {}) {
    // 大组"全部"模式
    if (group) {
      return this.listGroup(group, page)
    }
    const json = await this.fetch({
      ac: 'list',
      pg: page,
      t: typeId || undefined,
      wd: keyword || undefined
    })
    let items = this._filterItems(json.list)
    items = await this._mergeCovers(items)
    return {
      page: json.page || page,
      pageCount: json.pagecount || 1,
      total: json.total || items.length,
      items
    }
  }

  async detail(id) {
    const json = await this.fetch({ ac: 'detail', ids: id })
    const v = (json.list || [])[0]
    if (!v) throw new Error('未找到详情')

    const fromsRaw = String(v.vod_play_from || '').split('$$$')
    const urlsRaw = String(v.vod_play_url || '').split('$$$')
    const froms = fromsRaw.map((name, i) => {
      const chunk = urlsRaw[i] || ''
      const episodes = chunk
        .split('#')
        .filter(Boolean)
        .map(seg => {
          const idx = seg.indexOf('$')
          if (idx < 0) return { name: seg, url: seg }
          return { name: seg.slice(0, idx), url: seg.slice(idx + 1) }
        })
      return { name: name || `线路${i + 1}`, episodes }
    }).filter(f => f.episodes.length > 0)

    const content = String(v.vod_content || '').replace(/<[^>]+>/g, '').trim()

    return {
      id: String(v.vod_id),
      name: v.vod_name,
      pic: v.vod_pic || '',
      year: v.vod_year || '',
      area: v.vod_area || '',
      lang: v.vod_lang || '',
      remarks: v.vod_remarks || '',
      score: v.vod_score || '',
      actor: v.vod_actor || '',
      director: v.vod_director || '',
      typeName: v.type_name || '',
      content,
      froms
    }
  }
}

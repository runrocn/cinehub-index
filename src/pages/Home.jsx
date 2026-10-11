import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { useSource } from '../api/context.jsx'

// 首页顶部显示的分组
const TOP_GROUPS = ['电影', '电视剧', '综艺', '动漫', '短剧', '纪录片']

// 按 type_id 数字范围归组（与 Categories 页保持一致）
function groupOf(id) {
  const n = Number(id)
  if (n === 1 || (n >= 5 && n <= 11)) return '电影'
  if (n === 2 || (n >= 12 && n <= 18) || n === 54) return '电视剧'
  if (n === 3 || (n >= 62 && n <= 65)) return '综艺'
  if (n === 4 || n === 41 || (n >= 66 && n <= 70) || n === 95 || n === 117) return '动漫'
  if (n === 83 || (n >= 96 && n <= 116)) return '短剧'
  if (n === 20) return '纪录片'
  return '其他'
}

export default function Home() {
  const [cats, setCats] = useState([])
  const [activeGroup, setActiveGroup] = useState('电影')
  const [activeSubId, setActiveSubId] = useState('') // '' = 该组"全部"
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [loading, setLoading] = useState(false)
  const [kw, setKw] = useState('')
  const navigate = useNavigate()
  const { source: src } = useSource()

  // 拉分类
  useEffect(() => {
    src.categories().then(setCats).catch(() => {})
  }, [src])

  // 当前组下的细分分类
  const subCats = useMemo(() => {
    return cats.filter(c => groupOf(c.id) === activeGroup)
  }, [cats, activeGroup])

  // 拉列表
  useEffect(() => {
    setPage(1)
  }, [activeGroup, activeSubId])

  useEffect(() => {
    setLoading(true)
    // "全部"时传 group，并行合并该大组下所有细分分类
    const req = activeSubId
      ? src.list({ page, typeId: activeSubId })
      : src.list({ page, group: activeGroup })
    req.then(res => {
      setItems(res.items)
      setTotal(res.pageCount)
    }).finally(() => setLoading(false))
  }, [src, page, activeSubId, activeGroup])

  const onSearch = (e) => {
    e.preventDefault()
    const q = kw.trim()
    if (q) navigate(`/search?kw=${encodeURIComponent(q)}`)
  }

  const switchGroup = (g) => {
    setActiveGroup(g)
    setActiveSubId('')
  }

  const activeSubName = subCats.find(c => c.id === activeSubId)?.name
  const title = activeSubId
    ? `${activeGroup} · ${activeSubName}`
    : `${activeGroup} · 全部`

  return (
    <div className="p-6">
      {/* 顶部栏：左标题 右搜索框 */}
      <header className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">CineHub</h1>
        </div>
        <form onSubmit={onSearch} className="flex gap-2 flex-1 max-w-md">
          <input
            value={kw}
            onChange={e => setKw(e.target.value)}
            placeholder="搜索片名 / 演员 / 导演..."
            className="flex-1 px-4 py-2 bg-white border border-neutral-300 rounded-full outline-none focus:ring-2 focus:ring-rose-500 text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-full text-sm hover:bg-rose-700">
            搜索
          </button>
        </form>
      </header>

      {/* 第一行：大组切换 */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {TOP_GROUPS.map(g => (
          <button
            key={g}
            onClick={() => switchGroup(g)}
            className={`px-4 py-1.5 text-sm rounded-full transition ${
              g === activeGroup
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:border-rose-500 hover:text-rose-600'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* 第二行：细分分类 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5 text-sm">
        <button
          onClick={() => setActiveSubId('')}
          className={`px-3 py-1 rounded ${
            activeSubId === ''
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          全部
        </button>
        {subCats.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveSubId(c.id)}
            className={`px-3 py-1 rounded ${
              c.id === activeSubId
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {c.name}
          </button>
        ))}
        {subCats.length === 0 && (
          <span className="text-neutral-400">该组暂未分类</span>
        )}
      </div>

      <h2 className="text-lg font-semibold text-neutral-800 mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map(it => <MovieCard key={it.id} item={it} />)}
      </div>
      {items.length === 0 && !loading && (
        <div className="text-center text-neutral-500 py-10">暂无内容</div>
      )}
      {loading && <div className="text-center text-neutral-500 py-6">加载中...</div>}

      <Pagination page={page} total={total} onChange={setPage} />
    </div>
  )
}

export function Pagination({ page, total, onChange }) {
  return (
    <div className="flex justify-center items-center gap-3 mt-8">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 bg-white border border-neutral-300 rounded text-neutral-700 disabled:opacity-40 hover:bg-neutral-50"
      >上一页</button>
      <span className="text-sm text-neutral-500">第 {page} / {total} 页</span>
      <button
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 bg-white border border-neutral-300 rounded text-neutral-700 disabled:opacity-40 hover:bg-neutral-50"
      >下一页</button>
    </div>
  )
}

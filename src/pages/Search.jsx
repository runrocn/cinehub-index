import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { useSource } from '../api/context.jsx'

export default function Search() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialKw = params.get('kw') || ''
  const [kw, setKw] = useState(initialKw)
  const [items, setItems] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const { source: src } = useSource()

  const doSearch = async (word) => {
    const q = (word !== undefined ? word : kw).trim()
    if (!q) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await src.list({ keyword: q, page: 1 })
      setItems(res.items)
    } finally { setLoading(false) }
  }

  // 首次进入如果带了 ?kw=xxx，自动搜索
  useEffect(() => {
    if (initialKw) doSearch(initialKw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = (e) => {
    e.preventDefault()
    doSearch()
    navigate(`/search?kw=${encodeURIComponent(kw.trim())}`, { replace: true })
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-4">搜索</h1>
      <form onSubmit={onSubmit} className="flex gap-2 mb-6 max-w-2xl">
        <input
          autoFocus
          value={kw}
          onChange={e => setKw(e.target.value)}
          placeholder="输入片名 / 演员 / 导演..."
          className="flex-1 px-4 py-2.5 bg-white border border-neutral-300 rounded outline-none focus:ring-2 focus:ring-rose-500 text-neutral-800"
        />
        <button type="submit" className="px-5 py-2.5 bg-rose-600 text-white rounded hover:bg-rose-700">
          搜索
        </button>
      </form>

      {loading && <div className="text-neutral-500 py-6">搜索中...</div>}
      {!loading && searched && items.length === 0 && (
        <div className="text-neutral-500 py-6">没有找到「{kw}」相关的内容</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map(it => <MovieCard key={it.id} item={it} />)}
      </div>
    </div>
  )
}

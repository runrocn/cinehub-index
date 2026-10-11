import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { useSource } from '../api/context.jsx'
import { Pagination } from './Home.jsx'

// 按 type_id 数字范围分组
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

const GROUP_ORDER = ['电影', '电视剧', '综艺', '动漫', '短剧', '纪录片', '其他']

export default function Categories() {
  const { source: src } = useSource()
  const [params] = useSearchParams()
  const groupParam = params.get('group') || ''
  const [cats, setCats] = useState([])
  const [activeId, setActiveId] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    src.categories().then(all => {
      setCats(all)
      // 若带了 ?group=，自动选中该组下第一个分类；否则选所有分类的第一个
      if (groupParam) {
        const firstInGroup = all.find(c => groupOf(c.id) === groupParam)
        setActiveId(firstInGroup ? firstInGroup.id : (all[0]?.id || ''))
      } else {
        setActiveId(all[0]?.id || '')
      }
    }).catch(() => {})
  }, [src, groupParam])

  const groups = useMemo(() => {
    const m = {}
    GROUP_ORDER.forEach(g => { m[g] = [] })
    cats.forEach(c => {
      const g = groupOf(c.id)
      if (!m[g]) m[g] = []
      m[g].push(c)
    })
    return m
  }, [cats])

  useEffect(() => { setPage(1) }, [activeId])

  useEffect(() => {
    if (!activeId) return
    setLoading(true)
    src.list({ page, typeId: activeId }).then(res => {
      setItems(res.items)
      setTotal(Math.max(res.pageCount, 1))
    }).finally(() => setLoading(false))
  }, [src, page, activeId])

  const activeName = cats.find(c => c.id === activeId)?.name || ''

  return (
    <div className="flex h-full">
      {/* 左侧分组 */}
      <aside className="w-56 shrink-0 border-r border-neutral-200 overflow-y-auto bg-white">
        {GROUP_ORDER.map(g => {
          const list = groups[g] || []
          if (list.length === 0) return null
          return (
            <div key={g} className="py-3 px-3">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">{g}</div>
              <div className="flex flex-col">
                {list.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`text-left px-2 py-1.5 rounded text-sm transition ${
                      c.id === activeId
                        ? 'bg-rose-50 text-rose-600 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </aside>

      {/* 右侧内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <header className="mb-4 flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-neutral-900">{activeName}</h1>
          <span className="text-sm text-neutral-500">共 {total} 页</span>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(it => <MovieCard key={it.id} item={it} />)}
        </div>
        {items.length === 0 && !loading && (
          <div className="text-center text-neutral-500 py-10">该分类暂无数据</div>
        )}
        {loading && <div className="text-center text-neutral-500 py-6">加载中...</div>}
        <Pagination page={page} total={total} onChange={setPage} />
      </div>
    </div>
  )
}

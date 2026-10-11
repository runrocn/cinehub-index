import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { useSource } from '../api/context.jsx'
import { Pagination } from './Home.jsx'

export default function Category() {
  const { typeId } = useParams()
  const { source: src } = useSource()
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    src.categories().then(setCats).catch(() => {})
  }, [src])

  useEffect(() => { setPage(1) }, [typeId])

  useEffect(() => {
    setLoading(true)
    src.list({ page, typeId }).then(res => {
      setItems(res.items)
      setTotal(Math.max(res.pageCount, 1))
    }).finally(() => setLoading(false))
  }, [src, page, typeId])

  const current = cats.find(c => String(c.id) === String(typeId))

  return (
    <div className="p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">{current?.name || '分类浏览'}</h1>
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
  )
}

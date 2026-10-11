import { useState } from 'react'
import MovieCard from '../components/MovieCard.jsx'
import { listFav, listHistory, clearHistory } from '../store.js'

export default function Library() {
  const [tab, setTab] = useState('fav')
  const [, force] = useState(0)

  const favs = listFav()
  const history = listHistory()

  const onClear = () => {
    if (confirm('确定清空全部播放历史？')) {
      clearHistory()
      force(x => x + 1)
    }
  }

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">我的</h1>
        {tab === 'history' && history.length > 0 && (
          <button onClick={onClear} className="text-sm text-neutral-500 hover:text-red-500">
            清空历史
          </button>
        )}
      </header>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('fav')}
          className={`px-4 py-1.5 rounded ${tab === 'fav' ? 'bg-rose-600 text-white' : 'bg-white border border-neutral-300 text-neutral-700'}`}
        >收藏 {favs.length}</button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-1.5 rounded ${tab === 'history' ? 'bg-rose-600 text-white' : 'bg-white border border-neutral-300 text-neutral-700'}`}
        >最近观看 {history.length}</button>
      </div>

      {tab === 'fav' && favs.length === 0 && <Empty text="还没有收藏，去详情页点 ☆ 收藏吧" />}
      {tab === 'history' && history.length === 0 && <Empty text="还没有观看记录" />}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {(tab === 'fav' ? favs : history).map(it => <MovieCard key={it.id} item={it} />)}
      </div>
    </div>
  )
}

function Empty({ text }) {
  return <div className="text-center text-neutral-500 py-16">{text}</div>
}

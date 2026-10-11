import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Player from '../components/Player.jsx'
import { useSource } from '../api/context.jsx'
import { SOURCES as allSources } from '../api/index.js'
import { saveSourceId } from '../api/index.js'
import { toggleFav, isFav, getProgress, saveProgress, pushHistory } from '../store.js'

export default function Detail() {
  const { id } = useParams()
  const { source: src, sourceId, setSourceId: ctxSetSource } = useSource()

  const [detail, setDetail] = useState(null)
  const [fromIdx, setFromIdx] = useState(0)
  const [epIdx, setEpIdx] = useState(0)
  const [startAt, setStartAt] = useState(0)
  const [faved, setFaved] = useState(false)
  const [error, setError] = useState('')
  const [switchMsg, setSwitchMsg] = useState('')
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    setError('')
    setSwitchMsg('')
    setDetail(null)
    setFromIdx(0)
    setEpIdx(0)
    setStartAt(0)
    src.detail(id).then(d => {
      setDetail(d)
      setFaved(isFav(id))

      const p = getProgress(id)
      if (p && d.froms[p.fromIdx]?.episodes[p.epIdx]) {
        setFromIdx(p.fromIdx)
        setEpIdx(p.epIdx)
        setStartAt(p.time || 0)
      }

      pushHistory({
        id: d.id, name: d.name, pic: d.pic, remarks: d.remarks,
        typeName: d.typeName, year: d.year, score: d.score
      })
    }).catch(e => setError(e.message || '加载失败'))
  }, [src, id])

  const currentEp = useMemo(() => {
    if (!detail) return null
    return detail.froms[fromIdx]?.episodes[epIdx] || null
  }, [detail, fromIdx, epIdx])

  const selectEp = (fi, ei) => { setFromIdx(fi); setEpIdx(ei); setStartAt(0) }

  const handleToggleFav = () => {
    if (!detail) return
    const now = toggleFav({
      id: detail.id, name: detail.name, pic: detail.pic,
      remarks: detail.remarks, typeName: detail.typeName,
      year: detail.year, score: detail.score
    })
    setFaved(now)
  }

  // 切换源：按当前片名在新源搜索，取第一个匹配结果
  const switchTo = async (newSourceId) => {
    if (!detail || newSourceId === sourceId) return
    setSwitching(true)
    setSwitchMsg('')
    try {
      const target = allSources.find(s => s.meta.id === newSourceId)
      if (!target) return
      const list = await target.search(detail.name, 1)
      if (!list || list.length === 0) {
        setSwitchMsg(`在 ${target.meta.name} 未找到《${detail.name}》`)
        return
      }
      const matched = list[0]
      saveSourceId(newSourceId)
      ctxSetSource(newSourceId)
      window.location.hash = `#/detail/${matched.id}`
    } catch (e) {
      setSwitchMsg('切换失败：' + (e.message || ''))
    } finally {
      setSwitching(false)
    }
  }

  if (error) return <div className="p-8 text-center text-red-500">{error}</div>
  if (!detail) return <div className="p-8 text-center text-neutral-500">加载中...</div>

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {currentEp ? (
        <Player
          key={`${fromIdx}-${epIdx}`}
          url={currentEp.url}
          startAt={startAt}
          onProgress={({ time, duration }) => {
            if (duration > 0 && time / duration > 0.95) return
            saveProgress(detail.id, { fromIdx, epIdx, time, duration })
          }}
        />
      ) : (
        <div className="aspect-video bg-neutral-100 flex items-center justify-center text-neutral-500 rounded">
          该资源暂无播放地址
        </div>
      )}

      <div className="mt-6 flex gap-6 bg-white rounded-lg p-5 border border-neutral-200">
        <img
          src={detail.pic}
          alt={detail.name}
          referrerPolicy="no-referrer"
          className="w-40 aspect-[2/3] object-cover rounded bg-neutral-100 shrink-0 hidden md:block"
          onError={e => { e.target.style.visibility = 'hidden' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-neutral-900">{detail.name}</h1>
            {detail.score && <span className="text-rose-600 font-semibold">★ {detail.score}</span>}
            <button
              onClick={handleToggleFav}
              className={`px-3 py-1.5 text-sm rounded ${
                faved ? 'bg-rose-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {faved ? '已收藏' : '☆ 收藏'}
            </button>
          </div>
          <div className="text-sm text-neutral-600 mt-2 space-y-1">
            <div>类型：{[detail.typeName, detail.remarks].filter(Boolean).join(' / ')}</div>
            <div>年份 / 地区：{[detail.year, detail.area, detail.lang].filter(Boolean).join(' / ')}</div>
            {detail.director && <div>导演：{detail.director}</div>}
            {detail.actor && <div>主演：{detail.actor}</div>}
          </div>
          {detail.content && (
            <p className="text-sm text-neutral-700 mt-4 leading-relaxed line-clamp-4">{detail.content}</p>
          )}
        </div>
      </div>

      {/* 源切换 */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-neutral-600">资源源：</span>
        {allSources.map(s => (
          <button
            key={s.meta.id}
            onClick={() => switchTo(s.meta.id)}
            disabled={switching || s.meta.id === sourceId}
            className={`px-3 py-1.5 text-sm rounded ${
              s.meta.id === sourceId
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {s.meta.name}
          </button>
        ))}
        {switchMsg && <span className="text-sm text-amber-600 ml-2">{switchMsg}</span>}
      </div>

      {detail.froms.length > 1 && (
        <div className="mt-6">
          <div className="text-sm text-neutral-600 mb-2">播放线路：</div>
          <div className="flex gap-2 flex-wrap">
            {detail.froms.map((f, i) => (
              <button
                key={i}
                onClick={() => selectEp(i, 0)}
                className={`px-3 py-1.5 text-sm rounded ${
                  i === fromIdx ? 'bg-rose-600 text-white' : 'bg-white border border-neutral-300 text-neutral-700'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {detail.froms[fromIdx]?.episodes?.length > 0 && (
        <div className="mt-6">
          <div className="text-sm text-neutral-600 mb-2">
            选集（共 {detail.froms[fromIdx].episodes.length} 集）
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {detail.froms[fromIdx].episodes.map((ep, i) => (
              <button
                key={i}
                onClick={() => selectEp(fromIdx, i)}
                className={`px-2 py-2 text-sm rounded truncate border ${
                  i === epIdx
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
                title={ep.name}
              >
                {ep.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

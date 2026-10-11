import { useNavigate } from 'react-router-dom'

export default function MovieCard({ item }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/detail/${item.id}`)}
      className="group text-left bg-white rounded-lg overflow-hidden border border-neutral-200 hover:ring-2 hover:ring-rose-500 transition"
    >
      <div className="relative aspect-[2/3] bg-neutral-100 overflow-hidden">
        {item.pic ? (
          <img
            src={item.pic}
            alt={item.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : null}
        {item.remarks ? (
          <span className="absolute top-2 right-2 bg-black/70 text-xs px-1.5 py-0.5 rounded text-rose-400">
            {item.remarks}
          </span>
        ) : null}
      </div>
      <div className="p-2">
        <div className="text-sm truncate text-neutral-800 group-hover:text-rose-600">{item.name}</div>
        <div className="text-xs text-neutral-500 mt-0.5 truncate">
          {[item.year, item.typeName, item.score].filter(Boolean).join(' · ')}
        </div>
      </div>
    </button>
  )
}

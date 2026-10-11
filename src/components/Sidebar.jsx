import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/categories', label: '分类', icon: '🗂️' },
  { to: '/library', label: '我的', icon: '⭐' }
]

export default function Sidebar() {
  const navigate = useNavigate()
  return (
    <aside className="w-20 shrink-0 bg-white border-r border-neutral-200 flex flex-col items-center py-4">
      <button
        onClick={() => navigate('/')}
        className="mb-6 text-lg font-bold text-rose-600"
        title="CineHub"
      >
        CH
      </button>
      <nav className="flex flex-col gap-2 w-full">
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-xs rounded mx-2 transition ${
                isActive
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`
            }
          >
            <span className="text-base">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto text-[10px] text-neutral-400 px-2 text-center leading-tight">
        CineHub v0.1
      </div>
    </aside>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import { SourceProvider } from './api/context.jsx'
import Home from './pages/Home.jsx'
import Category from './pages/Category.jsx'
import Categories from './pages/Categories.jsx'
import Search from './pages/Search.jsx'
import Detail from './pages/Detail.jsx'
import Library from './pages/Library.jsx'

export default function App() {
  return (
    <SourceProvider>
      <div className="flex h-full w-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/category/:typeId" element={<Category />} />
            <Route path="/search" element={<Search />} />
            <Route path="/detail/:id" element={<Detail />} />
            <Route path="/library" element={<Library />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </SourceProvider>
  )
}

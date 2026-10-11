import { createContext, useContext, useState, useCallback } from 'react'
import { SOURCES, getSource, getSavedSourceId, saveSourceId } from './index.js'

const SourceContext = createContext(null)

export function SourceProvider({ children }) {
  const [sourceId, setSourceIdState] = useState(() => getSavedSourceId())

  const setSourceId = useCallback((id) => {
    setSourceIdState(id)
    saveSourceId(id)
    // 切换源时清掉分类缓存（每个源分类不同）
    const src = getSource(id)
    if (src) src._catCache = null
  }, [])

  const source = getSource(sourceId)

  return (
    <SourceContext.Provider value={{ source, sourceId, setSourceId, allSources: SOURCES }}>
      {children}
    </SourceContext.Provider>
  )
}

export function useSource() {
  const ctx = useContext(SourceContext)
  if (!ctx) throw new Error('useSource must be used within SourceProvider')
  return ctx
}

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import DPlayer from 'dplayer'
// DPlayer 1.27 已把样式内联进 JS bundle，无需单独 import CSS

// 通用 m3u8 播放器（基于 DPlayer + hls.js）
// props: url, startAt(秒), onProgress({time, duration})
export default function Player({ url, startAt = 0, onProgress }) {
  const containerRef = useRef(null)
  const dpRef = useRef(null)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  useEffect(() => {
    if (!containerRef.current || !url) return

    // 销毁旧实例
    if (dpRef.current) {
      try { dpRef.current.destroy() } catch (_) {}
      dpRef.current = null
      containerRef.current.innerHTML = ''
    }

    let hls = null

    const dp = new DPlayer({
      container: containerRef.current,
      theme: '#e11d48',
      lang: 'zh-cn',
      screenshot: false,
        hotkey: true,
        volume: 0.8,
        playbackSpeed: [0.5, 0.75, 1, 1.25, 1.5, 2],
        video: {
          url,
          type: 'customHls',
          customType: {
            customHls: function (video, player) {
              hls = new Hls({
                enableWorker: true,
                manifestLoadingMaxRetry: 6,
                levelLoadingMaxRetry: 6,
                fragLoadingMaxRetry: 8,
                // 自动回退到更低码率
                startLevel: -1
              })
              hls.loadSource(video.src)
              hls.attachMedia(video)

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (startAt > 0) video.currentTime = startAt
                video.play().catch(() => {})
              })

              hls.on(Hls.Events.ERROR, (_evt, data) => {
                if (!data.fatal) return
                console.error('[hls fatal]', data.type, data.details, data)
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                  try { hls.startLoad() } catch (_) {}
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                  try { hls.recoverMediaError() } catch (_) {}
                } else {
                  player.notice('播放失败：' + (data.details || '未知错误'))
                }
              })
            }
          }
        }
      })

      // 进度上报（每 5 秒）
      const timer = setInterval(() => {
        const v = dp.video
        if (v && onProgressRef.current) {
          onProgressRef.current({ time: v.currentTime || 0, duration: v.duration || 0 })
        }
      }, 5000)

      dpRef.current = dp

      return () => {
        clearInterval(timer)
        if (hls) { try { hls.destroy() } catch (_) {} }
        try { dp.destroy() } catch (_) {}
        dpRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url])

    return <div ref={containerRef} className="w-full bg-black aspect-video" />
  }

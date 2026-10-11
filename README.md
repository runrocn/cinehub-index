# CineHub

PC 端在线观影客户端（Windows），基于 **Electron + React + Vite + Tailwind + hls.js**。
当前对接「高清 m3u8 资源」（苹果 CMS V10 MAC 协议），后续新增其他资源站只需在 `src/api/index.js` 注册一行。

## 目录结构

```
cinehub/
├── electron/                # Electron 主进程
│   ├── main.js               # 窗口、CORS 放行、dev/prod 加载
│   └── preload.js
├── src/
│   ├── api/
│   │   ├── source.js         # 资源站抽象接口（必须实现）
│   │   ├── macv10.js         # 苹果 CMS V10 MAC 协议适配器
│   │   └── index.js          # 资源站注册表（在这里加新站）
│   ├── pages/               # 首页 / 分类 / 搜索 / 详情播放 / 我的
│   ├── components/           # 侧边栏、影片卡片、hls 播放器
│   └── store.js              # 收藏 / 历史 / 播放进度（localStorage）
└── package.json
```

## 已对接的资源站

| 站点 | 接口 | 协议 |
|---|---|---|
| 高清 m3u8 资源（yyzy） | `https://api.yyzy-tv.vip/inc/api_mac10.php` | 苹果 CMS V10 MAC |

接口约定（已在 `src/api/macv10.js` 适配）：
- 列表 / 搜索：`?ac=list&pg=页码&t=分类ID&wd=关键词`
- 详情：`?ac=detail&ids=影片ID`
- `vod_play_from` 与 `vod_play_url` 用 `$$$` 分隔多线路，每线路内每集用 `#` 分隔、`集名$地址` 形式

## 开发 / 运行

```powershell
cd cinehub

# 首次安装（国内网络建议先设镜像，避免 electron 二进制下载失败）
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm install

# 一键启动（vite + electron 同时起）
npm run dev:all
```

## 打包成 Windows exe

```powershell
npm run dist
# 产物在 dist_electron/ 目录下，生成 NSIS 安装包
```

> 首次打包会下载 electron-builder 依赖，若失败请先设置上面的 `ELECTRON_BUILDER_BINARIES_MIRROR` 环境变量再执行。

## 功能

- 首页最新上架（20/页）、分类快捷入口（从接口自动拉取）
- 按分类分页浏览
- 关键词搜索（片名 / 演员 / 导演）
- 详情页：海报、简介、评分、多播放线路切换、选集、hls.js 播放 m3u8
- 自动记住播放进度（再次打开同一影片自动跳到上次时间和集数）
- 收藏、最近观看历史（本地持久化，最多保留 100 条）

## 怎么加新资源站

1. 在 `src/api/` 下新建一个适配器，比如 `newssite.js`，继承 `ResourceSource` 并实现三个方法：
   - `categories()` 返回 `[{id, name}]`
   - `list({page, typeId, keyword})` 返回 `{page, pageCount, items:[{id,name,pic,remarks,typeName,year,score}]}`
   - `detail(id)` 返回标准详情对象（结构参考 `macv10.js`）
2. 在 `src/api/index.js` 的 `SOURCES` 数组里 push 一个新实例即可。

当前 UI 只展示默认第一个源；后续可在侧边栏加一个「资源源」切换下拉，把 `getSource()` 改成读当前选中的源。

## 已知点 / 后续可优化

- **播放必须禁用 HTTP/2**：该资源站的播放 CDN（`*.high24-playback.com`、`*.yzzy*-play.com` 等）的 HTTP/2 / QUIC 连接会被中间网络设备重置，Chromium 报 `net::ERR_FAILED`、hls.js 报 `manifestLoadError`。已在 `electron/main.js` 启动参数里加 `--disable-http2 --disable-quic` 强制走 HTTP/1.1。**这是播放能跑通的关键，勿删**
- CORS 已在 Electron 主进程统一放行（`electron/main.js` 里 `onHeadersReceived` 补 `Access-Control-Allow-Origin:*`），浏览器直接打开不适用
- 播放诊断工具：`npx electron electron/diag.js`，会跑一遍 fetch → hls 解析 → 分片加载的完整链路并打印结果，排查播放问题时用
- 部分 m3u8 CDN 会校验 Referer，如出现 403，可在主进程的 `webRequest.onBeforeSendHeaders` 里把 Referer 改成对应域名
- 暂无图片懒加载占位、弹幕、倍速记忆；播放器用 DPlayer 皮肤，后续可自定义

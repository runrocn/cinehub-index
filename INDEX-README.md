# CineHub 多源索引部署指南

采集脚本 + GitHub Actions 每天自动生成统一索引，客户端从托管平台读。

## 一次性部署

### 1. 建 GitHub 仓库
- 新建一个公开仓库，比如 `cinehub-index`
- 把当前 `cinehub/` 目录整个 push 上去（或只 push `scripts/`、`.github/`、`data/`）

### 2. 开启 Actions 权限
仓库 → Settings → Actions → General → Workflow permissions → 选 "Read and write permissions"
（否则 workflow 里 `git push` 会被拒）

### 3. 手动跑一次采集
进入仓库 → Actions → 选 "crawl-index" → Run workflow
跑完会自动生成 `data/index.json` 并 commit。

### 4. 拿到索引访问 URL
推荐 jsDelivr CDN（国内比 raw.githubusercontent.com 稳）：
```
https://cdn.jsdelivr.net/gh/<你的用户名>/<仓库名>@main/data/index.json
```
把这个 URL 填到 `src/api/index-store.js` 顶部的 `INDEX_URL` 常量。

### 5. 重启客户端
`npm run dev:all`，启动时会自动拉索引并缓存 12 小时。

## 本地测试采集

```powershell
# 小规模跑（每个分类 2 页，快速验证）
$env:CRAWL_PAGES_PER_CATEGORY="2"; node scripts/crawl.mjs

# 全量跑（每个分类 10 页，约 1 万条，30 秒）
npm run crawl
```

输出：`data/index.json`，结构：
```json
{
  "updatedAt": "2026-10-11T...",
  "count": 1762,
  "movies": {
    "<slug>": {
      "name": "牧神记",
      "year": "2024",
      "sources": {
        "yyzy": { "vodId": "60261", "name": "牧神记", "remarks": "更新104集" }
      }
    }
  }
}
```

## 加新源

1. 在 `scripts/crawl.mjs` 的 `SOURCES` 数组里 push 一个新源对象
2. 在 `src/api/index.js` 注册同样的源
3. 等下次 Actions 跑完，新源的 vod_id 会自动合并到 `sources.xxx` 字段
4. 客户端切换源时，用 `findVodId(slug, sourceId)` 反查

## 限制与注意

- jsDelivr 单文件限制 20MB，目前索引约 1-3MB，远未到上限
- jsDelivr 有缓存延迟（push 后最长 12 小时），紧急更新可以 URL 加 `?v=时间戳`
- GitHub Actions 免费额度 2000 分钟/月，每天一次采集约 30 秒，月消耗 15 分钟
- 片名匹配靠规范化 slug，繁简、特殊符号略有差异可能错配，后续可加"年份+主演"联合判断

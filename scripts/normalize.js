// 片名规范化：把不同源的同名影片归一到同一个 slug
// 规则：小写、去标点/空格/特殊符号、去年份和常见后缀

const STOP_WORDS = [
  'HD', 'hd', '高清', '中字', '国语', '粤语', '英语', '日语', '韩语',
  '完结', '更新', '全', '已完结', 'DVD', 'BD', 'WEB', 'web',
  '第二季', '第三季', '第四季', '第五季', '第六季', '第七季', '第八季',
  '第2季', '第3季', '第4季', '第5季', '第6季', '第7季', '第8季'
]

export function normalizeName(name) {
  if (!name) return ''
  let s = String(name)
    .trim()
    .toLowerCase()
    // 去年份
    .replace(/(19|20)\d{2}/g, '')
    // 去标点、空格、特殊符号
    .replace(/[\s\-\_:：·•,，.。!！?？'""\(\)（）\[\]【】]/g, '')

  // 去常见后缀（多跑几遍，因为可能叠加）
  let prev
  do {
    prev = s
    for (const w of STOP_WORDS) {
      if (s.endsWith(w.toLowerCase())) {
        s = s.slice(0, -w.length)
      }
    }
  } while (s !== prev)

  return s
}

// 生成文件系统友好的 slug（用作索引 key）
export function slugify(name) {
  return normalizeName(name)
}

// 资源站抽象接口。后续新增资源站时，实现同样的方法并在 sources.js 注册即可。
// 统一返回结构：
//   categories():  [{ id, name }]
//   list({page, typeId, keyword}): { page, pageCount, total, items: [{id, name, pic, remarks, typeName, year, score}] }
//   detail(id):     { id, name, pic, year, area, lang, remarks, score, actor, director, content, froms: [{name, episodes:[{name, url}]}] }

export class ResourceSource {
  constructor(meta) {
    this.meta = meta // { id, name, api }
  }
  async categories() { throw new Error('not implemented') }
  async list(_opts) { throw new Error('not implemented') }
  async detail(_id) { throw new Error('not implemented') }
}

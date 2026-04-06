import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BaseModel } from '../src/orm/base_model/index.js'
import { Preloader } from '../src/orm/preloader/index.js'
import { morphTo } from '../src/addons/morph-relations/index.js'

type Row = Record<string, any>

function createFakeBuilder(rows: Row[], primaryKey: string) {
  let equals: any = undefined
  let inValues: any[] | undefined

  return {
    where(_column: string, value: any) {
      equals = value
      return this
    },
    whereIn(_column: string, values: any[]) {
      inValues = values
      return this
    },
    debug(_v: boolean) {
      return this
    },
    sideload(_v: any) {
      return this
    },
    async first() {
      return rows.find((row) => row[primaryKey] === equals) || null
    },
    async exec() {
      if (inValues) {
        const set = new Set(inValues)
        return rows.filter((row) => set.has(row[primaryKey]))
      }
      return rows
    },
  }
}

test('morphTo preload: loads one related row', async () => {
  class Post extends BaseModel {
    static override table = 'posts'
    static override primaryKey = 'id'
    static override query() {
      return createFakeBuilder(
        [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' },
        ],
        'id'
      ) as any
    }
  }

  class Comment extends BaseModel {
    static override table = 'comments'
    static override primaryKey = 'id'
    declare commentableType: string | null
    declare commentableId: number | null
  }

  morphTo({ name: 'commentable', morphMap: { posts: () => Post } })(Comment.prototype as any, 'commentable')

  const comment = new Comment()
  comment.commentableType = 'posts'
  comment.commentableId = 2

  const preloader = new Preloader(Comment as any)
  preloader.load('commentable')
  await preloader.processAllForOne(comment as any, {} as any)

  assert.equal(comment.$getRelated('commentable')?.title, 'Post 2')
})

test('morphTo preload: loads many rows grouped by type', async () => {
  class Post extends BaseModel {
    static override table = 'posts'
    static override primaryKey = 'id'
    static override query() {
      return createFakeBuilder(
        [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' },
        ],
        'id'
      ) as any
    }
  }

  class Video extends BaseModel {
    static override table = 'videos'
    static override primaryKey = 'id'
    static override query() {
      return createFakeBuilder([{ id: 10, title: 'Video 10' }], 'id') as any
    }
  }

  class Comment extends BaseModel {
    static override table = 'comments'
    static override primaryKey = 'id'
    declare commentableType: string | null
    declare commentableId: number | null
  }

  morphTo({
    name: 'commentable',
    morphMap: { posts: () => Post, videos: () => Video },
  })(Comment.prototype as any, 'commentable')

  const c1 = new Comment()
  c1.commentableType = 'posts'
  c1.commentableId = 1

  const c2 = new Comment()
  c2.commentableType = 'videos'
  c2.commentableId = 10

  const preloader = new Preloader(Comment as any)
  preloader.load('commentable')
  await preloader.processAllForMany([c1 as any, c2 as any], {} as any)

  assert.equal(c1.$getRelated('commentable')?.title, 'Post 1')
  assert.equal(c2.$getRelated('commentable')?.title, 'Video 10')
})

test('morphTo related client: associate and dissociate', async () => {
  class Post extends BaseModel {
    static override table = 'posts'
    static override primaryKey = 'id'
    declare id: number
  }

  class Comment extends BaseModel {
    static override table = 'comments'
    static override primaryKey = 'id'
    declare commentableType: string | null
    declare commentableId: number | null
    declare saveCalls: number
    override async save() {
      this.saveCalls = (this.saveCalls || 0) + 1
      return this
    }
  }

  morphTo({ name: 'commentable', morphMap: { posts: () => Post } })(Comment.prototype as any, 'commentable')

  const post = new Post()
  post.id = 33

  const comment = new Comment()
  comment.saveCalls = 0

  await (comment as any).related('commentable').associate(post)
  assert.equal(comment.commentableType, 'posts')
  assert.equal(comment.commentableId, 33)

  await (comment as any).related('commentable').dissociate()
  assert.equal(comment.commentableType, null)
  assert.equal(comment.commentableId, null)
  assert.equal(comment.saveCalls, 2)
})

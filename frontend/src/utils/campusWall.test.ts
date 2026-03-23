import { describe, expect, it } from 'vitest'

import {
  ANONYMOUS_PLACEHOLDER_NAME,
  buildCampusWallUploadOptions,
  createAnonymousSeed,
  createAnonymousHandle,
  extractStoragePathFromPublicUrl,
  inferAnonymousState,
  isSupportedVideoFile,
  resolveAuthorDisplay,
} from './campusWall'

describe('createAnonymousHandle', () => {
  it('creates a stable anonymous label for the same seed', () => {
    expect(createAnonymousHandle('user-1')).toEqual(createAnonymousHandle('user-1'))
  })

  it('creates distinct labels for different seeds', () => {
    expect(createAnonymousHandle('user-1').label).not.toBe(createAnonymousHandle('user-2').label)
  })
})

describe('inferAnonymousState', () => {
  it('treats the placeholder author name as anonymous even without a flag', () => {
    expect(inferAnonymousState({ author_name: ANONYMOUS_PLACEHOLDER_NAME })).toBe(true)
  })

  it('prefers the explicit anonymous flag when present', () => {
    expect(inferAnonymousState({ author_name: '张三', is_anonymous: true })).toBe(true)
    expect(inferAnonymousState({ author_name: '张三', is_anonymous: false })).toBe(false)
  })
})

describe('resolveAuthorDisplay', () => {
  it('returns the original author for non-anonymous records', () => {
    expect(resolveAuthorDisplay({
      authorId: 'user-1',
      authorName: '小明',
      anonymous: false,
    })).toMatchObject({
      name: '小明',
      initial: '小',
      isAnonymous: false,
    })
  })

  it('returns a generated anonymous handle when anonymity is enabled', () => {
    expect(resolveAuthorDisplay({
      authorId: 'user-1',
      authorName: ANONYMOUS_PLACEHOLDER_NAME,
      anonymous: true,
    })).toMatchObject({
      isAnonymous: true,
      initial: '',
    })
    expect(resolveAuthorDisplay({
      authorId: 'user-1',
      authorName: ANONYMOUS_PLACEHOLDER_NAME,
      anonymous: true,
    }).name).not.toBe(ANONYMOUS_PLACEHOLDER_NAME)
  })

  it('uses the anonymous seed before the author id for stronger anonymity', () => {
    expect(resolveAuthorDisplay({
      authorId: 'user-1',
      anonymousSeed: 'post-1',
      authorName: ANONYMOUS_PLACEHOLDER_NAME,
      anonymous: true,
    }).name).toBe(resolveAuthorDisplay({
      authorId: 'user-2',
      anonymousSeed: 'post-1',
      authorName: ANONYMOUS_PLACEHOLDER_NAME,
      anonymous: true,
    }).name)
  })
})

describe('isSupportedVideoFile', () => {
  it('allows browser-friendly mp4 uploads', () => {
    expect(isSupportedVideoFile({ name: 'clip.mp4', type: 'video/mp4' })).toBe(true)
  })

  it('rejects formats that commonly stall in HTML5 playback', () => {
    expect(isSupportedVideoFile({ name: 'clip.mov', type: 'video/quicktime' })).toBe(false)
    expect(isSupportedVideoFile({ name: 'clip.mkv', type: 'video/x-matroska' })).toBe(false)
  })
})

describe('buildCampusWallUploadOptions', () => {
  it('keeps the original browser mime type for uploaded media', () => {
    expect(buildCampusWallUploadOptions({ name: 'clip.mp4', type: 'video/mp4' })).toEqual({
      cacheControl: '3600',
      contentType: 'video/mp4',
      upsert: false,
    })
  })
})

describe('createAnonymousSeed', () => {
  it('returns a uuid-like seed string', () => {
    expect(createAnonymousSeed()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})

describe('extractStoragePathFromPublicUrl', () => {
  it('extracts and decodes the storage path from a public bucket url', () => {
    expect(extractStoragePathFromPublicUrl(
      'https://example.supabase.co/storage/v1/object/public/campus-wall/posts/user-1/video%201.mp4?download=1',
    )).toBe('posts/user-1/video 1.mp4')
  })
})

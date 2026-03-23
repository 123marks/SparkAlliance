import { describe, expect, it } from 'vitest'
import { xmlToPlainText } from './documentImport'

describe('xmlToPlainText', () => {
  it('extracts readable text from wordprocessing xml', () => {
    const text = xmlToPlainText('<w:document><w:body><w:p><w:r><w:t>Course Notice</w:t></w:r></w:p><w:p><w:r><w:t>Room 302</w:t></w:r></w:p></w:body></w:document>')

    expect(text).toContain('Course Notice')
    expect(text).toContain('Room 302')
  })
})

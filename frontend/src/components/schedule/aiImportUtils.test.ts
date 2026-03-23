import { describe, expect, it } from 'vitest'
import { detectImportFileKind, isSupportedImportFile } from './aiImportUtils'

describe('aiImportUtils', () => {
  it('treats markdown and csv documents as text imports', () => {
    expect(detectImportFileKind({ name: 'notice.md', type: 'text/markdown' })).toBe('text')
    expect(detectImportFileKind({ name: 'schedule.csv', type: 'text/csv' })).toBe('text')
  })

  it('treats ics calendar files as text imports even when mime is missing', () => {
    expect(detectImportFileKind({ name: 'class.ics', type: '' })).toBe('text')
  })

  it('accepts word-like documents for direct AI recognition', () => {
    expect(
      detectImportFileKind({
        name: 'schedule.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe('document')
  })

  it('keeps image and pdf imports supported', () => {
    expect(isSupportedImportFile({ name: 'poster.png', type: 'image/png' })).toBe(true)
    expect(isSupportedImportFile({ name: 'notice.pdf', type: 'application/pdf' })).toBe(true)
  })
})

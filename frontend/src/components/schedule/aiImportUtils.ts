export type ImportFileLike = {
  name: string
  type: string
}

export type ImportFileKind = 'image' | 'pdf' | 'text' | 'document' | 'unsupported'

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'ics',
  'ical',
  'html',
  'htm',
  'json',
  'xml',
  'rtf',
])

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'text/calendar',
  'text/html',
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'text/rtf',
  'application/rtf',
])

const DOCUMENT_EXTENSIONS = new Set([
  'doc',
  'docx',
  'odt',
])

const DOCUMENT_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
])

export function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

export function detectImportFileKind(file: ImportFileLike): ImportFileKind {
  const mime = file.type.toLowerCase()
  const ext = getFileExtension(file.name)

  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (TEXT_MIME_TYPES.has(mime) || TEXT_EXTENSIONS.has(ext)) return 'text'
  if (DOCUMENT_MIME_TYPES.has(mime) || DOCUMENT_EXTENSIONS.has(ext)) return 'document'

  return 'unsupported'
}

export function isSupportedImportFile(file: ImportFileLike): boolean {
  return detectImportFileKind(file) !== 'unsupported'
}

export async function readImportFileText(file: File): Promise<string> {
  return file.text()
}

export const IMPORT_ACCEPT_ATTR = [
  'image/*',
  '.pdf',
  '.doc',
  '.docx',
  '.odt',
  '.rtf',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.ics',
  '.ical',
  '.html',
  '.htm',
  '.json',
  '.xml',
].join(',')

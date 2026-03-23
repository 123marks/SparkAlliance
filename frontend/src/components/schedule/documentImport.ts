function readUInt16(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

function readUInt32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前环境不支持 docx 文本解压')
  }

  const source = new Uint8Array(bytes.byteLength)
  source.set(bytes)
  const stream = new Blob([source.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

async function unzipEntry(compressedData: Uint8Array, compressionMethod: number): Promise<Uint8Array> {
  if (compressionMethod === 0) return compressedData
  if (compressionMethod === 8) return inflateRaw(compressedData)
  throw new Error(`不支持的 ZIP 压缩方法: ${compressionMethod}`)
}

function findCentralDirectory(view: DataView): number {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (readUInt32(view, offset) === 0x06054b50) return offset
  }
  throw new Error('未找到 ZIP 中央目录')
}

async function extractZipEntry(data: Uint8Array, targetNames: string[]): Promise<string | null> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const endOfCentralDirectory = findCentralDirectory(view)
  const totalEntries = readUInt16(view, endOfCentralDirectory + 10)
  const centralDirectoryOffset = readUInt32(view, endOfCentralDirectory + 16)

  let cursor = centralDirectoryOffset
  for (let index = 0; index < totalEntries; index += 1) {
    if (readUInt32(view, cursor) !== 0x02014b50) break

    const compressionMethod = readUInt16(view, cursor + 10)
    const compressedSize = readUInt32(view, cursor + 20)
    const fileNameLength = readUInt16(view, cursor + 28)
    const extraLength = readUInt16(view, cursor + 30)
    const commentLength = readUInt16(view, cursor + 32)
    const localHeaderOffset = readUInt32(view, cursor + 42)
    const fileNameBytes = data.slice(cursor + 46, cursor + 46 + fileNameLength)
    const fileName = decodeText(fileNameBytes)

    cursor += 46 + fileNameLength + extraLength + commentLength
    if (!targetNames.includes(fileName)) continue

    if (readUInt32(view, localHeaderOffset) !== 0x04034b50) {
      throw new Error(`ZIP 本地文件头损坏: ${fileName}`)
    }

    const localFileNameLength = readUInt16(view, localHeaderOffset + 26)
    const localExtraLength = readUInt16(view, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength
    const compressedData = data.slice(dataOffset, dataOffset + compressedSize)
    const inflated = await unzipEntry(compressedData, compressionMethod)
    return decodeText(inflated)
  }

  return null
}

export function xmlToPlainText(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function extractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const xml = await extractZipEntry(bytes, ['word/document.xml', 'word/footnotes.xml', 'word/header1.xml'])
    return xml ? xmlToPlainText(xml) : ''
  }

  if (name.endsWith('.odt')) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const xml = await extractZipEntry(bytes, ['content.xml'])
    return xml ? xmlToPlainText(xml) : ''
  }

  return ''
}

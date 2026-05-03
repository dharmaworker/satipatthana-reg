import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { generateExportWorkbook } from '@/lib/export-excel'

export async function GET(request: NextRequest) {
  if (request.cookies.get('admin_role')?.value !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { buffer, filename, bufferOnline, filenameOnline } = await generateExportWorkbook(new Date())

  const zip = new JSZip()
  zip.file(filename, buffer)
  zip.file(filenameOnline, bufferOnline)

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  const now = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '')
  const zipFilename = `報名彙整_${now}.zip`

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`,
    },
  })
}

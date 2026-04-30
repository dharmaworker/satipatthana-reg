// 從 scripts/copy-data.js 生成「表單文案.xlsx」
// 用法：node scripts/generate-content-xlsx.js
const path = require('path')
const ExcelJS = require('exceljs')
const data = require('./copy-data')

const OUTPUT = path.join(__dirname, '..', 'docs', '客戶交付', '表單文案.xlsx')

// ========= 設計樣式 =========
const COLOR = {
  greenDeep: 'FF334026',
  green: 'FF495534',
  goldDeep: 'FF916D3A',
  goldSoft: 'FFD8C29A',
  cream: 'FFF7F1E8',
  creamLight: 'FFFBF8F2',
  ink: 'FF2E241D',
  inkSoft: 'FF5A4A3C',
  inkMute: 'FF85776B',
  line: 'FFEEE5D5',
  editYellow: 'FFFEF8E5',  // 「修改後」欄位的淺黃底
  addArea: 'FFE9F1E4',     // 「新增項目」區的淺綠底
}

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Microsoft JhengHei' },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.green } },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { argb: COLOR.greenDeep } },
    bottom: { style: 'thin', color: { argb: COLOR.greenDeep } },
    left: { style: 'thin', color: { argb: COLOR.greenDeep } },
    right: { style: 'thin', color: { argb: COLOR.greenDeep } },
  },
}

const CELL_BORDER = {
  top: { style: 'hair', color: { argb: COLOR.line } },
  bottom: { style: 'hair', color: { argb: COLOR.line } },
  left: { style: 'hair', color: { argb: COLOR.line } },
  right: { style: 'hair', color: { argb: COLOR.line } },
}

const COLUMNS = [
  { key: 'pos', header: '位置', width: 24 },
  { key: 'id', header: 'KEY（請勿改）', width: 30 },
  { key: 'type', header: '類型', width: 10 },
  { key: 'current', header: '目前文案', width: 60 },
  { key: 'modified', header: '修改後 ✏️（請在這欄填寫）', width: 38 },
  { key: 'note', header: '備註', width: 24 },
]

function applyCellStyle(cell, opts = {}) {
  cell.font = {
    name: 'Microsoft JhengHei',
    size: 11,
    color: { argb: COLOR.ink },
    ...(opts.bold ? { bold: true } : {}),
  }
  cell.alignment = {
    vertical: 'top',
    wrapText: true,
    horizontal: opts.center ? 'center' : 'left',
  }
  cell.border = CELL_BORDER
  if (opts.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
  }
  if (opts.lock !== undefined) {
    cell.protection = { locked: opts.lock }
  }
}

function buildIntroSheet(wb, intro) {
  const ws = wb.addWorksheet(intro.title, {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: COLOR.green } },
  })
  ws.getColumn(1).width = 100

  // Title
  const titleRow = ws.addRow(['表單文案 ｜ 委託人核對／修改文件'])
  titleRow.getCell(1).font = { name: 'Microsoft JhengHei', bold: true, size: 16, color: { argb: COLOR.greenDeep } }
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  titleRow.height = 32
  ws.addRow([''])

  ws.addRow(['每個分頁對應網站的一個區域，請依「修改後」欄位填寫您要的新文案。']).getCell(1).font = { name: 'Microsoft JhengHei', size: 12, color: { argb: COLOR.ink } }
  ws.addRow([''])

  intro.rows.forEach(([line]) => {
    const r = ws.addRow([line])
    r.getCell(1).font = { name: 'Microsoft JhengHei', size: 11, color: { argb: COLOR.inkSoft } }
    r.getCell(1).alignment = { vertical: 'top', wrapText: true }
    r.height = Math.max(20, Math.ceil(line.length / 50) * 18)
  })

  ws.addRow([''])
  const tipsHeader = ws.addRow(['🌟 修改範例'])
  tipsHeader.getCell(1).font = { name: 'Microsoft JhengHei', bold: true, size: 13, color: { argb: COLOR.goldDeep } }
  ws.addRow(['原文：恭喜您被錄取成為「第二屆台灣四念處禪修課程」學員。'])
  ws.addRow(['修改後：恭喜您錄取「第二屆台灣四念處禪修」，期待您一同精進。'])
  ws.addRow(['（系統會自動以您的「修改後」覆寫網站。若留空＝不變。）']).getCell(1).font = { name: 'Microsoft JhengHei', italic: true, size: 11, color: { argb: COLOR.inkMute } }

  ws.addRow([''])
  const newHeader = ws.addRow(['💡 想新增項目？'])
  newHeader.getCell(1).font = { name: 'Microsoft JhengHei', bold: true, size: 13, color: { argb: COLOR.goldDeep } }
  ws.addRow(['每個分頁底部都有「新增項目」區（淺綠底），可寫下您想加的內容，工程師會評估後納入。'])

  return ws
}

function buildContentSheet(wb, sheet) {
  const ws = wb.addWorksheet(sheet.title, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    properties: { tabColor: { argb: COLOR.green } },
  })
  ws.columns = COLUMNS

  // Header row
  ws.getRow(1).height = 28
  COLUMNS.forEach((col, i) => {
    const cell = ws.getCell(1, i + 1)
    cell.value = col.header
    cell.font = HEADER_STYLE.font
    cell.fill = HEADER_STYLE.fill
    cell.alignment = HEADER_STYLE.alignment
    cell.border = HEADER_STYLE.border
  })

  // Data rows
  sheet.rows.forEach((row, idx) => {
    const [pos, id, type, current, note] = row
    const r = ws.addRow({ pos, id, type, current, modified: '', note })
    r.height = Math.max(22, Math.ceil(String(current || '').length / 30) * 18)
    // 讀取列：cream stripe
    const fill = idx % 2 === 0 ? COLOR.creamLight : 'FFFFFFFF'
    applyCellStyle(r.getCell(1), { fill })
    applyCellStyle(r.getCell(2), { fill, bold: false })
    r.getCell(2).font = { name: 'Consolas', size: 10, color: { argb: COLOR.inkMute } }
    r.getCell(2).alignment = { vertical: 'top', horizontal: 'left' }
    r.getCell(2).border = CELL_BORDER
    applyCellStyle(r.getCell(3), { fill, center: true })
    r.getCell(3).font = { name: 'Microsoft JhengHei', size: 10, bold: true, color: { argb: COLOR.greenDeep } }
    applyCellStyle(r.getCell(4), { fill })
    // 修改後欄位 — 鵝黃底
    applyCellStyle(r.getCell(5), { fill: COLOR.editYellow })
    r.getCell(5).font = { name: 'Microsoft JhengHei', size: 11, color: { argb: COLOR.greenDeep } }
    applyCellStyle(r.getCell(6), { fill })
    r.getCell(6).font = { name: 'Microsoft JhengHei', size: 10, color: { argb: COLOR.inkMute } }
    r.getCell(6).alignment = { vertical: 'top', wrapText: true, horizontal: 'left' }
  })

  // 「新增項目」區
  ws.addRow([])
  const sepRow = ws.addRow(['', '', '', '', '', ''])
  // 標題
  const titleRow = ws.addRow(['💡 新增項目（請寫在這裡）', '', '', '', '', ''])
  ws.mergeCells(titleRow.number, 1, titleRow.number, 6)
  const titleCell = titleRow.getCell(1)
  titleCell.font = { name: 'Microsoft JhengHei', bold: true, size: 12, color: { argb: COLOR.goldDeep } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.addArea } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  titleRow.height = 28

  // 提示
  const hintRow = ws.addRow(['請描述您想新增的內容（例：在 FAQ 加一條「線上同步直播怎麼觀看」），工程師會評估後納入。', '', '', '', '', ''])
  ws.mergeCells(hintRow.number, 1, hintRow.number, 6)
  const hintCell = hintRow.getCell(1)
  hintCell.font = { name: 'Microsoft JhengHei', italic: true, size: 10, color: { argb: COLOR.inkMute } }
  hintCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.addArea } }
  hintCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // 五個空白條目給委託人填
  for (let i = 1; i <= 5; i++) {
    const r = ws.addRow([`新增 ${i}`, '', '新增', '', '（在此填寫您想新增的內容）', ''])
    r.height = 50
    r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Microsoft JhengHei', size: 11, color: { argb: COLOR.ink } }
      cell.alignment = { vertical: 'top', wrapText: true, horizontal: 'left' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.addArea } }
      cell.border = CELL_BORDER
    })
  }

  return ws
}

async function main() {
  const wb = new ExcelJS.Workbook()
  wb.creator = '台灣四念處學會 satipatthana-reg'
  wb.created = new Date()

  buildIntroSheet(wb, data.intro)
  data.sheets.forEach(sheet => buildContentSheet(wb, sheet))

  await wb.xlsx.writeFile(OUTPUT)
  console.log(`✓ 已產生：${OUTPUT}`)
  console.log(`  共 ${1 + data.sheets.length} 個分頁，${data.sheets.reduce((s, x) => s + x.rows.length, 0)} 筆文案`)
}

main().catch(e => { console.error(e); process.exit(1) })

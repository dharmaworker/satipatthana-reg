// 主頁與會員區用到的視覺素材，存於 Supabase site-assets bucket（public）
// 換檔不需重新 deploy，學會可直接於 Supabase Dashboard 替換。
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const BUCKET = 'site-assets'
const asset = (path: string) => `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`

export const SITE_ASSETS = {
  poster: asset('poster.jpg'),
  sunsetBg: asset('sunset-bg.jpg'),
  teacher: (file: string) => asset(`teachers/${file}`),
  lineOfficial: asset('LINE_NOTE.jpg'),
  groupQrLine: asset('group-qr-line.jpg'),
  groupQrWechat: asset('group-qr-wechat.jpg'),
  // 承諾書改放 private bucket，下載走 /api/pledge gate（要 id+code+approved）
  // 本欄位刻意不放 public URL，避免外洩
  zoomGuide: (file: string) => asset(`zoom-guide/${file}`),
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 前台用（限制權限）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 後台用（完整權限，只在 server 端使用）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// 產生隨機碼
export function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}


// Supabase/PostgREST 單次查詢預設上限 1000 筆。打卡類資料早已破萬筆，
// 後台統計若直接 select 會被靜默截斷（只讀到前 1000 筆），故一律分頁讀取。
// 注意：分頁必須搭配穩定排序（各表以 id 主鍵排序），否則跨頁會重複或漏抓。
const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return rows
  }
}

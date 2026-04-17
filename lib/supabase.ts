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

// 產生學號
export function generateMemberId(sequence: number): string {
  return `TW2026-${String(sequence).padStart(3, '0')}`
}
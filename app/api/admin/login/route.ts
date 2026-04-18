import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password + process.env.PASSWORD_SALT).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    const computedHash = hashPassword(password)
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('password_hash', computedHash)
      .single()

    if (error || !admin) {
      console.error('[admin_login] failed', {
        username,
        supabase_url_tail: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(-20),
        salt_len: process.env.PASSWORD_SALT?.length ?? 0,
        salt_tail: process.env.PASSWORD_SALT?.slice(-6),
        service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10),
        computed_hash_prefix: computedHash.slice(0, 12),
        supabase_error: error?.message,
        supabase_code: error?.code,
      })
      return NextResponse.json(
        { error: '帳號或密碼錯誤' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      role: admin.role,
      name: admin.name,
    })

    response.cookies.set('admin_role', admin.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
    })
    response.cookies.set('admin_username', admin.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: '登入失敗' },
      { status: 500 }
    )
  }
}
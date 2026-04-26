import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('member_email', '', { path: '/', maxAge: 0 })
  response.cookies.set('member_id', '', { path: '/', maxAge: 0 })
  return response
}

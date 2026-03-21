import { NextRequest, NextResponse } from 'next/server'
import type { Feedback } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Feedback[]
    console.log('[feedback sync]', JSON.stringify(body, null, 2))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// NextAuth is disabled - using Supabase authentication instead
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'NextAuth is disabled. Use Supabase authentication.' }, { status: 404 })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'NextAuth is disabled. Use Supabase authentication.' }, { status: 404 })
}

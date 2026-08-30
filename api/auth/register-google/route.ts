import { NextResponse } from 'next/server';

// معالجة طلبات POST الأصلية
export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// معالجة طلبات GET لمنع خطأ 405
export async function GET() {
  return NextResponse.json(
    { message: 'This endpoint only accepts POST requests for registration.' },
    { status: 400 }
  );
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error_description') ?? searchParams.get('error');
  const nextRaw = searchParams.get('next') ?? '/practice';
  // Block open-redirect: only allow relative paths
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/practice';

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const type = searchParams.get('type');
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/login?mode=reset`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

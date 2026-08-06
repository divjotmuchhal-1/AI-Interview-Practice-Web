import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error_description') ?? searchParams.get('error');
  const nextRaw = searchParams.get('next') ?? '/practice';
  // Block open-redirect: only allow relative paths
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/practice';

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  const type = searchParams.get('type');
  const destination = type === 'recovery' ? `${origin}/login?mode=reset` : `${origin}${next}`;

  // The response must exist before the code exchange so session cookies can be
  // written straight onto it. Writing them to the next/headers cookie store
  // instead does not attach them to a redirect response, which left users
  // authenticated on the server but with no session in the browser: they landed
  // back on /login and had to sign in a second time.
  const response = NextResponse.redirect(destination);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('code exchange failed:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Sign-in failed. Please try again.')}`,
      );
    }
  }

  return response;
}

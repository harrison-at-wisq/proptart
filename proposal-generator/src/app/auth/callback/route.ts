import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user is from allowed domain
      const email = data.user.email;
      if (!email?.endsWith('@wisq.com')) {
        // Sign out the user and redirect to login with error
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=Access restricted to @wisq.com accounts`
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
}

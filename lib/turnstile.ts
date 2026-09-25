/**
 * Cloudflare Turnstile server-side verification. Passes through (returns
 * true) when TURNSTILE_SECRET_KEY isn't set, so the submission flow keeps
 * working before Turnstile is configured — see .env.example for setup.
 */
export async function verifyTurnstile(token: string | null, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({secret, response: token, remoteip: remoteIp}),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false; // fail closed once Turnstile is actually configured
  }
}

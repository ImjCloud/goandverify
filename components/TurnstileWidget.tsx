'use client';
import {useEffect, useRef, useState} from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Renders nothing if NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set — matches the
 *  server's verifyTurnstile() passthrough, so the form keeps working
 *  before/without Turnstile configured. */
export function TurnstileWidget({onVerify, onExpire}: {onVerify: (token: string) => void; onExpire: () => void}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady || !SITE_KEY || !containerRef.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onVerify(token),
      'expired-callback': () => onExpire(),
      'error-callback': () => onExpire(),
    });
  }, [scriptReady, onVerify, onExpire]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div ref={containerRef} />
    </>
  );
}

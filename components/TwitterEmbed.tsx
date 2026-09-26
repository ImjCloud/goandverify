'use client';

import {useEffect, useRef} from 'react';

declare global {
  interface Window {
    twttr?: {widgets: {load: (el?: HTMLElement) => void}};
  }
}

const SCRIPT_SRC = 'https://platform.twitter.com/widgets.js';

/** Renders the real, interactive X/Twitter post — the official lightweight
 *  embed pattern: a plain <blockquote> that their widgets.js script scans
 *  for and replaces with an iframe containing whatever the post actually
 *  has (text, photo, or a playable video). There's no simpler iframe-only
 *  version of this the way YouTube/Vimeo/TikTok have, so this always shows
 *  the full post rather than a stripped-down video-only frame. */
export function TwitterEmbed({url, dark = true}: {url: string; dark?: boolean}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    function render() {
      if (!cancelled && containerRef.current) window.twttr?.widgets.load(containerRef.current);
    }

    if (window.twttr?.widgets) {
      render();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', render);
      return () => script?.removeEventListener('load', render);
    }

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div ref={containerRef} className="mx-auto max-w-xl">
      <blockquote className="twitter-tweet" data-theme={dark ? 'dark' : 'light'}>
        <a href={url}>View post on X</a>
      </blockquote>
    </div>
  );
}

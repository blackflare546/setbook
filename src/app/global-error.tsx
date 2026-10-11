"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unexpected SetBook error", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong · SetBook</title>
      </head>
      <body>
        <main className="error-shell">
          <div className="error-card">
            <div className="error-mark" aria-hidden="true">
              SB
            </div>
            <h1>SetBook could not start</h1>
            <p>
              Your local library was not changed. Try loading SetBook again, or
              return to the song library.
            </p>
            {error.digest && (
              <p className="error-reference">Error reference: {error.digest}</p>
            )}
            <div className="error-actions">
              <a href="/library">Back to library</a>
              <button type="button" onClick={retry}>
                Try again
              </button>
            </div>
          </div>
        </main>
        <style>{`
          :root { color-scheme: light dark; font-family: Arial, Helvetica, sans-serif; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #fafafa; color: #111827; }
          .error-shell { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
          .error-card { width: min(100%, 480px); padding: 32px; text-align: center; border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; box-shadow: 0 20px 60px -40px rgba(0,0,0,.55); }
          .error-mark { display: grid; place-items: center; width: 48px; height: 48px; margin: 0 auto; border-radius: 12px; background: #111; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: -.04em; }
          h1 { margin: 18px 0 0; font-size: 24px; letter-spacing: -.03em; }
          p { margin: 10px auto 0; max-width: 380px; color: #4b5563; font-size: 14px; line-height: 1.65; }
          .error-reference { font-family: ui-monospace, monospace; font-size: 12px; }
          .error-actions { display: flex; flex-direction: column-reverse; gap: 8px; margin-top: 24px; }
          .error-actions a, .error-actions button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #d1d5db; border-radius: 10px; padding: 0 18px; font: inherit; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; }
          .error-actions a { background: #fff; color: #111827; }
          .error-actions button { border-color: #111; background: #111; color: #fff; }
          .error-actions a:focus-visible, .error-actions button:focus-visible { outline: 2px solid #5656d8; outline-offset: 2px; }
          @media (min-width: 480px) { .error-actions { flex-direction: row; justify-content: center; } }
          @media (prefers-color-scheme: dark) {
            body { background: #12161b; color: #f3f5f7; }
            .error-card { border-color: #343c47; background: #1a1f26; }
            .error-mark { background: #8b8bea; color: #1d1d48; }
            p { color: #b8c0cb; }
            .error-actions a { border-color: #4b5664; background: #20262e; color: #f3f5f7; }
            .error-actions button { border-color: #8b8bea; background: #8b8bea; color: #1d1d48; }
          }
        `}</style>
      </body>
    </html>
  );
}

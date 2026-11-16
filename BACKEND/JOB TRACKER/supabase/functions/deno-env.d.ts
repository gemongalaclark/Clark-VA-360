// Editor-only types so VS Code (plain TypeScript, no Deno extension) understands
// Supabase Edge Functions. Deno ships the real ones at runtime; this file is never deployed.

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(url: string, key: string, options?: Record<string, unknown>): any;
}

// Server-side env access. Values come from Portainer at runtime, never from git.
// NEXT_PUBLIC_* values are different: they are baked into the image at build time.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value ? value : undefined;
}

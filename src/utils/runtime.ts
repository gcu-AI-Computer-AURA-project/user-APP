export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message?: unknown }).message);
  return fallback;
}

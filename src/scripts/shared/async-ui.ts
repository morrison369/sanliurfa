export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryOnce<T>(
  operation: () => Promise<T>,
  delayMs: number,
  attempt = 0,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempt > 0) {
      throw error;
    }

    await delay(delayMs);
    return retryOnce(operation, delayMs, attempt + 1);
  }
}

export async function readJsonSafely<T = unknown>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

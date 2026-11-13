// Development-only timing for server work: prints "[perf] label 123ms" to the
// `next dev` terminal. In production it just runs the work, with no logging.

const enabled = process.env.NODE_ENV === "development";

export async function timed<T>(label: string, work: () => Promise<T>): Promise<T> {
  if (!enabled) return work();
  const start = performance.now();
  try {
    return await work();
  } finally {
    console.info(`[perf] ${label} ${Math.round(performance.now() - start)}ms`);
  }
}

/**
 * The public origin embedded in subscription URLs and RSS metadata.
 * Set NEXT_PUBLIC_PODCAST_PACER_ORIGIN when the permanent custom domain is ready.
 */
export const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_PODCAST_PACER_ORIGIN ??
  "https://podcast-pacer.vercel.app";

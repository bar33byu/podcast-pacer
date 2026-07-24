/**
 * The public origin embedded in subscription URLs and RSS metadata.
 * Override with NEXT_PUBLIC_PODCAST_PACER_ORIGIN only for an intentional alternate deployment.
 */
export const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_PODCAST_PACER_ORIGIN ??
  "https://pacer.lavalane.org";

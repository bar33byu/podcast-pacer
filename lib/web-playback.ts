export function webPlaybackUrl(enclosureUrl: string | undefined): string | undefined {
  if (!enclosureUrl) return undefined;

  try {
    const url = new URL(enclosureUrl);
    if (url.protocol === "https:") return url.toString();

    if (
      url.protocol === "http:"
      && (url.hostname === "archive.org" || url.hostname.endsWith(".archive.org"))
    ) {
      url.protocol = "https:";
      return url.toString();
    }
  } catch {}

  return undefined;
}

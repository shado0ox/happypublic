export type InstallPlatform = "ios" | "android" | "desktop";
export function installPlatform(
  userAgent: string,
  platform: string,
  touchPoints: number,
): InstallPlatform {
  if (
    /iphone|ipad|ipod/i.test(userAgent) ||
    (platform === "MacIntel" && touchPoints > 1)
  )
    return "ios";
  return /android/i.test(userAgent) ? "android" : "desktop";
}
export function storeLink(
  platform: InstallPlatform,
  ios?: string,
  android?: string,
): string | null {
  const value =
    platform === "ios" ? ios : platform === "android" ? android : undefined;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (
      platform === "ios" &&
      url.hostname === "apps.apple.com" &&
      /\/id\d+/.test(url.pathname)
    )
      return url.href;
    if (
      platform === "android" &&
      url.hostname === "play.google.com" &&
      url.pathname === "/store/apps/details" &&
      url.searchParams.get("id")
    )
      return url.href;
  } catch {}
  return null;
}

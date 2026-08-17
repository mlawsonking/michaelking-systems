// Server-side visit notification. Runs at the edge; nothing is added to any page,
// no client-side code, no third-party requests from the visitor's browser. The
// visitor experience and the page source are byte-identical with or without this.
//
// Notifies a private ntfy topic (set VISIT_NTFY_TOPIC in Vercel project env vars;
// never commit the topic name) for meaningful hits only: the homepage and the
// resume PDF. Obvious bots are skipped. If the env var is unset or the notify
// fails, the request proceeds untouched: logging must never cost a visitor.

export const config = {
  matcher: ["/", "/index.html", "/resume.pdf"],
};

const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|fetch|monitor|scan|curl|wget|python-requests|headless/i;

export default async function middleware(request: Request): Promise<Response | undefined> {
  try {
    const topic = process.env.VISIT_NTFY_TOPIC;
    if (!topic) return undefined;

    const ua = request.headers.get("user-agent") ?? "";
    if (BOT_PATTERN.test(ua)) return undefined;

    const url = new URL(request.url);
    const h = request.headers;
    const city = h.get("x-vercel-ip-city") ?? "?";
    const region = h.get("x-vercel-ip-country-region") ?? "";
    const country = h.get("x-vercel-ip-country") ?? "?";
    const ip = (h.get("x-forwarded-for") ?? "?").split(",")[0].trim();
    const referer = h.get("referer") ?? "direct";
    const uaShort = ua.split(")")[0].slice(0, 60);

    const line = `${url.pathname} | ${decodeURIComponent(city)} ${region} ${country} | ${ip} | from: ${referer} | ${uaShort}`;

    // Fire-and-forget with a short timeout; never block or fail the page.
    await Promise.race([
      fetch(`https://ntfy.sh/${topic}`, {
        method: "POST",
        headers: { Title: `visit: ${url.pathname}`, Priority: "low", Tags: "eye" },
        body: line,
      }),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).catch(() => {});
  } catch {
    // Logging is best-effort by design.
  }
  return undefined;
}

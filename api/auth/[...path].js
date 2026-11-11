// Same-origin proxy for Neon Managed Auth. Cookies are rebound to the EduZone origin.
module.exports = async function handler(req, res) {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) return res.status(500).json({ error: "Authentication is not configured." });
  const pathname = (req.url || "").replace(/^\/api\/auth/, "") || "/";
  const target = base.replace(/\/$/, "") + (pathname.startsWith("/") ? pathname : "/" + pathname);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (["host", "connection", "content-length", "accept-encoding"].includes(key.toLowerCase())) continue;
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value !== undefined) headers.set(key, String(value));
  }
  const origin = req.headers.origin || ((req.headers["x-forwarded-proto"] || "https") + "://" + req.headers.host);
  headers.set("origin", origin);
  headers.set("x-forwarded-host", req.headers.host || new URL(origin).host);
  let body;
  if (!["GET", "HEAD"].includes(req.method)) {
    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) body = req.body;
    else if (req.body !== undefined) {
      body = JSON.stringify(req.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }
  try {
    const upstream = await fetch(target, { method: req.method, headers, body, redirect: "manual" });
    res.status(upstream.status);
    for (const key of ["content-type", "cache-control", "location"]) {
      const value = upstream.headers.get(key);
      if (value) res.setHeader(key, value);
    }
    const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
    if (cookies.length) {
      res.setHeader("Set-Cookie", cookies.map(cookie => cookie.replace(/;\s*Domain=[^;]+/i, "")));
    }
    if (upstream.status === 204 || upstream.status === 304) return res.end();
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    return res.send(responseBody);
  } catch (error) {
    return res.status(502).json({ error: "Authentication service is temporarily unavailable." });
  }
};

const { Pool } = require("pg");
const { createRemoteJWKSet, jwtVerify } = require("jose");
let pool;
let jwks;
function db() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, max: 3, idleTimeoutMillis: 10000 });
  return pool;
}
function send(res, status, data) { res.status(status).setHeader("Content-Type", "application/json; charset=utf-8"); return res.end(JSON.stringify(data)); }
function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) {} }
  return {};
}
function validate(item) {
  const title = String(item.title || "").trim();
  const description = String(item.description || "").trim();
  const url = String(item.url || "").trim();
  let parsed;
  try { parsed = new URL(url); } catch (_) { return { error: "Enter a valid resource URL." }; }
  if (!title || title.length > 180) return { error: "Title is required (maximum 180 characters)." };
  if (!description || description.length > 1200) return { error: "Description is required (maximum 1,200 characters)." };
  if (!["http:", "https:"].includes(parsed.protocol)) return { error: "Only http and https links are allowed." };
  if (!["school", "college", "exam"].includes(item.level)) return { error: "Choose a valid learning level." };
  if (!["science", "maths", "general"].includes(item.subject)) return { error: "Choose a valid subject." };
  return { value: {
    title, description, url: parsed.href, level: item.level, subject: item.subject,
    type: String(item.type || "Learning resource").trim().slice(0, 100),
    icon: String(item.icon || "📘").trim().slice(0, 12) || "📘",
    tags: String(item.tags || (title + " " + description)).trim().slice(0, 600)
  }};
}
async function requireAdmin(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !process.env.NEON_AUTH_JWKS_URL || !process.env.NEON_AUTH_BASE_URL) return null;
  try {
    if (!jwks) jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL));
    const { payload } = await jwtVerify(token, jwks, { issuer: process.env.NEON_AUTH_BASE_URL });
    if (!payload.sub) return null;
    const result = await db().query('SELECT email, role, banned FROM neon_auth."user" WHERE id = $1 LIMIT 1', [payload.sub]);
    const user = result.rows[0];
    if (!user || user.banned || user.role !== "admin" || user.email.toLowerCase() !== "vaishnavs56758@gmail.com") return null;
    return user;
  } catch (_) { return null; }
}
module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) return send(res, 500, { error: "Database is not configured." });
  try {
    if (req.method === "GET") {
      const result = await db().query("SELECT id,title,level,subject,tags,type,description,url,icon FROM public.eduzone_resources ORDER BY created_at DESC, title ASC");
      return send(res, 200, result.rows);
    }
    if (!["POST", "PUT", "DELETE"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, PUT, DELETE");
      return send(res, 405, { error: "Method not allowed." });
    }
    const user = await requireAdmin(req);
    if (!user) return send(res, 401, { error: "Administrator sign-in required." });
    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return send(res, 400, { error: "Resource id is required." });
      const result = await db().query("DELETE FROM public.eduzone_resources WHERE id = $1 RETURNING id", [id]);
      return send(res, result.rowCount ? 200 : 404, result.rowCount ? { ok: true } : { error: "Resource not found." });
    }
    const checked = validate(readBody(req));
    if (checked.error) return send(res, 400, { error: checked.error });
    const v = checked.value;
    if (req.method === "POST") {
      const id = require("crypto").randomUUID();
      await db().query(
        "INSERT INTO public.eduzone_resources (id,title,level,subject,tags,type,description,url,icon) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [id,v.title,v.level,v.subject,v.tags,v.type,v.description,v.url,v.icon]
      );
      return send(res, 201, { id, ...v });
    }
    const id = String(readBody(req).id || "");
    if (!id) return send(res, 400, { error: "Resource id is required." });
    const result = await db().query(
      "UPDATE public.eduzone_resources SET title=$2,level=$3,subject=$4,tags=$5,type=$6,description=$7,url=$8,icon=$9,updated_at=now() WHERE id=$1 RETURNING id",
      [id,v.title,v.level,v.subject,v.tags,v.type,v.description,v.url,v.icon]
    );
    return send(res, result.rowCount ? 200 : 404, result.rowCount ? { id, ...v } : { error: "Resource not found." });
  } catch (error) {
    return send(res, 500, { error: "The resource service encountered an error." });
  }
};

// server.js (v3) - Backend para sistema de pools + Auth
// + Verificación email + resend + reset password
// + Professional: daily limits, invalidate old tokens, nicer email templates
// ----------------------------------------------------------------------------------------------
// ENV:
// - DATABASE_URL, DATABASE_SSL ("true"), SETUP_KEY
// - RESEND_API_KEY (recomendado en Render), MAIL_FROM, APP_BASE_URL
// - (Opcional SMTP): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

// Email / tokens
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  APP_BASE_URL,
  RESEND_API_KEY,
} = process.env;

// --------------------
// Email transport selection
// --------------------
// 1) Si existe RESEND_API_KEY -> manda por HTTPS usando Resend
// 2) Si no, intenta SMTP con nodemailer (NO recomendado en Render free)
const smtpPort = Number(SMTP_PORT || 587);

const transporter =
  !RESEND_API_KEY && SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

function baseUrl() {
  return APP_BASE_URL || "http://localhost:3000";
}

async function sendMail({ to, subject, html }) {
  const from = MAIL_FROM || SMTP_USER || "";
  if (!from) {
    console.warn("⚠️ [MAIL] MAIL_FROM no configurado. No se enviará email.");
    console.warn("To:", to, "Subject:", subject);
    return;
  }

  // ---- Opción API HTTPS (Resend) ----
  if (RESEND_API_KEY) {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("❌ [RESEND ERROR]", resp.status, data);
      throw new Error(`Resend error: ${resp.status} ${data?.message || "unknown"}`);
    }

    console.log("📧 [RESEND SENT] to:", to, "subject:", subject);
    return;
  }

  // ---- SMTP fallback ----
  if (!transporter) {
    console.log("📧 [DEV MAIL] transporter=NULL -> SMTP no configurado o deshabilitado");
    console.log("to:", to, "subject:", subject);
    console.log(html);
    return;
  }

  await transporter.sendMail({ from, to, subject, html });
  console.log("📧 [SMTP SENT] to:", to, "subject:", subject);
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}
function sha256(x) {
  return crypto.createHash("sha256").update(x).digest("hex");
}

// --------------------
// Email templates (pro + simples)
// --------------------
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailLayout({ preheader, title, bodyHtml, ctaText, ctaUrl }) {
  const year = new Date().getFullYear();
  const safePreheader = escapeHtml(preheader || "");
  const safeTitle = escapeHtml(title || "");
  const safeUrl = String(ctaUrl || "");

  const button =
    ctaText && safeUrl
      ? `
        <a href="${safeUrl}"
          style="display:inline-block; background:#111827; color:#ffffff; text-decoration:none; padding:12px 16px; border-radius:10px; font-weight:600;">
          ${escapeHtml(ctaText)}
        </a>
      `
      : "";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <title>${safeTitle}</title>
    </head>
    <body style="margin:0; padding:0; background:#f3f4f6;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${safePreheader}
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"
              style="width:560px; max-width:92vw; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
              <tr>
                <td style="padding:18px 22px; background:#111827; color:#fff; font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
                  <b>Assurant</b>
                </td>
              </tr>
              <tr>
                <td style="padding:22px; font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#111827; font-size:14px; line-height:1.55;">
                  <h1 style="margin:0 0 12px; font-size:18px; line-height:1.25;">${safeTitle}</h1>
                  ${bodyHtml || ""}
                  <div style="margin:18px 0 8px;">
                    ${button}
                  </div>
                  <p style="margin:14px 0 0; color:#6b7280; font-size:12px;">
                    Si no fuiste vos, podés ignorar este email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 22px; background:#f9fafb; color:#6b7280; font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; font-size:12px;">
                  © ${year} Assurant
                </td>
              </tr>
            </table>

            <p style="margin:12px 0 0; color:#6b7280; font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; font-size:12px; max-width:92vw;">
              ¿No ves el botón? Copiá y pegá este link:<br/>
              <span style="word-break:break-all;">${escapeHtml(safeUrl)}</span>
            </p>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

function verifyEmailHtml({ nombre, link }) {
  const safeName = escapeHtml(nombre || "");
  return emailLayout({
    preheader: "Verificá tu email para activar tu cuenta",
    title: "Verificá tu email",
    bodyHtml: `
      <p style="margin:0 0 10px;">Hola ${safeName},</p>
      <p style="margin:0 0 10px;">Para activar tu cuenta, verificá tu email.</p>
      <p style="margin:0;">Este link vence en <b>24 horas</b>.</p>
    `,
    ctaText: "Verificar email",
    ctaUrl: link,
  });
}

function resetPasswordHtml({ nombre, link }) {
  const safeName = escapeHtml(nombre || "");
  return emailLayout({
    preheader: "Link para resetear tu contraseña",
    title: "Resetear contraseña",
    bodyHtml: `
      <p style="margin:0 0 10px;">Hola ${safeName},</p>
      <p style="margin:0 0 10px;">Pediste resetear tu contraseña.</p>
      <p style="margin:0;">Este link vence en <b>30 minutos</b>.</p>
    `,
    ctaText: "Resetear contraseña",
    ctaUrl: link,
  });
}

const app = express();
app.use(express.json());

// Static para servir /public
app.use(express.static(path.join(__dirname, "..", "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// --------------------
// Helpers
// --------------------
function isISODate(yyyyMmDd) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(yyyyMmDd || ""));
}

async function getUserById(client, id) {
  const q = await client.query(
    `SELECT id, email, nombre, apellido, rol, supervisor_id, email_verificado
     FROM usuarios
     WHERE id = $1`,
    [id]
  );
  return q.rows[0] || null;
}

async function assertRole(client, usuarioId, allowedRoles) {
  const u = await getUserById(client, usuarioId);
  if (!u) {
    const err = new Error("Usuario no existe");
    err.status = 404;
    throw err;
  }
  if (!allowedRoles.includes(u.rol)) {
    const err = new Error("No autorizado para esta acción");
    err.status = 403;
    throw err;
  }
  return u;
}

async function getPisoIdByNumero(client, pisoNumero) {
  const q = await client.query(`SELECT id FROM pisos WHERE id = $1`, [pisoNumero]);
  return q.rows[0]?.id ?? null;
}

function devGuard(req, res, next) {
  const setupKey = process.env.SETUP_KEY;
  if (!setupKey) {
    return res.status(403).json({ ok: false, error: "SETUP_KEY no configurado" });
  }
  const key = String(req.query.key || req.headers["x-setup-key"] || "");
  if (key !== setupKey) {
    return res.status(403).json({ ok: false, error: "Key inválida" });
  }
  next();
}

// --------------------
// Cooldowns (anti-spam) - 60s por email e IP
// --------------------
const COOLDOWN_MS = 60 * 1000;
const resendCooldownByEmail = new Map();
const resendCooldownByIp = new Map();

function getClientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.socket?.remoteAddress || "unknown";
}

function isInCooldown(map, key) {
  const last = map.get(key);
  if (!last) return false;
  return Date.now() - last < COOLDOWN_MS;
}

function setCooldown(map, key) {
  map.set(key, Date.now());
}

// --------------------
// Daily limits (DB-based, “pro”)
// --------------------
const DAILY_LIMIT_VERIFY = 5; // max verificaciones por usuario/día
const DAILY_LIMIT_RESET = 5;  // max resets por usuario/día

async function reachedDailyLimit(client, tableName, usuarioId, limit) {
  // Cuenta tokens creados hoy (no importa si se usaron, lo que limita es el envío)
  const q = await client.query(
    `
    SELECT COUNT(*)::int AS c
    FROM ${tableName}
    WHERE usuario_id = $1
      AND creado_en >= date_trunc('day', now())
    `,
    [usuarioId]
  );
  return (q.rows[0]?.c || 0) >= limit;
}

// --------------------
// HEALTH
// --------------------
app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --------------------
// AUTH - Registro + Login + Verificación + Reset Password
// --------------------

// Registro
app.post("/api/auth/register", async (req, res) => {
  const { email, password, nombre, apellido, supervisor_email } = req.body || {};
  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let supervisorId = null;
    if (supervisor_email) {
      const s = await client.query(
        `SELECT id FROM usuarios WHERE email = $1 AND rol = 'SUPERVISOR'`,
        [String(supervisor_email).trim().toLowerCase()]
      );
      supervisorId = s.rows[0]?.id || null;
      if (!supervisorId) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, error: "Supervisor no encontrado" });
      }
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const hash = await bcrypt.hash(String(password), 10);

    const q = await client.query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, supervisor_id, email_verificado)
       VALUES ($1,$2,$3,$4,'EMPLEADO',$5,FALSE)
       RETURNING id, email, nombre, apellido, rol, supervisor_id, email_verificado`,
      [normalizedEmail, hash, String(nombre).trim(), String(apellido).trim(), supervisorId]
    );

    const user = q.rows[0];

    // Invalidate tokens viejos no usados (por prolijidad)
    await client.query(
      `DELETE FROM tokens_verificacion_email
       WHERE usuario_id = $1 AND usado_en IS NULL`,
      [user.id]
    );

    // Token verificación
    const token = randomToken();
    const tokenHash = sha256(token);
    const expira = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await client.query(
      `INSERT INTO tokens_verificacion_email (usuario_id, token_hash, expira_en)
       VALUES ($1,$2,$3)`,
      [user.id, tokenHash, expira]
    );

    await client.query("COMMIT");

    // Mail fuera de TX (no rompe el registro)
    const link = `${baseUrl()}/api/auth/verify-email?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: "Verificá tu email",
        html: verifyEmailHtml({ nombre: user.nombre, link }),
      });
    } catch (mailErr) {
      console.error("❌ No se pudo enviar mail de verificación:", mailErr?.message || mailErr);
    }

    res.json({
      ok: true,
      message: "Cuenta creada. Revisá tu email para verificar antes de ingresar.",
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (e.code === "23505") {
      return res.status(409).json({ ok: false, error: "Email ya existe" });
    }
    console.error(e);
    res.status(500).json({ ok: false, error: "Error registrando usuario" });
  } finally {
    client.release();
  }
});

// Verificar email
app.get("/api/auth/verify-email", async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).send("Token inválido");

  const client = await pool.connect();
  try {
    const tokenHash = sha256(token);

    const q = await client.query(
      `SELECT id, usuario_id, expira_en, usado_en
       FROM tokens_verificacion_email
       WHERE token_hash=$1
       ORDER BY creado_en DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (!q.rowCount) return res.status(400).send("Token inválido");

    const row = q.rows[0];
    if (row.usado_en) return res.status(400).send("Token ya utilizado");
    if (new Date(row.expira_en).getTime() < Date.now())
      return res.status(400).send("Token expirado");

    await client.query("BEGIN");

    await client.query(`UPDATE usuarios SET email_verificado = TRUE WHERE id = $1`, [
      row.usuario_id,
    ]);

    await client.query(`UPDATE tokens_verificacion_email SET usado_en = now() WHERE id = $1`, [
      row.id,
    ]);

    // Opcional pro: invalidar cualquier otro token pendiente
    await client.query(
      `UPDATE tokens_verificacion_email
       SET usado_en = now()
       WHERE usuario_id = $1 AND usado_en IS NULL`,
      [row.usuario_id]
    );

    await client.query("COMMIT");

    return res.redirect("/index.html?verified=1");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).send("Error verificando");
  } finally {
    client.release();
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  try {
    const q = await pool.query(
      `SELECT id, email, nombre, apellido, rol, supervisor_id, email_verificado, password_hash
       FROM usuarios
       WHERE email = $1`,
      [String(email).trim().toLowerCase()]
    );

    if (!q.rowCount) {
      return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    }

    const u = q.rows[0];

    if (!u.email_verificado) {
      return res.status(403).json({
        ok: false,
        error: "Tenés que verificar tu email antes de ingresar.",
      });
    }

    const ok = await bcrypt.compare(String(password), u.password_hash || "");
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
    }

    delete u.password_hash;
    res.json({ ok: true, user: u });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error login" });
  }
});

// Reenviar verificación (no revela si existe)
app.post("/api/auth/resend-verification", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, error: "Falta email" });

  const ip = getClientIp(req);

  if (isInCooldown(resendCooldownByEmail, email) || isInCooldown(resendCooldownByIp, ip)) {
    return res.json({
      ok: true,
      message: "Si ya pediste un reenvío hace poco, esperá 1 minuto y probá de nuevo.",
    });
  }

  const client = await pool.connect();
  try {
    const q = await client.query(
      `SELECT id, email, nombre, email_verificado
       FROM usuarios
       WHERE email = $1`,
      [email]
    );

    setCooldown(resendCooldownByEmail, email);
    setCooldown(resendCooldownByIp, ip);

    // respuesta genérica
    const genericOk = () =>
      res.json({
        ok: true,
        message: "Si tu cuenta existe y todavía no está verificada, te reenviamos el email.",
      });

    if (!q.rowCount) return genericOk();

    const user = q.rows[0];
    if (user.email_verificado) return genericOk();

    // Daily limit (pro)
    const limitReached = await reachedDailyLimit(
      client,
      "tokens_verificacion_email",
      user.id,
      DAILY_LIMIT_VERIFY
    );
    if (limitReached) {
      return res.json({
        ok: true,
        message:
          "Si tu cuenta existe y todavía no está verificada, te reenviamos el email. (Límite diario alcanzado, probá mañana.)",
      });
    }

    // invalidar tokens viejos pendientes
    await client.query(
      `DELETE FROM tokens_verificacion_email
       WHERE usuario_id = $1 AND usado_en IS NULL`,
      [user.id]
    );

    const token = randomToken();
    const tokenHash = sha256(token);
    const expira = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await client.query(
      `INSERT INTO tokens_verificacion_email (usuario_id, token_hash, expira_en)
       VALUES ($1,$2,$3)`,
      [user.id, tokenHash, expira]
    );

    const link = `${baseUrl()}/api/auth/verify-email?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: "Reenvío: verificá tu email",
        html: verifyEmailHtml({ nombre: user.nombre, link }),
      });
    } catch (mailErr) {
      console.error("❌ No se pudo reenviar mail de verificación:", mailErr?.message || mailErr);
    }

    return genericOk();
  } catch (e) {
    console.error(e);
    return res.json({
      ok: true,
      message: "Si tu cuenta existe y todavía no está verificada, te reenviamos el email.",
    });
  } finally {
    client.release();
  }
});

// Forgot password (no revela si existe)
app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, error: "Falta email" });

  const ip = getClientIp(req);

  if (
    isInCooldown(resendCooldownByEmail, `fp:${email}`) ||
    isInCooldown(resendCooldownByIp, `fp:${ip}`)
  ) {
    return res.json({
      ok: true,
      message: "Si ya pediste un envío hace poco, esperá 1 minuto y probá de nuevo.",
    });
  }

  setCooldown(resendCooldownByEmail, `fp:${email}`);
  setCooldown(resendCooldownByIp, `fp:${ip}`);

  // Respuesta siempre OK
  res.json({
    ok: true,
    message: "Si el email existe, te enviamos un link para resetear.",
  });

  const client = await pool.connect();
  try {
    const q = await client.query(
      `SELECT id, email, nombre FROM usuarios WHERE email=$1`,
      [email]
    );
    if (!q.rowCount) return;

    const user = q.rows[0];

    // Daily limit (pro)
    const limitReached = await reachedDailyLimit(
      client,
      "tokens_reset_password",
      user.id,
      DAILY_LIMIT_RESET
    );
    if (limitReached) return;

    // invalidar tokens viejos pendientes
    await client.query(
      `DELETE FROM tokens_reset_password
       WHERE usuario_id = $1 AND usado_en IS NULL`,
      [user.id]
    );

    const token = randomToken();
    const tokenHash = sha256(token);
    const expira = new Date(Date.now() + 1000 * 60 * 30);

    await client.query(
      `INSERT INTO tokens_reset_password (usuario_id, token_hash, expira_en)
       VALUES ($1,$2,$3)`,
      [user.id, tokenHash, expira]
    );

    const link = `${baseUrl()}/reset.html?token=${token}`;

    try {
      await sendMail({
        to: user.email,
        subject: "Resetear contraseña",
        html: resetPasswordHtml({ nombre: user.nombre, link }),
      });
    } catch (mailErr) {
      console.error("❌ No se pudo enviar mail de reset:", mailErr?.message || mailErr);
    }
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
  }
});

// Reset password
app.post("/api/auth/reset-password", async (req, res) => {
  const token = String(req.body?.token || "");
  const newPassword = String(req.body?.password || "");

  if (!token || newPassword.length < 6) {
    return res.status(400).json({
      ok: false,
      error: "Token inválido o contraseña muy corta (mín 6).",
    });
  }

  const client = await pool.connect();
  try {
    const tokenHash = sha256(token);

    const q = await client.query(
      `SELECT id, usuario_id, expira_en, usado_en
       FROM tokens_reset_password
       WHERE token_hash=$1
       ORDER BY creado_en DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (!q.rowCount) return res.status(400).json({ ok: false, error: "Token inválido" });

    const row = q.rows[0];
    if (row.usado_en) return res.status(400).json({ ok: false, error: "Token ya usado" });
    if (new Date(row.expira_en).getTime() < Date.now())
      return res.status(400).json({ ok: false, error: "Token expirado" });

    const hash = await bcrypt.hash(newPassword, 10);

    await client.query("BEGIN");
    await client.query(`UPDATE usuarios SET password_hash=$1 WHERE id=$2`, [
      hash,
      row.usuario_id,
    ]);
    await client.query(`UPDATE tokens_reset_password SET usado_en=now() WHERE id=$1`, [row.id]);

    // invalidar cualquier otro token pendiente
    await client.query(
      `UPDATE tokens_reset_password
       SET usado_en = now()
       WHERE usuario_id = $1 AND usado_en IS NULL`,
      [row.usuario_id]
    );

    await client.query("COMMIT");

    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).json({ ok: false, error: "Error reseteando" });
  } finally {
    client.release();
  }
});

// --------------------
// PISOS / ASIENTOS + POOLS + RESERVAS (igual que antes)
// --------------------

app.get("/api/pisos", async (_req, res) => {
  try {
    const q = await pool.query(`SELECT id, nombre FROM pisos ORDER BY id ASC`);
    res.json({ ok: true, pisos: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error listando pisos" });
  }
});

app.get("/api/asientos", async (req, res) => {
  const pisoNum = Number(req.query.piso);
  if (!pisoNum) return res.status(400).json({ ok: false, error: "Falta piso" });

  const client = await pool.connect();
  try {
    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const q = await client.query(
      `SELECT id, codigo, x, y, radio, activo
       FROM asientos
       WHERE piso_id = $1 AND activo = TRUE
       ORDER BY codigo ASC`,
      [pisoId]
    );
    res.json({ ok: true, asientos: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error listando asientos" });
  } finally {
    client.release();
  }
});

// POST /api/supervisor/pools
app.post("/api/supervisor/pools", async (req, res) => {
  const { supervisor_id, piso, fecha, asiento_ids } = req.body || {};
  const supervisorId = String(supervisor_id || "").trim();
  const pisoNum = Number(piso);

  if (!supervisorId || !pisoNum || !isISODate(fecha) || !Array.isArray(asiento_ids)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await assertRole(client, supervisorId, ["SUPERVISOR", "ADMIN"]);

    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Piso no existe" });
    }

    const poolQ = await client.query(
      `INSERT INTO pools_supervisor (supervisor_id, piso_id, fecha)
       VALUES ($1,$2,$3)
       ON CONFLICT (supervisor_id, piso_id, fecha)
       DO UPDATE SET supervisor_id = EXCLUDED.supervisor_id
       RETURNING id, supervisor_id, piso_id, fecha`,
      [supervisorId, pisoId, fecha]
    );
    const poolRow = poolQ.rows[0];

    await client.query(`DELETE FROM pool_asientos WHERE pool_id = $1`, [poolRow.id]);

    const clean = asiento_ids.map((x) => String(x).trim()).filter(Boolean);
    for (const asientoId of clean) {
      await client.query(`INSERT INTO pool_asientos (pool_id, asiento_id) VALUES ($1,$2)`, [
        poolRow.id,
        asientoId,
      ]);
    }

    await client.query("COMMIT");
    res.json({ ok: true, pool: poolRow, habilitados: clean.length });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    const status = e.status || 500;
    res.status(status).json({ ok: false, error: e.message || "Error creando pool" });
  } finally {
    client.release();
  }
});

// GET /api/supervisor/pool
app.get("/api/supervisor/pool", async (req, res) => {
  const supervisorId = String(req.query.supervisor_id || "").trim();
  const pisoNum = Number(req.query.piso);
  const fecha = String(req.query.fecha || "").trim();

  if (!supervisorId || !pisoNum || !isISODate(fecha)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await assertRole(client, supervisorId, ["SUPERVISOR", "ADMIN"]);

    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const poolQ = await client.query(
      `SELECT id FROM pools_supervisor WHERE supervisor_id=$1 AND piso_id=$2 AND fecha=$3`,
      [supervisorId, pisoId, fecha]
    );
    if (!poolQ.rowCount) return res.json({ ok: true, pool: null, asientos: [] });

    const poolId = poolQ.rows[0].id;

    const asQ = await client.query(`SELECT asiento_id FROM pool_asientos WHERE pool_id=$1`, [
      poolId,
    ]);

    res.json({ ok: true, pool: { id: poolId }, asientos: asQ.rows.map((r) => r.asiento_id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error obteniendo pool" });
  } finally {
    client.release();
  }
});

// GET /api/empleado/disponibles
app.get("/api/empleado/disponibles", async (req, res) => {
  const empleadoId = String(req.query.empleado_id || "").trim();
  const pisoNum = Number(req.query.piso);
  const fecha = String(req.query.fecha || "").trim();

  if (!empleadoId || !pisoNum || !isISODate(fecha)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    const empleado = await assertRole(client, empleadoId, ["EMPLEADO", "ADMIN"]);
    if (!empleado.supervisor_id) {
      return res.json({ ok: true, disponibles: [] });
    }

    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const poolQ = await client.query(
      `SELECT id FROM pools_supervisor
       WHERE supervisor_id=$1 AND piso_id=$2 AND fecha=$3`,
      [empleado.supervisor_id, pisoId, fecha]
    );
    if (!poolQ.rowCount) return res.json({ ok: true, disponibles: [] });

    const poolId = poolQ.rows[0].id;

    const q = await client.query(
      `
      SELECT a.id, a.codigo, a.x, a.y, a.radio
      FROM pool_asientos pa
      JOIN asientos a ON a.id = pa.asiento_id
      WHERE pa.pool_id = $1
        AND a.activo = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM reservas r
          WHERE r.asiento_id = a.id
            AND r.fecha = $2
        )
      ORDER BY a.codigo ASC
      `,
      [poolId, fecha]
    );

    res.json({ ok: true, disponibles: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error disponibles" });
  } finally {
    client.release();
  }
});

// GET /api/empleado/pool-status
// Devuelve TODOS los asientos del pool del supervisor del empleado para (piso, fecha)
// incluyendo si están ocupados y por quién.
// Útil para pintar el mapa (libre/ocupado) sin filtrar solo disponibles.
app.get("/api/empleado/pool-status", async (req, res) => {
  const empleadoId = String(req.query.empleado_id || "").trim();
  const pisoNum = Number(req.query.piso);
  const fecha = String(req.query.fecha || "").trim();

  if (!empleadoId || !pisoNum || !isISODate(fecha)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    const empleado = await assertRole(client, empleadoId, ["EMPLEADO", "ADMIN"]);
    if (!empleado.supervisor_id) {
      return res.json({ ok: true, asientos: [] });
    }

    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const poolQ = await client.query(
      `SELECT id FROM pools_supervisor
       WHERE supervisor_id=$1 AND piso_id=$2 AND fecha=$3`,
      [empleado.supervisor_id, pisoId, fecha]
    );
    if (!poolQ.rowCount) return res.json({ ok: true, asientos: [] });

    const poolId = poolQ.rows[0].id;

    // Todos los asientos del pool + ocupación (si hay reserva en esa fecha)
    const q = await client.query(
      `
      SELECT
        a.id,
        a.codigo,
        a.x,
        a.y,
        a.radio,
        (r.id IS NOT NULL) AS ocupado,
        r.empleado_id AS ocupado_por
      FROM pool_asientos pa
      JOIN asientos a ON a.id = pa.asiento_id
      LEFT JOIN reservas r
        ON r.asiento_id = a.id
       AND r.fecha = $2
      WHERE pa.pool_id = $1
        AND a.activo = TRUE
      ORDER BY a.codigo ASC
      `,
      [poolId, fecha]
    );

    res.json({ ok: true, asientos: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error pool-status" });
  } finally {
    client.release();
  }
});


// POST /api/empleado/reservar
app.post("/api/empleado/reservar", async (req, res) => {
  const empleadoId = String(req.body?.empleado_id || "").trim();
  const asientoId = String(req.body?.asiento_id || "").trim();
  const fecha = String(req.body?.fecha || "").trim();

  if (!empleadoId || !asientoId || !isISODate(fecha)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const empleado = await assertRole(client, empleadoId, ["EMPLEADO", "ADMIN"]);
    if (!empleado.supervisor_id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ ok: false, error: "No tenés supervisor asignado" });
    }

    const asQ = await client.query(`SELECT id, piso_id FROM asientos WHERE id=$1 AND activo=TRUE`, [
      asientoId,
    ]);
    if (!asQ.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Asiento no existe" });
    }

    const pisoId = asQ.rows[0].piso_id;

    const poolQ = await client.query(
      `SELECT ps.id
       FROM pools_supervisor ps
       WHERE ps.supervisor_id=$1 AND ps.piso_id=$2 AND ps.fecha=$3`,
      [empleado.supervisor_id, pisoId, fecha]
    );
    if (!poolQ.rowCount) {
      await client.query("ROLLBACK");
      return res.status(403).json({ ok: false, error: "No hay pool habilitado para esa fecha/piso" });
    }
    const poolId = poolQ.rows[0].id;

    const habilQ = await client.query(
      `SELECT 1 FROM pool_asientos WHERE pool_id=$1 AND asiento_id=$2`,
      [poolId, asientoId]
    );
    if (!habilQ.rowCount) {
      await client.query("ROLLBACK");
      return res.status(403).json({ ok: false, error: "Asiento no habilitado por tu supervisor" });
    }

    const ins = await client.query(
      `INSERT INTO reservas (empleado_id, asiento_id, fecha)
       VALUES ($1,$2,$3)
       RETURNING id, empleado_id, asiento_id, fecha, creado_en`,
      [empleadoId, asientoId, fecha]
    );

    await client.query("COMMIT");
    res.json({ ok: true, reserva: ins.rows[0] });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (e.code === "23505") {
      return res.status(409).json({ ok: false, error: "Ese asiento ya está reservado" });
    }
    console.error(e);
    res.status(500).json({ ok: false, error: "Error reservando" });
  } finally {
    client.release();
  }
});

// GET /api/empleado/mis-reservas
app.get("/api/empleado/mis-reservas", async (req, res) => {
  const empleadoId = String(req.query.empleado_id || "").trim();
  const fecha = String(req.query.fecha || "").trim();
  if (!empleadoId || !isISODate(fecha))
    return res.status(400).json({ ok: false, error: "Faltan datos" });

  try {
    const q = await pool.query(
      `
      SELECT r.id, r.fecha, r.creado_en, a.codigo, a.piso_id
      FROM reservas r
      JOIN asientos a ON a.id = r.asiento_id
      WHERE r.empleado_id = $1
        AND r.fecha = $2
      ORDER BY r.creado_en DESC
      `,
      [empleadoId, fecha]
    );
    res.json({ ok: true, reservas: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error listando reservas" });
  }
});

// DEV endpoints (igual que antes)
app.get("/api/dev/whoami", devGuard, async (req, res) => {
  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).json({ ok: false, error: "Falta id" });

  const client = await pool.connect();
  try {
    const u = await getUserById(client, id);
    res.json({ ok: true, user: u });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error" });
  } finally {
    client.release();
  }
});

app.post("/api/dev/seed", devGuard, async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pisos = [
      { id: 7, nombre: "Piso 7" },
      { id: 8, nombre: "Piso 8" },
      { id: 11, nombre: "Piso 11" },
      { id: 12, nombre: "Piso 12" },
    ];

    for (const p of pisos) {
      await client.query(
        `INSERT INTO pisos (id, nombre)
         VALUES ($1,$2)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.nombre]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, message: "Seed OK (pisos)" });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).json({ ok: false, error: "Seed error" });
  } finally {
    client.release();
  }
});

// SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server escuchando en puerto", PORT));

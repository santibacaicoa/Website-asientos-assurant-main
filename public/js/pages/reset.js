// server.js (v2) - Backend para sistema de pools (Supervisor -> habilita asientos, Empleado -> reserva 1)
// + Auth con verificación email + reset password
// ----------------------------------------------------------------------------------------------
// Variables de entorno:
// - DATABASE_URL: connection string de Neon
// - DATABASE_SSL: "true" para forzar SSL (Render + Neon)
// - SETUP_KEY: key para endpoints /api/dev/*
// - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: SMTP
// - MAIL_FROM: ejemplo "Assurant <no-reply@assurant.com>"
// - APP_BASE_URL: ejemplo "http://localhost:3000" o tu URL de Render

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
} = process.env;

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: false,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

async function sendMail({ to, subject, html }) {
  // Si no hay SMTP configurado, no rompemos: logueamos el mail (modo dev).
  if (!transporter) {
    console.log("📧 [DEV MAIL] to:", to, "subject:", subject);
    console.log(html);
    return;
  }
  await transporter.sendMail({
    from: MAIL_FROM || SMTP_USER,
    to,
    subject,
    html,
  });
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}
function sha256(x) {
  return crypto.createHash("sha256").update(x).digest("hex");
}

const app = express();
app.use(express.json());

// Static para servir /public
app.use(express.static(path.join(__dirname, "..", "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// --------------------
// Helpers
// --------------------
function isISODate(yyyyMmDd) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(yyyyMmDd || ""));
}

function baseUrl() {
  return APP_BASE_URL || "http://localhost:3000";
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
  // En el schema nuevo: pisos.id es el número (7,8,11,12)
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
// AUTH (v2) - Registro + Login + Verificación + Reset Password
// --------------------

// Registro (crea EMPLEADO, opcional supervisor_email)
// body: { email, password, nombre, apellido, supervisor_email? }
app.post("/api/auth/register", async (req, res) => {
  const { email, password, nombre, apellido, supervisor_email } = req.body || {};
  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Si viene supervisor_email, validar que exista y sea SUPERVISOR
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
      [
        normalizedEmail,
        hash,
        String(nombre).trim(),
        String(apellido).trim(),
        supervisorId,
      ]
    );

    const user = q.rows[0];

    // Crear token verificación email
    const token = randomToken();
    const tokenHash = sha256(token);
    const expira = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await client.query(
      `INSERT INTO tokens_verificacion_email (usuario_id, token_hash, expira_en)
       VALUES ($1,$2,$3)`,
      [user.id, tokenHash, expira]
    );

    await client.query("COMMIT");

    // Enviar mail verificación (afuera del TX)
    const link = `${baseUrl()}/api/auth/verify-email?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Verificá tu email",
      html: `
        <p>Hola ${user.nombre},</p>
        <p>Para verificar tu email, hacé click acá:</p>
        <p><a href="${link}">Verificar email</a></p>
        <p>Este link vence en 24 horas.</p>
      `,
    });

    // Importante: no auto-login, pediste verificación primero
    res.json({
      ok: true,
      message: "Cuenta creada. Te enviamos un email para verificar tu cuenta antes de ingresar.",
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
// GET /api/auth/verify-email?token=...
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

    await client.query(
      `UPDATE usuarios SET email_verificado = TRUE WHERE id = $1`,
      [row.usuario_id]
    );

    await client.query(
      `UPDATE tokens_verificacion_email SET usado_en = now() WHERE id = $1`,
      [row.id]
    );

    await client.query("COMMIT");

    // vuelve al login con flag
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
// body: { email, password }
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

    // bloquear si no verificó email
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

// Forgot password (no revela si el email existe)
// body: { email }
app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, error: "Falta email" });

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

    const token = randomToken();
    const tokenHash = sha256(token);
    const expira = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await client.query(
      `INSERT INTO tokens_reset_password (usuario_id, token_hash, expira_en)
       VALUES ($1,$2,$3)`,
      [user.id, tokenHash, expira]
    );

    const link = `${baseUrl()}/reset.html?token=${token}`;

    await sendMail({
      to: user.email,
      subject: "Resetear contraseña",
      html: `
        <p>Hola ${user.nombre || ""},</p>
        <p>Para resetear tu contraseña, hacé click acá:</p>
        <p><a href="${link}">Resetear contraseña</a></p>
        <p>Este link vence en 30 minutos.</p>
      `,
    });
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
  }
});

// Reset password
// body: { token, password }
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
    await client.query(`UPDATE usuarios SET password_hash=$1 WHERE id=$2`, [hash, row.usuario_id]);
    await client.query(`UPDATE tokens_reset_password SET usado_en=now() WHERE id=$1`, [row.id]);
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
// PISOS / ASIENTOS (base)
// --------------------
app.get

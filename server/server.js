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

// Reenviar verificación de email (no revela si el email existe)
// body: { email }
app.post("/api/auth/resend-verification", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, error: "Falta email" });

  // Respuesta siempre OK (para evitar enumeración de usuarios)
  res.json({
    ok: true,
    message: "Si tu cuenta existe y todavía no está verificada, te reenviamos el email.",
  });

  const client = await pool.connect();
  try {
    const q = await client.query(
      `SELECT id, email, nombre, email_verificado
       FROM usuarios
       WHERE email = $1`,
      [email]
    );

    if (!q.rowCount) return;

    const user = q.rows[0];
    if (user.email_verificado) return;

    const token = randomToken();
    const tokenHash = sha256(token);
    const expira = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await client.query(
      `INSERT INTO tokens_verificacion_email (usuario_id, token_hash, expira_en)
       VALUES ($1,$2,$3)`,
      [user.id, tokenHash, expira]
    );

    const link = `${baseUrl()}/api/auth/verify-email?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Reenvío: verificá tu email",
      html: `
        <p>Hola ${user.nombre || ""},</p>
        <p>Te reenviamos el link para verificar tu email:</p>
        <p><a href="${link}">Verificar email</a></p>
        <p>Este link vence en 24 horas.</p>
      `,
    });
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
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
app.get("/api/pisos", async (_req, res) => {
  try {
    const q = await pool.query(`SELECT id, nombre FROM pisos ORDER BY id ASC`);
    res.json({ ok: true, pisos: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error listando pisos" });
  }
});

// Lista de asientos de un piso (para renderizar mapa)
// GET /api/asientos?piso=8
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

// --------------------
// SUPERVISOR: crear pool + habilitar asientos
// --------------------
// POST /api/supervisor/pools
// body: { supervisor_id, piso, fecha, asiento_ids: [uuid, uuid, ...] }
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

    // Upsert del pool (1 por supervisor/piso/fecha)
    const poolQ = await client.query(
      `INSERT INTO pools_supervisor (supervisor_id, piso_id, fecha)
       VALUES ($1,$2,$3)
       ON CONFLICT (supervisor_id, piso_id, fecha)
       DO UPDATE SET supervisor_id = EXCLUDED.supervisor_id
       RETURNING id, supervisor_id, piso_id, fecha`,
      [supervisorId, pisoId, fecha]
    );
    const poolRow = poolQ.rows[0];

    // Reemplazamos la lista de asientos habilitados del pool (modo “fuente de verdad”)
    await client.query(`DELETE FROM pool_asientos WHERE pool_id = $1`, [poolRow.id]);

    const clean = asiento_ids.map((x) => String(x).trim()).filter(Boolean);
    for (const asientoId of clean) {
      await client.query(
        `INSERT INTO pool_asientos (pool_id, asiento_id) VALUES ($1,$2)`,
        [poolRow.id, asientoId]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, pool: poolRow, habilitados: clean.length });
  } catch (e) {
    await client.query("ROLLBACK");
    const status = e.status || 500;
    res.status(status).json({ ok: false, error: e.message || "Error creando pool" });
  } finally {
    client.release();
  }
});

// GET /api/supervisor/pool
// query: supervisor_id, piso, fecha
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

    const asQ = await client.query(
      `SELECT asiento_id FROM pool_asientos WHERE pool_id=$1`,
      [poolId]
    );

    res.json({ ok: true, pool: { id: poolId }, asientos: asQ.rows.map((r) => r.asiento_id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error obteniendo pool" });
  } finally {
    client.release();
  }
});

// --------------------
// EMPLEADO: ver asientos disponibles de su supervisor + reservar
// --------------------
// GET /api/empleado/disponibles?empleado_id=...&piso=8&fecha=YYYY-MM-DD
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

    // buscar pool supervisor para esa fecha/piso
    const poolQ = await client.query(
      `SELECT id FROM pools_supervisor
       WHERE supervisor_id=$1 AND piso_id=$2 AND fecha=$3`,
      [empleado.supervisor_id, pisoId, fecha]
    );
    if (!poolQ.rowCount) return res.json({ ok: true, disponibles: [] });

    const poolId = poolQ.rows[0].id;

    // Asientos habilitados - menos los ya reservados esa fecha/piso
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

// POST /api/empleado/reservar
// body: { empleado_id, asiento_id, fecha }
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

    // validar que el asiento exista
    const asQ = await client.query(
      `SELECT id, piso_id FROM asientos WHERE id=$1 AND activo=TRUE`,
      [asientoId]
    );
    if (!asQ.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Asiento no existe" });
    }

    const pisoId = asQ.rows[0].piso_id;

    // validar que el asiento esté habilitado en el pool del supervisor para esa fecha/piso
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

    // Insert reserva (si ya reservado, falla por unique)
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

// GET /api/empleado/mis-reservas?empleado_id=...&fecha=YYYY-MM-DD
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

// --------------------
// DEV / Setup endpoints (opcional)
// --------------------

// GET /api/dev/whoami?id=...
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

// POST /api/dev/seed
// crea pisos (7,8,11,12) y algunos asientos ejemplo si no existen
app.post("/api/dev/seed", devGuard, async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // pisos por id
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

// --------------------
// SERVER
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server escuchando en puerto", PORT));

// server.js (v2) - Backend para sistema de pools (Supervisor -> habilita asientos, Empleado -> reserva 1)
// ----------------------------------------------------------------------------------------------
// Variables de entorno:
// - DATABASE_URL: connection string de Neon
// - DATABASE_SSL: "true" para forzar SSL (Render + Neon)
// - SETUP_KEY: (opcional) key para endpoints /api/dev/*
 // email sender
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
  // Si no hay SMTP configurado, no rompemos: logueamos el mail.
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


const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

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
app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --------------------
// AUTH (v2)
// --------------------
// Registro (por ahora: permite crear EMPLEADO; el supervisor se asigna por supervisor_email)
// body: { email, password, nombre, apellido, supervisor_email? }
app.post("/api/auth/register", async (req, res) => {
  const { email, password, nombre, apellido, supervisor_email } = req.body || {};
  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    let supervisorId = null;
    if (supervisor_email) {
      const s = await client.query(
        `SELECT id FROM usuarios WHERE email = $1 AND rol = 'SUPERVISOR'`,
        [String(supervisor_email).trim().toLowerCase()]
      );
      supervisorId = s.rows[0]?.id || null;
      if (!supervisorId) {
        return res
          .status(404)
          .json({ ok: false, error: "Supervisor no encontrado" });
      }
    }

    const hash = await bcrypt.hash(String(password), 10);

    const q = await client.query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, supervisor_id)
       VALUES ($1,$2,$3,$4,'EMPLEADO',$5)
       RETURNING id, email, nombre, apellido, rol, supervisor_id, email_verificado`,
      [String(email).trim().toLowerCase(), hash, String(nombre).trim(), String(apellido).trim(), supervisorId]
    );

    res.json({ ok: true, user: q.rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ ok: false, error: "Email ya existe" });
    }
    console.error(e);
    res.status(500).json({ ok: false, error: "Error registrando usuario" });
  } finally {
    client.release();
  }
});

// --------------------
// AUTH (EMAIL + PASSWORD) - NUEVO
// --------------------
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  try {
    const q = await pool.query(
      `SELECT id, username, nombre, apellido, rol, password_hash
       FROM usuarios
       WHERE username=$1`,
      [String(email).trim().toLowerCase()]
    );

    if (!q.rowCount) {
      return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    }

    const user = q.rows[0];

    // Si no tiene hash, no puede loguearse con password
    if (!user.password_hash) {
      return res.status(401).json({
        ok: false,
        error: "Usuario sin contraseña. Registralo o asignale password.",
      });
    }

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
    }

    delete user.password_hash;
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.username,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error login" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, nombre, apellido } = req.body || {};
  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  try {
    const hash = await bcrypt.hash(String(password), 10);

    const q = await pool.query(
      `INSERT INTO usuarios (username, nombre, apellido, rol, password_hash)
       VALUES ($1,$2,$3,'user',$4)
       RETURNING id, username, nombre, apellido, rol`,
      [String(email).trim().toLowerCase(), nombre.trim(), apellido.trim(), hash]
    );

    res.json({
      ok: true,
      user: {
        id: q.rows[0].id,
        email: q.rows[0].username,
        nombre: q.rows[0].nombre,
        apellido: q.rows[0].apellido,
        rol: q.rows[0].rol,
      },
    });
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ ok: false, error: "Email ya existe" });
    console.error(e);
    res.status(500).json({ ok: false, error: "Error registrando" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, nombre, apellido } = req.body || {};
  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const hash = await bcrypt.hash(String(password), 10);

    const q = await pool.query(
      `INSERT INTO usuarios (username, nombre, apellido, rol, password_hash)
       VALUES ($1,$2,$3,'user',$4)
       RETURNING id, username, nombre, apellido, rol`,
      [normalizedEmail, String(nombre).trim(), String(apellido).trim(), hash]
    );

    res.json({
      ok: true,
      user: {
        id: q.rows[0].id,
        email: q.rows[0].username,
        nombre: q.rows[0].nombre,
        apellido: q.rows[0].apellido,
        rol: q.rows[0].rol,
      },
    });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ ok: false, error: "Ese email ya existe" });
    }
    console.error(e);
    res.status(500).json({ ok: false, error: "Error registrando" });
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
    const ok = await bcrypt.compare(String(password), u.password_hash || "");
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Password incorrecta" });
    }

    delete u.password_hash;
    res.json({ ok: true, user: u });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error login" });
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
    console.error(e);
    res.status(status).json({ ok: false, error: e.message || "Error creando pool" });
  } finally {
    client.release();
  }
});

// GET /api/supervisor/pools?supervisor_id=...&piso=8&fecha=YYYY-MM-DD
app.get("/api/supervisor/pools", async (req, res) => {
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

    const p = await client.query(
      `SELECT id, supervisor_id, piso_id, fecha
       FROM pools_supervisor
       WHERE supervisor_id=$1 AND piso_id=$2 AND fecha=$3`,
      [supervisorId, pisoId, fecha]
    );
    if (!p.rowCount) return res.json({ ok: true, pool: null });

    const poolId = p.rows[0].id;

    const seats = await client.query(
      `SELECT a.id, a.codigo, a.x, a.y, a.radio
       FROM pool_asientos pa
       JOIN asientos a ON a.id = pa.asiento_id
       WHERE pa.pool_id = $1
       ORDER BY a.codigo ASC`,
      [poolId]
    );

    res.json({ ok: true, pool: p.rows[0], asientos: seats.rows });
  } catch (e) {
    const status = e.status || 500;
    console.error(e);
    res.status(status).json({ ok: false, error: e.message || "Error consultando pool" });
  } finally {
    client.release();
  }
});

// --------------------
// EMPLEADO: ver pool de su supervisor + asientos disponibles + reservar
// --------------------
// GET /api/empleado/pool?empleado_id=...&piso=8&fecha=YYYY-MM-DD
app.get("/api/empleado/pool", async (req, res) => {
  const empleadoId = String(req.query.empleado_id || "").trim();
  const pisoNum = Number(req.query.piso);
  const fecha = String(req.query.fecha || "").trim();

  if (!empleadoId || !pisoNum || !isISODate(fecha)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    const emp = await assertRole(client, empleadoId, ["EMPLEADO"]);

    if (!emp.supervisor_id) {
      return res.status(400).json({ ok: false, error: "Empleado sin supervisor asignado" });
    }

    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const p = await client.query(
      `SELECT id, supervisor_id, piso_id, fecha
       FROM pools_supervisor
       WHERE supervisor_id=$1 AND piso_id=$2 AND fecha=$3`,
      [emp.supervisor_id, pisoId, fecha]
    );

    res.json({ ok: true, pool: p.rows[0] || null });
  } catch (e) {
    const status = e.status || 500;
    console.error(e);
    res.status(status).json({ ok: false, error: e.message || "Error buscando pool" });
  } finally {
    client.release();
  }
});

// GET /api/empleado/asientos-disponibles?empleado_id=...&piso=8&fecha=YYYY-MM-DD
app.get("/api/empleado/asientos-disponibles", async (req, res) => {
  const empleadoId = String(req.query.empleado_id || "").trim();
  const pisoNum = Number(req.query.piso);
  const fecha = String(req.query.fecha || "").trim();

  if (!empleadoId || !pisoNum || !isISODate(fecha)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    const emp = await assertRole(client, empleadoId, ["EMPLEADO"]);
    if (!emp.supervisor_id) {
      return res.status(400).json({ ok: false, error: "Empleado sin supervisor asignado" });
    }

    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const p = await client.query(
      `SELECT id
       FROM pools_supervisor
       WHERE supervisor_id=$1 AND piso_id=$2 AND fecha=$3`,
      [emp.supervisor_id, pisoId, fecha]
    );
    if (!p.rowCount) {
      return res.json({ ok: true, pool_id: null, disponibles: [], ocupados: [] });
    }

    const poolId = p.rows[0].id;

    // Ocupados = reservas_empleado dentro del pool
    const occ = await client.query(
      `SELECT re.asiento_id, u.nombre, u.apellido
       FROM reservas_empleado re
       JOIN usuarios u ON u.id = re.empleado_id
       WHERE re.pool_id = $1`,
      [poolId]
    );

    const occSet = new Set(occ.rows.map((r) => r.asiento_id));
    const occInfo = occ.rows.map((r) => ({
      asiento_id: r.asiento_id,
      nombre: `${r.nombre} ${r.apellido}`.trim(),
    }));

    // Disponibles = asientos del pool - ocupados
    const seats = await client.query(
      `SELECT a.id, a.codigo, a.x, a.y, a.radio
       FROM pool_asientos pa
       JOIN asientos a ON a.id = pa.asiento_id
       WHERE pa.pool_id = $1
       ORDER BY a.codigo ASC`,
      [poolId]
    );

    const disponibles = seats.rows.filter((s) => !occSet.has(s.id));

    res.json({ ok: true, pool_id: poolId, disponibles, ocupados: occInfo });
  } catch (e) {
    const status = e.status || 500;
    console.error(e);
    res.status(status).json({ ok: false, error: e.message || "Error listando disponibles" });
  } finally {
    client.release();
  }
});

// POST /api/empleado/reservar
// body: { empleado_id, pool_id, asiento_id }
app.post("/api/empleado/reservar", async (req, res) => {
  const { empleado_id, pool_id, asiento_id } = req.body || {};
  const empleadoId = String(empleado_id || "").trim();
  const poolId = String(pool_id || "").trim();
  const asientoId = String(asiento_id || "").trim();

  if (!empleadoId || !poolId || !asientoId) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const emp = await assertRole(client, empleadoId, ["EMPLEADO"]);
    if (!emp.supervisor_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Empleado sin supervisor asignado" });
    }

    // Validar que el pool pertenezca al supervisor del empleado
    const p = await client.query(
      `SELECT id, supervisor_id
       FROM pools_supervisor
       WHERE id=$1`,
      [poolId]
    );
    if (!p.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Pool no existe" });
    }
    if (String(p.rows[0].supervisor_id) !== String(emp.supervisor_id)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ ok: false, error: "Pool no pertenece a tu supervisor" });
    }

    // Validar que el asiento esté dentro del pool
    const inside = await client.query(
      `SELECT 1 FROM pool_asientos WHERE pool_id=$1 AND asiento_id=$2`,
      [poolId, asientoId]
    );
    if (!inside.rowCount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Asiento no habilitado en este pool" });
    }

    // Insert reserva (constraints en DB se encargan de duplicados)
    const ins = await client.query(
      `INSERT INTO reservas_empleado (pool_id, asiento_id, empleado_id)
       VALUES ($1,$2,$3)
       RETURNING id, pool_id, asiento_id, empleado_id, creado_en`,
      [poolId, asientoId, empleadoId]
    );

    await client.query("COMMIT");
    res.json({ ok: true, reserva: ins.rows[0] });
  } catch (e) {
    await client.query("ROLLBACK");
    // unique violations:
    // uq_reserva_pool_asiento -> asiento ya reservado
    // uq_reserva_empleado_pool -> empleado ya reservó en ese pool
    if (e.code === "23505") {
      return res.status(409).json({
        ok: false,
        error: "Conflicto: asiento ya reservado o ya tenés una reserva en este pool",
      });
    }
    console.error(e);
    res.status(500).json({ ok: false, error: "Error reservando" });
  } finally {
    client.release();
  }
});

// --------------------
// ADMIN: borrar reserva
// --------------------
// DELETE /api/admin/reservas/:id?admin_id=...
app.delete("/api/admin/reservas/:id", async (req, res) => {
  const adminId = String(req.query.admin_id || "").trim();
  const reservaId = String(req.params.id || "").trim();

  if (!adminId || !reservaId) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertRole(client, adminId, ["ADMIN"]);

    const del = await client.query(
      `DELETE FROM reservas_empleado WHERE id=$1 RETURNING id`,
      [reservaId]
    );
    await client.query("COMMIT");

    if (!del.rowCount) return res.status(404).json({ ok: false, error: "Reserva no encontrada" });
    res.json({ ok: true, deleted: del.rows[0] });
  } catch (e) {
    await client.query("ROLLBACK");
    const status = e.status || 500;
    console.error(e);
    res.status(status).json({ ok: false, error: e.message || "Error borrando reserva" });
  } finally {
    client.release();
  }
});

// --------------------
// DEV: crear usuario SUPERVISOR/ADMIN rápido (protegido por SETUP_KEY)
// --------------------
// POST /api/dev/create-user?key=...
// body: { email, password, nombre, apellido, rol: 'SUPERVISOR'|'ADMIN'|'EMPLEADO', supervisor_email? }
app.post("/api/dev/create-user", devGuard, async (req, res) => {
  const { email, password, nombre, apellido, rol, supervisor_email } = req.body || {};
  const role = String(rol || "").trim().toUpperCase();

  if (!email || !password || !nombre || !apellido || !["EMPLEADO", "SUPERVISOR", "ADMIN"].includes(role)) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    let supervisorId = null;
    if (role === "EMPLEADO" && supervisor_email) {
      const s = await client.query(
        `SELECT id FROM usuarios WHERE email=$1 AND rol='SUPERVISOR'`,
        [String(supervisor_email).trim().toLowerCase()]
      );
      supervisorId = s.rows[0]?.id || null;
      if (!supervisorId) return res.status(404).json({ ok: false, error: "Supervisor no encontrado" });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const q = await client.query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, supervisor_id, email_verificado)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)
       RETURNING id, email, nombre, apellido, rol, supervisor_id, email_verificado`,
      [String(email).trim().toLowerCase(), hash, String(nombre).trim(), String(apellido).trim(), role, supervisorId]
    );
    res.json({ ok: true, user: q.rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ ok: false, error: "Email ya existe" });
    console.error(e);
    res.status(500).json({ ok: false, error: "Error creando usuario" });
  } finally {
    client.release();
  }
});

// --------------------
// DEV: seed asientos (cargar coordenadas) - protegido por SETUP_KEY
// --------------------
// POST /api/dev/seed-asientos?key=...
// body: { piso: 8, seats: [{codigo,x,y,radio?}, ...] }
app.post("/api/dev/seed-asientos", devGuard, async (req, res) => {
  const { piso, seats } = req.body || {};
  const pisoNum = Number(piso);
  if (!pisoNum || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pisoId = await getPisoIdByNumero(client, pisoNum);
    if (!pisoId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Piso no existe" });
    }

    let inserted = 0;
    for (const s of seats) {
      const codigo = String(s.codigo || "").trim();
      const x = Number(s.x);
      const y = Number(s.y);
      const radio = s.radio == null ? null : Number(s.radio);

      if (!codigo || !Number.isFinite(x) || !Number.isFinite(y)) continue;

      // Normalizamos: front viejo usa % (0..100). En DB queremos 0..1.
      const nx = x > 1 ? x / 100 : x;
      const ny = y > 1 ? y / 100 : y;

      await client.query(
        `INSERT INTO asientos (piso_id, codigo, x, y, radio)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (piso_id, codigo)
         DO UPDATE SET x=EXCLUDED.x, y=EXCLUDED.y, radio=EXCLUDED.radio, activo=TRUE`,
        [pisoId, codigo, nx, ny, radio]
      );
      inserted++;
    }

    await client.query("COMMIT");
    res.json({ ok: true, piso: pisoNum, upserts: inserted });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ ok: false, error: "Error seedeando asientos" });
  } finally {
    client.release();
  }
});

// --------------------
// START
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor v2 activo en http://localhost:${PORT}`);
});

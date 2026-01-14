// server.js
const path = require("path");
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

// Static (importantísimo para /images/...)
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "reservas_oficina",
  user: "postgres",
  password: "TuNuevaPasswordSegura",
});

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
// SETUP (DEV) + reset opcional
//
// Normal:
//   http://localhost:3000/api/setup-local
//
// Reset DEV (borra y recrea todo):
//   http://localhost:3000/api/setup-local?reset=1
//
// En producción se bloquea salvo key.
// --------------------
app.get("/api/setup-local", async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const setupKey = process.env.SETUP_KEY;
  const key = String(req.query.key || "");
  const reset = String(req.query.reset || "") === "1";

  if (isProd) {
    if (!setupKey || key !== setupKey) {
      return res.status(403).json({
        ok: false,
        error: "Setup deshabilitado en producción (o key inválida).",
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (reset) {
      await client.query(`DROP TABLE IF EXISTS reservas_asientos CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS reservas CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS pisos CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS usuarios CASCADE;`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        rol TEXT NOT NULL CHECK (rol IN ('user','admin')),
        password_hash TEXT,
        creado_en TIMESTAMP DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pisos (
        id SERIAL PRIMARY KEY,
        numero INT UNIQUE NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('individual','grupal')),
        cantidad_asientos INT NOT NULL DEFAULT 1,
        piso_id INT REFERENCES pisos(id),
        fecha DATE,
        estado TEXT NOT NULL DEFAULT 'borrador'
          CHECK (estado IN ('borrador','confirmada')),
        creada_en TIMESTAMP DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas_asientos (
        id SERIAL PRIMARY KEY,
        reserva_id INT NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
        piso_id INT NOT NULL REFERENCES pisos(id) ON DELETE CASCADE,
        fecha DATE NOT NULL,
        asiento_id TEXT NOT NULL,
        creada_en TIMESTAMP DEFAULT now(),
        UNIQUE (piso_id, fecha, asiento_id)
      );
    `);

    await client.query(`
      INSERT INTO pisos (numero) VALUES (7),(8),(11),(12)
      ON CONFLICT (numero) DO NOTHING;
    `);

    await client.query("COMMIT");

    res.json({
      ok: true,
      message: reset ? "DB reseteada y lista (local)" : "DB lista (local)",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

// --------------------
// Helpers
// --------------------
async function getPisoId(numero) {
  const r = await pool.query("SELECT id FROM pisos WHERE numero = $1", [numero]);
  return r.rows[0]?.id || null;
}

// --------------------
// AUTH
// --------------------
app.post("/api/auth/register-user", async (req, res) => {
  const { username, nombre, apellido } = req.body || {};
  if (!username || !nombre || !apellido) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  try {
    const q = await pool.query(
      `INSERT INTO usuarios (username, nombre, apellido, rol)
       VALUES ($1,$2,$3,'user')
       RETURNING id, username, nombre, apellido, rol`,
      [username.trim(), nombre.trim(), apellido.trim()]
    );
    res.json({ ok: true, user: q.rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ ok: false, error: "Username ya existe" });
    console.error(e);
    res.status(500).json({ ok: false, error: "Error registrando usuario" });
  }
});

app.post("/api/auth/login-user", async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ ok: false, error: "Falta username" });

  try {
    const q = await pool.query(
      `SELECT id, username, nombre, apellido, rol
       FROM usuarios
       WHERE username=$1 AND rol='user'`,
      [username.trim()]
    );
    if (!q.rowCount) return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    res.json({ ok: true, user: q.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error login" });
  }
});

app.post("/api/auth/find-users", async (req, res) => {
  const { nombre, apellido } = req.body || {};
  if (!nombre || !apellido) return res.status(400).json({ ok: false, error: "Faltan datos" });

  try {
    const q = await pool.query(
      `SELECT id, username, nombre, apellido, rol
       FROM usuarios
       WHERE lower(nombre)=lower($1) AND lower(apellido)=lower($2) AND rol='user'
       ORDER BY id ASC`,
      [nombre.trim(), apellido.trim()]
    );
    res.json({ ok: true, matches: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error buscando usuarios" });
  }
});

app.post("/api/auth/register-admin", async (req, res) => {
  const { username, nombre, apellido, password } = req.body || {};
  if (!username || !nombre || !apellido || !password) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const q = await pool.query(
      `INSERT INTO usuarios (username, nombre, apellido, rol, password_hash)
       VALUES ($1,$2,$3,'admin',$4)
       RETURNING id, username, nombre, apellido, rol`,
      [username.trim(), nombre.trim(), apellido.trim(), hash]
    );
    res.json({ ok: true, user: q.rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ ok: false, error: "Username ya existe" });
    console.error(e);
    res.status(500).json({ ok: false, error: "Error registrando admin" });
  }
});

app.post("/api/auth/login-admin", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: "Faltan datos" });

  try {
    const q = await pool.query(
      `SELECT id, username, nombre, apellido, rol, password_hash
       FROM usuarios WHERE username=$1 AND rol='admin'`,
      [username.trim()]
    );
    if (!q.rowCount) return res.status(404).json({ ok: false, error: "Admin no encontrado" });

    const admin = q.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash || "");
    if (!ok) return res.status(401).json({ ok: false, error: "Password incorrecta" });

    delete admin.password_hash;
    res.json({ ok: true, user: admin });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error login admin" });
  }
});

// --------------------
// RESERVAS
// --------------------
app.post("/api/pre-reservas", async (req, res) => {
  const { usuario_id, tipo, cantidad_asientos } = req.body || {};
  if (!usuario_id || !tipo) return res.status(400).json({ ok: false, error: "Faltan datos" });

  const cant = Number.isFinite(Number(cantidad_asientos)) ? Math.max(1, Number(cantidad_asientos)) : 1;

  try {
    const u = await pool.query(`SELECT id, nombre, apellido FROM usuarios WHERE id = $1`, [Number(usuario_id)]);
    if (!u.rowCount) return res.status(404).json({ ok: false, error: "Usuario no existe" });

    const fullName = `${u.rows[0].nombre} ${u.rows[0].apellido}`.trim();

    const result = await pool.query(
      `INSERT INTO reservas (usuario_id, nombre, tipo, cantidad_asientos)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [Number(usuario_id), fullName, tipo, cant]
    );

    res.json({ ok: true, reserva: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error creando reserva" });
  }
});

app.patch("/api/reservas/:id/piso", async (req, res) => {
  const reservaId = Number(req.params.id);
  const pisoNum = Number(req.body?.piso);

  if (!reservaId || !pisoNum) return res.status(400).json({ ok: false, error: "Faltan datos" });

  try {
    const pisoId = await getPisoId(pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const q = await pool.query(`UPDATE reservas SET piso_id=$1 WHERE id=$2 RETURNING *`, [pisoId, reservaId]);
    if (!q.rowCount) return res.status(404).json({ ok: false, error: "Reserva no encontrada" });

    res.json({ ok: true, reserva: q.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error seteando piso" });
  }
});

// --------------------
// ASIENTOS
// --------------------
app.get("/api/asientos/ocupados", async (req, res) => {
  const pisoNum = Number(req.query.piso);
  const fecha = String(req.query.fecha || "").trim();
  if (!pisoNum || !fecha) return res.status(400).json({ ok: false, error: "Faltan piso/fecha" });

  try {
    const pisoId = await getPisoId(pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const q = await pool.query(
      `SELECT asiento_id FROM reservas_asientos
       WHERE piso_id=$1 AND fecha=$2
       ORDER BY asiento_id ASC`,
      [pisoId, fecha]
    );

    res.json({ ok: true, ocupados: q.rows.map((r) => r.asiento_id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error consultando ocupados" });
  }
});

// ✅ NUEVO: ocupados + nombre (para tooltip)
app.get("/api/asientos/ocupados-info", async (req, res) => {
  const pisoNum = Number(req.query.piso);
  const fecha = String(req.query.fecha || "").trim();
  if (!pisoNum || !fecha) return res.status(400).json({ ok: false, error: "Faltan piso/fecha" });

  try {
    const pisoId = await getPisoId(pisoNum);
    if (!pisoId) return res.status(404).json({ ok: false, error: "Piso no existe" });

    const q = await pool.query(
      `SELECT ra.asiento_id, r.nombre
       FROM reservas_asientos ra
       JOIN reservas r ON r.id = ra.reserva_id
       WHERE ra.piso_id=$1 AND ra.fecha=$2
       ORDER BY ra.asiento_id ASC`,
      [pisoId, fecha]
    );

    res.json({ ok: true, ocupados: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error consultando ocupados" });
  }
});

// --------------------
// Confirmar asientos seleccionados (modo cine)
// POST /api/asientos/confirmar
// body: { reserva_id, piso, fecha, asientos: ["11-01","11-02"] }
// --------------------
app.post("/api/asientos/confirmar", async (req, res) => {
  const reservaId = Number(req.body?.reserva_id);
  const pisoNum = Number(req.body?.piso);
  const fecha = String(req.body?.fecha || "").trim();
  const asientos = Array.isArray(req.body?.asientos) ? req.body.asientos : [];

  if (!reservaId || !pisoNum || !fecha || asientos.length === 0) {
    return res.status(400).json({ ok: false, error: "Faltan datos (reserva_id, piso, fecha, asientos[])" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rsv = await client.query(`SELECT id, tipo FROM reservas WHERE id=$1`, [reservaId]);
    if (!rsv.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Reserva no encontrada" });
    }

    const pisoId = await (async () => {
      const p = await client.query(`SELECT id FROM pisos WHERE numero=$1`, [pisoNum]);
      return p.rows[0]?.id || null;
    })();

    if (!pisoId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Piso no existe" });
    }

    const tipo = rsv.rows[0].tipo;
    if (tipo === "individual" && asientos.length > 1) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Reserva individual: solo 1 asiento" });
    }

    for (const seatIdRaw of asientos) {
      const seatId = String(seatIdRaw).trim();
      await client.query(
        `INSERT INTO reservas_asientos (reserva_id, piso_id, fecha, asiento_id)
         VALUES ($1,$2,$3,$4)`,
        [reservaId, pisoId, fecha, seatId]
      );
    }

    await client.query(
      `UPDATE reservas
       SET piso_id=$1, fecha=$2, estado='confirmada'
       WHERE id=$3`,
      [pisoId, fecha, reservaId]
    );

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");

    if (e.code === "23505") {
      return res.status(409).json({ ok: false, error: "Uno de los asientos ya está ocupado. Actualizá la vista." });
    }

    console.error(e);
    res.status(500).json({ ok: false, error: "Error confirmando asientos" });
  } finally {
    client.release();
  }
});

// --------------------
// START
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en http://localhost:${PORT}`));

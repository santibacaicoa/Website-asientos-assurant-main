// server.js
// =============================================================================
// Servidor Node.js + Express
// - Sirve archivos estáticos (tu frontend)
// - API Auth (usuarios + admins)
// - API Reservas (pre-reserva + asignar piso)
// =============================================================================

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();

// 1) Conexión a PostgreSQL (ajustá SOLO tu password si hace falta)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'reservas_oficina',
  password: 'TuNuevaPasswordSegura',
  port: 5432,
});

// 2) Middleware
app.use(express.json());

// 3) Archivos estáticos (HTML/CSS/JS/Images)
app.use(express.static(__dirname));

// =============================================================================
// AUTH
// =============================================================================

// Registrar usuario común (sin password)
app.post('/api/auth/register-user', async (req, res) => {
  const { username, nombre, apellido } = req.body || {};
  if (!username || !nombre || !apellido) {
    return res.status(400).json({ ok: false, error: 'Faltan datos (username, nombre, apellido)' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO usuarios (username, nombre, apellido, rol)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, username, nombre, apellido, rol`,
      [username.trim(), nombre.trim(), apellido.trim()]
    );
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    // username unique
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ese username ya existe. Elegí otro.' });
    }
    console.error('Error register-user:', err);
    return res.status(500).json({ ok: false, error: 'Error registrando usuario' });
  }
});

// Login usuario común por username (sin password)
app.post('/api/auth/login-user', async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ ok: false, error: 'Falta username' });

  try {
    const result = await pool.query(
      `SELECT id, username, nombre, apellido, rol
       FROM usuarios
       WHERE username = $1 AND rol = 'user'`,
      [username.trim()]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('Error login-user:', err);
    return res.status(500).json({ ok: false, error: 'Error en login' });
  }
});

// Buscar usuarios por nombre+apellido (si se olvidó el username)
app.post('/api/auth/find-users', async (req, res) => {
  const { nombre, apellido } = req.body || {};
  if (!nombre || !apellido) {
    return res.status(400).json({ ok: false, error: 'Faltan datos (nombre, apellido)' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, nombre, apellido, rol
       FROM usuarios
       WHERE lower(nombre) = lower($1)
         AND lower(apellido) = lower($2)
         AND rol = 'user'
       ORDER BY id ASC`,
      [nombre.trim(), apellido.trim()]
    );

    return res.json({ ok: true, matches: result.rows });
  } catch (err) {
    console.error('Error find-users:', err);
    return res.status(500).json({ ok: false, error: 'Error buscando usuarios' });
  }
});

// Registrar admin (con password)
app.post('/api/auth/register-admin', async (req, res) => {
  const { username, nombre, apellido, password } = req.body || {};
  if (!username || !nombre || !apellido || !password) {
    return res.status(400).json({ ok: false, error: 'Faltan datos (username, nombre, apellido, password)' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (username, nombre, apellido, rol, password_hash)
       VALUES ($1, $2, $3, 'admin', $4)
       RETURNING id, username, nombre, apellido, rol`,
      [username.trim(), nombre.trim(), apellido.trim(), hash]
    );
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ese username ya existe. Elegí otro.' });
    }
    console.error('Error register-admin:', err);
    return res.status(500).json({ ok: false, error: 'Error registrando admin' });
  }
});

// Login admin (username + password)
app.post('/api/auth/login-admin', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Faltan datos (username, password)' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, nombre, apellido, rol, password_hash
       FROM usuarios
       WHERE username = $1 AND rol = 'admin'`,
      [username.trim()]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Admin no encontrado' });
    }

    const admin = result.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash || '');

    if (!ok) return res.status(401).json({ ok: false, error: 'Password incorrecta' });

    // No devolvemos hash
    delete admin.password_hash;
    return res.json({ ok: true, user: admin });
  } catch (err) {
    console.error('Error login-admin:', err);
    return res.status(500).json({ ok: false, error: 'Error en login admin' });
  }
});

// =============================================================================
// RESERVAS
// =============================================================================

// Crear pre-reserva vinculada al usuario (luego se completa piso/fecha/asientos)
app.post('/api/pre-reservas', async (req, res) => {
  const { usuario_id, tipo, cantidad_asientos } = req.body || {};
  if (!usuario_id || !tipo) {
    return res.status(400).json({ ok: false, error: 'Faltan datos (usuario_id, tipo)' });
  }

  const cant = Number.isFinite(Number(cantidad_asientos)) ? Math.max(1, Number(cantidad_asientos)) : 1;

  try {
    // Traemos el nombre/apellido del usuario para guardar "nombre" también (compatibilidad)
    const u = await pool.query(
      `SELECT id, nombre, apellido FROM usuarios WHERE id = $1`,
      [Number(usuario_id)]
    );
    if (u.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Usuario no existe' });
    }
    const fullName = `${u.rows[0].nombre} ${u.rows[0].apellido}`.trim();

    const result = await pool.query(
      `INSERT INTO reservas (usuario_id, nombre, tipo, cantidad_asientos)
       VALUES ($1, $2, $3, $4)
       RETURNING id, usuario_id, nombre, tipo, cantidad_asientos, piso_id, fecha, estado, creada_en`,
      [Number(usuario_id), fullName, tipo, cant]
    );

    return res.json({ ok: true, reserva: result.rows[0] });
  } catch (err) {
    console.error('Error /api/pre-reservas:', err);
    return res.status(500).json({ ok: false, error: 'Error guardando pre-reserva' });
  }
});

// Asignar piso a una reserva existente (piso por número 7/8/11/12)
app.patch('/api/reservas/:id/piso', async (req, res) => {
  const reservaId = Number(req.params.id);
  const { piso } = req.body || {};

  if (!Number.isFinite(reservaId) || reservaId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de reserva inválido' });
  }
  const pisoNum = Number(piso);
  if (!Number.isFinite(pisoNum)) {
    return res.status(400).json({ ok: false, error: 'Piso inválido' });
  }

  try {
    const pisoRow = await pool.query(`SELECT id FROM pisos WHERE numero = $1`, [pisoNum]);
    if (pisoRow.rowCount === 0) {
      return res.status(404).json({ ok: false, error: `El piso ${pisoNum} no existe en DB` });
    }

    const pisoId = pisoRow.rows[0].id;

    const upd = await pool.query(
      `UPDATE reservas
       SET piso_id = $1
       WHERE id = $2
       RETURNING id, usuario_id, nombre, tipo, cantidad_asientos, piso_id, fecha, estado`,
      [pisoId, reservaId]
    );

    if (upd.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Reserva no encontrada' });
    }

    return res.json({ ok: true, reserva: upd.rows[0] });
  } catch (err) {
    console.error('Error PATCH piso:', err);
    return res.status(500).json({ ok: false, error: 'Error actualizando piso' });
  }
});

// =============================================================================
// START
// =============================================================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});

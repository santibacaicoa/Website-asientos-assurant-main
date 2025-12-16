// server.js
// Servidor Node.js + Express
// - Sirve tu frontend estático (HTML/CSS/JS/Images)
// - Expone API para guardar reservas en PostgreSQL

const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const app = express();

// 1) Conexión a PostgreSQL (ajustá SOLO el password si hace falta)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'reservas_oficina',
  password: 'TuNuevaPasswordSegura',
  port: 5432,
});

// 2) Middleware para leer JSON
app.use(express.json());

// 3) Servir archivos estáticos de tu proyecto (HTML/CSS/JS/Images)
app.use(express.static(__dirname));

// 4) Endpoint: crear “pre-reserva” (nombre + tipo + cantidad_asientos opcional)
app.post('/api/pre-reservas', async (req, res) => {
  const { nombre, tipo, cantidad_asientos } = req.body || {};

  if (!nombre || !tipo) {
    return res.status(400).json({ ok: false, error: 'Faltan datos (nombre/tipo)' });
  }

  // seguridad: cantidad_asientos mínimo 1
  const cant = Number.isFinite(Number(cantidad_asientos)) ? Math.max(1, Number(cantidad_asientos)) : 1;

  try {
    const result = await pool.query(
      `INSERT INTO reservas (nombre, tipo, cantidad_asientos)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, tipo, cantidad_asientos, fecha, creada_en`,
      [nombre, tipo, cant]
    );

    return res.json({ ok: true, reserva: result.rows[0] });
  } catch (err) {
    console.error('Error en /api/pre-reservas:', err);
    return res.status(500).json({ ok: false, error: 'Error guardando pre-reserva' });
  }
});

// 5) Endpoint: asignar piso a una reserva existente (por número: 7/8/11/12)
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
    // Buscar el piso_id real en tabla pisos
    const pisoRow = await pool.query(`SELECT id, numero FROM pisos WHERE numero = $1`, [pisoNum]);
    if (pisoRow.rowCount === 0) {
      return res.status(404).json({ ok: false, error: `El piso ${pisoNum} no existe en la DB` });
    }

    const pisoId = pisoRow.rows[0].id;

    const upd = await pool.query(
      `UPDATE reservas
       SET piso_id = $1
       WHERE id = $2
       RETURNING id, nombre, tipo, cantidad_asientos, piso_id, fecha, estado`,
      [pisoId, reservaId]
    );

    if (upd.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Reserva no encontrada' });
    }

    return res.json({ ok: true, reserva: upd.rows[0] });
  } catch (err) {
    console.error('Error en PATCH /api/reservas/:id/piso:', err);
    return res.status(500).json({ ok: false, error: 'Error actualizando piso' });
  }
});

// 6) Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});

// ============================================================================
// floors.js - Selección de piso (capas PNG)
// - Click en piso -> guarda en localStorage
// - Si existe reserva.id -> actualiza piso en PostgreSQL via Node/Express
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const floorLayers = document.querySelectorAll('.floor-layer');
  if (!floorLayers.length) return;

  const floorRoutes = {
    '7': 'floor7.html',
    '8': 'floor8.html',
    '11': 'floor11.html',
    '12': 'floor12.html',
  };

  function getReservaId() {
    try { return JSON.parse(localStorage.getItem('reserva.id')); }
    catch { return null; }
  }

  async function setPisoEnBackend(reservaId, pisoNumero) {
    const res = await fetch(`/api/reservas/${reservaId}/piso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ piso: Number(pisoNumero) }),
    });
    return res.json();
  }

  async function seleccionarPiso(floor) {
    const floorStr = String(floor);
    localStorage.setItem('reserva.floor', floorStr);

    const reservaId = getReservaId();

    // Intentamos actualizar en DB si tenemos ID
    if (reservaId) {
      try {
        const data = await setPisoEnBackend(reservaId, floorStr);
        if (data?.ok) {
          console.log('Piso actualizado en backend:', data.reserva);
        } else {
          console.warn('No se pudo actualizar piso en backend:', data);
        }
      } catch (err) {
        console.error('Error actualizando piso en backend:', err);
      }
    } else {
      console.warn('No hay reserva.id en localStorage (todavía).');
    }

    const target = floorRoutes[floorStr] || 'home.html';
    window.location.href = target;
  }

  floorLayers.forEach(layer => {
    layer.addEventListener('click', () => {
      const floor = layer.dataset.floor;
      if (!floor) return;
      seleccionarPiso(floor);
    });
  });
});

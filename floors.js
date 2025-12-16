// =============================================================================
// floors.js - Selección de piso (capas PNG)
// - Click en piso -> guarda en localStorage (reserva.floor)
// - Si existe reserva.id -> PATCH al backend para guardar piso_id
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const floorLayers = document.querySelectorAll('.floor-layer');
  if (!floorLayers.length) return;

  const floorRoutes = {
    '7': 'floor7.html',
    '8': 'floor8.html',
    '11': 'floor11.html',
    '12': 'floor12.html',
  };

  function getJSON(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  async function setPisoEnBackend(reservaId, pisoNumero) {
    const res = await fetch(`/api/reservas/${reservaId}/piso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ piso: Number(pisoNumero) })
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function seleccionarPiso(floor) {
    const floorStr = String(floor);
    localStorage.setItem('reserva.floor', floorStr);

    const reservaId = getJSON('reserva.id', null);

    if (reservaId) {
      try {
        const { res, data } = await setPisoEnBackend(reservaId, floorStr);
        if (!res.ok || !data.ok) {
          console.warn('No se pudo guardar el piso en backend:', data);
        } else {
          console.log('Piso guardado en backend:', data.reserva);
        }
      } catch (err) {
        console.error('Error guardando piso en backend:', err);
      }
    } else {
      console.warn('No hay reserva.id en localStorage. (¿Se creó la pre-reserva en Home?)');
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

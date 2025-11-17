// ============================================================================
// floors.js - Lógica de selección de piso (opción A: capas de imagen por piso)
// - Maneja clicks en botones de UI (Piso 8/11/12)
// - Maneja clicks en las capas de imagen de cada piso
// - Guarda el piso elegido en localStorage (reserva.floor)
// - Deja espacio preparado para futura llamada a la API / PostgreSQL
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const floorButtons = document.querySelectorAll('.floor-btn');
  const floorLayers  = document.querySelectorAll('.floor-layer');

  if (!floorButtons.length && !floorLayers.length) return;

  function seleccionarPiso(floor) {
    // Guardamos el piso elegido en localStorage
    localStorage.setItem('reserva.floor', String(floor));

    // TODO: Más adelante, acá podemos llamar a tu backend / PostgreSQL
    /*
    fetch('/api/pre-reservas/floor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor: Number(floor) })
    }).then(res => res.json()).then(data => {
      console.log('Piso guardado en backend', data);
      // Luego redirigimos a la pantalla de asientos:
      // window.location.href = 'seats.html';
    }).catch(err => {
      console.error('Error guardando piso en backend', err);
      // Podés decidir si igual navegás, mostrás error, etc.
    });
    */

    console.log('Piso seleccionado (solo front por ahora):', floor);

    // Por ahora lo dejamos solo en consola.
    // Más adelante: window.location.href = 'seats.html';
  }

  // Click en los botones de UI (Piso 8/11/12)
  floorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const floor = btn.dataset.floor;
      if (!floor) return;
      seleccionarPiso(floor);
    });
  });

  // Click en las capas de imagen (Piso 8/11/12)
  floorLayers.forEach(layer => {
    layer.addEventListener('click', () => {
      const floor = layer.dataset.floor;
      if (!floor) return;
      seleccionarPiso(floor);
    });
  });
});

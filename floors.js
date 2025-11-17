// ============================================================================
// floors.js - Lógica de selección de piso (solo imágenes de piso)
// - Maneja clicks en las capas de imagen de cada piso (floor-layer)
// - Guarda el piso elegido en localStorage (reserva.floor)
// - Redirige a la página correspondiente según el piso
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const floorLayers = document.querySelectorAll('.floor-layer');

  // Si por algún motivo no hay capas, no hacemos nada
  if (!floorLayers.length) return;

  // Mapa de pisos -> página de destino
  // Cambiá los nombres de archivo si querés usar otros (p.ej. piso8.html)
  const floorRoutes = {
    '8': 'floor8.html',
    '11': 'floor11.html',
    '12': 'floor12.html',
  };

  function seleccionarPiso(floor) {
    const floorStr = String(floor);

    // Guardamos el piso elegido en localStorage
    localStorage.setItem('reserva.floor', floorStr);

    console.log('Piso seleccionado (solo front por ahora):', floorStr);

    // Página de destino según el piso
    const target = floorRoutes[floorStr] || 'home.html';

    // Redirigimos al HTML del piso correspondiente
    window.location.href = target;
  }

  // Click en las capas de imagen (Piso 8/11/12)
  floorLayers.forEach(layer => {
    layer.addEventListener('click', () => {
      const floor = layer.dataset.floor;
      if (!floor) return;
      seleccionarPiso(floor);
    });
  });
});

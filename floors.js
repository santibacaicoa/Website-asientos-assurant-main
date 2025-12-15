// ============================================================================
// floors.js - Lógica de selección de piso (capas PNG)
// - Click en la imagen de cada piso -> guarda en localStorage y navega
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const floorLayers = document.querySelectorAll('.floor-layer');
  if (!floorLayers.length) return;

  // Mapa de pisos -> página destino
  const floorRoutes = {
    '7': 'floor7.html',
    '8': 'floor8.html',
    '11': 'floor11.html',
    '12': 'floor12.html',
  };

  function seleccionarPiso(floor) {
    const floorStr = String(floor);

    // Guardamos piso elegido (más adelante lo vamos a mandar a la DB vía API)
    localStorage.setItem('reserva.floor', floorStr);

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

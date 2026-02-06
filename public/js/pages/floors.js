// =============================================================================
// floors.js - Selector de piso (capas PNG)
// Nuevo flujo:
// - Requiere estar logueado (localStorage.user)
// - Lee query params: ?mode=empleado|supervisor&fecha=YYYY-MM-DD
// - Click en piso -> navega a /floor.html?piso=X&fecha=...&mode=...
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const safeJson = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const user = safeJson(localStorage.getItem("user"));
  if (!user?.id) {
    window.location.href = "/index.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const mode = String(params.get("mode") || "").toLowerCase();
  const fecha = String(params.get("fecha") || "");

  const isISO = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const safeFecha = isISO
    ? fecha
    : localStorage.getItem("reserva.fecha") || new Date().toISOString().slice(0, 10);

  const safeMode = mode === "supervisor" || mode === "empleado" ? mode : "empleado";

  // Ajustar copy según modo
  const titleEl = document.querySelector(".floor-title");
  const subEl = document.querySelector(".floor-subtitle");

  const floorLayers = document.querySelectorAll(".floor-layer");
  if (!floorLayers.length) return;

  const goFloor = (piso) => {
    const p = String(piso);
    localStorage.setItem("reserva.floor", p);
    localStorage.setItem("reserva.fecha", safeFecha);

    window.location.href = `/floor.html?piso=${encodeURIComponent(
      p
    )}&fecha=${encodeURIComponent(safeFecha)}&mode=${encodeURIComponent(safeMode)}`;
  };

  floorLayers.forEach((layer) => {
    layer.addEventListener("click", () => {
      const piso = layer.dataset.floor;
      if (!piso) return;
      goFloor(piso);
    });
  });
});

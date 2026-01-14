// floor11.js (cine-style reservar y confirmar)
(() => {
  const seatsLayer = document.getElementById("seatsLayer");
  const floorMap = document.getElementById("floorMap");
  const datePick = document.getElementById("datePick");
  const btnBackHome = document.getElementById("btnBackHome");
  const sideMsg = document.getElementById("sideMsg");

  const btnConfirm = document.getElementById("btnConfirm");
  const btnClearSel = document.getElementById("btnClearSel");
  const selCount = document.getElementById("selCount");

  const editHint = document.getElementById("editHint");
  const editCursor = document.getElementById("editCursor");

  if (!seatsLayer || !floorMap || !datePick || !btnBackHome || !sideMsg) {
    console.warn("[floor11] faltan elementos en HTML");
    return;
  }

  // ==========================
  // 1) Tus asientos (62) ya listos
  // ==========================
  // IMPORTANTE: este archivo asume que acá tenés tu array completo.
  // Si ya lo tenías armado, dejalo tal cual lo tenés.
  const SEATS_11 = [
{ id: "11-01", x: 1.8, y: 25.3 },
{ id: "11-02", x: 5.6, y: 25.3 },
{ id: "11-03", x: 10.2, y: 25.2 },
{ id: "11-04", x: 14.9, y: 25.2 },
{ id: "11-05", x: 19.0, y: 25.2 },
{ id: "11-06", x: 1.7, y: 30.3 },
{ id: "11-07", x: 5.6, y: 30.5 },
{ id: "11-08", x: 10.2, y: 30.5 },
{ id: "11-09", x: 14.9, y: 30.5 },
{ id: "11-10", x: 19.1, y: 30.5 },
{ id: "11-11", x: 1.6, y: 42.4 },
{ id: "11-12", x: 5.6, y: 42.4 },
{ id: "11-13", x: 10.3, y: 42.1 },
{ id: "11-14", x: 14.8, y: 42.0 },
{ id: "11-15", x: 19.1, y: 42.4 },
{ id: "11-16", x: 1.7, y: 47.8 },
{ id: "11-17", x: 5.6, y: 47.8 },
{ id: "11-18", x: 10.3, y: 47.6 },
{ id: "11-19", x: 14.8, y: 47.4 },
{ id: "11-20", x: 19.0, y: 47.4 },
{ id: "11-21", x: 26.9, y: 64.2 },
{ id: "11-22", x: 31.1, y: 64.0 },
{ id: "11-23", x: 35.6, y: 64.2 },
{ id: "11-24", x: 40.3, y: 64.4 },
{ id: "11-25", x: 44.5, y: 64.0 },
{ id: "11-26", x: 27.0, y: 69.0 },
{ id: "11-27", x: 31.0, y: 69.3 },
{ id: "11-28", x: 35.4, y: 69.3 },
{ id: "11-29", x: 40.4, y: 69.4 },
{ id: "11-30", x: 44.5, y: 69.4 },
{ id: "11-31", x: 26.7, y: 81.1 },
{ id: "11-32", x: 31.0, y: 80.9 },
{ id: "11-33", x: 35.6, y: 81.1 },
{ id: "11-34", x: 40.2, y: 81.1 },
{ id: "11-35", x: 44.6, y: 80.9 },
{ id: "11-36", x: 27.0, y: 86.4 },
{ id: "11-37", x: 31.1, y: 86.4 },
{ id: "11-38", x: 35.6, y: 86.5 },
{ id: "11-39", x: 40.3, y: 86.4 },
{ id: "11-40", x: 44.6, y: 86.4 },
{ id: "11-41", x: 55.0, y: 64.5 },
{ id: "11-42", x: 59.6, y: 64.4 },
{ id: "11-43", x: 64.5, y: 64.2 },
{ id: "11-44", x: 68.8, y: 64.2 },
{ id: "11-45", x: 73.0, y: 64.4 },
{ id: "11-46", x: 55.0, y: 69.4 },
{ id: "11-47", x: 59.4, y: 69.7 },
{ id: "11-48", x: 64.3, y: 69.7 },
{ id: "11-49", x: 68.9, y: 69.3 },
{ id: "11-50", x: 72.9, y: 69.4 },
{ id: "11-51", x: 55.2, y: 80.9 },
{ id: "11-52", x: 59.6, y: 80.8 },
{ id: "11-53", x: 64.5, y: 80.7 },
{ id: "11-54", x: 68.9, y: 80.8 },
{ id: "11-55", x: 72.9, y: 80.9 },
{ id: "11-56", x: 55.0, y: 86.2 },
{ id: "11-57", x: 59.6, y: 86.0 },
{ id: "11-58", x: 64.6, y: 86.0 },
{ id: "11-59", x: 68.9, y: 86.2 },
{ id: "11-60", x: 72.8, y: 86.0 },
{ id: "11-61", x: 80.0, y: 47.8 },
{ id: "11-62", x: 84.5, y: 47.8 },
{ id: "11-63", x: 89.2, y: 47.8 },
{ id: "11-64", x: 93.8, y: 47.3 },
{ id: "11-65", x: 80, y: 52.5 },
{ id: "11-66", x: 84.5, y: 52.6 },
{ id: "11-67", x: 89.4, y: 52.3 },
{ id: "11-68", x: 93.7, y: 52.3 },
{ id: "11-69", x: 79.7, y: 30.5 },
{ id: "11-70", x: 84.4, y: 30.6 },
{ id: "11-71", x: 89.0, y: 30.7 },
{ id: "11-72", x: 93.7, y: 30.7 },
{ id: "11-73", x: 79.5, y: 35.8 },
{ id: "11-74", x: 84.8, y: 35.8 },
{ id: "11-75", x: 89.3, y: 36.0 },
{ id: "11-76", x: 93.7, y: 35.5 },
{ id: "11-77", x: 86, y: 8.6 },
{ id: "11-78", x: 89.2, y: 8.6 },
{ id: "11-79", x: 86.0, y: 14.3 },
{ id: "11-80", x: 89.4, y: 14.3 },
{ id: "11-81", x: 86.0, y: 19 },
{ id: "11-82", x: 89.4, y: 19 }
  ];

  // ==========================
  // Helpers UI
  // ==========================
  const setMsg = (t) => (sideMsg.textContent = t || "");
  const todayISO = () => new Date().toISOString().slice(0, 10);

  // ==========================
  // Estado
  // ==========================
  const seatEls = new Map();            // id -> button
  let occupied = new Set();             // ocupados definitivos de DB
  let selected = new Set();             // selección temporal (cine)

  // Modo edición
  let editMode = false;

  function updateSelectionUI() {
    selCount.textContent = String(selected.size);
    const has = selected.size > 0;
    btnConfirm.disabled = !has;
    btnClearSel.disabled = !has;
  }

  function applySeatClasses() {
    seatEls.forEach((btn, id) => {
      const isOcc = occupied.has(id);
      const isSel = selected.has(id);

      btn.classList.toggle("is-busy", isOcc);
      btn.classList.toggle("is-free", !isOcc);

      // selección temporal (cine)
      btn.classList.toggle("is-selected", isSel);

      // ocupado => disable total
      btn.disabled = isOcc;
    });
  }

  // ==========================
  // Render
  // ==========================
  function renderSeats() {
    seatsLayer.innerHTML = "";
    seatEls.clear();

    for (const s of SEATS_11) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-free";
      b.style.left = `${s.x}%`;
      b.style.top = `${s.y}%`;
      b.dataset.seatId = s.id;
      b.title = s.id;

      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (editMode) return; // en edición no reservamos
        if (occupied.has(s.id)) return;

        // toggle cine
        if (selected.has(s.id)) selected.delete(s.id);
        else selected.add(s.id);

        updateSelectionUI();
        applySeatClasses();
      });

      seatEls.set(s.id, b);
      seatsLayer.appendChild(b);
    }

    applySeatClasses();
  }

  // ==========================
  // Backend: cargar ocupados
  // ==========================
  async function loadOccupied() {
    const fecha = datePick.value;
    if (!fecha) return;

    try {
      setMsg("Cargando disponibilidad…");
      const r = await fetch(`/api/asientos/ocupados?piso=11&fecha=${encodeURIComponent(fecha)}`);
      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo cargar disponibilidad");
        return;
      }

      occupied = new Set(j.ocupados || []);

      // si lo seleccionado quedó ocupado (porque alguien reservó antes), lo sacamos
      selected.forEach((id) => {
        if (occupied.has(id)) selected.delete(id);
      });

      updateSelectionUI();
      applySeatClasses();
      setMsg("");
    } catch (e) {
      console.error(e);
      setMsg("Error consultando disponibilidad");
    }
  }

  // ==========================
  // Backend: confirmar selección
  // ==========================
  async function confirmReservation() {
    const reservaId = JSON.parse(localStorage.getItem("reserva.id") || "null");
    if (!reservaId) {
      setMsg("No encontré reserva.id (volvé al inicio y hacé el flujo completo).");
      return;
    }

    const fecha = datePick.value;
    if (!fecha) {
      setMsg("Elegí una fecha.");
      return;
    }

    if (selected.size === 0) {
      setMsg("Seleccioná al menos 1 asiento.");
      return;
    }

    // Si es individual, forzamos 1 asiento
    const tipo = JSON.parse(localStorage.getItem("reserva.tipo") || "null");
    if (tipo === "individual" && selected.size > 1) {
      setMsg("Reserva individual: elegí 1 solo asiento.");
      return;
    }

    try {
      btnConfirm.disabled = true;
      setMsg("Confirmando…");

      const asientos = Array.from(selected);
      const r = await fetch("/api/asientos/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reserva_id: reservaId,
          piso: 11,
          fecha,
          asientos,
        }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo confirmar");
        // si hay conflicto, recargamos ocupados
        if (r.status === 409) await loadOccupied();
        updateSelectionUI();
        return;
      }

      // éxito: pasan a ocupados definitivos
      asientos.forEach((id) => occupied.add(id));
      selected.clear();

      applySeatClasses();
      updateSelectionUI();

      setMsg("✅ Reserva confirmada");
    } catch (e) {
      console.error(e);
      setMsg("Error confirmando");
    } finally {
      btnConfirm.disabled = selected.size === 0;
    }
  }

  // ==========================
  // Acciones UI
  // ==========================
  btnConfirm.addEventListener("click", confirmReservation);

  btnClearSel.addEventListener("click", () => {
    selected.clear();
    updateSelectionUI();
    applySeatClasses();
    setMsg("");
  });

  btnBackHome.addEventListener("click", () => {
    window.location.href = "home.html";
  });

  datePick.addEventListener("change", async () => {
    // al cambiar fecha:
    // 1) limpiamos selección
    selected.clear();
    updateSelectionUI();
    // 2) traemos ocupados
    await loadOccupied();
  });

  // ==========================
  // MODO EDICIÓN (E)
  // ==========================
  function fmt(n) {
    return Math.round(n * 10) / 10;
  }
  function getPercentCoords(ev) {
    const rect = floorMap.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    return { x: fmt(x), y: fmt(y) };
  }

  window.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() !== "e") return;
    editMode = !editMode;
    editHint?.classList.toggle("is-hidden", !editMode);
    setMsg(editMode ? "🛠️ Modo edición ON (no reserva)" : "");
  });

  floorMap.addEventListener("mousemove", (ev) => {
    if (!editMode || !editCursor) return;
    const { x, y } = getPercentCoords(ev);
    editCursor.classList.remove("is-hidden");
    editCursor.style.left = `${x}%`;
    editCursor.style.top = `${y}%`;
  });

  // ==========================
  // INIT
  // ==========================
  datePick.value = todayISO();
  renderSeats();
  updateSelectionUI();
  loadOccupied();
})();

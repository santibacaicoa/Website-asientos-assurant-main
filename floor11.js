// floor11.js
(() => {
  const seatLayer = document.getElementById("seatsLayer");
  const datePick = document.getElementById("datePicker");
  const msg = document.getElementById("sideMsg");
  const backBtn = document.getElementById("btnBack");
  const floorMap = document.getElementById("floorMap");
  const editBtn = document.getElementById("btnEdit");
  const editHint = document.getElementById("editHint");
  const editCursor = document.getElementById("editCursor");
  const btnCopyPoints = document.getElementById("btnCopyPoints");
  const editCount = document.getElementById("editCount");

  // ====== Tus asientos (NO los toco) ======
  // Asegurate de que tu SEATS_11 esté completo como lo dejaste (62 asientos)
  // Ejemplo:
  // const SEATS_11 = [
  //   { id: "11-01", x: 33.0, y: 62.0 },
  //   ...
  // ];
  const SEATS_11 = window.SEATS_11 || [
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
]; // si vos ya lo tenés definido acá, reemplazá esta línea por tu array

  function setMsg(t) {
    if (!msg) return;
    msg.textContent = t || "";
  }

  function setDefaultDate() {
    if (!datePick) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    datePick.value = `${yyyy}-${mm}-${dd}`;
  }

  // Estado de ocupación (viene del backend)
  const seatEls = new Map(); // asiento_id -> button
  let busySet = new Set(); // Set(asiento_id)

  function updateSeatClasses() {
    seatEls.forEach((btn, asientoId) => {
      const busy = busySet.has(asientoId);
      btn.classList.toggle("is-busy", busy);
      btn.classList.toggle("is-free", !busy);
      btn.disabled = busy;
    });
  }

  async function loadBusySeats() {
    const fecha = datePick?.value;
    if (!fecha) return;

    try {
      setMsg("Cargando disponibilidad…");
      const r = await fetch(`/api/asientos/ocupados?piso=11&fecha=${encodeURIComponent(fecha)}`);
      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo cargar disponibilidad");
        return;
      }

      busySet = new Set(j.ocupados || []);
      updateSeatClasses();
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Error cargando disponibilidad");
    }
  }

  async function reservarAsiento(asientoId) {
    const reservaId = JSON.parse(localStorage.getItem("reserva.id") || "null");
    if (!reservaId) {
      setMsg("No encontré la reserva. Volvé al inicio y reintentá.");
      return;
    }

    const fecha = datePick?.value;
    if (!fecha) {
      setMsg("Elegí una fecha primero.");
      return;
    }

    try {
      setMsg("Reservando…");
      const r = await fetch("/api/asientos/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reserva_id: reservaId,
          piso: 11,
          fecha,
          asiento_id: asientoId,
        }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo reservar");
        if (r.status === 409) {
          await loadBusySeats(); // deja UI consistente
        }
        return;
      }

      busySet.add(asientoId);
      updateSeatClasses();
      setMsg("✅ Asiento reservado");
    } catch (err) {
      console.error(err);
      setMsg("Error reservando asiento");
    }
  }

  function renderSeats() {
    if (!seatLayer) return;
    seatLayer.innerHTML = "";
    seatEls.clear();

    SEATS_11.forEach((s) => {
      const b = document.createElement("button");
      b.className = "seat is-free";
      b.type = "button";
      b.dataset.seat = s.id;
      b.style.left = `${s.x}%`;
      b.style.top = `${s.y}%`;
      b.title = s.id;
      seatEls.set(s.id, b);

      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (editMode) return; // en modo edición no reservamos
        if (busySet.has(s.id)) return;
        reservarAsiento(s.id);
      });

      seatLayer.appendChild(b);
    });
  }

  // ---- Botón volver ----
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // si querés limpiar la sesión completa, descomentá:
      // localStorage.removeItem("session.user");
      // localStorage.removeItem("reserva.id");
      // localStorage.removeItem("reserva.floor");
      window.location.href = "home.html";
    });
  }

  // ==========================================================
  // MODO EDICIÓN (E) + SHIFT CLICK para capturar coordenadas
  // ==========================================================
  let editMode = false;
  let tempIdCounter = 1;
  const captured = []; // acumulados
  let pendingSeatEl = null;

  function fmt(num) {
    return Math.round(num * 10) / 10;
  }

  function seatIdFromCounter(n) {
    const padded = String(n).padStart(2, "0");
    return `11-${padded}`;
  }

  function updateEditUI() {
    if (editHint) editHint.classList.toggle("is-hidden", !editMode);
    if (btnCopyPoints) btnCopyPoints.classList.toggle("is-hidden", !editMode);
    if (editCount) editCount.textContent = String(captured.length);
    if (!editMode && editCursor) editCursor.classList.add("is-hidden");
  }

  function placeCursor(xPercent, yPercent) {
    if (!editCursor) return;
    editCursor.classList.remove("is-hidden");
    editCursor.style.left = `${xPercent}%`;
    editCursor.style.top = `${yPercent}%`;
  }

  function getPercentFromEvent(ev) {
    const rect = floorMap.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    return { x: fmt(x), y: fmt(y) };
  }

  function openMiniPrompt(x, y) {
    // mini “pantallita” sin librerías: confirm() + prompt()
    const nextId = seatIdFromCounter(tempIdCounter);
    const ok = confirm(`¿Guardar punto?\nID sugerido: ${nextId}\nx: ${x} / y: ${y}`);
    if (!ok) return;

    const custom = prompt("Podés editar el ID si querés (Enter para usar el sugerido):", nextId);
    const finalId = (custom || nextId).trim() || nextId;

    captured.push({ id: finalId, x, y });
    tempIdCounter++;

    console.log("[PUNTO]", { id: finalId, x, y });
    setMsg(`Guardado ${finalId}  (x:${x} y:${y})`);
    if (editCount) editCount.textContent = String(captured.length);
  }

  // Tecla E para activar/desactivar
  window.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() !== "e") return;
    editMode = !editMode;
    pendingSeatEl = null;
    setMsg(editMode ? "🛠️ Modo edición ON (SHIFT+Click para capturar)" : "");
    updateEditUI();
  });

  // Mostrar cursor mientras movés mouse (solo en edición)
  if (floorMap) {
    floorMap.addEventListener("mousemove", (ev) => {
      if (!editMode) return;
      const { x, y } = getPercentFromEvent(ev);
      placeCursor(x, y);
    });

    // SHIFT+Click captura coordenadas
    floorMap.addEventListener("click", (ev) => {
      if (!editMode) return;
      if (!ev.shiftKey) return;

      const { x, y } = getPercentFromEvent(ev);
      placeCursor(x, y);
      openMiniPrompt(x, y);
    });
  }

  // Copiar todo en el formato que querés
  if (btnCopyPoints) {
    btnCopyPoints.addEventListener("click", async () => {
      const out = captured
        .map((p) => `{ id: "${p.id}", x: ${p.x}, y: ${p.y} }`)
        .join("\n");

      try {
        await navigator.clipboard.writeText(out);
        setMsg(`📋 Copiado (${captured.length} puntos)`);
      } catch {
        // fallback
        console.log(out);
        setMsg("No pude copiar automático: te lo dejé en consola.");
      }
    });
  }

  // Botón del UI para entrar/salir edición
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      editMode = !editMode;
      pendingSeatEl = null;
      setMsg(editMode ? "🛠️ Modo edición ON (SHIFT+Click para capturar)" : "");
      updateEditUI();
    });
  }

  // Init
  setDefaultDate();
  renderSeats();
  updateSeatClasses();
  datePick.addEventListener("change", loadBusySeats);
  loadBusySeats();
  updateEditUI();
})();

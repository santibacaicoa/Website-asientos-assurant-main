// floor8.js (cine-style reservar y confirmar + modo edición + modo cancelar)
(() => {
  const seatsLayer = document.getElementById("seatsLayer");
  const floorMap = document.getElementById("floorMap");
  const datePick = document.getElementById("datePick");
  const btnBackHome = document.getElementById("btnBackHome");
  const sideMsg = document.getElementById("sideMsg");

  const btnConfirm = document.getElementById("btnConfirm");
  const btnClearSel = document.getElementById("btnClearSel");
  const selCount = document.getElementById("selCount");

  const btnToggleCancel = document.getElementById("btnToggleCancel");
  const btnConfirmCancel = document.getElementById("btnConfirmCancel");
  const btnClearCancel = document.getElementById("btnClearCancel");

  const editHint = document.getElementById("editHint");
  const editCursor = document.getElementById("editCursor");

  if (!seatsLayer || !floorMap || !datePick || !btnBackHome || !sideMsg) {
    console.warn("[floor8] faltan elementos en HTML");
    return;
  }

  // ==========================
  // 1) Asientos Piso 8
  // ==========================
  const SEATS_8 = [
    { id: "8-01", x: 7.2, y: 32.8 },
    { id: "8-02", x: 12.4, y: 32.8 },
    { id: "8-03", x: 17.5, y: 33.0 },
    { id: "8-04", x: 22.1, y: 33.5 },
    { id: "8-05", x: 6.6, y: 39.3 },
    { id: "8-06", x: 12.5, y: 39.9 },
    { id: "8-07", x: 17.4, y: 40.0 },
    { id: "8-08", x: 22.0, y: 40.2 },
    { id: "8-09", x: 6.3, y: 58.2 },
    { id: "8-10", x: 11.5, y: 58.3 },
    { id: "8-11", x: 16.6, y: 58.7 },
    { id: "8-12", x: 21.6, y: 59.2 },
    { id: "8-13", x: 6.3, y: 63.6 },
    { id: "8-14", x: 11.5, y: 63.8 },
    { id: "8-15", x: 16.7, y: 64.3 },
    { id: "8-16", x: 21.6, y: 65.0 },
    { id: "8-17", x: 31.1, y: 64.1 },
    { id: "8-18", x: 36.2, y: 64.1 },
    { id: "8-19", x: 41.1, y: 63.9 },
    { id: "8-20", x: 45.8, y: 63.9 },
    { id: "8-21", x: 50.3, y: 63.8 },
    { id: "8-22", x: 31.4, y: 67.8 },
    { id: "8-23", x: 36.3, y: 67.6 },
    { id: "8-24", x: 41.2, y: 67.6 },
    { id: "8-25", x: 46.0, y: 67.5 },
    { id: "8-26", x: 50.3, y: 67.4 },
    { id: "8-27", x: 31.7, y: 86.3 },
    { id: "8-28", x: 36.2, y: 86.0 },
    { id: "8-29", x: 41.0, y: 85.7 },
    { id: "8-30", x: 46.0, y: 85.6 },
    { id: "8-31", x: 50.4, y: 85.7 },
    { id: "8-32", x: 31.9, y: 89.3 },
    { id: "8-33", x: 36.2, y: 89.0 },
    { id: "8-34", x: 41.3, y: 88.9 },
    { id: "8-35", x: 45.9, y: 89.0 },
    { id: "8-36", x: 50.3, y: 88.7 },
    { id: "8-37", x: 60.1, y: 63.9 },
    { id: "8-38", x: 64.3, y: 63.9 },
    { id: "8-39", x: 69.2, y: 63.9 },
    { id: "8-40", x: 60.4, y: 66.9 },
    { id: "8-41", x: 64.6, y: 67.0 },
    { id: "8-42", x: 69.0, y: 66.9 },
    { id: "8-43", x: 60.2, y: 85.5 },
    { id: "8-44", x: 64.7, y: 85.6 },
    { id: "8-45", x: 69.5, y: 85.8 },
    { id: "8-46", x: 74.1, y: 85.6 },
    { id: "8-47", x: 79.0, y: 85.6 },
    { id: "8-48", x: 60.4, y: 88.9 },
    { id: "8-49", x: 64.8, y: 88.8 },
    { id: "8-50", x: 69.7, y: 88.7 },
    { id: "8-51", x: 74.3, y: 89.1 },
    { id: "8-52", x: 78.8, y: 89.3 },
    { id: "8-53", x: 78.3, y: 60.0 },
    { id: "8-54", x: 82.9, y: 59.3 },
    { id: "8-55", x: 87.3, y: 58.5 },
    { id: "8-56", x: 91.9, y: 57.8 },
    { id: "8-57", x: 96.2, y: 57.1 },
    { id: "8-58", x: 78.8, y: 64.4 },
    { id: "8-59", x: 83.4, y: 63.2 },
    { id: "8-60", x: 87.8, y: 62.3 },
    { id: "8-61", x: 92.6, y: 61.8 },
    { id: "8-62", x: 96.5, y: 61.2 },
    { id: "8-63", x: 75.3, y: 25.9 },
    { id: "8-64", x: 78.3, y: 26.0 },
    { id: "8-65", x: 75.3, y: 33.9 },
    { id: "8-66", x: 78.1, y: 34.0 },
  ];

  // ==========================
  // Helpers UI
  // ==========================
  const setMsg = (t) => (sideMsg.textContent = t || "");
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function getReservaTipo() {
    const raw = localStorage.getItem("reserva.tipo");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return raw;
    }
  }

  function getSessionUser() {
    try {
      return JSON.parse(localStorage.getItem("session.user") || "null");
    } catch {
      return null;
    }
  }

  // ✅ Detecta modo cancelar
  function isCancelMode() {
    const v1 = localStorage.getItem("modo.quitar");   // "1" / "true"
    const v2 = localStorage.getItem("admin.modo");    // "quitar"
    const v3 = localStorage.getItem("asientos.modo"); // "cancelar"
    return v1 === "1" || v1 === "true" || v2 === "quitar" || v3 === "cancelar";
  }

  function setCancelMode(on) {
    if (on) localStorage.setItem("modo.quitar", "1");
    else localStorage.removeItem("modo.quitar");
  }

  // ==========================
  // Estado
  // ==========================
  const seatEls = new Map();
  let occupied = new Set();
  let selected = new Set();
  let editMode = false;

  function updateSelectionUI() {
    selCount.textContent = String(selected.size);
    const has = selected.size > 0;
    btnConfirm.disabled = !has;
    btnClearSel.disabled = !has;

    if (isCancelMode()) {
      btnConfirm.textContent = "Confirmar cancelación";
      btnConfirm.classList.add("is-danger");
      btnConfirm.classList.remove("side-btn-primary");
      btnConfirm.classList.add("side-btn-danger");
    } else {
      btnConfirm.textContent = "Confirmar reserva";
      btnConfirm.classList.remove("is-danger");
      btnConfirm.classList.remove("side-btn-danger");
      btnConfirm.classList.add("side-btn-primary");
    }
  }

  // ==========================
  // Tooltip (quién reservó)
  // ==========================
  const occupiedByName = new Map();
  let tooltipEl = null;

  function ensureTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "seat-tooltip is-hidden";
    document.body.appendChild(tooltipEl);
  }
  function showTooltip(text, ev) {
    ensureTooltip();
    tooltipEl.textContent = text;
    tooltipEl.classList.remove("is-hidden");
    moveTooltip(ev);
  }
  function moveTooltip(ev) {
    if (!tooltipEl || tooltipEl.classList.contains("is-hidden")) return;
    const pad = 14;
    tooltipEl.style.left = `${ev.clientX + pad}px`;
    tooltipEl.style.top = `${ev.clientY + pad}px`;
  }
  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.classList.add("is-hidden");
  }

  function applySeatClasses() {
    const cancelMode = isCancelMode();

    seatEls.forEach((btn, id) => {
      const isOcc = occupied.has(id);
      const isSel = selected.has(id);

      btn.classList.toggle("is-busy", isOcc);
      btn.classList.toggle("is-free", !isOcc);

      // ✅ selección distinta según modo
      btn.classList.toggle("is-selected", !cancelMode && isSel);
      btn.classList.toggle("is-cancel-selected", cancelMode && isSel);

      if (isOcc) {
        const who = occupiedByName.get(id);
        btn.title = who ? `${id} • ${who}` : id;
      } else {
        btn.title = id;
      }

      // ✅ CLAVE:
      // - modo normal: ocupados deshabilitados
      // - modo cancelar: SOLO ocupados habilitados (para poder clickearlos)
      btn.disabled = cancelMode ? !isOcc : isOcc;
      btn.classList.toggle("is-disabled", btn.disabled);
    });
  }

  // ==========================
  // Render asientos
  // ==========================
  function renderSeats() {
    seatsLayer.innerHTML = "";
    seatEls.clear();

    for (const s of SEATS_8) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-free";
      b.style.left = `${s.x}%`;
      b.style.top = `${s.y}%`;
      b.dataset.seatId = s.id;
      b.title = s.id;

      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (editMode) return;

        const cancelMode = isCancelMode();
        const isOcc = occupied.has(s.id);

        if (cancelMode) {
          if (!isOcc) return;
          if (selected.has(s.id)) selected.delete(s.id);
          else selected.add(s.id);
          updateSelectionUI();
          applySeatClasses();
          return;
        }

        if (isOcc) return;

        const tipo = getReservaTipo();
        if (tipo === "individual") {
          if (selected.has(s.id)) selected.clear();
          else {
            selected.clear();
            selected.add(s.id);
          }
        } else {
          if (selected.has(s.id)) selected.delete(s.id);
          else selected.add(s.id);
        }

        updateSelectionUI();
        applySeatClasses();
      });

      b.addEventListener("mouseenter", (ev) => {
        if (editMode) return;
        if (!occupied.has(s.id)) return;
        const who = occupiedByName.get(s.id);
        if (!who) return;
        showTooltip(who, ev);
      });

      b.addEventListener("mousemove", (ev) => {
        if (editMode) return;
        moveTooltip(ev);
      });

      b.addEventListener("mouseleave", () => hideTooltip());

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
      const r = await fetch(
        `/api/asientos/ocupados-info?piso=8&fecha=${encodeURIComponent(fecha)}`
      );
      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo cargar disponibilidad");
        return;
      }

      occupiedByName.clear();
      const rows = Array.isArray(j.ocupados) ? j.ocupados : [];
      occupied = new Set(rows.map((row) => row.asiento_id));

      for (const row of rows) {
        if (row?.asiento_id) occupiedByName.set(row.asiento_id, row?.nombre || "");
      }

      const cancelMode = isCancelMode();
      selected.forEach((id) => {
        if (cancelMode) {
          if (!occupied.has(id)) selected.delete(id);
        } else {
          if (occupied.has(id)) selected.delete(id);
        }
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
  // Confirmar (reserva o cancelación)
  // ==========================
  async function confirmAction() {
    const fecha = datePick.value;
    if (!fecha) return setMsg("Elegí una fecha.");
    if (selected.size === 0) return setMsg("Seleccioná al menos 1 asiento.");

    const cancelMode = isCancelMode();

    if (cancelMode) {
      const session = getSessionUser();
      if (!session?.id) return setMsg("No hay usuario en sesión (volvé al home y logueate).");

      try {
        btnConfirm.disabled = true;
        setMsg("Cancelando…");

        const asientos = Array.from(selected);
        const r = await fetch("/api/asientos/cancelar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ piso: 8, fecha, asientos, usuario_id: session.id }),
        });

        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.ok) {
          setMsg(j?.error || "No se pudo cancelar");
          await loadOccupied();
          updateSelectionUI();
          return;
        }

        selected.clear();
        updateSelectionUI();
        await loadOccupied();

        if (j?.denied?.length) {
          setMsg(`✅ Canceladas: ${j.deleted?.length || 0}. Sin permiso: ${j.denied.join(", ")}`);
        } else {
          setMsg("✅ Reservas canceladas");
        }
      } catch (e) {
        console.error(e);
        setMsg("Error cancelando");
      } finally {
        btnConfirm.disabled = selected.size === 0;
      }
      return;
    }

    const reservaId = JSON.parse(localStorage.getItem("reserva.id") || "null");
    if (!reservaId) {
      setMsg("No encontré reserva.id (volvé al inicio y hacé el flujo completo).");
      return;
    }

    const tipo = getReservaTipo();
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
          piso: 8,
          fecha,
          asientos,
        }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo confirmar");
        if (r.status === 409) await loadOccupied();
        updateSelectionUI();
        return;
      }

      selected.clear();
      updateSelectionUI();
      await loadOccupied();
      setMsg("✅ Reserva confirmada");
    } catch (e) {
      console.error(e);
      setMsg("Error confirmando");
    } finally {
      btnConfirm.disabled = selected.size === 0;
    }
  }

  // ==========================
  // UI actions
  // ==========================
  btnConfirm.addEventListener("click", confirmAction);

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
    selected.clear();
    updateSelectionUI();
    await loadOccupied();
  });

  // ✅ Botón "Quitar reservas" (ACTIVA/DESACTIVA modo)
  if (btnConfirmCancel) btnConfirmCancel.classList.add("is-hidden");
  if (btnClearCancel) btnClearCancel.classList.add("is-hidden");

  if (btnToggleCancel) {
    btnToggleCancel.textContent = isCancelMode()
      ? "Salir de quitar reservas"
      : "Quitar reservas";

    btnToggleCancel.addEventListener("click", async () => {
      const nowOn = !isCancelMode();
      setCancelMode(nowOn);

      selected.clear();
      updateSelectionUI();

      await loadOccupied();
      applySeatClasses();

      setMsg(nowOn ? "🟠 Modo quitar reservas ACTIVO (tocá asientos rojos)" : "✅ Modo reserva normal");
      btnToggleCancel.textContent = nowOn ? "Salir de quitar reservas" : "Quitar reservas";
    });
  }

  // ==========================
  // MODO EDICIÓN (E) + ShiftClick
  // ==========================
  const picked = [];
  let nextIdx = 1;
  let hud = null;

  function ensureHUD() {
    if (hud) return;
    hud = document.createElement("div");
    hud.className = "edit-panel is-hidden";
    hud.innerHTML = `
      <strong>Editor Piso 8</strong>
      <div class="edit-row">Puntos: <span id="hudCount">0</span></div>
      <button id="hudCopy" type="button">Copiar todo</button>
      <button id="hudClear" type="button">Limpiar</button>
    `;
    floorMap.appendChild(hud);

    hud.querySelector("#hudCopy").addEventListener("click", async () => {
      const text = picked
        .map((p) => `{ id: "${p.id}", x: ${p.x.toFixed(1)}, y: ${p.y.toFixed(1)} }`)
        .join("\n");
      try {
        await navigator.clipboard.writeText(text);
        setMsg("✅ Copiado al portapapeles");
      } catch {
        console.log(text);
        setMsg("No pude copiar (tu navegador lo bloqueó). Mirá la consola.");
      }
    });

    hud.querySelector("#hudClear").addEventListener("click", () => {
      picked.length = 0;
      nextIdx = 1;
      hud.querySelector("#hudCount").textContent = "0";
      setMsg("Listo: se limpió la lista.");
    });
  }

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

    ensureHUD();
    hud.classList.toggle("is-hidden", !editMode);

    editHint?.classList.toggle("is-hidden", !editMode);
    if (!editMode) hideTooltip();

    setMsg(editMode ? "🛠️ Modo edición ON (Shift+Click para guardar)" : "");
  });

  floorMap.addEventListener("mousemove", (ev) => {
    if (!editMode || !editCursor) return;
    const { x, y } = getPercentCoords(ev);
    editCursor.classList.remove("is-hidden");
    editCursor.style.left = `${x}%`;
    editCursor.style.top = `${y}%`;
  });

  floorMap.addEventListener("click", (ev) => {
    if (!editMode) return;
    if (!ev.shiftKey) return;

    const target = ev.target;
    if (target && target.classList && target.classList.contains("seat")) return;

    ensureHUD();

    const { x, y } = getPercentCoords(ev);
    const id = `8-${String(nextIdx).padStart(2, "0")}`;
    nextIdx++;

    picked.push({ id, x, y });

    const dot = document.createElement("div");
    dot.className = "seat";
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.borderWidth = "2px";
    dot.style.pointerEvents = "none";
    dot.style.opacity = "0.9";
    seatsLayer.appendChild(dot);

    hud.querySelector("#hudCount").textContent = String(picked.length);

    console.log(`{ id: "${id}", x: ${x.toFixed(1)}, y: ${y.toFixed(1)} }`);
    setMsg(`Punto agregado: ${id}`);
  });

  // ==========================
  // INIT
  // ==========================
  datePick.value = todayISO();
  renderSeats();
  updateSelectionUI();
  loadOccupied();
})();

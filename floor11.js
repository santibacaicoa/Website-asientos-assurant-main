// =====================================================
// floor11.js
// - Renderiza asientos encima del plano (por %)
// - Calendario para seleccionar fecha
// - Botón volver/cambiar usuario
// - Modo edición (tecla E) para sacar coordenadas fácil
//   * Shift+Click: agrega punto TEMP + acumula
//   * Click normal: copia el último punto (sin agregar)
//   * HUD: copiar último / copiar todo / borrar lista
// =====================================================

(function () {
  const seatsLayer = document.getElementById("seatsLayer");
  const floorMap = document.querySelector(".floor-map");
  const datePick = document.getElementById("datePick");
  const btnBackHome = document.getElementById("btnBackHome");
  const sideMsg = document.getElementById("sideMsg");
  const editHint = document.getElementById("editHint");
  const editCursor = document.getElementById("editCursor");

  if (!seatsLayer || !floorMap || !datePick || !btnBackHome || !sideMsg) {
    console.warn("[floor11.js] Faltan elementos en el HTML. Revisá IDs/clases.");
    return;
  }

  // ✅ Acá van los 62 asientos del piso 11 con coordenadas (%) (x=left, y=top)
  // Ejemplo: { id: "11-01", x: 33.2, y: 62.5 }
  const SEATS_11 = [
    // TODO: completar 62
    { id: "11-01", x: 1.8, y: 25.3 }
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
{ id: "11-61", x: 79.0, y: 47.8 },
{ id: "11-62", x: 84.5, y: 47.8 },
{ id: "11-63", x: 89.2, y: 47.8 },
{ id: "11-64", x: 93.8, y: 47.3 },
{ id: "11-65", x: 79.6, y: 52.5 },
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
{ id: "11-77", x: 86.3, y: 9.0 },
{ id: "11-78", x: 89.2, y: 8.6 },
{ id: "11-79", x: 86.0, y: 14.0 },
{ id: "11-80", x: 88.9, y: 14.3 },
{ id: "11-81", x: 86.0, y: 19.6 },
{ id: "11-82", x: 89.4, y: 19.3 }
  ];

  function setMsg(text) {
    sideMsg.textContent = text || "";
  }

  function setDefaultDate() {
    const today = new Date();
    datePick.value = today.toISOString().slice(0, 10);
  }

  function renderSeats() {
    seatsLayer.innerHTML = "";
    for (const s of SEATS_11) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-free";
      b.style.left = s.x + "%";
      b.style.top = s.y + "%";
      b.dataset.seatId = s.id;
      b.title = s.id;

      b.addEventListener("click", () => {
        if (b.classList.contains("is-busy")) return;
        console.log("Seat click:", s.id, "Fecha:", datePick.value);
        // Próximo paso: seleccionar / reservar con backend
      });

      seatsLayer.appendChild(b);
    }
  }

  // =====================================================
  // Volver / Cambiar usuario
  // =====================================================
  btnBackHome.addEventListener("click", () => {
    window.location.href = "home.html";
  });

  // =====================================================
  // Calendario
  // =====================================================
  datePick.addEventListener("change", () => {
    const date = datePick.value;
    setMsg(date ? `Viendo disponibilidad para: ${date}` : "");
    // Próximo paso: fetch al backend para asientos ocupados por fecha
  });

  // =====================================================
  // MODO EDICIÓN (TOGGLE con tecla E)
  // =====================================================
  const params = new URLSearchParams(window.location.search);
  let editEnabled = params.get("edit") === "1";

  // ---- Lista de puntos acumulados (para copiar todo)
  const collected = [];
  let nextIdNumber = 1; // 👈 si querés arrancar desde 1 siempre. Si querés 63, poné 63.

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatLine(item) {
    // item: { id, x, y }
    // OJO: vos pediste 33.0 (un decimal). Usamos 1 decimal.
    const x = Number(item.x).toFixed(1);
    const y = Number(item.y).toFixed(1);
    return `{ id: "${item.id}", x: ${x}, y: ${y} }`;
  }

  function getPercentCoords(e) {
    const rect = floorMap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: +x.toFixed(2), y: +y.toFixed(2) };
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copiado ✅");
      setTimeout(() => setMsg(""), 900);
      return true;
    } catch {
      setMsg("No pude copiar (clipboard bloqueado). Mirá consola.");
      setTimeout(() => setMsg(""), 1200);
      return false;
    }
  }

  // =====================================================
  // HUD (mini pantallita) con botones
  // =====================================================
  const hud = document.createElement("div");
  hud.id = "editHud";
  hud.style.position = "fixed";
  hud.style.left = "14px";
  hud.style.top = "14px";
  hud.style.zIndex = "9999";
  hud.style.width = "320px";
  hud.style.padding = "12px";
  hud.style.borderRadius = "12px";
  hud.style.border = "1px solid rgba(255,255,255,.25)";
  hud.style.background = "rgba(0,0,0,.55)";
  hud.style.backdropFilter = "blur(8px)";
  hud.style.webkitBackdropFilter = "blur(8px)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  hud.style.fontSize = "13px";
  hud.style.lineHeight = "1.25";
  hud.style.boxShadow = "0 14px 38px rgba(0,0,0,.35)";
  hud.style.display = "none";

  hud.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <div style="font-weight:700;">EDIT: <span id="hudState">OFF</span></div>
      <div style="opacity:.9;">Puntos: <span id="hudCount">0</span></div>
    </div>

    <div style="margin-top:8px;">Mouse: <span id="hudXY">x: --  y: --</span></div>

    <div style="margin-top:10px; opacity:.92;">Último:</div>
    <pre id="hudLast" style="
      margin:6px 0 10px;
      padding:8px;
      border-radius:10px;
      background: rgba(255,255,255,.10);
      border: 1px solid rgba(255,255,255,.15);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
      font-size: 12px;
    ">-</pre>

    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button id="btnCopyLast" type="button" style="flex:1; min-width:140px; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.10); color:#fff; cursor:pointer;">Copiar último</button>
      <button id="btnCopyAll" type="button" style="flex:1; min-width:140px; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.10); color:#fff; cursor:pointer;">Copiar todo</button>
      <button id="btnClear" type="button" style="width:100%; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color:#fff; cursor:pointer;">Borrar lista</button>
    </div>

    <div style="margin-top:10px; opacity:.85;">
      Tip: <b>E</b> toggle · <b>Shift+Click</b> agrega punto + lo acumula
    </div>
  `;

  document.body.appendChild(hud);

  const hudState = hud.querySelector("#hudState");
  const hudXY = hud.querySelector("#hudXY");
  const hudCount = hud.querySelector("#hudCount");
  const hudLast = hud.querySelector("#hudLast");
  const btnCopyLast = hud.querySelector("#btnCopyLast");
  const btnCopyAll = hud.querySelector("#btnCopyAll");
  const btnClear = hud.querySelector("#btnClear");

  let lastLine = "";

  function updateHud() {
    if (hudCount) hudCount.textContent = String(collected.length);
    if (hudLast) hudLast.textContent = lastLine || "-";
  }

  function setEditUI(on) {
    if (editHint) editHint.classList.toggle("is-hidden", !on);
    if (editCursor) editCursor.classList.toggle("is-hidden", !on);
    hud.style.display = on ? "block" : "none";
    if (hudState) hudState.textContent = on ? "ON" : "OFF";
  }

  setEditUI(editEnabled);
  updateHud();

  function isTypingInInput() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  }

  document.addEventListener("keydown", (e) => {
    if (isTypingInInput()) return;
    if (e.key === "e" || e.key === "E") {
      editEnabled = !editEnabled;
      setEditUI(editEnabled);
      setMsg(editEnabled ? "Modo edición ACTIVADO" : "Modo edición DESACTIVADO");
      setTimeout(() => setMsg(""), 800);
    }
  });

  // Cursor + coords
  floorMap.addEventListener("mousemove", (e) => {
    if (!editEnabled) return;

    if (editCursor) {
      const rect = floorMap.getBoundingClientRect();
      editCursor.style.left = e.clientX - rect.left + "px";
      editCursor.style.top = e.clientY - rect.top + "px";
    }

    const { x, y } = getPercentCoords(e);
    if (hudXY) hudXY.textContent = `x: ${x}  y: ${y}`;
  });

  // Botones HUD
  btnCopyLast.addEventListener("click", async () => {
    if (!lastLine) return setMsg("No hay último para copiar");
    console.log("COPY LAST:\n" + lastLine);
    await copyText(lastLine);
  });

  btnCopyAll.addEventListener("click", async () => {
    if (collected.length === 0) return setMsg("No hay puntos para copiar");
    const all = collected.map(formatLine).join("\n");
    console.log("COPY ALL:\n" + all);
    await copyText(all);
    if (hudLast) hudLast.textContent = all; // preview (opcional)
  });

  btnClear.addEventListener("click", () => {
    collected.length = 0;
    nextIdNumber = 1;
    lastLine = "";
    updateHud();

    // borra los TEMP dibujados (los que tengan data-temp="1")
    seatsLayer.querySelectorAll('.seat[data-temp="1"]').forEach((el) => el.remove());

    setMsg("Lista borrada ✅");
    setTimeout(() => setMsg(""), 800);
  });

  // Click en el plano
  floorMap.addEventListener("click", async (e) => {
    if (!editEnabled) return;

    // Si clickeaste un asiento real, no hagas nada de edición
    if (e.target && e.target.classList && e.target.classList.contains("seat")) return;

    const { x, y } = getPercentCoords(e);

    // SHIFT+CLICK: agrega a lista + dibuja TEMP
    if (e.shiftKey) {
      const id = `11-${pad2(nextIdNumber++)}`;
      const item = { id, x, y };
      collected.push(item);

      lastLine = formatLine(item);
      updateHud();

      console.log("ADD:", lastLine);

      // dibuja punto temporal
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-free";
      b.style.left = x + "%";
      b.style.top = y + "%";
      b.title = `TEMP ${id}`;
      b.dataset.temp = "1";
      seatsLayer.appendChild(b);

      // Copia automática del último agregado (si querés que NO copie solo, borrá estas 2 líneas)
      await copyText(lastLine);
      return;
    }

    // Click normal: NO agrega, solo prepara "último" para copiar
    lastLine = `{ id: "11-XX", x: ${Number(x).toFixed(1)}, y: ${Number(y).toFixed(1)} }`;
    updateHud();
    console.log("COORD (solo preview):", lastLine);

    // Si querés que el click normal copie también, descomentá:
    // await copyText(lastLine);
  });

  // Init
  setDefaultDate();
  renderSeats();
})();

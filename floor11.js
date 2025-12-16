// =====================================================
// floor11.js
// - Renderiza asientos encima del plano (por %)
// - Calendario para seleccionar fecha
// - Botón volver/cambiar usuario
// - Modo edición para sacar coordenadas fácil
// =====================================================

(function () {
  const seatsLayer = document.getElementById("seatsLayer");
  const floorMap = document.querySelector(".floor-map");
  const floorBg = document.getElementById("floorBg");
  const datePick = document.getElementById("datePick");
  const btnBackHome = document.getElementById("btnBackHome");
  const sideMsg = document.getElementById("sideMsg");
  const editHint = document.getElementById("editHint");
  const editCursor = document.getElementById("editCursor");

  // ✅ Acá van los 62 asientos del piso 11 con coordenadas (%) (x=left, y=top)
  // Ejemplo: { id: "11-01", x: 33.2, y: 62.5 }
  const SEATS_11 = [
    // TODO: completar 62
    { id: "11-01", x: 33.0, y: 62.0 },
    { id: "11-02", x: 58.0, y: 62.0 },
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
    // Si querés “cambiar usuario” de verdad, descomentá:
    // localStorage.removeItem("session.user");
    // localStorage.removeItem("reserva.id");
    // localStorage.removeItem("reserva.tipo");
    // localStorage.removeItem("reserva.floor");
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
  // MODO EDICIÓN
  // - Activás con: floor11.html?edit=1
  // - Click: imprime % en consola y lo copia al portapapeles
  // - Shift+Click: agrega un asiento temporal (para testear)
  // =====================================================
  const params = new URLSearchParams(window.location.search);
  const EDIT_MODE = params.get("edit") === "1";

  function getPercentCoords(e) {
    const rect = floorMap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: +x.toFixed(2), y: +y.toFixed(2) };
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Coordenadas copiadas ✅");
      setTimeout(() => setMsg(""), 900);
    } catch {
      // si el navegador bloquea clipboard, al menos queda en consola
      setMsg("Copiado a consola (clipboard bloqueado)");
      setTimeout(() => setMsg(""), 1200);
    }
  }

  if (EDIT_MODE) {
    editHint.classList.remove("is-hidden");
    editCursor.classList.remove("is-hidden");

    floorMap.addEventListener("mousemove", (e) => {
      const rect = floorMap.getBoundingClientRect();
      editCursor.style.left = (e.clientX - rect.left) + "px";
      editCursor.style.top = (e.clientY - rect.top) + "px";
    });

    floorMap.addEventListener("click", async (e) => {
      // Evita que al clickear un asiento existente dispare doble
      if (e.target && e.target.classList && e.target.classList.contains("seat")) return;

      const { x, y } = getPercentCoords(e);
      const line = `{ id: "11-XX", x: ${x}, y: ${y} }`;
      console.log("COORD:", line);

      await copyText(line);

      // Shift + click: agrega un asiento temporal para ver si calza
      if (e.shiftKey) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "seat is-free";
        b.style.left = x + "%";
        b.style.top = y + "%";
        b.title = `TEMP ${x},${y}`;
        seatsLayer.appendChild(b);
      }
    });
  }

  // Init
  setDefaultDate();
  renderSeats();
})();

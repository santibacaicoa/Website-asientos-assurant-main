// ============================================================================
// HOME.JS — Lógica de la pantalla Home (nombre + tipo de reserva + Continuar)
// - Guarda/restaura estado en localStorage
// - Habilita "Continuar" solo si nombre + tipo están completos
// - No modifica estilos ni estructura existentes
// ============================================================================

(function () {
  // ----------------------------- Constantes ---------------------------------
  const K = {
    nombre: 'home.nombre',
    tipo: 'home.tipo', // 'grupal' | 'individual'
  };

  // -------------------------- Utils: Storage --------------------------------
  const store = {
    get(key, fallback = '') {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch { /* noop */ }
    },
    del(key) {
      try { localStorage.removeItem(key); }
      catch { /* noop */ }
    },
  };

  // -------------------------- Utils: Helpers --------------------------------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function getSelectedTipo() {
    const el = $('input[name="tipo-reserva"]:checked');
    return el ? el.value : '';
  }

  function setSelectedTipo(value) {
    const target = value ? $(`input[name="tipo-reserva"][value="${value}"]`) : null;
    if (target) {
      target.checked = true;
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function debounce(fn, ms = 300) {
    let t; 
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // --------------------------- Inicialización -------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const inputNombre  = $('#nombre');
    const radios       = $$('input[name="tipo-reserva"]');
    const btnContinuar = $('#btnContinuar');

    // Si no estamos en home o falta algo esencial, salir.
    if (!inputNombre || radios.length === 0 || !btnContinuar) return;

    // 1) Restaurar estado desde localStorage
    const savedNombre = store.get(K.nombre, '');
    const savedTipo   = store.get(K.tipo, '');

    if (savedNombre) inputNombre.value = savedNombre;
    if (savedTipo)   setSelectedTipo(savedTipo);

    // 2) Validación y habilitado del botón
    function isValid() {
      const nombreOk = (inputNombre.value || '').trim().length > 0;
      const tipoOk   = !!getSelectedTipo();
      return nombreOk && tipoOk;
    }

    function updateContinuar() {
      const ok = isValid();
      btnContinuar.disabled = !ok;
      btnContinuar.setAttribute('aria-disabled', String(!ok));
    }

    // Estado inicial del botón
    updateContinuar();

    // 3) Listeners: guardar cambios y actualizar botón
    inputNombre.addEventListener('input', debounce(() => {
      store.set(K.nombre, inputNombre.value.trim());
      updateContinuar();
    }, 250));

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        store.set(K.tipo, getSelectedTipo());
        updateContinuar();
      });
    });

    // 4) Acción de Continuar (placeholder: ajustá según tu flujo)
    btnContinuar.addEventListener('click', () => {
      if (!isValid()) return; // seguridad
      // En este punto tenés:
      //  - Nombre: store.get(K.nombre)
      //  - Tipo:   store.get(K.tipo)
      // TODO: Navegar o abrir el siguiente paso. Mientras tanto:
      console.log('Continuar:', {
        nombre: store.get(K.nombre, ''),
        tipo: store.get(K.tipo, '')
      });
      // Ejemplo: window.location.href = 'seleccionar-fecha.html';
    });

    // 5) Guardado final al salir (por si quedó algo en buffer)
    window.addEventListener('beforeunload', () => {
      store.set(K.nombre, (inputNombre.value || '').trim());
      store.set(K.tipo, getSelectedTipo());
    });

    // 6) Helpers de depuración en consola
    window.reserva = {
      get() {
        return {
          nombre: store.get(K.nombre, ''),
          tipo: store.get(K.tipo, ''),
          valido: isValid()
        };
      },
      clear() {
        store.del(K.nombre);
        store.del(K.tipo);
      }
    };
  });
})();

// ============================================================================
// LOGIN + ZOOM AL EDIFICIO + TOGGLE PASSWORD
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
const inputClave = document.getElementById('clave');
const btnAcceder = document.getElementById('btnAcceder');
const toggleBtn = document.getElementById('togglePwd');

if (!inputClave || !btnAcceder || !toggleBtn) return;

const iconEye = toggleBtn.querySelector('.icon-eye');
const iconEyeOff = toggleBtn.querySelector('.icon-eye-off');
const error = document.getElementById('errorMsg');

// ------------------ ACCEDER ------------------------
btnAcceder.addEventListener('click', () => {
const clave = inputClave.value;

if (clave === 'Assurant1') {
if (error) error.classList.remove('show');

// ZOOM SOLO AL EDIFICIO
const building = document.querySelector('.bg-building');
if (building) building.classList.add('zoom-building');

setTimeout(() => {
window.location.href = 'home.html';
}, 350);

} else {
if (error) error.classList.add('show');
}
});

// ------------------ FEEDBACK ERROR ------------------
inputClave.addEventListener('input', () => {
if (error) error.classList.remove('show');
});

inputClave.addEventListener('keydown', (e) => {
if (e.key === 'Enter') btnAcceder.click();
});

// ------------------ OJO PASSWORD ------------------
toggleBtn.addEventListener('click', () => {
const isPwd = inputClave.type === 'password';
inputClave.type = isPwd ? 'text' : 'password';

toggleBtn.setAttribute('aria-pressed', String(isPwd));
toggleBtn.setAttribute('aria-label', isPwd ? 'Ocultar contraseña' : 'Mostrar contraseña');
toggleBtn.setAttribute('title', isPwd ? 'Ocultar contraseña' : 'Mostrar contraseña');

if (isPwd) {
iconEye.style.display = 'none';
iconEyeOff.style.display = 'block';
} else {
iconEye.style.display = 'block';
iconEyeOff.style.display = 'none';
}
});
});
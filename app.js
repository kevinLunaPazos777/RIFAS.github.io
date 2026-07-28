// ==========================================
// CONFIGURACIÓN DE ENLACES
// ==========================================
const urlCSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSArWADxZRUcn0i1KjQgRn88Y93EDTaxhxsF3_m_HaNSyYoLHKCLdTiOT1zsXjNLBPpCp3f7JzJDB2Q/pub?output=csv';
const urlAppScript = 'https://script.google.com/macros/s/AKfycby3ec4HNdq0rkWDGcmcJ1WDbMXWm-oK-V9bpmyt8z34JPqpV3YpxR09L7tyxVtgvFqa/exec';
const miWhatsApp = '522321270910';
const totalNumeros = 100;

// 🔑 CONTRASEÑA DEL PANEL DE ADMINISTRADOR (¡CÁMBIALA POR LA TUYA!)
const ADMIN_PASS = 'rifa123';

// ==========================================
// CONFIGURA AQUÍ TUS COLUMNAS DEL EXCEL
// (A = 0, B = 1, C = 2, D = 3, E = 4...)
// ==========================================
const COL_RIFA = 0;    // Columna A: nombre de la rifa
const COL_BOLETOS = 1; // Columna B: boletos apartados
const COL_ESTADO = 2;  // Columna C: Apartado / Pagado / Liberado  ← NUEVA

// Fecha del sorteo (Año, Mes-1, Día, Hora, Min, Seg)
const fechaSorteo = new Date(2026, 7, 15, 20, 0, 0).getTime();

let rifaActual = '';
let boletosSeleccionados = [];
let datosBase = [];
let modoAdmin = sessionStorage.getItem('modoAdmin') === 'si';
let numeroParaLiberar = null;

// Función para mostrar Toast (Mensajitos negros)
function mostrarToast(mensaje) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = mensaje;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

// Funciones para el Modal de Términos y Condiciones
function abrirTerminos(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modal-terminos');
    if (modal) modal.classList.remove('hidden');
}

function cerrarTerminos() {
    const modal = document.getElementById('modal-terminos');
    if (modal) modal.classList.add('hidden');
}

// ==========================================
// PANEL DE ADMINISTRADOR (sin ventanas emergentes:
// todo se hace con cajitas dentro de la página)
// ==========================================
function entrarAdmin() {
    if (modoAdmin) {
        // Si ya está activo, este mismo botón sirve para SALIR
        modoAdmin = false;
        sessionStorage.removeItem('modoAdmin');
        actualizarAvisoAdmin();
        repintarSiEstaAbierta();
        mostrarToast('👋 Saliste del modo administrador');
        return;
    }
    const modal = document.getElementById('modal-admin');
    const input = document.getElementById('admin-pass-input');
    if (input) input.value = '';
    if (modal) modal.classList.remove('hidden');
    if (input) setTimeout(function() { input.focus(); }, 100);
}

function cerrarModalAdmin() {
    const modal = document.getElementById('modal-admin');
    if (modal) modal.classList.add('hidden');
}

function verificarPassAdmin() {
    const input = document.getElementById('admin-pass-input');
    const pass = input ? input.value.trim() : '';
    cerrarModalAdmin();
    if (pass === ADMIN_PASS) {
        modoAdmin = true;
        sessionStorage.setItem('modoAdmin', 'si');
        actualizarAvisoAdmin();
        repintarSiEstaAbierta();
        mostrarToast('🔧 Modo administrador ACTIVADO');
    } else {
        mostrarToast('❌ Contraseña incorrecta');
    }
}

function actualizarAvisoAdmin() {
    const aviso = document.getElementById('aviso-admin');
    if (!aviso) return;
    aviso.classList.toggle('hidden', !modoAdmin);
}

function repintarSiEstaAbierta() {
    const seccionRifa = document.getElementById('seccion-rifa');
    if (seccionRifa && !seccionRifa.classList.contains('hidden')) {
        cargarCuadricula();
    }
}

// LIBERAR UN NÚMERO - paso 1: mostrar la confirmación
function liberarNumero(num) {
    if (!modoAdmin) return;
    numeroParaLiberar = num;
    const texto = document.getElementById('texto-liberar');
    if (texto) texto.innerText = 'Vas a liberar el número ' + num + '.\nQuedará disponible para todos.';
    const modal = document.getElementById('modal-liberar');
    if (modal) modal.classList.remove('hidden');
}

function cerrarModalLiberar() {
    numeroParaLiberar = null;
    const modal = document.getElementById('modal-liberar');
    if (modal) modal.classList.add('hidden');
}

// LIBERAR UN NÚMERO - paso 2: confirmado, liberarlo de verdad
function confirmarLiberacion() {
    if (numeroParaLiberar === null) return;
    const num = numeroParaLiberar;
    numeroParaLiberar = null;
    const modal = document.getElementById('modal-liberar');
    if (modal) modal.classList.add('hidden');

    const keyRifa = rifaActual.toLowerCase();

    // 1. Quitarlo de los bloqueados que viven solo en ESTE navegador
    const storageKey = 'boletos_ocupados_' + keyRifa;
    let localesGuardados = JSON.parse(localStorage.getItem(storageKey) || '[]');
    localesGuardados = localesGuardados.filter(n => n !== num);
    localStorage.setItem(storageKey, JSON.stringify(localesGuardados));

    // 2. Marcarlo como "liberación pendiente" para verlo libre al instante
    //    (el Excel tarda unos minutos en actualizarse)
    const keyPend = 'liberados_pendientes_' + keyRifa;
    let pendientes = JSON.parse(localStorage.getItem(keyPend) || '[]');
    if (!pendientes.includes(num)) pendientes.push(num);
    localStorage.setItem(keyPend, JSON.stringify(pendientes));

    // 3. Avisar al Google Apps Script para que lo quite del Excel
    fetch(urlAppScript, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'liberar', rifa: rifaActual, numero: num })
    }).catch(e => console.error('Error liberando:', e));

    mostrarToast('✅ Número ' + num + ' liberado');
    cargarCuadricula();
}

// Cuenta Regresiva
setInterval(function() {
    const ahora = new Date().getTime();
    const distancia = fechaSorteo - ahora;

    const elDias = document.getElementById("dias");
    const elHoras = document.getElementById("horas");
    const elMinutos = document.getElementById("minutos");
    const elSegundos = document.getElementById("segundos");

    if (distancia > 0 && elDias && elHoras && elMinutos && elSegundos) {
        elDias.innerText = Math.floor(distancia / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
        elHoras.innerText = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
        elMinutos.innerText = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        elSegundos.innerText = Math.floor((distancia % (1000 * 60)) / 1000).toString().padStart(2, '0');
    } else {
        const container = document.querySelector(".countdown-container");
        if (container) container.innerHTML = "<h2>¡El sorteo ha comenzado! 🎉</h2>";
    }
}, 1000);

// Precios de la promoción
function calcularTotal(cantidad) {
    if (cantidad >= 5) return cantidad * 40;
    if (cantidad >= 3) return cantidad * 45;
    return cantidad * 50;
}

function copiarTexto(idElemento) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;
    const texto = elemento.innerText;
    navigator.clipboard.writeText(texto).then(() => {
        mostrarToast("✅ ¡Cuenta copiada con éxito!");
    }).catch(() => {
        mostrarToast("⚠️ No se pudo copiar, anótalo manual: " + texto);
    });
}

// Decodificador especial para que no se rompa el Excel cuando hay comas (ej. "5, 12")
function parseFilaCSV(str) {
    let result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '"') {
            inQuotes = !inQuotes;
        } else if (str[i] === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += str[i];
        }
    }
    result.push(cur.trim());
    return result;
}

// Abrir la Rifa y descargar los datos fresquitos
function abrirRifa(idRifa, nombreRifa) {
    rifaActual = idRifa;
    boletosSeleccionados = [];

    // Cambiar de pantalla
    document.getElementById('seccion-menu').classList.add('hidden');
    const seccionRifa = document.getElementById('seccion-rifa');
    seccionRifa.classList.remove('hidden');
    seccionRifa.classList.add('fade-in');

    document.getElementById('titulo-rifa-activa').innerText = nombreRifa;
    document.getElementById('formulario-section').classList.add('hidden');
    actualizarAvisoAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reiniciar y mostrar loader
    document.getElementById('cargando').classList.remove('hidden');
    const grid = document.getElementById('grid-numeros');
    grid.innerHTML = '';
    grid.classList.add('hidden');

    // Bajar los datos del Excel con anti-cache
    fetch(urlCSV + '&t=' + new Date().getTime())
        .then(response => response.text())
        .then(data => {
            datosBase = data.split(/\r?\n/).map(parseFilaCSV);
            cargarCuadricula();
        })
        .catch(error => {
            console.error('Error cargando datos:', error);
            cargarCuadricula();
        });
}

function volverAlMenu() {
    document.getElementById('seccion-rifa').classList.add('hidden');
    document.getElementById('seccion-rifa').classList.remove('fade-in');

    const seccionMenu = document.getElementById('seccion-menu');
    seccionMenu.classList.remove('hidden');
    seccionMenu.classList.add('fade-in');
}

// Cargar los cuadritos
function cargarCuadricula() {
    const grid = document.getElementById('grid-numeros');
    grid.innerHTML = '';
    const keyRifa = rifaActual.toLowerCase();
    let ocupadosExcel = [];

    // 1. Filtrar los números ocupados de tu Excel
    //    (IGNORANDO las filas que digan "Liberado" o "Cancelado" en la columna C)
    datosBase.forEach(fila => {
        if (fila[COL_RIFA] && fila[COL_RIFA].trim().toLowerCase() === keyRifa) {
            const estado = (fila[COL_ESTADO] || '').trim().toLowerCase();
            if (estado === 'liberado' || estado === 'cancelado') return; // 👈 no cuentan
            if (fila[COL_BOLETOS]) {
                let nums = fila[COL_BOLETOS].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                ocupadosExcel = ocupadosExcel.concat(nums);
            }
        }
    });
    ocupadosExcel = [...new Set(ocupadosExcel)];

    // 2. Liberaciones que hiciste en el panel admin y el Excel AÚN no refleja.
    //    Se limpian solas en cuanto el Excel deja de reportar el número.
    const keyPend = 'liberados_pendientes_' + keyRifa;
    let pendientes = JSON.parse(localStorage.getItem(keyPend) || '[]');
    pendientes = pendientes.filter(n => ocupadosExcel.includes(n));
    localStorage.setItem(keyPend, JSON.stringify(pendientes));

    // 3. BLOQUEO INSTANTÁNEO: boletos recién apartados guardados en ESTE navegador
    const storageKey = 'boletos_ocupados_' + keyRifa;
    let localesGuardados = JSON.parse(localStorage.getItem(storageKey) || '[]');

    let ocupados = [...new Set(ocupadosExcel.concat(localesGuardados))];
    ocupados = ocupados.filter(n => !pendientes.includes(n));

    const porcentajeVendido = Math.round((ocupados.length / totalNumeros) * 100);
    document.getElementById('barra-progreso').style.width = porcentajeVendido + '%';
    document.getElementById('texto-progreso').innerText = `¡Ya se vendió el ${porcentajeVendido}%!`;

    // Pintar los botones
    for (let i = 1; i <= totalNumeros; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.classList.add('number');

        if (ocupados.includes(i)) {
            btn.classList.add('taken');
            if (modoAdmin) {
                // En modo admin los números ocupados se pueden tocar para liberarlos
                btn.classList.add('admin-release');
                btn.onclick = () => liberarNumero(i);
            } else {
                btn.disabled = true;
            }
        } else {
            btn.onclick = () => alternarNumero(i, btn);
        }
        grid.appendChild(btn);
    }

    document.getElementById('cargando').classList.add('hidden');
    grid.classList.remove('hidden');
    grid.classList.add('fade-in');
}

// Seleccionar/Deseleccionar números
function alternarNumero(num, botonElement) {
    const index = boletosSeleccionados.indexOf(num);
    if (index === -1) {
        boletosSeleccionados.push(num);
        botonElement.classList.add('selected');
    } else {
        boletosSeleccionados.splice(index, 1);
        botonElement.classList.remove('selected');
    }

    if (boletosSeleccionados.length > 0) {
        document.getElementById('formulario-section').classList.remove('hidden');
        boletosSeleccionados.sort((a, b) => a - b);
        document.getElementById('num-elegido').innerText = boletosSeleccionados.join(', ');
        document.getElementById('total-pagar').innerText = calcularTotal(boletosSeleccionados.length);
    } else {
        document.getElementById('formulario-section').classList.add('hidden');
    }
}

// Enviar el formulario
const formRifa = document.getElementById('form-rifa');
if (formRifa) {
    formRifa.addEventListener('submit', function(e) {
        e.preventDefault();
        const btnSubmit = document.querySelector('.submit');

        const nombre = document.getElementById('nombre').value;
        const apellidos = document.getElementById('apellidos').value;
        const telefono = document.getElementById('telefono').value;
        const edad = document.getElementById('edad').value;
        const direccion = document.getElementById('direccion').value;
        const terminos = document.getElementById('terminos');

        if(telefono.length !== 10 || isNaN(telefono)) {
            mostrarToast("❌ Ingresa un número de 10 dígitos válido.");
            return;
        }

        if (terminos && !terminos.checked) {
            mostrarToast("❌ Debes aceptar los términos y condiciones.");
            return;
        }

        if (btnSubmit) {
            btnSubmit.innerText = "Procesando de forma segura... ⏳";
            btnSubmit.disabled = true;
        }

        const total = calcularTotal(boletosSeleccionados.length);

        const datosParaGuardar = {
            rifa: rifaActual,
            boletos: boletosSeleccionados,
            nombre: nombre,
            apellidos: apellidos,
            telefono: telefono,
            direccion: direccion
        };

        // 1. BLOQUEO INSTANTÁNEO: Guardar localmente
        const storageKey = 'boletos_ocupados_' + rifaActual.toLowerCase();
        let localesGuardados = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localesGuardados = localesGuardados.concat(boletosSeleccionados);
        localStorage.setItem(storageKey, JSON.stringify([...new Set(localesGuardados)]));

        // 2. Enviar datos al Google Apps Script (para registrar en el Excel)
        fetch(urlAppScript, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datosParaGuardar)
        }).then(() => {
            const mensaje = `¡Hola! Quiero confirmar mi participación.%0A%0A` +
                            `🎯 Rifa: ${rifaActual.toUpperCase()}%0A` +
                            `🎟️ Boletos: ${boletosSeleccionados.join(', ')}%0A` +
                            `💰 Total a pagar: $${total} MXN%0A%0A` +
                            `👤 Nombre: ${nombre} ${apellidos}%0A` +
                            `📞 Teléfono: ${telefono}%0A` +
                            `🎂 Edad: ${edad} años%0A` +
                            `🏠 Dirección: ${direccion}%0A%0A` +
                            `Aquí te adjunto mi comprobante de pago 👇`;

            window.open(`https://wa.me/${miWhatsApp}?text=${mensaje}`, '_blank');

            // Recargar la página después de 2 segundos
            setTimeout(() => { window.location.reload(); }, 2000);

        }).catch(error => {
            console.error("Error:", error);
            mostrarToast("⚠️ Hubo un problema, pero abriremos WhatsApp para continuar.");
            if (btnSubmit) {
                btnSubmit.innerText = "Apartar Boletos y Enviar WhatsApp";
                btnSubmit.disabled = false;
            }
        });
    });
}
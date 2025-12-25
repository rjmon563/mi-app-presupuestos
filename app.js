// 1. CONFIGURACIÓN COMPLETA
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²', esM2: true },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²', esM2: true },
    'cajones': { n: 'Cajones', i: '📦', uni: 'ml', esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'ml', esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml', esM2: false },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', esM2: false },
    'placa13': { n: 'Placa de 13', i: '📄', uni: 'ud', esM2: false },
    'montante48': { n: 'Montante 48', i: '🏗️', uni: 'ud', esM2: false },
    'montante70': { n: 'Montante 70', i: '🏗️', uni: 'ud', esM2: false },
    'canal48': { n: 'Canal 48', i: '🛤️', uni: 'ud', esM2: false },
    'canal70': { n: 'Canal 70', i: '🛤️', uni: 'ud', esM2: false },
    'tc48': { n: 'TC 48', i: '📏', uni: 'ud', esM2: false },
    'cuelgues': { n: 'Cuelgues', i: '⚓', uni: 'ud', esM2: false },
    'perfilU': { n: 'Perfil U', i: '📐', uni: 'ud', esM2: false },
    'perfilClick': { n: 'Perfil Click', i: '🖱️', uni: 'ud', esM2: false }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], iva: 21, total: 0, lugar: "", fecha: "" };
let editandoIndex = null;

// --- REPARACIÓN DEFINITIVA DE LA PAPELERA ---
window.borrarCliente = function(id, event) {
    if (event) {
        event.stopPropagation(); // Evita que se abra el expediente
        event.preventDefault();  // Evita cualquier otra acción del navegador
    }
    
    if (confirm("¿Estás seguro de borrar este cliente y todos sus presupuestos?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        window.save(); 
        window.renderListaClientes(); // Forzamos el repintado para que desaparezca visualmente
    }
};

window.renderListaClientes = function() {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    
    if (db.clientes.length === 0) {
        cont.innerHTML = "<p class='text-center text-slate-400 py-10'>No hay clientes todavía.</p>";
        return;
    }

    cont.innerHTML = db.clientes.map(c => `
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center active:bg-slate-50 cursor-pointer">
            <div>
                <div class="font-black text-slate-800 text-lg uppercase">${c.nombre}</div>
                <div class="text-[10px] text-slate-400 font-bold">${c.ciudad || ''} ${c.fiscal ? '· ' + c.fiscal : ''}</div>
            </div>
            <button onclick="window.borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 p-3 rounded-xl border border-red-100 active:bg-red-500 active:text-white transition-colors">
                🗑️
            </button>
        </div>
    `).join('');
};

window.save = function() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
};

window.irAPantalla = function(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    const p = document.getElementById(`pantalla-${id}`);
    if(p) p.classList.remove('hidden');
    if(id === 'clientes') window.renderListaClientes();
};

window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    if(!clienteActual) return;
    
    document.getElementById('titulo-cliente').innerHTML = `
        <div class="text-blue-600 font-black text-2xl uppercase tracking-tighter">Presupuesto</div>
        <div class="text-slate-800 font-bold text-sm mt-1 uppercase">${clienteActual.nombre}</div>
        <div class="text-[10px] text-slate-500 font-normal italic">${clienteActual.fiscal || ''} | ${clienteActual.direccion || ''}</div>
    `;
    window.renderHistorial(); 
    window.irAPantalla('expediente'); 
};

window.nuevoCliente = function() {
    const n = prompt("Nombre del Cliente:");
    if(!n) return;
    const f = prompt("CIF/DNI:");
    const d = prompt("Dirección:");
    const c = prompt("Ciudad/Provincia:");
    db.clientes.push({
        id: Date.now(), nombre: n, fiscal: f || "", direccion: d || "", ciudad: c || "", presupuestos: []
    });
    window.save();
    window.renderListaClientes();
};

// ... (Resto de funciones de mediciones, historial y compartir que ya tenías)
window.renderHistorial = function() { 
    const archivo = document.getElementById('archivo-presupuestos');
    if(!archivo) return;
    archivo.innerHTML = (clienteActual.presupuestos || []).map((p, index) => `
        <div class="bg-white p-4 rounded-2xl border mb-3 shadow-sm border-l-4 border-l-blue-500">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="text-[9px] font-black text-slate-400 uppercase">${p.fecha}</div>
                    <div class="font-bold text-slate-800 text-sm uppercase">${p.lugar}</div>
                </div>
                <div class="font-black text-blue-600 text-sm">${parseFloat(p.total).toFixed(2)}€</div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3">
                <button onclick="window.compartirWhatsApp(${index})" class="bg-green-500 text-white text-[10px] font-bold py-2 rounded-lg">WhatsApp</button>
                <button onclick="window.modificarPresupuesto(${index})" class="bg-amber-500 text-white text-[10px] font-bold py-2 rounded-lg">✏️ EDITAR</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-500 text-white text-[10px] font-bold py-2 rounded-lg">Email</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-2 rounded-lg text-[10px] font-bold">Borrar</button>
            </div>
        </div>`).reverse().join(''); 
};

// Asegúrate de incluir el resto de funciones (abrirPrompt, iniciarNuevaMedicion, compartirWhatsApp, etc.) que tenías en tu versión original.

window.onload = () => { window.renderListaClientes(); };

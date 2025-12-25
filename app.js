const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', esM2: true },
    'techos': { n: 'Techos', i: '🏠', esM2: true },
    'cajones': { n: 'Cajones', i: '📦', esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', esM2: false },
    'horas': { n: 'Horas', i: '⏱️', esM2: false },
    'placa13': { n: 'Placa 13', i: '📄', esM2: false },
    'montante48': { n: 'Montante 48', i: '🏗️', esM2: false },
    'montante70': { n: 'Montante 70', i: '🏗️', esM2: false },
    'canal48': { n: 'Canal 48', i: '🛤️', esM2: false },
    'canal70': { n: 'Canal 70', i: '🛤️', esM2: false },
    'tc48': { n: 'TC 48', i: '📏', esM2: false }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let trabajoActual = { lineas: [] };

function irAPantalla(id) {
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    document.getElementById('pantalla-' + id).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
}

function renderListaClientes() {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.map(c => `
        <div class="bg-white p-4 rounded shadow mb-3 flex justify-between items-center">
            <div onclick="abrirExpediente(${c.id})" class="flex-1 font-bold uppercase cursor-pointer">${c.nombre}</div>
            <button onclick="borrarCliente(${c.id})" class="text-red-500 ml-4">🗑️</button>
        </div>
    `).join('');
}

function abrirExpediente(id) {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre.toUpperCase();
    renderHistorial();
    irAPantalla('expediente');
}

function nuevoCliente() {
    const n = prompt("Nombre del cliente:");
    if(!n) return;
    db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] });
    save();
    renderListaClientes();
}

function borrarCliente(id) {
    if(confirm("¿Borrar cliente?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        save();
        renderListaClientes();
    }
}

function iniciarNuevaMedicion() {
    const l = prompt("Lugar de la obra:");
    if(!l) return;
    trabajoActual = { lugar: l, fecha: new Date().toLocaleDateString(), lineas: [], total: 0 };
    document.getElementById('num-presu-header').innerText = l.toUpperCase();
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    irAPantalla('trabajo');
    cambiarVista('tecnico');
}

function abrirPrompt(tipo) {
    const conf = CONFIG[tipo];
    const precio = parseFloat(prompt("Precio unidad/m2:", "0")) || 0;
    let cant = 0;
    if(conf.esM2) {
        const largo = (prompt("Largo:") || "0").split('+').reduce((a, b) => a + Number(b), 0);
        const alto = parseFloat(prompt("Alto:")) || 0;
        cant = largo * alto;
    } else {
        cant = parseFloat(prompt("Cantidad:")) || 0;
    }
    if(cant > 0) {
        trabajoActual.lineas.push({ nombre: conf.n, icono: conf.i, cantidad: cant, precio: precio });
        renderListaMedidas();
    }
}

function renderListaMedidas() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="bg-white p-2 border-b flex justify-between text-sm">
            <span>${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}</span>
            <button onclick="quitarLinea(${i})" class="text-red-500">✕</button>
        </div>
    `).join('');
}

function quitarLinea(i) {
    trabajoActual.lineas.splice(i, 1);
    renderListaMedidas();
}

function cambiarVista(v) {
    document.getElementById('vista-tecnico').classList.add('hidden');
    document.getElementById('vista-economico').classList.add('hidden');
    document.getElementById('vista-' + v).classList.remove('hidden');
    document.getElementById('tab-tecnico').classList.remove('tab-active');
    document.getElementById('tab-economico').classList.remove('tab-active');
    document.getElementById('tab-' + v).classList.add('tab-active');
    if(v === 'economico') renderPresupuesto();
}

function renderPresupuesto() {
    let suma = 0;
    let html = "";
    trabajoActual.lineas.forEach(l => {
        const totalLinea = l.cantidad * l.precio;
        suma += totalLinea;
        html += `<div class="flex justify-between py-1 border-b"><span>${l.nombre}</span><span>${totalLinea.toFixed(2)}€</span></div>`;
    });
    document.getElementById('desglose-precios').innerHTML = html;
    const totalFinal = suma * 1.21;
    document.getElementById('total-final').innerText = totalFinal.toFixed(2) + "€";
    trabajoActual.total = totalFinal;
}

function guardarTodo() {
    clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual)));
    save();
    irAPantalla('expediente');
}

function renderHistorial() {
    const cont = document.getElementById('archivo-presupuestos');
    cont.innerHTML = (clienteActual.presupuestos || []).map(p => `
        <div class="bg-white p-3 rounded border mb-2 flex justify-between">
            <span><b>${p.lugar}</b> (${p.fecha})</span>
            <span class="text-blue-600 font-bold">${p.total.toFixed(2)}€</span>
        </div>
    `).reverse().join('');
}

function save() { localStorage.setItem('presupro_v3', JSON.stringify(db)); }

window.onload = renderListaClientes;

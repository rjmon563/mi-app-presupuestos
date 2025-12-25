const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²', esM2: true },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²', esM2: true },
    'cajones': { n: 'Cajones', i: '📦', uni: 'ml', esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'ml', esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml', esM2: false },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', esM2: false },
    'placa13': { n: 'Placa 13', i: '📄', uni: 'ud', esM2: false },
    'montante48': { n: 'Montante 48', i: '🏗️', uni: 'ud', esM2: false },
    'montante70': { n: 'Montante 70', i: '🏗️', uni: 'ud', esM2: false },
    'canal48': { n: 'Canal 48', i: '🛤️', uni: 'ud', esM2: false },
    'canal70': { n: 'Canal 70', i: '🛤️', uni: 'ud', esM2: false },
    'tc48': { n: 'TC 48', i: '📏', uni: 'ud', esM2: false }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let trabajoActual = { lineas: [] };

window.irAPantalla = (id) => {
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border border-slate-200 mb-4 shadow-sm flex justify-between items-center active:scale-95 transition-all">
            <div class="font-extrabold text-slate-800 uppercase text-lg">${c.nombre}</div>
            <button onclick="borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 w-10 h-10 rounded-xl flex items-center justify-center">🗑️</button>
        </div>
    `).join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    if(!clienteActual) return;
    document.getElementById('titulo-cliente').innerHTML = `
        <h2 class="text-xl font-extrabold text-slate-900 leading-none uppercase">${clienteActual.nombre}</h2>
        <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Expediente</p>
    `;
    renderHistorial();
    irAPantalla('expediente');
};

window.nuevoCliente = () => {
    const n = prompt("Nombre:");
    if(!n) return;
    db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] });
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    renderListaClientes();
};

window.borrarCliente = (id, event) => {
    event.stopPropagation();
    if(confirm("¿Borrar cliente?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        localStorage.setItem('presupro_v3', JSON.stringify(db));
        renderListaClientes();
    }
};

window.iniciarNuevaMedicion = () => {
    const l = prompt("Nombre de la obra:");
    if(!l) return;
    trabajoActual = { lugar: l, fecha: new Date().toLocaleDateString(), lineas: [], total: 0 };
    document.getElementById('num-presu-header').innerText = l.toUpperCase();
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    irAPantalla('trabajo');
    cambiarVista('tecnico');
};

window.abrirPrompt = (tipo) => {
    const conf = CONFIG[tipo];
    const p = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    let cant = 0;
    if(conf.esM2) {
        const largo = (prompt("Largo:") || "0").split('+').reduce((a, b) => a + Number(b), 0);
        const alto = parseFloat(prompt("Alto:")) || 0;
        cant = largo * alto;
    } else {
        cant = parseFloat(prompt(`Cantidad para ${conf.n}:`)) || 0;
    }
    if(cant > 0) {
        trabajoActual.lineas.push({ tipo, cantidad: cant, precio: p, icono: conf.i, nombre: conf.n });
        renderListaMedidas();
    }
};

window.renderListaMedidas = () => {
    const cont = document.getElementById('resumen-medidas-pantalla');
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="bg-white p-4 rounded-2xl border mb-2 flex justify-between items-center text-sm shadow-sm">
            <span class="font-bold">${l.icono} ${l.nombre} (${l.cantidad.toFixed(2)})</span>
            <button onclick="quitarLinea(${i})" class="text-red-500 font-bold">✕</button>
        </div>
    `).join('');
};

window.quitarLinea = (i) => {
    trabajoActual.lineas.splice(i, 1);
    renderListaMedidas();
};

window.cambiarVista = (v) => {
    document.querySelectorAll('.vista-trabajo').forEach(d => d.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'economico') renderPresupuesto();
};

window.renderPresupuesto = () => {
    let sub = 0;
    trabajoActual.lineas.forEach(l => sub += (l.cantidad * l.precio));
    document.getElementById('desglose-precios').innerHTML = trabajoActual.lineas.map(l => `
        <div class="flex justify-between border-b border-slate-50 py-2 font-bold uppercase text-[10px]">
            <span>${l.nombre}</span><span>${(l.cantidad*l.precio).toFixed(2)}€</span>
        </div>
    `).join('');
    const totalConIva = sub * 1.21;
    document.getElementById('total-final').innerText = totalConIva.toFixed(2) + "€";
    trabajoActual.total = totalConIva;
};

window.guardarTodo = () => {
    clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual)));
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    irAPantalla('expediente');
};

window.renderHistorial = () => {
    const cont = document.getElementById('archivo-presupuestos');
    cont.innerHTML = (clienteActual.presupuestos || []).map(p => `
        <div class="bg-white p-4 rounded-3xl border shadow-sm flex justify-between items-center">
            <div><div class="font-black text-xs uppercase">${p.lugar}</div><div class="text-[10px] text-slate-400">${p.fecha}</div></div>
            <div class="font-black text-blue-600">${parseFloat(p.total).toFixed(2)}€</div>
        </div>
    `).reverse().join('');
};

window.onload = () => renderListaClientes();

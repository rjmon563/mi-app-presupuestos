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
    'tc48': { n: 'TC 48', i: '📏', uni: 'ud', esM2: false }
};

// Base de datos y variables de estado
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let trabajoActual = { lineas: [], iva: 21, total: 0, lugar: "", fecha: "" };
let editandoIndex = null;

// Guardado
window.save = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// Navegación entre pantallas
window.irAPantalla = (id) => {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    const pantalla = document.getElementById(`pantalla-${id}`);
    if (pantalla) pantalla.classList.remove('hidden');
    if (id === 'clientes') window.renderListaClientes();
};

// Renderizar Clientes en Inicio
window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    if (db.clientes.length === 0) {
        cont.innerHTML = "<p class='text-center text-slate-400 py-10 italic font-medium'>No tienes clientes creados todavía.</p>";
        return;
    }
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border border-slate-200 mb-4 shadow-sm flex justify-between items-center active:scale-95 transition-all cursor-pointer">
            <div>
                <div class="font-extrabold text-slate-800 text-lg uppercase">${c.nombre}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${c.ciudad || 'OBRA'}</div>
            </div>
            <button onclick="window.borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 w-12 h-12 rounded-2xl flex items-center justify-center text-xl">🗑️</button>
        </div>
    `).join('');
};

// Borrar Cliente
window.borrarCliente = (id, event) => {
    if (event) event.stopPropagation();
    if (confirm("¿Seguro que quieres eliminar este cliente y todos sus datos?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        window.save();
        window.renderListaClientes();
    }
};

// Nuevo Cliente
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if (!n) return;
    const c = prompt("Ciudad/Obra:");
    db.clientes.push({ id: Date.now(), nombre: n, ciudad: c || "", presupuestos: [] });
    window.save();
    window.renderListaClientes();
};

// Abrir Ficha del Cliente (ESTO ES LO QUE ESTABA FALLANDO)
window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    if (!clienteActual) return;

    const titulo = document.getElementById('titulo-cliente');
    if (titulo) {
        titulo.innerHTML = `
            <h2 class="text-xl font-extrabold text-slate-900 leading-none uppercase">${clienteActual.nombre}</h2>
            <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Expediente del Cliente</p>
        `;
    }
    window.renderHistorial();
    window.irAPantalla('expediente');
};

// Iniciar nueva medición
window.iniciarNuevaMedicion = () => {
    const l = prompt("¿Qué zona de la obra es? (Ej: Salón, Cocina...)");
    if (!l) return;
    editandoIndex = null;
    trabajoActual = { lugar: l, fecha: new Date().toLocaleDateString(), lineas: [], total: 0 };
    
    const header = document.getElementById('num-presu-header');
    if (header) header.innerText = l.toUpperCase();
    
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
};

// Lógica de prompts de materiales
window.abrirPrompt = (tipo) => {
    const conf = CONFIG[tipo];
    const p = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    let cant = 0;
    if (conf.esM2) {
        const largoStr = prompt("Largo total (puedes sumar 4+2.5...):") || "0";
        const largo = largoStr.split('+').reduce((a, b) => a + Number(b), 0);
        const alto = parseFloat(prompt("Alto:")) || 0;
        cant = largo * alto;
    } else {
        cant = parseFloat(prompt(`Cantidad de ${conf.n}:`)) || 0;
    }
    if (cant > 0) {
        trabajoActual.lineas.push({ tipo, cantidad: cant, precio: p, icono: conf.i, nombre: conf.n });
        window.renderListaMedidas();
    }
};

// Renderizar medidas añadidas
window.renderListaMedidas = () => {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if (!cont) return;
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="bg-white p-4 rounded-2xl border mb-2 flex justify-between items-center text-sm shadow-sm border-l-4 border-blue-500">
            <div>
                <span class="font-bold text-slate-800">${l.icono} ${l.nombre}</span>
                <div class="text-[10px] text-slate-500 font-bold">${l.cantidad.toFixed(2)} x ${l.precio}€</div>
            </div>
            <button onclick="window.quitarLinea(${i})" class="bg-red-50 text-red-500 w-8 h-8 rounded-lg font-bold">✕</button>
        </div>
    `).join('');
};

window.quitarLinea = (i) => {
    trabajoActual.lineas.splice(i, 1);
    window.renderListaMedidas();
};

window.cambiarVista = (v) => {
    document.querySelectorAll('.vista-trabajo').forEach(d => d.classList.add('hidden'));
    const vista = document.getElementById(`vista-${v}`);
    if (vista) vista.classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    const tab = document.getElementById(`tab-${v}`);
    if (tab) tab.classList.add('tab-active');
    
    if (v === 'economico') window.renderPresupuesto();
};

window.renderPresupuesto = () => {
    let sub = 0;
    trabajoActual.lineas.forEach(l => sub += (l.cantidad * l.precio));
    const totalConIva = sub * 1.21;
    
    document.getElementById('desglose-precios').innerHTML = trabajoActual.lineas.map(l => `
        <div class="flex justify-between border-b border-slate-50 py-3 font-bold uppercase text-[11px]">
            <span>${l.nombre}</span>
            <span>${(l.cantidad * l.precio).toFixed(2)}€</span>
        </div>
    `).join('');
    
    document.getElementById('total-final').innerText = totalConIva.toFixed(2) + "€";
    trabajoActual.total = totalConIva;
};

window.guardarTodo = () => {
    if (editandoIndex !== null) {
        clienteActual.presupuestos[editandoIndex] = JSON.parse(JSON.stringify(trabajoActual));
    } else {
        clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual)));
    }
    window.save();
    window.irAPantalla('expediente');
};

window.renderHistorial = () => {
    const cont = document.getElementById('archivo-presupuestos');
    if (!cont || !clienteActual.presupuestos) return;
    
    cont.innerHTML = clienteActual.presupuestos.map((p, i) => `
        <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center mb-3">
            <div>
                <div class="font-black text-xs uppercase text-slate-800">${p.lugar}</div>
                <div class="text-[10px] font-bold text-slate-400 mt-1">${p.fecha}</div>
            </div>
            <div class="text-right">
                <div class="font-black text-blue-600 text-sm">${parseFloat(p.total).toFixed(2)}€</div>
                <button onclick="window.borrarPresupuesto(${i})" class="text-[9px] font-bold text-red-400 uppercase mt-1">Borrar</button>
            </div>
        </div>
    `).reverse().join('');
};

window.borrarPresupuesto = (i) => {
    if(confirm("¿Eliminar este presupuesto?")) {
        clienteActual.presupuestos.splice(i, 1);
        window.save();
        window.renderHistorial();
    }
};

window.onload = () => window.renderListaClientes();

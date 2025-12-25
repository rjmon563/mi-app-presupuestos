// 1. CONFIGURACIÓN
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²', esM2: true },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²', esM2: true },
    'cajones': { n: 'Cajones', i: '📦', uni: 'ml', esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'ml', esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml', esM2: false },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', esM2: false }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], iva: 21, total: 0, lugar: "", fecha: "" };
let editandoIndex = null;

// 2. NAVEGACIÓN
window.irAPantalla = function(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    const p = document.getElementById(`pantalla-${id}`);
    if(p) p.classList.remove('hidden');
    if(id === 'clientes') window.renderListaClientes();
};

window.cambiarVista = function(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    const target = document.getElementById(`vista-${v}`);
    if(target) target.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    const tab = document.getElementById(`tab-${v}`);
    if(tab) tab.classList.add('tab-active');
    
    if(v === 'economico') window.renderPresupuesto();
    if(v === 'tecnico') window.renderListaMedidas();
};

// 3. CLIENTES (CON PAPELERA RECUPERADA)
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
};

window.renderListaClientes = function() {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center">
            <div>
                <div class="font-black text-slate-800 text-lg">${c.nombre}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold">${c.ciudad || 'Sin ciudad'}</div>
            </div>
            <button onclick="window.borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 p-2 rounded-xl text-lg">🗑️</button>
        </div>
    `).join('');
};

window.borrarCliente = function(id, event) {
    event.stopPropagation();
    if(confirm("¿Borrar cliente y todo su historial?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        window.save();
    }
};

// 4. EXPEDIENTE (TÍTULO "PRESUPUESTO" CORREGIDO)
window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    if(!clienteActual) return;

    const tituloHtml = `
        <div class="text-blue-600 font-black text-2xl uppercase tracking-tighter">Presupuesto</div>
        <div class="text-slate-800 font-bold text-sm mt-1 uppercase">${clienteActual.nombre}</div>
        <div class="text-[10px] text-slate-500 font-normal">
            ${clienteActual.fiscal} | ${clienteActual.direccion} | ${clienteActual.ciudad}
        </div>
    `;
    document.getElementById('titulo-cliente').innerHTML = tituloHtml; 
    window.renderHistorial(); 
    window.irAPantalla('expediente'); 
};

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
                <button onclick="window.modificarPresupuesto(${index})" class="bg-amber-500 text-white text-[10px] font-bold py-2 rounded-lg uppercase">✏️ EDITAR</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-500 text-white text-[10px] font-bold py-2 rounded-lg">Email</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-2 rounded-lg text-[10px] font-bold">Borrar</button>
            </div>
        </div>`).reverse().join(''); 
};

// 5. EDITAR (CON RETRASO DE CARGA PARA EVITAR FALLO)
window.modificarPresupuesto = function(index) {
    const p = clienteActual.presupuestos[index];
    if(!p) return;

    trabajoActual = JSON.parse(JSON.stringify(p)); 
    editandoIndex = index;

    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
    
    // Forzamos el dibujo de los metros después de un micro-segundo
    setTimeout(() => {
        window.renderListaMedidas();
    }, 50);
};

// 6. TRABAJO Y MEDICIONES
window.iniciarNuevaMedicion = function() {
    const lugar = prompt("¿Dónde es la obra?");
    if (!lugar) return;
    editandoIndex = null;
    trabajoActual = { lugar: lugar, fecha: new Date().toLocaleDateString(), lineas: [], iva: 21, total: 0 };
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
};

window.renderListaMedidas = function() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(!cont) return;
    
    if(!trabajoActual.lineas || trabajoActual.lineas.length === 0) {
        cont.innerHTML = "<p class='text-center text-slate-400 py-10 text-xs italic'>No hay metros añadidos</p>";
        return;
    }

    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 shadow-sm">
            <div class="text-xs">
                <span class="font-black text-slate-700">${l.icono} ${l.nombre}</span><br>
                ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€
            </div>
            <div class="flex items-center gap-3">
                <span class="font-bold text-blue-600 text-sm">${(l.cantidad * l.precio).toFixed(2)}€</span>
                <button onclick="window.quitarLinea(${i})" class="text-red-400 bg-red-50 w-8 h-8 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
        </div>`).join('');
};

window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    let cantidad = 0;
    if(conf.esM2) {
        const largo = (prompt("Largo (puedes sumar 5+2...):", "0") || "0").split('+').reduce((a, b) => a + Number(b), 0);
        const alto = parseFloat(prompt("Alto:", "0")) || 0;
        cantidad = largo * alto;
    } else {
        cantidad = parseFloat(prompt(`Cantidad de ${conf.n}:`, "0")) || 0;
    }
    if(cantidad > 0) {
        trabajoActual.lineas.push({ tipo, cantidad, precio, icono: conf.i, nombre: conf.n });
        window.renderListaMedidas();
    }
};

window.quitarLinea = function(i) {
    trabajoActual.lineas.splice(i, 1);
    window.renderListaMedidas();
};

window.renderPresupuesto = function() {
    let subtotal = 0;
    trabajoActual.lineas.forEach(l => subtotal += (l.cantidad * l.precio));
    const totalFinal = subtotal * 1.21;
    document.getElementById('desglose-precios').innerHTML = `
        <div class="text-[10px] font-bold text-slate-400 mb-2 uppercase italic">${trabajoActual.lugar}</div>
        ${trabajoActual.lineas.map(l => `<div class="flex justify-between text-xs border-b py-1"><span>${l.icono} ${l.nombre}</span><span>${(l.cantidad*l.precio).toFixed(2)}€</span></div>`).join('')}
    `;
    document.getElementById('total-final').innerText = totalFinal.toFixed(2) + "€";
    trabajoActual.total = totalFinal;
};

window.guardarTodo = function() {
    if(editandoIndex !== null) {
        clienteActual.presupuestos[editandoIndex] = JSON.parse(JSON.stringify(trabajoActual));
    } else {
        clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual)));
    }
    window.save();
    window.irAPantalla('expediente');
};

window.save = function() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    window.renderListaClientes();
};

window.compartirWhatsApp = function(index) {
    const p = clienteActual.presupuestos[index];
    let msg = `*PRESUPUESTO: ${p.lugar.toUpperCase()}*\n`;
    msg += `Cliente: ${clienteActual.nombre}\n`;
    p.lineas.forEach(l => msg += `${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} = ${(l.cantidad*l.precio).toFixed(2)}€\n`);
    msg += `*TOTAL CON IVA: ${parseFloat(p.total).toFixed(2)}€*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

window.enviarEmail = function(index) {
    const p = clienteActual.presupuestos[index];
    window.location.href = `mailto:?subject=Presupuesto ${p.lugar}&body=Total: ${p.total}€`;
};

window.borrarPresupuesto = function(index) {
    if(confirm("¿Borrar definitivamente?")) {
        clienteActual.presupuestos.splice(index, 1);
        window.save();
        window.renderHistorial();
    }
};

window.onload = () => { window.renderListaClientes(); };

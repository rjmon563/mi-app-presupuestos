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
let trabajoActual = { lineas: [], iva: 21, total: 0, lugar: "" };
let editandoIndex = null;

// 2. NAVEGACIÓN Y GUARDADO
window.save = function() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    window.renderListaClientes();
};

window.irAPantalla = function(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') window.renderListaClientes();
};

window.cambiarVista = function(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'economico') window.renderPresupuesto();
    if(v === 'tecnico') window.renderListaMedidas();
};

// 3. GESTIÓN CLIENTES
window.nuevoCliente = function() {
    const n = prompt("Nombre del cliente:");
    if(n) {
        db.clientes.push({id: Date.now(), nombre: n, presupuestos: []});
        window.save();
    }
};

window.borrarCliente = function(id, event) {
    event.stopPropagation();
    if(confirm("¿Borrar cliente y todo su historial?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        window.save();
    }
};

window.renderListaClientes = function() {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center">
            <div class="font-black text-slate-800">${c.nombre}</div>
            <button onclick="window.borrarCliente(${c.id}, event)" class="text-red-400 p-2">🗑️</button>
        </div>
    `).join('');
};

// 4. HISTORIAL Y EDICIÓN (SOLUCIONADO)
window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre; 
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
                <button onclick="window.compartirWhatsApp(${index})" class="bg-green-500 text-white text-[10px] font-bold py-2 rounded-lg uppercase">WhatsApp</button>
                <button onclick="window.modificarPresupuesto(${index})" class="bg-amber-500 text-white text-[10px] font-bold py-2 rounded-lg uppercase">✏️ EDITAR</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-500 text-white text-[10px] font-bold py-2 rounded-lg uppercase">Email</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-2 rounded-lg text-[10px] font-bold uppercase">Borrar</button>
            </div>
        </div>`).reverse().join(''); 
};

// BOTÓN EDITAR SOLUCIONADO
window.modificarPresupuesto = function(index) {
    const p = clienteActual.presupuestos[index];
    trabajoActual = JSON.parse(JSON.stringify(p)); // Carga datos
    editandoIndex = index;

    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico'); // Esto ya llama a renderListaMedidas()
};

// 5. EDITOR Y MEDICIONES
window.iniciarNuevaMedicion = function() {
    const lugar = prompt("¿Lugar de la obra?");
    if (!lugar) return;
    editandoIndex = null;
    trabajoActual = { lugar: lugar, fecha: new Date().toLocaleDateString(), lineas: [], iva: 21, total: 0 };
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
};

window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    let cantidad = 0;
    if(conf.esM2) {
        const largo = (prompt("Largo (suma 5+2...):", "0") || "0").split('+').reduce((a, b) => a + Number(b), 0);
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

window.renderListaMedidas = function() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(!cont) return;
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 shadow-sm">
            <div class="text-xs"><b>${l.icono} ${l.nombre}</b><br>${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€</div>
            <div class="flex items-center gap-2">
                <span class="font-bold text-blue-600 text-sm">${(l.cantidad * l.precio).toFixed(2)}€</span>
                <button onclick="window.quitarLinea(${i})" class="text-red-400 bg-red-50 p-1 rounded">✕</button>
            </div>
        </div>`).join('') || "<p class='text-center text-slate-400 py-4 text-xs'>Sin metros</p>";
};

window.quitarLinea = function(i) {
    trabajoActual.lineas.splice(i, 1);
    window.renderListaMedidas();
};

window.renderPresupuesto = function() {
    let subtotal = 0;
    trabajoActual.lineas.forEach(l => subtotal += (l.cantidad * l.precio));
    const ivaPct = parseFloat(document.getElementById('select-iva')?.value || 21);
    const totalFinal = subtotal * (1 + ivaPct/100);
    document.getElementById('desglose-precios').innerHTML = `<div class="text-xs font-bold">${trabajoActual.lugar}</div>` + trabajoActual.lineas.map(l => `<div class="flex justify-between text-xs border-b py-1"><span>${l.icono} ${l.nombre}</span><span>${(l.cantidad*l.precio).toFixed(2)}€</span></div>`).join('');
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

// 6. ENVÍOS
window.compartirWhatsApp = function(index) {
    const p = clienteActual.presupuestos[index];
    let msg = `*PRESUPUESTO: ${p.lugar.toUpperCase()}*\n`;
    p.lineas.forEach(l => msg += `${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} = ${(l.cantidad*l.precio).toFixed(2)}€\n`);
    msg += `*TOTAL: ${parseFloat(p.total).toFixed(2)}€*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

window.enviarEmail = function(index) {
    const p = clienteActual.presupuestos[index];
    window.location.href = `mailto:?subject=Presupuesto&body=Presupuesto ${p.lugar}: ${p.total}€`;
};

window.borrarPresupuesto = function(index) {
    if(confirm("¿Borrar definitivamente?")) {
        clienteActual.presupuestos.splice(index, 1);
        window.save();
        window.renderHistorial();
    }
};

window.onload = () => { window.renderListaClientes(); };

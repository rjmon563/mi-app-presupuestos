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
let trabajoActual = { lineas: [], estado: 'Pendiente', iva: 21, total: 0, numero: "", lugar: "" };
let editandoIndex = null;

window.save = function() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    window.renderListaClientes();
};

window.actualizarDash = function() {
    let t = 0;
    db.clientes.forEach(c => {
        if(c.presupuestos) c.presupuestos.forEach(p => t += (parseFloat(p.total) || 0));
    });
    const dash = document.getElementById('dash-pendiente');
    if(dash) dash.innerText = t.toFixed(2) + "€";
};

window.nuevoCliente = function() {
    const n = prompt("Nombre del cliente:");
    if(n) {
        db.clientes.push({id: Date.now(), nombre: n, presupuestos: []});
        window.save();
    }
};

window.borrarCliente = function(id, event) {
    event.stopPropagation();
    if(confirm("¿Seguro que quieres borrar este cliente y todos sus presupuestos?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        window.save();
    }
};

window.renderListaClientes = function() {
    const listaCont = document.getElementById('lista-clientes');
    if(!listaCont) return;
    const filtro = document.getElementById('buscador')?.value.toLowerCase() || "";
    const lista = db.clientes.filter(c => c.nombre.toLowerCase().includes(filtro));
    
    listaCont.innerHTML = lista.map(c => `
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center">
            <div>
                <div class="font-black text-slate-800">${c.nombre}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold">${c.presupuestos?.length || 0} Trabajos</div>
            </div>
            <div class="flex items-center gap-4">
                <button onclick="window.borrarCliente(${c.id}, event)" class="bg-red-50 text-red-400 p-2 rounded-lg text-sm">🗑️</button>
                <span class="text-blue-500 font-bold text-xl">→</span>
            </div>
        </div>
    `).join('');
    window.actualizarDash();
};

window.irAPantalla = function(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
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

window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre; 
    window.renderHistorial(); 
    window.irAPantalla('expediente'); 
};

window.renderHistorial = function() { 
    const archivo = document.getElementById('archivo-presupuestos');
    if(!archivo || !clienteActual.presupuestos) return;
    
    archivo.innerHTML = clienteActual.presupuestos.map((p, index) => `
        <div class="bg-white p-4 rounded-2xl border mb-3 shadow-sm border-l-4 border-l-blue-500">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="text-[9px] font-black text-slate-400 uppercase">${p.fecha || ''}</div>
                    <div class="font-bold text-slate-800 text-sm">${p.lugar || 'Obra'}</div>
                </div>
                <div class="text-right font-black text-blue-600 text-sm">${parseFloat(p.total).toFixed(2)}€</div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3">
                <button onclick="window.compartirWhatsApp(${index})" class="bg-green-500 text-white text-[9px] font-bold py-2 rounded-lg uppercase font-black italic">WhatsApp</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-500 text-white text-[9px] font-bold py-2 rounded-lg uppercase">Email</button>
                <button onclick="window.modificarPresupuesto(${index})" class="bg-amber-500 text-white text-[9px] font-bold py-2 rounded-lg uppercase font-black italic">✏️ EDITAR</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-2 rounded-lg text-[9px] font-bold uppercase text-center font-black">BORRAR 🗑️</button>
            </div>
        </div>`).reverse().join(''); 
};

// --- MODIFICAR PRESUPUESTO (REFORZADO) ---
window.modificarPresupuesto = function(index) {
    const p = clienteActual.presupuestos[index];
    // Cargamos los datos en el editor
    trabajoActual = JSON.parse(JSON.stringify(p)); 
    editandoIndex = index;
    
    // Actualizamos el nombre en la cabecera
    document.getElementById('num-presu-header').innerText = "EDITANDO: " + trabajoActual.lugar.toUpperCase();
    
    // IMPORTANTE: Primero cambiamos de pantalla y LUEGO dibujamos la lista
    window.irAPantalla('trabajo'); 
    window.cambiarVista('tecnico'); 
    setTimeout(() => { window.renderListaMedidas(); }, 50); 
};

window.enviarEmail = function(index) {
    const p = clienteActual.presupuestos[index];
    const asunto = encodeURIComponent(`Presupuesto Obra: ${p.lugar}`);
    let cuerpo = `Hola ${clienteActual.nombre},\n\nAdjunto el presupuesto para la obra en ${p.lugar}:\n\n`;
    p.lineas.forEach(l => {
        cuerpo += `${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€ = ${(l.cantidad*l.precio).toFixed(2)}€\n`;
    });
    cuerpo += `\nTOTAL FINAL: ${parseFloat(p.total).toFixed(2)}€\n\nSaludos.`;
    window.location.href = `mailto:?subject=${asunto}&body=${encodeURIComponent(cuerpo)}`;
};

window.borrarPresupuesto = function(index) {
    if(confirm("¿Borrar este presupuesto definitivamente?")) {
        clienteActual.presupuestos.splice(index, 1);
        window.save();
        window.renderHistorial();
    }
};

window.compartirWhatsApp = function(index) {
    const p = clienteActual.presupuestos[index];
    let msg = `*PRESUPUESTO: ${p.lugar.toUpperCase()}*\n`;
    msg += `--------------------------\n`;
    p.lineas.forEach(l => {
        msg += `${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€ = *${(l.cantidad*l.precio).toFixed(2)}€*\n`;
    });
    msg += `--------------------------\n*TOTAL: ${parseFloat(p.total).toFixed(2)}€*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

window.iniciarNuevaMedicion = function() {
    const lugar = prompt("¿Dónde es la obra?", "");
    if (!lugar) return;
    editandoIndex = null;
    const ahora = new Date();
    const fechaStr = ahora.getDate() + "/" + (ahora.getMonth()+1) + "/" + ahora.getFullYear();
    trabajoActual = { numero: "OBRA-" + ahora.getTime().toString().slice(-4), lugar: lugar, fecha: fechaStr, lineas: [], estado: 'Pendiente', iva: 21, total: 0 };
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    window.cambiarVista('tecnico');
    window.irAPantalla('trabajo');
};

window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    const pInput = prompt(`Precio para ${conf.n}:`, "0");
    if(pInput === null) return;
    const precio = parseFloat(pInput) || 0;
    let cantidad = 0;
    
    if(conf.esM2) {
        const largoInput = prompt(`${conf.n}: LARGO (ej: 5+3):`, "0");
        const altoInput = prompt("ALTO / ANCHO:", "0");
        const sumaLargo = (largoInput || "0").split('+').reduce((a, b) => a + Number(b || 0), 0);
        cantidad = sumaLargo * (parseFloat(altoInput) || 0);
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
    if(trabajoActual.lineas.length === 0) {
        cont.innerHTML = "<p class='text-center text-slate-400 py-4 text-xs'>No hay mediciones</p>";
        return;
    }
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 text-sm shadow-sm">
            <span>${l.icono} <b>${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni}</b> ${l.nombre}</span>
            <div class="flex gap-3 items-center">
                <span class="font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span>
                <button onclick="window.quitarLinea(${i})" class="text-red-400 font-bold px-2 bg-red-50 rounded">✕</button>
            </div>
        </div>
    `).join('');
};

window.quitarLinea = function(i) {
    trabajoActual.lineas.splice(i, 1);
    window.renderListaMedidas();
};

window.renderPresupuesto = function() {
    let subtotal = 0;
    let h = `<div class="border-b pb-2 mb-4 text-[10px] font-bold uppercase text-slate-400">DESGLOSE: ${trabajoActual.lugar}</div>`;
    trabajoActual.lineas.forEach(l => {
        subtotal += (l.cantidad * l.precio);
        h += `<div class="flex justify-between items-center mb-2 text-xs border-b border-slate-50 pb-2">
                <span>${l.icono} <b>${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni}</b> ${l.nombre}</span>
                <span class="font-bold">${(l.cantidad * l.precio).toFixed(2)}€</span>
              </div>`;
    });
    const ivaPct = parseFloat(document.getElementById('select-iva')?.value || 21);
    const ant = parseFloat(document.getElementById('input-anticipo')?.value || 0);
    const totalFinal = (subtotal * (1 + ivaPct/100)) - ant;
    h += `<div class="mt-4 pt-2 border-t-2 text-xs font-bold flex justify-between"><span>TOTAL:</span><span>${totalFinal.toFixed(2)}€</span></div>`;
    document.getElementById('desglose-precios').innerHTML = h;
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

window.onload = () => { window.renderListaClientes(); };

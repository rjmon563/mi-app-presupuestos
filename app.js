// 1. CONFIGURACIÓN Y ESTADO
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

// 2. UTILIDADES
window.save = function() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    window.renderListaClientes();
};

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

// 3. CLIENTES
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
            <button onclick="window.borrarCliente(${c.id}, event)" class="bg-red-50 text-red-400 p-2 rounded-lg text-xs">🗑️</button>
        </div>
    `).join('');
};

// 4. HISTORIAL
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
                    <div class="text-[9px] font-black text-slate-400 uppercase">${p.fecha || ''}</div>
                    <div class="font-bold text-slate-800 text-sm uppercase">${p.lugar || 'Sin nombre'}</div>
                </div>
                <div class="font-black text-blue-600 text-sm">${parseFloat(p.total).toFixed(2)}€</div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3">
                <button onclick="window.compartirWhatsApp(${index})" class="bg-green-500 text-white text-[9px] font-bold py-2 rounded-lg uppercase">WhatsApp</button>
                <button onclick="window.modificarPresupuesto(${index})" class="bg-amber-500 text-white text-[9px] font-bold py-2 rounded-lg uppercase">✏️ EDITAR</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-100 text-blue-600 text-[9px] font-bold py-2 rounded-lg uppercase">Email</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-2 rounded-lg text-[9px] font-bold uppercase">Borrar</button>
            </div>
        </div>`).reverse().join(''); 
};

// 5. FUNCIÓN EDITAR (RECONSTRUIDA)
window.modificarPresupuesto = function(index) {
    // 1. Localizar el presupuesto
    const pOriginal = clienteActual.presupuestos[index];
    if(!pOriginal) return;

    // 2. Clonar los datos para no romper el original hasta guardar
    trabajoActual = JSON.parse(JSON.stringify(pOriginal));
    editandoIndex = index;

    // 3. Preparar la pantalla de trabajo
    document.getElementById('num-presu-header').innerText = "MODIFICANDO: " + trabajoActual.lugar.toUpperCase();
    
    // 4. Forzar navegación y dibujo
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico'); // Esto llama internamente a renderListaMedidas()
};

// 6. MEDICIONES
window.iniciarNuevaMedicion = function() {
    const lugar = prompt("¿Lugar de la obra?", "");
    if (!lugar) return;
    editandoIndex = null;
    const ahora = new Date();
    trabajoActual = { 
        numero: "OBRA-" + ahora.getTime().toString().slice(-4), 
        lugar: lugar, 
        fecha: ahora.toLocaleDateString(), 
        lineas: [], 
        iva: 21, 
        total: 0 
    };
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
};

window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    let cantidad = 0;
    
    if(conf.esM2) {
        const largo = (prompt("Largo (ej: 5+2):", "0") || "0").split('+').reduce((a, b) => a + Number(b), 0);
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
    
    if(!trabajoActual.lineas || trabajoActual.lineas.length === 0) {
        cont.innerHTML = "<p class='text-center text-slate-400 py-10 text-xs'>No hay metros añadidos</p>";
        return;
    }
    
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-4 rounded-xl border mb-2 shadow-sm">
            <div class="text-sm">
                <span class="font-black text-slate-700">${l.icono} ${l.nombre}</span>
                <div class="text-[10px] text-slate-500">${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€</div>
            </div>
            <div class="flex items-center gap-4">
                <span class="font-bold text-blue-600 text-sm">${(l.cantidad * l.precio).toFixed(2)}€</span>
                <button onclick="window.quitarLinea(${i})" class="text-red-400 bg-red-50 w-8 h-8 rounded-full">✕</button>
            </div>
        </div>
    `).join('');
};

window.quitarLinea = function(i) {
    trabajoActual.lineas.splice(i, 1);
    window.renderListaMedidas();
};

// 7. TOTALES Y GUARDADO
window.renderPresupuesto = function() {
    let subtotal = 0;
    trabajoActual.lineas.forEach(l => subtotal += (l.cantidad * l.precio));
    
    const ivaPct = parseFloat(document.getElementById('select-iva')?.value || 21);
    const ant = parseFloat(document.getElementById('input-anticipo')?.value || 0);
    const totalFinal = (subtotal * (1 + ivaPct/100)) - ant;

    document.getElementById('desglose-precios').innerHTML = `
        <div class="space-y-2">
            ${trabajoActual.lineas.map(l => `
                <div class="flex justify-between text-xs border-b pb-1">
                    <span>${l.icono} ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} ${l.nombre}</span>
                    <span class="font-bold">${(l.cantidad*l.precio).toFixed(2)}€</span>
                </div>
            `).join('')}
            <div class="pt-4 text-xs">
                <div class="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}€</span></div>
                <div class="flex justify-between font-black text-blue-600 text-sm mt-2"><span>TOTAL:</span><span>${totalFinal.toFixed(2)}€</span></div>
            </div>
        </div>
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

// 8. ENVÍOS
window.compartirWhatsApp = function(index) {
    const p = clienteActual.presupuestos[index];
    let msg = `*PRESUPUESTO: ${p.lugar.toUpperCase()}*\n`;
    p.lineas.forEach(l => msg += `${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€ = *${(l.cantidad*l.precio).toFixed(2)}€*\n`);
    msg += `*TOTAL: ${parseFloat(p.total).toFixed(2)}€*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

window.enviarEmail = function(index) {
    const p = clienteActual.presupuestos[index];
    const cuerpo = `Presupuesto ${p.lugar}: Total ${p.total}€`;
    window.location.href = `mailto:?subject=Presupuesto&body=${encodeURIComponent(cuerpo)}`;
};

window.borrarPresupuesto = function(index) {
    if(confirm("¿Borrar presupuesto?")) {
        clienteActual.presupuestos.splice(index, 1);
        window.save();
        window.renderHistorial();
    }
};

window.onload = () => { window.renderListaClientes(); };

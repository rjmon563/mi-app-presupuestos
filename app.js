
// 1. CONFIGURACIÓN
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²', esM2: true },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²', esM2: true },
    'cajones': { n: 'Cajones', i: '📦', uni: 'm²', esM2: true },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'm²', esM2: true },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml', esM2: false },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', esM2: false }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let trabajoActual = { lineas: [], iva: 21, total: 0, lugar: "", fecha: "" };
let editandoIndex = null;

// AUXILIAR: PROCESAR SUMAS (5+2.5+1) Y COMAS
const procesarSuma = (valor) => {
    if (!valor) return 0;
    return valor.toString().split('+').reduce((acc, curr) => {
        // Cambiamos coma por punto para que el móvil no falle
        const num = Number(curr.replace(',', '.').trim());
        return acc + (isNaN(num) ? 0 : num);
    }, 0);
};

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

// 3. CLIENTES
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
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border mb-3 shadow-sm flex justify-between items-center active:scale-95 transition-transform">
            <div>
                <div class="font-black text-slate-800 text-lg uppercase leading-tight">${c.nombre}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">${c.ciudad || 'Sin ciudad'}</div>
            </div>
            <button onclick="window.borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 p-3 rounded-2xl text-xl">🗑️</button>
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

// 4. EXPEDIENTE
window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    if(!clienteActual) return;
    const tituloHtml = `
        <div class="text-blue-600 font-black text-2xl uppercase tracking-tighter leading-none">Presupuesto</div>
        <div class="text-slate-800 font-bold text-xs mt-1 uppercase">${clienteActual.nombre}</div>
        <div class="text-[9px] text-slate-400 font-normal">
            ${clienteActual.fiscal} | ${clienteActual.direccion}
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
        <div class="bg-white p-5 rounded-3xl border mb-4 shadow-sm border-l-8 border-l-blue-500">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">${p.fecha}</div>
                    <div class="font-black text-slate-800 text-base uppercase">${p.lugar}</div>
                </div>
                <div class="font-black text-blue-600 text-lg">${parseFloat(p.total).toFixed(2)}€</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button onclick="window.compartirWhatsApp(${index})" class="bg-green-500 text-white text-[10px] font-black py-3 rounded-xl uppercase">WhatsApp</button>
                <button onclick="window.modificarPresupuesto(${index})" class="bg-slate-800 text-white text-[10px] font-black py-3 rounded-xl uppercase">✏️ Editar</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-100 text-blue-600 text-[10px] font-black py-3 rounded-xl uppercase">Email</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-3 rounded-xl text-[10px] font-black uppercase">Borrar</button>
            </div>
        </div>`).reverse().join(''); 
};

// 5. MEDICIONES CON FÓRMULAS Y SUMA "+"
window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    const precio = parseFloat((prompt(`Precio para ${conf.n}:`, "0") || "0").replace(',', '.')) || 0;
    let cantidad = 0;

    if(tipo === 'techos') {
        const ancho = procesarSuma(prompt("Ancho (puedes sumar 4+2.5):", "0"));
        const largo = procesarSuma(prompt("Largo (puedes sumar 5+3):", "0"));
        cantidad = ancho * largo;
    } 
    else if(tipo === 'tabicas') {
        const largo = procesarSuma(prompt("Largo acumulado (ej: 3+2+6):", "0"));
        const ancho = parseFloat((prompt("Ancho / Caída:", "0") || "0").replace(',', '.')) || 0;
        cantidad = largo * ancho;
    }
    else if(tipo === 'cajones') {
        const ancho = parseFloat((prompt("Ancho:", "0") || "0").replace(',', '.')) || 0;
        const alto = parseFloat((prompt("Alto:", "0") || "0").replace(',', '.')) || 0;
        const largo = procesarSuma(prompt("Largo total (ej: 2+2+3):", "0"));
        cantidad = (ancho + alto) * largo;
    }
    else if(conf.esM2) {
        const largo = procesarSuma(prompt("Largo acumulado:", "0"));
        const alto = parseFloat((prompt("Alto:", "0") || "0").replace(',', '.')) || 0;
        cantidad = largo * alto;
    } else {
        cantidad = procesarSuma(prompt(`Cantidad de ${conf.n} (puedes sumar):`, "0"));
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
        cont.innerHTML = "<p class='text-center text-slate-400 py-10 text-xs italic font-bold'>No hay metros añadidos</p>";
        return;
    }
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-4 rounded-2xl border mb-3 shadow-sm">
            <div class="text-xs">
                <span class="font-black text-slate-800 uppercase tracking-tighter">${l.icono} ${l.nombre}</span><br>
                <span class="font-bold text-slate-400">${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€</span>
            </div>
            <div class="flex items-center gap-4">
                <span class="font-black text-blue-600 text-sm">${(l.cantidad * l.precio).toFixed(2)}€</span>
                <button onclick="window.quitarLinea(${i})" class="text-red-400 bg-red-50 w-8 h-8 rounded-xl font-bold">✕</button>
            </div>
        </div>`).join('');
};

window.renderPresupuesto = function() {
    let subtotal = 0;
    trabajoActual.lineas.forEach(l => subtotal += (l.cantidad * l.precio));
    const totalFinal = subtotal * 1.21;
    document.getElementById('desglose-precios').innerHTML = `
        <div class="text-[10px] font-black text-blue-500 mb-3 uppercase tracking-widest italic">${trabajoActual.lugar}</div>
        ${trabajoActual.lineas.map(l => `
            <div class="border-b border-slate-50 py-3">
                <div class="flex justify-between text-xs font-black uppercase text-slate-700">
                    <span>${l.icono} ${l.nombre}</span>
                    <span>${(l.cantidad*l.precio).toFixed(2)}€</span>
                </div>
                <div class="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    Detalle: ${l.cantidad.toFixed(2)} x ${l.precio.toFixed(2)}€
                </div>
            </div>`).join('')}
    `;
    document.getElementById('total-final').innerText = totalFinal.toFixed(2) + "€";
    trabajoActual.total = totalFinal;
};

// 6. GUARDAR Y COMPARTIR
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
    msg += `Cliente: ${clienteActual.nombre}\n\n`;
    p.lineas.forEach(l => msg += `${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€ = ${(l.cantidad*l.precio).toFixed(2)}€\n`);
    msg += `\n*TOTAL CON IVA: ${parseFloat(p.total).toFixed(2)}€*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

window.enviarEmail = function(index) {
    const p = clienteActual.presupuestos[index];
    const asunto = `PRESUPUESTO: ${p.lugar.toUpperCase()} - ${clienteActual.nombre}`;
    let cuerpo = `Hola,\n\nAdjunto el detalle del presupuesto para ${p.lugar.toUpperCase()}:\n\n`;
    p.lineas.forEach(l => {
        cuerpo += `- ${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)} ${CONFIG[l.tipo].uni} x ${l.precio}€ = ${(l.cantidad*l.precio).toFixed(2)}€\n`;
    });
    cuerpo += `\nTOTAL CON IVA: ${parseFloat(p.total).toFixed(2)}€\n\nQuedamos a su disposición.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
};

window.modificarPresupuesto = function(index) {
    const p = clienteActual.presupuestos[index];
    trabajoActual = JSON.parse(JSON.stringify(p)); 
    editandoIndex = index;
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
    setTimeout(() => { window.renderListaMedidas(); }, 50);
};

window.iniciarNuevaMedicion = function() {
    const lugar = prompt("¿Dónde es la obra?");
    if (!lugar) return;
    editandoIndex = null;
    trabajoActual = { lugar: lugar, fecha: new Date().toLocaleDateString(), lineas: [], iva: 21, total: 0 };
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
};

window.borrarPresupuesto = function(index) {
    if(confirm("¿Borrar definitivamente?")) {
        clienteActual.presupuestos.splice(index, 1);
        window.save();
        window.renderHistorial();
    }
};

window.quitarLinea = function(i) {
    trabajoActual.lineas.splice(i, 1);
    window.renderListaMedidas();
};

window.onload = () => { window.renderListaClientes(); };

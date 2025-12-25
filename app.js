// 1. CONFIGURACIÓN COMPLETA
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²', esM2: true },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²', esM2: true },
    'cajones': { n: 'Cajones', i: '📦', uni: 'ml', esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'ml', esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml', esM2: false },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', esM2: false },
    'placa13': { n: 'Placa de 13', i: '📄', uni: 'ud', esM2: false },
    'montante48': { n: 'Montante 48', i: '🏗️', uni: 'ud', esM2: false },// 1. CONFIGURACIÓN COMPLETA
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

// --- FUNCIÓN DE BORRADO REPARADA ---
window.borrarCliente = function(id, event) {
    // Esto evita que al borrar se abra la ficha del cliente
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (confirm("¿Estás seguro de borrar este cliente y todos sus presupuestos?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        window.save(); // Guarda y refresca la lista automáticamente
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

// --- EL RESTO DE FUNCIONES ---

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
};

window.modificarPresupuesto = function(index) {
    const p = clienteActual.presupuestos[index];
    if(!p) return;
    trabajoActual = JSON.parse(JSON.stringify(p)); 
    editandoIndex = index;
    document.getElementById('num-presu-header').innerText = (trabajoActual.lugar || "OBRA").toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
    setTimeout(() => { window.renderListaMedidas(); }, 100);
};

window.renderListaMedidas = function() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(!cont) return;
    if(!trabajoActual.lineas || trabajoActual.lineas.length === 0) {
        cont.innerHTML = "<p class='text-center text-slate-400 py-10 text-xs italic'>Sin datos</p>";
        return;
    }
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="bg-white p-3 rounded-xl border mb-2 shadow-sm border-l-4 border-l-blue-400">
            <div class="flex justify-between items-start">
                <div class="text-xs">
                    <span class="font-black text-slate-700 uppercase">${l.icono} ${l.nombre}</span>
                    ${l.descripcion ? `<div class="text-[10px] text-blue-500 italic font-medium">${l.descripcion}</div>` : ''}
                    <div class="mt-1 text-slate-500 font-bold">${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black text-blue-600 text-sm">${(l.cantidad * l.precio).toFixed(2)}€</span>
                    <button onclick="window.quitarLinea(${i})" class="text-red-500 bg-red-50 w-9 h-9 rounded-full flex items-center justify-center border border-red-100 shadow-sm">✕</button>
                </div>
            </div>
        </div>`).join('');
};

window.quitarLinea = function(i) {
    trabajoActual.lineas.splice(i, 1);
    window.renderListaMedidas();
    if(document.getElementById('vista-economico').classList.contains('hidden') === false) window.renderPresupuesto();
};

window.renderPresupuesto = function() {
    let subtotal = 0;
    trabajoActual.lineas.forEach(l => subtotal += (l.cantidad * l.precio));
    const totalFinal = subtotal * 1.21;
    document.getElementById('desglose-precios').innerHTML = `
        <div class="text-[10px] font-bold text-slate-400 mb-2 uppercase italic">${trabajoActual.lugar}</div>
        ${trabajoActual.lineas.map(l => `
            <div class="border-b py-2">
                <div class="flex justify-between text-xs font-bold">
                    <span>${l.icono} ${l.nombre}</span>
                    <span>${(l.cantidad*l.precio).toFixed(2)}€</span>
                </div>
                ${l.descripcion ? `<div class="text-[9px] text-slate-500 italic font-medium">${l.descripcion}</div>` : ''}
            </div>
        `).join('')}
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

window.cambiarVista = function(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'economico') window.renderPresupuesto();
    if(v === 'tecnico') window.renderListaMedidas();
};

window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    const desc = prompt(`Descripción para ${conf.n}:`, "");
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
        trabajoActual.lineas.push({ tipo, cantidad, precio, icono: conf.i, nombre: conf.n, descripcion: desc || "" });
        window.renderListaMedidas();
    }
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
                <button onclick="window.modificarPresupuesto(${index})" class="bg-amber-500 text-white text-[10px] font-bold py-2 rounded-lg">✏️ EDITAR</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-500 text-white text-[10px] font-bold py-2 rounded-lg">Email</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-2 rounded-lg text-[10px] font-bold">Borrar</button>
            </div>
        </div>`).reverse().join(''); 
};

window.borrarPresupuesto = function(index) {
    if(confirm("¿Borrar definitivamente?")) {
        clienteActual.presupuestos.splice(index, 1);
        window.save();
        window.renderHistorial();
    }
};

window.iniciarNuevaMedicion = function() {
    const lugar = prompt("¿Nombre de la obra?");
    if (!lugar) return;
    editandoIndex = null;
    trabajoActual = { lugar: lugar, fecha: new Date().toLocaleDateString(), lineas: [], iva: 21, total: 0 };
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
};

window.compartirWhatsApp = function(index) {
    const p = clienteActual.presupuestos[index];
    let msg = `*PRESUPUESTO: ${p.lugar.toUpperCase()}*\nCliente: ${clienteActual.nombre}\n\n`;
    p.lineas.forEach(l => {
        msg += `${l.icono} *${l.nombre}*\n${l.descripcion ? '_'+l.descripcion+'_\n' : ''}${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€ = *${(l.cantidad*l.precio).toFixed(2)}€*\n\n`;
    });
    msg += `*TOTAL CON IVA: ${parseFloat(p.total).toFixed(2)}€*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

window.enviarEmail = function(index) {
    const p = clienteActual.presupuestos[index];
    window.location.href = `mailto:?subject=Presupuesto ${p.lugar}&body=Total: ${p.total}€`;
};

window.onload = () => { window.renderListaClientes(); };
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

// 2. MOTOR DE NAVEGACIÓN
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
    
    // Al cambiar de vista, refrescamos siempre los datos
    if(v === 'economico') window.renderPresupuesto();
    if(v === 'tecnico') window.renderListaMedidas();
};

// 3. EDITAR (REPARADO: Ahora limpia y reconecta funciones)
window.modificarPresupuesto = function(index) {
    const p = clienteActual.presupuestos[index];
    if(!p) return;

    // Clonamos profundamente para que no afecte al original hasta que demos a "Guardar"
    trabajoActual = JSON.parse(JSON.stringify(p)); 
    editandoIndex = index;

    document.getElementById('num-presu-header').innerText = (trabajoActual.lugar || "EDITANDO").toUpperCase();
    
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
    
    // Forzamos el renderizado de las líneas guardadas
    setTimeout(() => {
        window.renderListaMedidas();
    }, 100);
};

// 4. FUNCIONES DE MEDICIÓN (ELIMINAR Y AÑADIR)
window.renderListaMedidas = function() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(!cont) return;
    
    if(!trabajoActual.lineas || trabajoActual.lineas.length === 0) {
        cont.innerHTML = "<p class='text-center text-slate-400 py-10 text-xs'>Sin datos. Pulsa los botones para añadir.</p>";
        return;
    }

    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="bg-white p-3 rounded-xl border mb-2 shadow-sm border-l-4 border-l-blue-400">
            <div class="flex justify-between items-start">
                <div class="text-xs">
                    <span class="font-black text-slate-700 uppercase">${l.icono} ${l.nombre}</span>
                    ${l.descripcion ? `<div class="text-[10px] text-blue-500 italic font-medium">${l.descripcion}</div>` : ''}
                    <div class="mt-1 text-slate-500 font-bold">${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black text-blue-600 text-sm">${(l.cantidad * l.precio).toFixed(2)}€</span>
                    <button onclick="window.quitarLinea(${i})" class="text-red-500 bg-red-50 w-9 h-9 rounded-full flex items-center justify-center border border-red-100 shadow-sm active:bg-red-200">✕</button>
                </div>
            </div>
        </div>`).join('');
};

window.quitarLinea = function(i) {
    // Eliminamos la línea del array
    trabajoActual.lineas.splice(i, 1);
    // Volvemos a pintar la lista inmediatamente
    window.renderListaMedidas();
    // Si estuviéramos en la vista económica, también se actualizaría
    window.renderPresupuesto();
};

window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    const desc = prompt(`Descripción para ${conf.n}:`, "");
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    
    let cantidad = 0;
    if(conf.esM2) {
        const largoStr = prompt("Largo (puedes sumar 4+3.5...):", "0") || "0";
        const largo = largoStr.split('+').reduce((a, b) => a + Number(b), 0);
        const alto = parseFloat(prompt("Alto:", "0")) || 0;
        cantidad = largo * alto;
    } else {
        cantidad = parseFloat(prompt(`Cantidad de ${conf.n}:`, "0")) || 0;
    }

    if(cantidad > 0) {
        trabajoActual.lineas.push({ 
            tipo, cantidad, precio, icono: conf.i, nombre: conf.n, descripcion: desc || ""
        });
        window.renderListaMedidas();
    }
};

// 5. GUARDADO Y PERSISTENCIA
window.guardarTodo = function() {
    if(!clienteActual) return;
    
    if(editandoIndex !== null) {
        // Sobreescribimos la versión anterior
        clienteActual.presupuestos[editandoIndex] = JSON.parse(JSON.stringify(trabajoActual));
    } else {
        // Añadimos uno nuevo
        clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual)));
    }
    
    window.save();
    window.irAPantalla('expediente');
};

window.save = function() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    window.renderListaClientes();
};

// 6. RENDER ECONÓMICO
window.renderPresupuesto = function() {
    let subtotal = 0;
    trabajoActual.lineas.forEach(l => subtotal += (l.cantidad * l.precio));
    const totalFinal = subtotal * 1.21;
    
    const cont = document.getElementById('desglose-precios');
    if(cont) {
        cont.innerHTML = `
            <div class="text-[10px] font-bold text-slate-400 mb-2 uppercase italic">${trabajoActual.lugar}</div>
            ${trabajoActual.lineas.map(l => `
                <div class="border-b py-2">
                    <div class="flex justify-between text-xs font-bold">
                        <span>${l.icono} ${l.nombre}</span>
                        <span>${(l.cantidad*l.precio).toFixed(2)}€</span>
                    </div>
                    ${l.descripcion ? `<div class="text-[9px] text-slate-500 italic">${l.descripcion}</div>` : ''}
                </div>
            `).join('')}
        `;
    }
    const txtTotal = document.getElementById('total-final');
    if(txtTotal) txtTotal.innerText = totalFinal.toFixed(2) + "€";
    trabajoActual.total = totalFinal;
};

// 7. CLIENTES Y OTROS
window.nuevoCliente = function() {
    const n = prompt("Nombre del Cliente:");
    if(!n) return;
    db.clientes.push({
        id: Date.now(), nombre: n, fiscal: prompt("CIF/DNI:") || "", direccion: prompt("Dirección:") || "", ciudad: prompt("Ciudad:") || "", presupuestos: []
    });
    window.save();
};

window.renderListaClientes = function() {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center active:scale-95 transition-transform">
            <div>
                <div class="font-black text-slate-800 text-lg">${c.nombre}</div>
                <div class="text-[10px] text-slate-400 font-bold">${c.ciudad}</div>
            </div>
            <button onclick="window.borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 p-3 rounded-xl border border-red-100">🗑️</button>
        </div>
    `).join('');
};

window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    if(!clienteActual) return;
    document.getElementById('titulo-cliente').innerHTML = `
        <div class="text-blue-600 font-black text-2xl uppercase tracking-tighter">Presupuesto</div>
        <div class="text-slate-800 font-bold text-sm mt-1 uppercase">${clienteActual.nombre}</div>
        <div class="text-[10px] text-slate-500 font-normal">${clienteActual.fiscal} | ${clienteActual.direccion}</div>
    `;
    window.renderHistorial(); 
    window.irAPantalla('expediente'); 
};

window.renderHistorial = function() { 
    const archivo = document.getElementById('archivo-presupuestos');
    if(!archivo) return;
    archivo.innerHTML = (clienteActual.presupuestos || []).map((p, index) => `
        <div class="bg-white p-4 rounded-2xl border mb-3 shadow-sm border-l-4 border-l-blue-500">
            <div class="flex justify-between items-start">
                <div>
                    <div class="text-[9px] font-black text-slate-400">${p.fecha}</div>
                    <div class="font-bold text-slate-800 text-sm uppercase">${p.lugar}</div>
                </div>
                <div class="font-black text-blue-600 text-sm">${parseFloat(p.total).toFixed(2)}€</div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3">
                <button onclick="window.compartirWhatsApp(${index})" class="bg-green-500 text-white text-[10px] font-bold py-2 rounded-lg">WhatsApp</button>
                <button onclick="window.modificarPresupuesto(${index})" class="bg-amber-500 text-white text-[10px] font-bold py-2 rounded-lg">✏️ EDITAR</button>
                <button onclick="window.enviarEmail(${index})" class="bg-blue-500 text-white text-[10px] font-bold py-2 rounded-lg">Email</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-50 text-red-500 py-2 rounded-lg font-bold">Borrar</button>
            </div>
        </div>`).reverse().join(''); 
};

window.borrarCliente = function(id, e) { e.stopPropagation(); if(confirm("¿Borrar cliente?")) { db.clientes = db.clientes.filter(c => c.id !== id); window.save(); } };
window.borrarPresupuesto = function(i) { if(confirm("¿Borrar obra?")) { clienteActual.presupuestos.splice(i, 1); window.save(); window.renderHistorial(); } };
window.onload = () => { window.renderListaClientes(); };

window.compartirWhatsApp = function(index) {
    const p = clienteActual.presupuestos[index];
    let msg = `*PRESUPUESTO: ${p.lugar.toUpperCase()}*\nCliente: ${clienteActual.nombre}\n\n`;
    p.lineas.forEach(l => msg += `${l.icono} *${l.nombre}*\n${l.descripcion ? '_'+l.descripcion+'_\n' : ''}${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€ = *${(l.cantidad*l.precio).toFixed(2)}€*\n\n`);
    msg += `*TOTAL: ${parseFloat(p.total).toFixed(2)}€*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

window.iniciarNuevaMedicion = function() {
    const lugar = prompt("Nombre de la obra:");
    if (!lugar) return;
    editandoIndex = null;
    trabajoActual = { lugar: lugar, fecha: new Date().toLocaleDateString(), lineas: [], iva: 21, total: 0 };
    document.getElementById('num-presu-header').innerText = trabajoActual.lugar.toUpperCase();
    window.irAPantalla('trabajo');
    window.cambiarVista('tecnico');
};


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
            <span class="text-blue-500 font-bold text-xl">→</span>
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
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'economico') window.renderPresupuesto();
};

window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre; 
    window.renderHistorial(); 
    window.irAPantalla('expediente'); 
};

// --- FUNCIÓN PARA BORRAR PRESUPUESTO ---
window.borrarPresupuesto = function(index) {
    if(confirm("¿Estás seguro de borrar este presupuesto? No se puede recuperar.")) {
        clienteActual.presupuestos.splice(index, 1);
        window.save();
        window.renderHistorial();
    }
};

// --- FUNCIÓN PARA ENVIAR POR WHATSAPP ---
window.compartirWhatsApp = function(index) {
    const p = clienteActual.presupuestos[index];
    let msg = `*PRESUPUESTO: ${p.lugar}*\n`;
    msg += `Cliente: ${clienteActual.nombre}\n`;
    msg += `Fecha: ${p.fecha}\n`;
    msg += `--------------------------\n`;
    p.lineas.forEach(l => {
        msg += `${l.icono} ${l.nombre}: ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€ = *${(l.cantidad*l.precio).toFixed(2)}€*\n`;
    });
    msg += `--------------------------\n`;
    msg += `*TOTAL FINAL: ${parseFloat(p.total).toFixed(2)}€*\n\n`;
    msg += `_Por favor, responda con un "ACEPTO" para confirmar el trabajo._`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
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
            <div class="mt-2 pt-2 border-t border-dashed text-[9px] text-slate-500 mb-3 italic">
                ${p.lineas.map(l => `<span>${l.icono} ${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} ${l.nombre}</span>`).join(' | ')}
            </div>
            <div class="flex gap-2">
                <button onclick="window.compartirWhatsApp(${index})" class="flex-1 bg-green-500 text-white text-[10px] font-bold py-2 rounded-lg uppercase">Enviar WhatsApp</button>
                <button onclick="window.borrarPresupuesto(${index})" class="bg-red-100 text-red-500 px-3 rounded-lg">🗑️</button>
            </div>
        </div>`).reverse().join(''); 
};

window.iniciarNuevaMedicion = function() {
    const lugar = prompt("¿Dónde es la obra?", "");
    if (!lugar) return;
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
        const sumaLargo = largoInput.split('+').reduce((a, b) => a + Number(b || 0), 0);
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
    cont.innerHTML = trabajoActual.lineas.map(l => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 text-sm">
            <span>${l.icono} <b>${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni}</b> ${l.nombre}</span>
            <span class="font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span>
        </div>
    `).join('');
};

window.renderPresupuesto = function() {
    let subtotal = 0;
    let h = `<div class="border-b pb-2 mb-4">
                <div class="flex justify-between text-[9px] font-black text-slate-400"><span>FECHA: ${trabajoActual.fecha}</span></div>
                <h3 class="font-black text-slate-800 text-sm uppercase">${trabajoActual.lugar}</h3>
             </div>`;

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

    h += `<div class="mt-4 pt-2 border-t-2 space-y-1 text-xs">
            <div class="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}€</span></div>
            <div class="flex justify-between font-bold text-blue-600"><span>TOTAL:</span><span>${totalFinal.toFixed(2)}€</span></div>
          </div>`;

    document.getElementById('desglose-precios').innerHTML = h;
    document.getElementById('total-final').innerText = totalFinal.toFixed(2) + "€";
    trabajoActual.total = totalFinal;
};

window.guardarTodo = function() {
    clienteActual.presupuestos.push({...trabajoActual});
    window.save();
    window.irAPantalla('expediente');
};

window.onload = () => { window.renderListaClientes(); };

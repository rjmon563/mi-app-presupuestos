// 1. CONFIGURACIÓN DE RENDIMIENTOS Y UNIDADES
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²', esM2: true },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²', esM2: true },
    'cajones': { n: 'Cajones', i: '📦', uni: 'ml', esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'ml', esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml', esM2: false },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', esM2: false }
};

// 2. BASE DE DATOS
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], estado: 'Pendiente', iva: 21, total: 0, numero: "" };

// 3. FUNCIONES DE GUARDADO
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

// 4. CLIENTES
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
            <span class="text-blue-500">→</span>
        </div>
    `).join('');
    window.actualizarDash();
};

// 5. NAVEGACIÓN
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

// 6. MEDICIONES (👷 TÉCNICO)
window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre; 
    window.renderHistorial(); 
    window.irAPantalla('expediente'); 
};

window.renderHistorial = function() { 
    const archivo = document.getElementById('archivo-presupuestos');
    if(!archivo) return;
    archivo.innerHTML = clienteActual.presupuestos.map(p => `
        <div class="bg-white p-3 rounded-xl border mb-2 flex justify-between italic text-xs">
            <span class="font-bold">${p.numero}</span>
            <span class="font-black text-blue-600">${parseFloat(p.total).toFixed(2)}€</span>
        </div>`).join(''); 
};

window.iniciarNuevaMedicion = function() {
    const ahora = new Date();
    const ID_OBRA = ahora.getDate() + "/" + (ahora.getMonth()+1) + "-" + ahora.getHours() + ":" + ahora.getMinutes();
    trabajoActual = { numero: "OBRA-" + ID_OBRA, lineas: [], estado: 'Pendiente', iva: 21, total: 0 };
    document.getElementById('num-presu-header').innerText = trabajoActual.numero;
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    window.cambiarVista('tecnico');
    window.irAPantalla('trabajo');
};

window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    let cantidad = 0;
    const pInput = prompt(`Precio para ${conf.n}:`, "0");
    if(pInput === null) return;
    const precio = parseFloat(pInput) || 0;
    
    if(conf.esM2) {
        const largoInput = prompt(`${conf.n}: Introduce LARGO (puedes sumar 5+2+3):`, "0");
        const altoInput = prompt("Introduce ALTO o ANCHO:", "0");
        const sumaLargo = largoInput.split('+').reduce((a, b) => a + Number(b || 0), 0);
        cantidad = sumaLargo * (parseFloat(altoInput) || 0);
    } else {
        const cantInput = prompt(`Cantidad total de ${conf.n} (${conf.uni}):`, "0");
        cantidad = parseFloat(cantInput) || 0;
    }

    if(cantidad > 0) {
        trabajoActual.lineas.push({ tipo, cantidad, precio, icono: conf.i, nombre: conf.n });
        window.renderListaMedidas();
    }
};

window.renderListaMedidas = function() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 shadow-sm text-sm">
            <span>${l.icono} <b>${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni}</b> ${l.nombre}</span>
            <span class="font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span>
        </div>
    `).join('');
};

// 7. DESGLOSE ECONÓMICO (💰 DINERO)
window.renderPresupuesto = function() {
    let subtotal = 0;
    const fecha = new Date().toLocaleDateString();
    let h = `
        <div class="border-b pb-2 mb-4">
            <div class="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                <span>FECHA: ${fecha}</span>
                <span>ID: ${trabajoActual.numero}</span>
            </div>
            <h3 class="font-black text-slate-800 text-sm">DESGLOSE PARA CLIENTE</h3>
        </div>
    `;

    trabajoActual.lineas.forEach(l => {
        const totalL = l.cantidad * l.precio;
        subtotal += totalL;
        h += `
            <div class="flex justify-between items-center mb-2 text-xs border-b border-slate-50 pb-2">
                <span>${l.icono} <b>${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni}</b> ${l.nombre}</span>
                <span class="font-bold">${totalL.toFixed(2)}€</span>
            </div>`;
    });

    const ivaPct = parseFloat(document.getElementById('select-iva')?.value || 21);
    const ant = parseFloat(document.getElementById('input-anticipo')?.value || 0);
    const cuotaIva = subtotal * (ivaPct / 100);
    const totalFinal = subtotal + cuotaIva - ant;

    h += `
        <div class="mt-4 pt-2 border-t-2 space-y-1">
            <div class="flex justify-between text-xs text-slate-500"><span>Subtotal:</span><span>${subtotal.toFixed(2)}€</span></div>
            <div class="flex justify-between text-xs text-slate-500"><span>IVA (${ivaPct}%):</span><span>${cuotaIva.toFixed(2)}€</span></div>
            ${ant > 0 ? `<div class="flex justify-between text-xs text-green-600 font-bold"><span>Anticipo:</span><span>-${ant.toFixed(2)}€</span></div>` : ''}
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

const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', fPlaca: 1.05, fPerfil: 2.1, fPasta: 0.5, esM2: true },
    'techos': { n: 'Techos', i: '🏠', fPlaca: 1.05, fPerfil: 3.2, fPasta: 0.6, esM2: true },
    'cajones': { n: 'Cajones', i: '📦', fPlaca: 0.2, fPerfil: 1.5, fPasta: 0.1, esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', fPlaca: 0.1, fPerfil: 1.0, fPasta: 0.1, esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', fPlaca: 0, fPerfil: 0, fPasta: 0.05, esM2: false },
    'horas': { n: 'Horas de Trabajo', i: '⏱️', fPlaca: 0, fPerfil: 0, fPasta: 0, esM2: false }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], estado: 'Pendiente', iva: 21, descuento: 0, anticipo: 0, observaciones: "", tipoMaterial: 'con' };

function irAPantalla(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
}

function cambiarVista(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    if(document.getElementById(`tab-${v}`)) document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'materiales') renderCalculadora();
    if(v === 'economico') renderPresupuesto();
}

function abrirPrompt(tipo) {
    const conf = CONFIG[tipo];
    let cantidad = 0;
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    if(conf.esM2) {
        const largoInput = prompt(`${conf.n}: Introduce largo (ej: 15+12+15):`, "0");
        const ancho = parseFloat(prompt("Introduce Alto o Ancho:", "0")) || 0;
        const sumaLargo = largoInput.split('+').reduce((a, b) => a + Number(b || 0), 0);
        cantidad = sumaLargo * ancho;
    } else {
        cantidad = parseFloat(prompt(`Cantidad de ${conf.n}:`, "0")) || 0;
    }
    if(cantidad > 0) {
        trabajoActual.lineas.push({ tipo, cantidad, precio, icono: conf.i });
        renderListaMedidas();
    }
}

function renderListaMedidas() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(trabajoActual.lineas.length === 0) {
        cont.innerHTML = `<p class="text-center text-slate-400 text-xs py-4">Sin elementos añadidos</p>`;
        return;
    }
    cont.innerHTML = trabajoActual.lineas.map((l, idx) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 shadow-sm text-sm">
            <div class="flex items-center">
                <span class="mr-3 text-lg">${l.icono}</span>
                <div>
                    <div class="font-bold text-slate-700">${CONFIG[l.tipo].n}</div>
                    <div class="text-[10px] text-slate-500">${l.cantidad.toFixed(2)} unidades/m²</div>
                </div>
            </div>
            <div class="text-right font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</div>
        </div>
    `).join('');
}

function renderPresupuesto() {
    let h = `<h3 class="font-black text-slate-800 border-b pb-2 uppercase text-[10px] mb-3">📄 Desglose del Trabajo</h3>`;
    let subtotal = 0;

    trabajoActual.lineas.forEach(l => {
        let totalLinea = l.cantidad * l.precio;
        subtotal += totalLinea;
        h += `
            <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-500">${l.icono} ${CONFIG[l.tipo].n}:</span>
                <span class="font-medium text-slate-700">${totalLinea.toFixed(2)}€</span>
            </div>
        `;
    });

    const ivaPct = parseFloat(document.getElementById('select-iva')?.value) || 21;
    const descPct = parseFloat(document.getElementById('input-descuento')?.value) || 0;
    const anticipo = parseFloat(document.getElementById('input-anticipo')?.value) || 0;
    
    const descuento = subtotal * (descPct / 100);
    const baseImponible = subtotal - descuento;
    const cuotaIva = baseImponible * (ivaPct / 100);
    const totalConIva = baseImponible + cuotaIva;
    const totalFinal = totalConIva - anticipo;

    h += `
        <div class="border-t mt-3 pt-3 space-y-1 text-sm">
            <div class="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}€</span></div>
            ${descuento > 0 ? `<div class="flex justify-between text-red-500"><span>Dto (${descPct}%):</span><span>-${descuento.toFixed(2)}€</span></div>` : ''}
            <div class="flex justify-between font-bold"><span>Base Impon.:</span><span>${baseImponible.toFixed(2)}€</span></div>
            <div class="flex justify-between text-slate-500"><span>IVA (${ivaPct}%):</span><span>${cuotaIva.toFixed(2)}€</span></div>
            <div class="flex justify-between font-black text-blue-600 border-t pt-1"><span>TOTAL:</span><span>${totalConIva.toFixed(2)}€</span></div>
            ${anticipo > 0 ? `<div class="flex justify-between text-green-600 italic"><span>Anticipo:</span><span>-${anticipo.toFixed(2)}€</span></div>` : ''}
        </div>
    `;
    
    document.getElementById('desglose-precios').innerHTML = h;
    document.getElementById('total-final').innerText = totalFinal.toFixed(2) + "€";
    trabajoActual.total = totalFinal;
}

function renderCalculadora() {
    const modo = document.getElementById('selector-modo-material').value;
    const cont = document.getElementById('contenedor-pedido');
    
    if (modo === 'sin') {
        cont.innerHTML = `<p class="text-center text-slate-400 py-4 italic">Presupuesto solo de mano de obra (Sin materiales).</p>`;
        return;
    }

    const tipoPlaca = document.getElementById('tipo-placa').value;
    const tipoPasta = document.getElementById('tipo-pasta').value;

    const mats = { 
        [tipoPlaca]: 0, 
        [tipoPasta]: 0, 
        'Perfiles (Metros)': 0,
        'Cinta de juntas (m)': 0,
        'Cinta cantonera (m)': 0
    };

    trabajoActual.lineas.forEach(l => {
        const c = CONFIG[l.tipo];
        mats[tipoPlaca] += (l.cantidad * c.fPlaca) / 2.88;
        mats[tipoPasta] += (l.cantidad * c.fPasta) / 20;
        mats['Perfiles (Metros)'] += (l.cantidad * c.fPerfil);
        mats['Cinta de juntas (m)'] += (l.cantidad * 1.5);
        if(l.tipo === 'cantoneras') mats['Cinta cantonera (m)'] += l.cantidad;
    });

    let h = "";
    for(let [m, v] of Object.entries(mats)) {
        if(v > 0) {
            let unidad = m.includes('Metros') || m.includes('(m)') ? 'm' : 'uds';
            h += `<div class="flex justify-between border-b border-slate-700 py-3">
                    <span class="text-slate-300 font-medium">${m}</span>
                    <span class="font-black text-blue-400 text-lg">${Math.ceil(v)} <small class="text-[10px] text-slate-500">${unidad}</small></span>
                  </div>`;
        }
    }
    cont.innerHTML = h || "Añade mediciones primero";
}

// ... Resto de funciones (renderListaClientes, nuevoCliente, guardarTodo, etc.) iguales que antes
function renderListaClientes() {
    const filtro = document.getElementById('buscador').value.toLowerCase();
    const lista = db.clientes.filter(c => c.nombre.toLowerCase().includes(filtro));
    document.getElementById('lista-clientes').innerHTML = lista.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center">
            <div><div class="font-black text-slate-800">${c.nombre}</div><div class="text-[10px] text-slate-400 uppercase font-bold">${c.presupuestos.length} Trabajos</div></div>
            <span class="text-blue-500">→</span>
        </div>
    `).join('');
    actualizarDash();
}
function nuevoCliente() { const n = prompt("Nombre del cliente:"); if(n) { db.clientes.push({id: Date.now(), nombre: n, presupuestos: []}); save(); } }
function abrirExpediente(id) { clienteActual = db.clientes.find(c => c.id === id); document.getElementById('titulo-cliente').innerText = clienteActual.nombre; renderHistorial(); irAPantalla('expediente'); }
function renderHistorial() { document.getElementById('archivo-presupuestos').innerHTML = clienteActual.presupuestos.map(p => `
    <div class="bg-white p-3 rounded-xl border flex justify-between items-center mb-2 shadow-sm">
        <div><div class="text-[10px] font-bold text-blue-500 uppercase">${p.numero}</div><div class="text-xs text-slate-500">${p.fecha} - ${p.estado}</div></div>
        <div class="font-black text-slate-700">${parseFloat(p.total).toFixed(2)}€</div>
    </div>
`).join(''); }
function iniciarNuevaMedicion() { trabajoActual = { numero: `PRE-2025-${String(db.contador).padStart(3,'0')}`, lineas: [], estado: 'Pendiente', iva: 21, total: 0, fecha: new Date().toLocaleDateString() }; document.getElementById('num-presu-header').innerText = trabajoActual.numero; document.getElementById('resumen-medidas-pantalla').innerHTML = ""; cambiarVista('tecnico'); irAPantalla('trabajo'); }
function save() { localStorage.setItem('presupro_v3', JSON.stringify(db)); renderListaClientes(); }
function guardarTodo() { trabajoActual.estado = document.getElementById('select-estado')?.value || 'Pendiente'; trabajoActual.observaciones = document.getElementById('input-notas')?.value || ""; clienteActual.presupuestos.push({...trabajoActual}); db.contador++; save(); irAPantalla('expediente'); }
function actualizarDash() { let t = 0; db.clientes.forEach(c => c.presupuestos.forEach(p => t += p.total)); document.getElementById('dash-pendiente').innerText = t.toFixed(2) + "€"; }
function enviarPedidoWhatsApp() { const pedidoTxt = document.getElementById('contenedor-pedido').innerText; const mensaje = `*PEDIDO MATERIAL - ${trabajoActual.numero}*\nCliente: ${clienteActual.nombre}\n\n${pedidoTxt}`; window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`); }

window.onload = () => { renderListaClientes(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js'); };

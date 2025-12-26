// --- CONFIGURACIÓN Y BASE DE DATOS ---
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²' },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²' },
    'cajones': { n: 'Cajones', i: '📦', uni: 'm²' },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'm²' },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs' }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let trabajoActual = { lineas: [], total: 0, lugar: "", descuento: 0, anticipo: 0, firma: null };
let calcEstado = { tipo: '', campo: '', valor: '', precio: 0, datos: {} };

// --- NAVEGACIÓN ---
window.irAPantalla = function(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.cambiarVista = function(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'economico') renderPresupuesto();
};

// --- CALCULADORA MODO LÁSER (CON FUNCIÓN SUMAR +) ---
window.prepararMedida = function(tipo) {
    const p = prompt(`Precio para ${CONFIG[tipo].n}:`, "0");
    if(!p) return;
    calcEstado = { tipo: tipo, precio: parseFloat(p.replace(',','.')), valor: '', datos: {} };
    siguientePaso();
};

function siguientePaso() {
    const t = calcEstado.tipo;
    const d = calcEstado.datos;

    if (t === 'tabiques' || t === 'techos' || t === 'tabicas' || t === 'cajones') {
        if (d.largo === undefined) { 
            calcEstado.campo = 'largo'; 
            abrirCalc(`LARGO (Suma con +)`); 
        }
        else if (d.segundo_dato === undefined) { 
            let nombre_campo = (t === 'techos' || t === 'tabicas') ? 'ANCHO' : (t === 'cajones' ? 'DESARROLLO' : 'ALTURA');
            calcEstado.campo = 'segundo_dato'; 
            abrirCalc(`${nombre_campo} (Suma con +)`); 
        }
        else { finalizar(); }
    } else {
        calcEstado.campo = 'total'; 
        abrirCalc('CANTIDAD TOTAL (Suma con +)');
    }
}

window.abrirCalc = function(titulo) {
    document.getElementById('calc-titulo').innerText = titulo;
    document.getElementById('calc-display').innerText = '';
    calcEstado.valor = '';
    document.getElementById('modal-calc').classList.remove('hidden');
};

window.teclear = function(n) {
    if (n === 'DEL') calcEstado.valor = calcEstado.valor.slice(0, -1);
    else if (n === 'OK') {
        const expresion = calcEstado.valor.replace(/,/g, '.');
        const suma = expresion.split('+').reduce((a, b) => a + (parseFloat(b) || 0), 0);
        calcEstado.datos[calcEstado.campo] = suma;
        cerrarCalc();
        siguientePaso();
        return;
    } else {
        if (n === '+' && calcEstado.valor.endsWith('+')) return;
        calcEstado.valor += n;
    }
    document.getElementById('calc-display').innerText = calcEstado.valor;
};

window.cerrarCalc = function() { document.getElementById('modal-calc').classList.add('hidden'); };

function finalizar() {
    const t = calcEstado.tipo;
    const d = calcEstado.datos;
    let cant = (d.largo !== undefined && d.segundo_dato !== undefined) ? d.largo * d.segundo_dato : (d.total || 0);

    if (cant > 0) {
        trabajoActual.lineas.push({ tipo: t, cantidad: cant, precio: calcEstado.precio, icono: CONFIG[t].i, nombre: CONFIG[t].n });
        renderListaMedidas();
    }
}

// --- DESCUENTOS Y ANTICIPOS (RECUPERADO) ---
window.aplicarDescuento = function() {
    const d = prompt("Descuento (€):", trabajoActual.descuento);
    trabajoActual.descuento = parseFloat(d.replace(',','.')) || 0;
    renderPresupuesto();
};

window.aplicarAnticipo = function() {
    const a = prompt("Anticipo entregado (€):", trabajoActual.anticipo);
    trabajoActual.anticipo = parseFloat(a.replace(',','.')) || 0;
    renderPresupuesto();
};

// --- PANEL DE FIRMA ---
let canvas, ctx, dibujando = false;

window.abrirFirma = function() {
    const htmlFirma = `
        <div id="modal-firma" class="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
            <div class="bg-white w-full max-w-sm rounded-3xl p-6">
                <h3 class="font-black mb-4 uppercase text-center">Firma del Cliente</h3>
                <canvas id="canvas-firma" class="border-2 border-dashed border-slate-300 w-full h-40 bg-slate-50 rounded-xl"></canvas>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <button onclick="cerrarFirma()" class="bg-slate-100 py-3 rounded-xl font-bold">CANCELAR</button>
                    <button onclick="guardarFirma()" class="bg-blue-600 text-white py-3 rounded-xl font-bold">OK, FIRMAR</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', htmlFirma);
    canvas = document.getElementById('canvas-firma');
    ctx = canvas.getContext('2d');
    
    // Ajustar resolución del canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    canvas.ontouchstart = (e) => { dibujando = true; ctx.moveTo(e.touches[0].clientX - canvas.offsetLeft, e.touches[0].clientY - canvas.offsetTop); };
    canvas.ontouchmove = (e) => { if(dibujando) { ctx.lineTo(e.touches[0].clientX - canvas.offsetLeft, e.touches[0].clientY - canvas.offsetTop); ctx.stroke(); } e.preventDefault(); };
    canvas.ontouchend = () => { dibujando = false; };
};

window.cerrarFirma = function() { document.getElementById('modal-firma').remove(); };
window.guardarFirma = function() { 
    trabajoActual.firma = canvas.toDataURL(); 
    cerrarFirma(); 
    renderPresupuesto(); 
};

// --- RENDERIZADO Y GUARDADO ---
function renderPresupuesto() {
    let sub = trabajoActual.lineas.reduce((acc, l) => acc + (l.cantidad * l.precio), 0);
    let totalBruto = sub - trabajoActual.descuento;
    let totalConIva = totalBruto * 1.21;
    let aPagar = totalConIva - trabajoActual.anticipo;

    let html = `
        <div class="text-[10px] font-black text-blue-500 mb-2 uppercase italic">${trabajoActual.lugar}</div>
        ${trabajoActual.lineas.map(l => `<div class="flex justify-between text-xs font-black border-b py-2"><span>${l.icono} ${l.nombre}</span><span>${(l.cantidad*l.precio).toFixed(2)}€</span></div>`).join('')}
        <div class="mt-4 pt-2 border-t-2 border-slate-100">
            <div onclick="aplicarDescuento()" class="flex justify-between text-red-500 text-xs font-bold mb-1 italic"><span>(-) DESCUENTO</span><span>${trabajoActual.descuento.toFixed(2)}€</span></div>
            <div onclick="aplicarAnticipo()" class="flex justify-between text-emerald-600 text-xs font-bold italic"><span>(-) ANTICIPO</span><span>${trabajoActual.anticipo.toFixed(2)}€</span></div>
        </div>
        ${trabajoActual.firma ? `<div class="mt-4 text-center"><img src="${trabajoActual.firma}" class="h-16 mx-auto border rounded-lg bg-slate-50"><p class="text-[8px] font-bold text-slate-400 mt-1">FIRMA ACEPTADA</p></div>` : 
        `<button onclick="abrirFirma()" class="w-full mt-4 border-2 border-dashed border-blue-200 py-2 rounded-xl text-blue-400 font-bold text-xs uppercase">Añadir Firma Cliente</button>`}
    `;
    
    document.getElementById('desglose-precios').innerHTML = html;
    document.getElementById('total-final').innerText = aPagar.toFixed(2) + "€";
    trabajoActual.total = aPagar;
}

// (Funciones de gestión de clientes y guardado se mantienen igual que la V3)
window.renderListaClientes = function() {
    document.getElementById('lista-clientes').innerHTML = db.clientes.map(c => `<div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border mb-3 font-black uppercase flex justify-between"><span>${c.nombre}</span><span>➔</span></div>`).join('');
};
window.save = function() { localStorage.setItem('presupro_v3', JSON.stringify(db)); renderListaClientes(); };
window.nuevoCliente = function() { const n = prompt("Nombre:"); if(n) { db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] }); save(); } };
window.abrirExpediente = function(id) { clienteActual = db.clientes.find(c => c.id === id); renderHistorial(); irAPantalla('expediente'); };
window.renderHistorial = function() { 
    document.getElementById('titulo-cliente').innerHTML = `<div class="font-black text-blue-600 uppercase text-xl">${clienteActual.nombre}</div>`;
    document.getElementById('archivo-presupuestos').innerHTML = (clienteActual.presupuestos || []).map((p, i) => `
        <div class="bg-white p-5 rounded-3xl border mb-4 shadow-sm border-l-8 border-l-blue-500">
            <div class="flex justify-between mb-4 font-black uppercase text-sm"><span>${p.lugar}</span><span class="text-blue-600">${p.total.toFixed(2)}€</span></div>
            <button onclick="generarPDF(${i})" class="w-full bg-red-500 text-white py-2 rounded-xl text-[10px] font-black uppercase">PDF</button>
        </div>`).reverse().join('');
};
window.iniciarNuevaMedicion = function() { const l = prompt("Lugar:"); if(l) { trabajoActual = { lugar: l, lineas: [], total: 0, descuento: 0, anticipo: 0, firma: null }; irAPantalla('trabajo'); renderListaMedidas(); } };
window.guardarTodo = function() { clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual))); save(); irAPantalla('expediente'); };
window.renderListaMedidas = function() {
    document.getElementById('resumen-medidas-pantalla').innerHTML = trabajoActual.lineas.map((l, i) => `<div class="flex justify-between items-center bg-white p-4 rounded-2xl border mb-3"><div class="text-xs font-black uppercase">${l.icono} ${l.nombre}<br><span class="text-slate-400">${l.cantidad.toFixed(2)}${CONFIG[l.tipo].uni} x ${l.precio}€</span></div><span class="font-black text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span></div>`).join('');
};

window.onload = () => renderListaClientes();

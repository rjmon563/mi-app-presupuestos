// --- 1. CONFIGURACIÓN BASE (BLOQUEADA) ---
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
let trabajoActual = { lineas: [], total: 0, lugar: "", firma: null, descuento: 0, anticipo: 0 };
let calcEstado = { tipo: '', campo: '', valor: '', precio: 0, datos: {}, concepto: '' };

// --- 2. NAVEGACIÓN ---
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

// --- 3. CALCULADORA INTELIGENTE CON CONCEPTO Y FECHAS ---
window.prepararMedida = function(tipo) {
    const p = prompt(`Precio para ${CONFIG[tipo].n}:`, "0");
    if(!p) return;
    
    let conc;
    if(tipo === 'horas') {
        // Para horas pedimos días y tipo de trabajo
        conc = prompt(`¿Qué días y qué trabajo? (Ej: 20/12 al 22/12 - Administración):`, "Administración");
    } else {
        // Para metros pedimos qué se ha hecho
        conc = prompt(`¿Qué trabajo se ha hecho? (Ej: Montaje, Encintado):`, "Montaje");
    }
    
    calcEstado = { 
        tipo: tipo, 
        precio: parseFloat(p.replace(',','.')), 
        valor: '', 
        datos: {}, 
        concepto: conc || "" 
    };
    siguientePaso();
};

function siguientePaso() {
    const t = calcEstado.tipo;
    const d = calcEstado.datos;
    if (t === 'tabiques' || t === 'techos' || t === 'tabicas' || t === 'cajones') {
        if (d.largo === undefined) { 
            calcEstado.campo = 'largo'; abrirCalc(`LARGO (Suma con +)`); 
        } else if (d.segundo_dato === undefined) { 
            let txt = (t === 'techos' || t === 'tabicas') ? 'ANCHO' : (t === 'cajones' ? 'DESARROLLO' : 'ALTURA');
            calcEstado.campo = 'segundo_dato'; abrirCalc(`${txt} (Suma con +)`); 
        } else { finalizarMedicion(); }
    } else {
        calcEstado.campo = 'total'; abrirCalc('TOTAL (Suma con +)');
    }
}

window.teclear = function(n) {
    const disp = document.getElementById('calc-display');
    if (n === 'DEL') { calcEstado.valor = calcEstado.valor.slice(0, -1); }
    else if (n === 'OK') {
        const suma = calcEstado.valor.replace(/,/g, '.').split('+').reduce((a, b) => a + (parseFloat(b) || 0), 0);
        calcEstado.datos[calcEstado.campo] = suma;
        cerrarCalc(); siguientePaso(); return;
    } else {
        if (n === '+' && calcEstado.valor.endsWith('+')) return;
        calcEstado.valor += n;
    }
    disp.innerText = calcEstado.valor;
};

function finalizarMedicion() {
    const d = calcEstado.datos;
    let cant = (d.largo !== undefined && d.segundo_dato !== undefined) ? d.largo * d.segundo_dato : (d.total || 0);
    if (cant > 0) {
        trabajoActual.lineas.push({ 
            tipo: calcEstado.tipo, 
            cantidad: cant, 
            precio: calcEstado.precio, 
            icono: CONFIG[calcEstado.tipo].i, 
            nombre: `${CONFIG[calcEstado.tipo].n} (${calcEstado.concepto})`
        });
        renderListaMedidas();
    }
}

// --- 4. FIRMA Y RENDERIZADO DETALLADO ---
let canvas, ctx, dibujando = false;
window.abrirFirma = function() {
    const fHTML = `<div id="modal-firma" class="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 class="font-black mb-4 uppercase text-center text-slate-800">Firma del Cliente</h3>
            <canvas id="canvas-firma" class="border-2 border-dashed border-slate-300 w-full h-40 bg-slate-50 rounded-xl touch-none"></canvas>
            <div class="grid grid-cols-2 gap-4 mt-6">
                <button onclick="document.getElementById('modal-firma').remove()" class="bg-slate-100 py-3 rounded-xl font-bold">CANCELAR</button>
                <button onclick="guardarFirma()" class="bg-blue-600 text-white py-3 rounded-xl font-bold">GUARDAR</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', fHTML);
    canvas = document.getElementById('canvas-firma'); ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    canvas.ontouchstart = (e) => { dibujando = true; ctx.beginPath(); ctx.moveTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); };
    canvas.ontouchmove = (e) => { if(dibujando) { ctx.lineTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); ctx.stroke(); } e.preventDefault(); };
    canvas.ontouchend = () => { dibujando = false; };
};

window.guardarFirma = function() { trabajoActual.firma = canvas.toDataURL(); document.getElementById('modal-firma').remove(); renderPresupuesto(); };

window.renderPresupuesto = function() {
    let sub = trabajoActual.lineas.reduce((acc, l) => acc + (l.cantidad * l.precio), 0);
    let totalIva = (sub - trabajoActual.descuento) * 1.21;
    let final = totalIva - trabajoActual.anticipo;

    document.getElementById('desglose-precios').innerHTML = `
        <div class="text-[10px] font-black text-blue-500 mb-2 uppercase">${trabajoActual.lugar}</div>
        ${trabajoActual.lineas.map(l => `
            <div class="border-b py-2 uppercase text-[11px]">
                <div class="flex justify-between font-black">
                    <span>${l.icono} ${l.nombre}</span>
                    <span>${(l.cantidad*l.precio).toFixed(2)}€</span>
                </div>
                <div class="text-[9px] text-slate-400 font-bold">${l.cantidad.toFixed(2)} ${CONFIG[l.tipo].uni} x ${l.precio}€</div>
            </div>
        `).join('')}
        <button onclick="abrirFirma()" class="w-full mt-4 border-2 border-dashed border-blue-200 py-3 rounded-xl text-blue-500 font-bold text-[10px] uppercase">Añadir Firma Cliente</button>
        ${trabajoActual.firma ? `<img src="${trabajoActual.firma}" class="h-16 mx-auto mt-2">` : ''}`;
    document.getElementById('total-final').innerText = final.toFixed(2) + "€";
    trabajoActual.total = final;
};

// --- 5. PDF Y HISTORIAL (BLINDADO) ---
window.generarPDF = function(i) {
    const p = clienteActual.presupuestos[i];
    const el = document.createElement('div');
    el.style.padding = '40px'; el.style.fontFamily = 'Arial';
    el.innerHTML = `
        <h2 style="color:#2563eb">PRESUPUESTO: ${p.lugar}</h2>
        <p><strong>Cliente:</strong> ${clienteActual.nombre}</p><hr>
        ${p.lineas.map(l => `<p style="text-transform:uppercase; font-size:12px"><strong>${l.nombre}:</strong> ${l.cantidad.toFixed(2)} x ${l.precio}€ = ${(l.cantidad*l.precio).toFixed(2)}€</p>`).join('')}
        <hr><h3>TOTAL CON IVA: ${p.total.toFixed(2)}€</h3>
        ${p.firma ? `<p>Firma Cliente:</p><img src="${p.firma}" style="width:200px; border:1px solid #ccc">` : ''}`;
    html2pdf().from(el).save(`${p.lugar}.pdf`);
};

// --- AUXILIARES ---
window.abrirCalc = function(titulo) { document.getElementById('calc-titulo').innerText = titulo; document.getElementById('calc-display').innerText = ''; calcEstado.valor = ''; document.getElementById('modal-calc').classList.remove('hidden'); };
window.cerrarCalc = function() { document.getElementById('modal-calc').classList.add('hidden'); };
window.renderListaMedidas = function() { document.getElementById('resumen-medidas-pantalla').innerHTML = trabajoActual.lineas.map((l, i) => `<div class="flex justify-between items-center bg-white p-4 rounded-2xl border mb-3"><div><div class="text-xs font-black uppercase">${l.icono} ${l.nombre}</div><div class="text-[10px] text-slate-400">${l.cantidad.toFixed(2)} ${CONFIG[l.tipo].uni}</div></div><span class="font-black text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span><button onclick="trabajoActual.lineas.splice(${i},1);renderListaMedidas();" class="ml-2 text-red-500 text-xl font-bold">✕</button></div>`).join(''); };
window.renderListaClientes = function() { document.getElementById('lista-clientes').innerHTML = db.clientes.map(c => `<div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border mb-3 font-black uppercase flex justify-between shadow-sm"><span>${c.nombre}</span><span class="text-blue-500">➔</span></div>`).join(''); };
window.save = function() { localStorage.setItem('presupro_v3', JSON.stringify(db)); };
window.nuevoCliente = function() { const n = prompt("Nombre Cliente:"); if(n) { db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] }); save(); renderListaClientes(); } };
window.abrirExpediente = function(id) { clienteActual = db.clientes.find(c => c.id === id); irAPantalla('expediente'); renderHistorial(); };
window.iniciarNuevaMedicion = function() { const l = prompt("Lugar de la Obra:"); if(l) { trabajoActual = { lugar: l, lineas: [], total: 0, firma: null, descuento: 0, anticipo: 0 }; irAPantalla('trabajo'); renderListaMedidas(); } };
window.guardarTodo = function() { if(!clienteActual.presupuestos) clienteActual.presupuestos = []; clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual))); save(); irAPantalla('expediente'); renderHistorial(); };
window.renderHistorial = function() { 
    document.getElementById('titulo-cliente').innerHTML = `<div class="font-black text-blue-600 uppercase text-xl">${clienteActual.nombre}</div>`;
    document.getElementById('archivo-presupuestos').innerHTML = (clienteActual.presupuestos || []).map((p, i) => `
        <div class="bg-white p-5 rounded-3xl border mb-4 shadow-sm border-l-8 border-l-blue-600">
            <div class="flex justify-between mb-4 font-black uppercase text-sm"><span>${p.lugar}</span><span class="text-blue-600">${p.total.toFixed(2)}€</span></div>
            <div class="grid grid-cols-2 gap-2"><button onclick="generarPDF(${i})" class="bg-red-500 text-white py-2 rounded-xl text-[10px] font-black uppercase">PDF</button>
            <button onclick="borrarPresu(${i})" class="bg-slate-100 text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase">Borrar</button></div>
        </div>`).reverse().join('');
};
window.borrarPresu = function(i) { if(confirm('¿Seguro?')) { clienteActual.presupuestos.splice(i,1); save(); renderHistorial(); } };
window.onload = () => renderListaClientes();

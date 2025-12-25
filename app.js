// CONFIGURACIÓN DE SISTEMAS
const SISTEMAS = {
    'tabique_estandar': { nombre: 'Tabique Blanca', placa: 'Placa 13mm Blanca', factorPlaca: 1.05, factorPerfil: 2.1, factorPasta: 0.5 },
    'tabique_hidro': { nombre: 'Tabique Verde', placa: 'Placa 13mm Verde', factorPlaca: 1.05, factorPerfil: 2.1, factorPasta: 0.5 },
    'trasdosado': { nombre: 'Trasdosado', placa: 'Placa 15mm Blanca', factorPlaca: 1.05, factorPerfil: 1.8, factorPasta: 0.4 },
    'techo_continuo': { nombre: 'Techo', placa: 'Placa 13mm Blanca', factorPlaca: 1.05, factorPerfil: 3.2, factorPasta: 0.6 }
};

// BASE DE DATOS LOCAL
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], observaciones: "", total: 0 };

// --- NAVEGACIÓN ---
function irAPantalla(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    const target = document.getElementById(`pantalla-${id}`);
    if(target) target.classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
}

function cambiarVista(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    const vista = document.getElementById(`vista-${v}`);
    if(vista) vista.classList.remove('hidden');
    
    // Gestión de pestañas (tabs)
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    const tab = document.getElementById(`tab-${v}`);
    if(tab) tab.classList.add('tab-active');

    if(v === 'materiales') renderCalculadora();
    if(v === 'economico') renderPresupuesto();
}

// --- GESTIÓN DE CLIENTES ---
function nuevoCliente() {
    const n = prompt("Nombre del cliente:");
    if(!n) return;
    db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] });
    save();
}

function renderListaClientes() {
    const buscador = document.getElementById('buscador');
    const filtro = buscador ? buscador.value.toLowerCase() : "";
    const lista = db.clientes.filter(c => c.nombre.toLowerCase().includes(filtro));
    
    document.getElementById('lista-clientes').innerHTML = lista.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="card flex justify-between items-center bg-white p-4 mb-2 rounded-xl border shadow-sm">
            <span class="font-bold">${c.nombre}</span>
            <span class="text-blue-500 font-bold">VER →</span>
        </div>
    `).join('');
    actualizarDash();
}

function abrirExpediente(id) {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre;
    renderHistorial();
    irAPantalla('expediente');
}

function renderHistorial() {
    document.getElementById('archivo-presupuestos').innerHTML = clienteActual.presupuestos.map(p => `
        <div class="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
            <div>
                <div class="text-[10px] font-bold text-blue-500 uppercase">${p.numero}</div>
                <div class="text-sm text-slate-500">${p.fecha}</div>
            </div>
            <div class="font-black text-slate-700">${parseFloat(p.total).toFixed(2)}€</div>
        </div>
    `).join('');
}

// --- MEDICIÓN Y TRABAJO ---
function iniciarNuevaMedicion() {
    trabajoActual = { 
        numero: `PRE-2025-${String(db.contador).padStart(3,'0')}`, 
        lineas: [], 
        observaciones: "",
        total: 0 
    };
    document.getElementById('num-presu-header').innerText = trabajoActual.numero;
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    cambiarVista('tecnico');
    irAPantalla('trabajo');
    setTimeout(iniciarCanvas, 300); // Esperar a que el HTML cargue para el canvas
}

function agregarLinea() {
    const sis = document.getElementById('tipo-sistema').value;
    const med = document.getElementById('input-medida').value;
    const alt = parseFloat(document.getElementById('input-alto').value) || 0;
    const pre = parseFloat(document.getElementById('input-precio').value) || 0;
    
    // Suma automática de medidas compuestas (ej: 2+3+4)
    const anchoCalculado = med.split('+').reduce((a,b) => a + Number(b||0), 0);
    const m2 = anchoCalculado * alt;

    if(m2 <= 0) return alert("Introduce medidas válidas");

    trabajoActual.lineas.push({ sistema: sis, med, m2, precio: pre });
    
    const itemHtml = `
        <div class="bg-white p-2 rounded border-l-4 border-blue-500 text-xs flex justify-between mb-1 shadow-sm">
            <span>${SISTEMAS[sis].nombre} (${med}x${alt})</span>
            <span class="font-bold">${m2.toFixed(2)}m²</span>
        </div>`;
    document.getElementById('resumen-medidas-pantalla').insertAdjacentHTML('beforeend', itemHtml);
}

// --- CÁLCULOS DE MATERIALES ---
function renderCalculadora() {
    const mats = {};
    trabajoActual.lineas.forEach(l => {
        const s = SISTEMAS[l.sistema];
        const placas = Math.ceil((l.m2 * s.factorPlaca) / 2.88);
        mats[s.placa] = (mats[s.placa] || 0) + placas;
        mats['Pasta (Sacos 20kg)'] = (mats['Pasta (Sacos 20kg)'] || 0) + Math.ceil(l.m2 * s.factorPasta / 20);
        mats['Metros Perfilería'] = (mats['Metros Perfilería'] || 0) + Math.ceil(l.m2 * s.factorPerfil);
    });
    
    let h = "";
    for(let [m, c] of Object.entries(mats)) {
        h += `<div class="flex justify-between border-b border-slate-700 py-1"><span>${m}</span><span class="font-bold text-blue-400">${c}</span></div>`;
    }
    document.getElementById('contenedor-pedido').innerHTML = h || "Añada medidas primero";
}

function renderPresupuesto() {
    let sub = 0;
    document.getElementById('desglose-precios').innerHTML = trabajoActual.lineas.map(l => {
        const totalLinea = l.m2 * l.precio;
        sub += totalLinea;
        return `<div class="flex justify-between text-sm py-1 border-b">
                    <span>${SISTEMAS[l.sistema].nombre} (${l.m2.toFixed(2)}m²)</span>
                    <span class="font-bold">${totalLinea.toFixed(2)}€</span>
                </div>`;
    }).join('');
    
    trabajoActual.total = sub * 1.21;
    document.getElementById('total-final').innerText = trabajoActual.total.toFixed(2) + "€";
}

// --- FIRMA TÁCTIL (Corregida) ---
let canvas, ctx, dibujando = false;
function iniciarCanvas() {
    canvas = document.getElementById('canvasFirma');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 180;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;

    const p = (e) => { 
        const r = canvas.getBoundingClientRect(); 
        const ev = e.touches ? e.touches[0] : e;
        return { x: ev.clientX - r.left, y: ev.clientY - r.top }; 
    };

    canvas.addEventListener('touchstart', (e) => { dibujando=true; ctx.beginPath(); const pos=p(e); ctx.moveTo(pos.x, pos.y); e.preventDefault(); });
    canvas.addEventListener('touchmove', (e) => { if(!dibujando) return; const pos=p(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); e.preventDefault(); });
    window.addEventListener('touchend', () => dibujando=false);
}
function limpiarFirma() { if(ctx) ctx.clearRect(0,0,canvas.width,canvas.height); }

// --- ACCIONES FINALES ---
function enviarPedidoWhatsApp() {
    const texto = "PEDIDO MATERIAL:\n" + document.getElementById('contenedor-pedido').innerText;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
}

function save() { 
    localStorage.setItem('presupro_v3', JSON.stringify(db)); 
    renderListaClientes(); 
}

function guardarTodo() { 
    trabajoActual.fecha = new Date().toLocaleDateString();
    clienteActual.presupuestos.push({...trabajoActual}); // Copia profunda
    db.contador++; 
    save(); 
    irAPantalla('expediente'); 
}

function actualizarDash() {
    let t = 0; 
    db.clientes.forEach(c => c.presupuestos.forEach(p => t += p.total));
    const dash = document.getElementById('dash-pendiente');
    if(dash) dash.innerText = t.toFixed(2) + "€";
}

window.onload = () => {
    renderListaClientes();
    // Registrar Service Worker si existe el archivo sw.js
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
};

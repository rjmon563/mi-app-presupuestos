const SISTEMAS = {
    'tabique_estandar': { nombre: 'Tabique Blanca', placa: 'Placa 13mm Blanca', factorPlaca: 1.05, factorPerfil: 2.1, factorPasta: 0.5 },
    'tabique_hidro': { nombre: 'Tabique Verde', placa: 'Placa 13mm Verde', factorPlaca: 1.05, factorPerfil: 2.1, factorPasta: 0.5 },
    'trasdosado': { nombre: 'Trasdosado', placa: 'Placa 15mm Blanca', factorPlaca: 1.05, factorPerfil: 1.8, factorPasta: 0.4 },
    'techo_continuo': { nombre: 'Techo', placa: 'Placa 13mm Blanca', factorPlaca: 1.05, factorPerfil: 3.2, factorPasta: 0.6 }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], observaciones: "", total: 0 };

function irAPantalla(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
}

function cambiarVista(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.flex > button').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'materiales') renderCalculadora();
    if(v === 'economico') renderPresupuesto();
}

function nuevoCliente() {
    const n = prompt("Nombre del cliente:");
    if(!n) return;
    db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] });
    save();
}

function renderListaClientes() {
    const buscar = document.getElementById('buscador').value.toLowerCase();
    const lista = db.clientes.filter(c => c.nombre.toLowerCase().includes(buscar));
    document.getElementById('lista-clientes').innerHTML = lista.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="card flex justify-between items-center">
            <span class="font-bold">${c.nombre}</span>
            <span class="text-blue-500">→</span>
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
        <div class="bg-white p-3 rounded-xl border flex justify-between">
            <div><div class="text-[10px] font-bold text-blue-500">${p.numero}</div><div>${p.fecha}</div></div>
            <div class="font-black">${p.total.toFixed(2)}€</div>
        </div>
    `).join('');
}

function iniciarNuevaMedicion() {
    trabajoActual = { numero: `PRE-2025-${String(db.contador).padStart(3,'0')}`, lineas: [], observaciones: "" };
    document.getElementById('num-presu-header').innerText = trabajoActual.numero;
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    cambiarVista('tecnico');
    irAPantalla('trabajo');
    setTimeout(iniciarCanvas, 200);
}

function agregarLinea() {
    const sis = document.getElementById('tipo-sistema').value;
    const med = document.getElementById('input-medida').value;
    const alt = parseFloat(document.getElementById('input-alto').value) || 0;
    const pre = parseFloat(document.getElementById('input-precio').value) || 0;
    const m2 = med.split('+').reduce((a,b) => a + Number(b||0), 0) * alt;

    trabajoActual.lineas.push({ sistema: sis, med, m2, precio: pre });
    document.getElementById('resumen-medidas-pantalla').innerHTML += `
        <div class="bg-white p-2 rounded border text-xs flex justify-between mb-1">
            <span>${SISTEMAS[sis].nombre} (${med}x${alt})</span>
            <span class="font-bold">${m2.toFixed(2)}m²</span>
        </div>`;
}

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
    for(let [m, c] of Object.entries(mats)) h += `<div class="flex justify-between"><span>${m}</span><span class="font-bold text-white">${c}</span></div>`;
    document.getElementById('contenedor-pedido').innerHTML = h || "Sin datos";
}

function renderPresupuesto() {
    let sub = 0;
    document.getElementById('desglose-precios').innerHTML = trabajoActual.lineas.map(l => {
        sub += (l.m2 * l.precio);
        return `<div class="flex justify-between text-sm"><span>${SISTEMAS[l.sistema].nombre} (${l.m2.toFixed(2)}m²)</span><span>${(l.m2*l.precio).toFixed(2)}€</span></div>`;
    }).join('');
    trabajoActual.total = sub * 1.21;
    document.getElementById('total-final').innerText = trabajoActual.total.toFixed(2) + "€";
}

// FIRMA
let canvas, ctx, dibujando = false;
function iniciarCanvas() {
    canvas = document.getElementById('canvasFirma');
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    const p = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top }; };
    canvas.addEventListener('touchstart', (e) => { dibujando=true; ctx.beginPath(); const pos=p(e); ctx.moveTo(pos.x, pos.y); });
    canvas.addEventListener('touchmove', (e) => { if(!dibujando) return; const pos=p(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); e.preventDefault(); });
    window.addEventListener('touchend', () => dibujando=false);
}
function limpiarFirma() { ctx.clearRect(0,0,canvas.width,canvas.height); }

function enviarPedidoWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(document.getElementById('contenedor-pedido').innerText)}`);
}

function generarPDF_Oficial() {
    const c = `<h1>Presupuesto ${trabajoActual.numero}</h1><p>Cliente: ${clienteActual.nombre}</p><h3>TOTAL: ${trabajoActual.total.toFixed(2)}€</h3>`;
    html2pdf().from(c).save();
}

function save() { localStorage.setItem('presupro_v3', JSON.stringify(db)); renderListaClientes(); }
function guardarTodo() { 
    trabajoActual.fecha = new Date().toLocaleDateString();
    clienteActual.presupuestos.push(trabajoActual);
    db.contador++; save(); irAPantalla('expediente'); 
}
function actualizarDash() {
    let t = 0; db.clientes.forEach(c => c.presupuestos.forEach(p => t += p.total));
    document.getElementById('dash-pendiente').innerText = t.toFixed(2) + "€";
}
window.onload = () => renderListaClientes();

// 1. CONFIGURACIÓN DE DEPARTAMENTOS Y RENDIMIENTOS
const CONFIG = {
    'tabiques': { n: 'Tabiques', fPlaca: 1.05, fPerfil: 2.1, fPasta: 0.5, esM2: true },
    'techos': { n: 'Techos', fPlaca: 1.05, fPerfil: 3.2, fPasta: 0.6, esM2: true },
    'cajones': { n: 'Cajones', fPlaca: 0.2, fPerfil: 1.5, fPasta: 0.1, esM2: false },
    'tabicas': { n: 'Tabicas', fPlaca: 0.1, fPerfil: 1.0, fPasta: 0.1, esM2: false },
    'cantoneras': { n: 'Cantoneras', fPlaca: 0, fPerfil: 0, fPasta: 0.05, esM2: false },
    'horas': { n: 'Horas Trabajadas', fPlaca: 0, fPerfil: 0, fPasta: 0, esM2: false }
};

// 2. ESTADO GLOBAL Y BASE DE DATOS LOCAL
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], total: 0 };

// 3. NAVEGACIÓN ENTRE PANTALLAS
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
    
    // Activar pestaña visualmente
    document.querySelectorAll('#pantalla-trabajo button').forEach(b => b.classList.remove('tab-active'));
    const tab = document.getElementById(`tab-${v}`);
    if(tab) tab.classList.add('tab-active');

    if(v === 'materiales') renderCalculadora();
    if(v === 'economico') renderPresupuesto();
}

// 4. LÓGICA DE MEDICIÓN (LO QUE ACTIVAN LOS BOTONES)
function abrirPrompt(tipo) {
    const conf = CONFIG[tipo];
    let cantidad = 0;
    const precio = parseFloat(prompt(`Introduce precio para ${conf.n}:`, "0")) || 0;

    if(conf.esM2) {
        const largoStr = prompt("Largo (puedes sumar ej: 4+2.5+3):", "0");
        const alto = parseFloat(prompt("Alto / Ancho:", "0")) || 0;
        // Sumar automáticamente si el usuario pone "2+3+1.5"
        const sumaLargo = largoStr.split('+').reduce((a, b) => a + Number(b || 0), 0);
        cantidad = sumaLargo * alto;
    } else {
        cantidad = parseFloat(prompt(`Cantidad de ${conf.n} (ml o unidades):`, "0")) || 0;
    }

    if(cantidad > 0) {
        trabajoActual.lineas.push({ tipo, cantidad, precio });
        renderListaMedidas();
    }
}

function renderListaMedidas() {
    const contenedor = document.getElementById('resumen-medidas-pantalla');
    if(!contenedor) return;
    contenedor.innerHTML = trabajoActual.lineas.map((l) => `
        <div class="card-partida flex justify-between bg-white p-3 rounded-lg border-l-4 border-blue-500 mb-2 shadow-sm">
            <span class="text-sm"><b>${CONFIG[l.tipo].n}</b>: ${l.cantidad.toFixed(2)} ${CONFIG[l.tipo].esM2 ? 'm²' : 'un/ml'}</span>
            <span class="font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span>
        </div>
    `).join('');
}

// 5. CÁLCULOS DE MATERIALES Y DINERO
function renderCalculadora() {
    const mats = { 'Placas 13mm (unidades)': 0, 'Sacos Pasta 20kg': 0, 'Perfilería (metros)': 0 };
    
    trabajoActual.lineas.forEach(l => {
        const c = CONFIG[l.tipo];
        mats['Placas 13mm (unidades)'] += Math.ceil((l.cantidad * c.fPlaca) / 2.88);
        mats['Sacos Pasta 20kg'] += Math.ceil((l.cantidad * c.fPasta) / 20);
        mats['Perfilería (metros)'] += Math.ceil(l.cantidad * c.fPerfil);
    });

    let h = "";
    for(let [m, v] of Object.entries(mats)) {
        if(v > 0) h += `<div class="flex justify-between border-b border-slate-700 py-2"><span>${m}</span><span class="font-bold text-blue-400">${v}</span></div>`;
    }
    document.getElementById('contenedor-pedido').innerHTML = h || "No hay medidas registradas";
}

function renderPresupuesto() {
    let subtotal = 0;
    document.getElementById('desglose-precios').innerHTML = trabajoActual.lineas.map(l => {
        const totalLinea = l.cantidad * l.precio;
        subtotal += totalLinea;
        return `<div class="flex justify-between bg-white p-2 rounded border text-sm mb-1">
                    <span>${CONFIG[l.tipo].n}</span>
                    <b>${totalLinea.toFixed(2)}€</b>
                </div>`;
    }).join('');
    
    trabajoActual.total = subtotal * 1.21; // Aplicando IVA 21%
    document.getElementById('total-final').innerText = trabajoActual.total.toFixed(2) + "€";
}

// 6. GESTIÓN DE CLIENTES Y BASE DE DATOS
function renderListaClientes() {
    const inputBuscador = document.getElementById('buscador');
    const filtro = inputBuscador ? inputBuscador.value.toLowerCase() : "";
    const filtrados = db.clientes.filter(c => c.nombre.toLowerCase().includes(filtro));
    
    document.getElementById('lista-clientes').innerHTML = filtrados.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm mb-2 active:bg-slate-50">
            <span class="font-bold text-slate-700">${c.nombre}</span>
            <span class="text-blue-500 font-bold">VER →</span>
        </div>
    `).join('');
    actualizarDash();
}

function nuevoCliente() {
    const n = prompt("Nombre del nuevo cliente:");
    if(n) {
        db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] });
        save();
    }
}

function abrirExpediente(id) {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre;
    renderHistorial();
    irAPantalla('expediente');
}

function renderHistorial() {
    document.getElementById('archivo-presupuestos').innerHTML = clienteActual.presupuestos.map(p => `
        <div class="bg-white p-3 rounded-lg border text-sm flex justify-between mb-2 shadow-sm">
            <span><b>${p.numero}</b> - ${p.fecha}</span>
            <span class="font-black text-blue-600">${parseFloat(p.total).toFixed(2)}€</span>
        </div>
    `).join('');
}

// 7. GUARDADO Y FIRMA
function save() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    renderListaClientes();
}

function iniciarNuevaMedicion() {
    trabajoActual = { 
        numero: `PRE-2025-${String(db.contador).padStart(3, '0')}`, 
        lineas: [], 
        total: 0 
    };
    document.getElementById('num-presu-header').innerText = trabajoActual.numero;
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    cambiarVista('tecnico');
    irAPantalla('trabajo');
    setTimeout(iniciarCanvas, 300);
}

function guardarTodo() {
    if(!clienteActual) return;
    trabajoActual.fecha = new Date().toLocaleDateString();
    clienteActual.presupuestos.push({...trabajoActual});
    db.contador++;
    save();
    irAPantalla('expediente');
}

function actualizarDash() {
    let totalFacturado = 0;
    db.clientes.forEach(c => c.presupuestos.forEach(p => totalFacturado += p.total));
    const dash = document.getElementById('dash-pendiente');
    if(dash) dash.innerText = totalFacturado.toFixed(2) + "€";
}

// 8. FUNCIONES DE APOYO (CANVAS Y WHATSAPP)
let canvas, ctx, dibujando = false;
function iniciarCanvas() {
    canvas = document.getElementById('canvasFirma');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2;
    const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const ev = e.touches ? e.touches[0] : e;
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    const start = (e) => { dibujando=true; ctx.beginPath(); const p=getPos(e); ctx.moveTo(p.x, p.y); if(e.touches) e.preventDefault(); };
    const move = (e) => { if(!dibujando) return; const p=getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); if(e.touches) e.preventDefault(); };
    canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false});
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', () => dibujando=false); window.addEventListener('touchend', () => dibujando=false);
}
function limpiarFirma() { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }

function enviarPedidoWhatsApp() {
    const pedidoTxt = document.getElementById('contenedor-pedido').innerText;
    const mensaje = `*PEDIDO MATERIAL - ${trabajoActual.numero}*\nCliente: ${clienteActual.nombre}\n\n${pedidoTxt}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`);
}

// INICIO AUTOMÁTICO
window.onload = () => {
    renderListaClientes();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW error", err));
    }
};

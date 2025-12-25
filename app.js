// CONFIGURACIÓN DE DEPARTAMENTOS
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', fPlaca: 1.05, fPerfil: 2.1, fPasta: 0.5, esM2: true },
    'techos': { n: 'Techos', i: '🏠', fPlaca: 1.05, fPerfil: 3.2, fPasta: 0.6, esM2: true },
    'cajones': { n: 'Cajones', i: '📦', fPlaca: 0.2, fPerfil: 1.5, fPasta: 0.1, esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', fPlaca: 0.1, fPerfil: 1.0, fPasta: 0.1, esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', fPlaca: 0, fPerfil: 0, fPasta: 0.05, esM2: false },
    'horas': { n: 'Horas de Trabajo', i: '⏱️', fPlaca: 0, fPerfil: 0, fPasta: 0, esM2: false }
};

// BASE DE DATOS LOCAL
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], estado: 'Pendiente', iva: 21, descuento: 0, anticipo: 0, observaciones: "" };

// FUNCIONES DE NAVEGACIÓN
window.irAPantalla = function(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.cambiarVista = function(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    if(document.getElementById(`tab-${v}`)) document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'materiales') renderCalculadora();
    if(v === 'economico') renderPresupuesto();
};

// FUNCIÓN PARA AÑADIR MEDICIONES (EL BOTÓN +)
window.abrirPrompt = function(tipo) {
    const conf = CONFIG[tipo];
    let cantidad = 0;
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;
    
    if(conf.esM2) {
        const largoInput = prompt(`${conf.n}: Introduce largo (ej: 15+12+15):`, "0");
        if (largoInput === null) return;
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
};

window.renderListaMedidas = function() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(!cont) return;
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
                    <div class="text-[10px] text-slate-500">${l.cantidad.toFixed(2)} m²/uds</div>
                </div>
            </div>
            <div class="text-right font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</div>
        </div>
    `).join('');
};

window.nuevoCliente = function() {
    const n = prompt("Nombre del cliente:");
    if(n) {
        const nuevo = {id: Date.now(), nombre: n, presupuestos: []};
        db.clientes.push(nuevo);
        save();
    }
};

window.iniciarNuevaMedicion = function() {
    trabajoActual = { 
        numero: `PRE-2025-${String(db.contador).padStart(3,'0')}`, 
        lineas: [], 
        estado: 'Pendiente', 
        iva: 21, 
        total: 0, 
        fecha: new Date().toLocaleDateString() 
    };
    document.getElementById('num-presu-header').innerText = trabajoActual.numero;
    renderListaMedidas();
    cambiarVista('tecnico');
    irAPantalla('trabajo');
};

window.renderListaClientes = function() {
    const listaCont = document.getElementById('lista-clientes');
    if(!listaCont) return;
    const filtro = document.getElementById('buscador').value.toLowerCase();
    const lista = db.clientes.filter(c => c.nombre.toLowerCase().includes(filtro));
    listaCont.innerHTML = lista.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center">
            <div><div class="font-black text-slate-800">${c.nombre}</div><div class="text-[10px] text-slate-400 uppercase font-bold">${c.presupuestos.length} Trabajos</div></div>
            <span class="text-blue-500">→</span>
        </div>
    `).join('');
    actualizarDash();
};

window.abrirExpediente = function(id) {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre;
    renderHistorial();
    irAPantalla('expediente');
};

function renderHistorial() {
    document.getElementById('archivo-presupuestos').innerHTML = clienteActual.presupuestos.map(p => `
        <div class="bg-white p-3 rounded-xl border flex justify-between items-center mb-2 shadow-sm">
            <div><div class="text-[10px] font-bold text-blue-500 uppercase">${p.numero}</div><div class="text-xs text-slate-500">${p.fecha} - ${p.estado}</div></div>
            <div class="font-black text-slate-700">${parseFloat(p.total).toFixed(2)}€</div>
        </div>
    `).join('');
}

window.renderPresupuesto = function() {
    let h = `<h3 class="font-black text-slate-800 border-b pb-2 uppercase text-[10px] mb-3">📄 Desglose</h3>`;
    let subtotal = 0;
    trabajoActual.lineas.forEach(l => {
        let totalLinea = l.cantidad * l.precio;
        subtotal += totalLinea;
        h += `<div class="flex justify-between text-xs mb-1"><span>${l.icono} ${CONFIG[l.tipo].n}:</span><span>${totalLinea.toFixed(2)}€</span></div>`;
    });
    const ivaPct = parseFloat(document.getElementById('select-iva')?.value) || 21;
    const base = subtotal;
    const iva = base * (ivaPct/100);
    const total = base + iva;
    h += `<div class="border-t mt-2 pt-2 font-black">Total: ${total.toFixed(2)}€</div>`;
    document.getElementById('desglose-precios').innerHTML = h;
    document.getElementById('total-final').innerText = total.toFixed(2) + "€";
    trabajoActual.total = total;
};

window.renderCalculadora = function() {
    const cont = document.getElementById('contenedor-pedido');
    const modo = document.getElementById('selector-modo-material').value;
    if(modo === 'sin') { cont.innerHTML = "Solo mano de obra"; return; }
    
    let placas = 0;
    trabajoActual.lineas.forEach(l => placas += (l.cantidad * CONFIG[l.tipo].fPlaca) / 2.88);
    cont.innerHTML = `<div class="flex justify-between"><span>${document.getElementById('tipo-placa').value}:</span><span class="text-blue-400 font-bold">${Math.ceil(placas)} uds</span></div>`;
};

window.save = function() { localStorage.setItem('presupro_v3', JSON.stringify(db)); renderListaClientes(); };
window.guardarTodo = function() { 
    clienteActual.presupuestos.push({...trabajoActual}); 
    db.contador++; 
    save(); 
    irAPantalla('expediente'); 
};
function actualizarDash() { 
    let t = 0; 
    db.clientes.forEach(c => c.presupuestos.forEach(p => t += p.total)); 
    document.getElementById('dash-pendiente').innerText = t.toFixed(2) + "€"; 
}

window.onload = () => { 
    renderListaClientes(); 
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
};

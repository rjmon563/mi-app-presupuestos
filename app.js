// CONFIGURACIÓN CON ICONOS Y CÁLCULOS
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
let trabajoActual = { lineas: [], estado: 'Pendiente', iva: 21, descuento: 0, anticipo: 0, observaciones: "" };

// --- NAVEGACIÓN ---
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

// --- LÓGICA DE AÑADIR PARTIDAS ---
function abrirPrompt(tipo) {
    const conf = CONFIG[tipo];
    let cantidad = 0;
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;

    if(conf.esM2) {
        // Lógica de suma automática: 15+12+15
        const largoInput = prompt(`${conf.n}: Introduce largo (ej: 15+12+15):`, "0");
        const ancho = parseFloat(prompt("Introduce Alto o Ancho:", "0")) || 0;
        const sumaLargo = largoInput.split('+').reduce((a, b) => a + Number(b || 0), 0);
        cantidad = sumaLargo * ancho;
    } else {
        cantidad = parseFloat(prompt(`Cantidad de ${conf.n} (Metros o Horas):`, "0")) || 0;
    }

    if(cantidad > 0) {
        trabajoActual.lineas.push({ tipo, cantidad, precio, icono: conf.i });
        renderListaMedidas();
    }
}

function renderListaMedidas() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(trabajoActual.lineas.length === 0) {
        cont.innerHTML = `<p class="text-center text-slate-400 text-xs py-4">Sin elementos. Haz clic en "Añadir" para crear uno</p>`;
        return;
    }
    cont.innerHTML = trabajoActual.lineas.map((l, idx) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 shadow-sm">
            <div class="flex items-center">
                <span class="text-xl mr-3">${l.icono}</span>
                <div>
                    <div class="font-bold text-slate-700 text-sm">${CONFIG[l.tipo].n}</div>
                    <div class="text-[10px] text-slate-500">${l.cantidad.toFixed(2)} x ${l.precio.toFixed(2)}€</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-black text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</div>
                <button onclick="eliminarLinea(${idx})" class="text-[9px] text-red-400 font-bold uppercase">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function eliminarLinea(idx) {
    trabajoActual.lineas.splice(idx, 1);
    renderListaMedidas();
}

// --- CÁLCULOS FINALES (IVA, DESCUENTOS) ---
function renderPresupuesto() {
    let subtotal = trabajoActual.lineas.reduce((acc, l) => acc + (l.cantidad * l.precio), 0);
    
    // Capturar valores de los inputs del HTML
    const ivaPct = parseFloat(document.getElementById('select-iva')?.value) || 21;
    const descPct = parseFloat(document.getElementById('input-descuento')?.value) || 0;
    const anticipo = parseFloat(document.getElementById('input-anticipo')?.value) || 0;

    const descuento = subtotal * (descPct / 100);
    const baseImponible = subtotal - descuento;
    const cuotaIva = baseImponible * (ivaPct / 100);
    const totalConIva = baseImponible + cuotaIva;
    const totalFinal = totalConIva - anticipo;

    document.getElementById('desglose-precios').innerHTML = `
        <div class="space-y-1 text-sm text-slate-600">
            <div class="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}€</span></div>
            <div class="flex justify-between text-red-500"><span>Descuento (${descPct}%):</span><span>-${descuento.toFixed(2)}€</span></div>
            <div class="flex justify-between"><span>Base Imponible:</span><span>${baseImponible.toFixed(2)}€</span></div>
            <div class="flex justify-between"><span>IVA (${ivaPct}%):</span><span>${cuotaIva.toFixed(2)}€</span></div>
            <div class="flex justify-between font-bold text-slate-900 border-t pt-1 mt-1"><span>TOTAL:</span><span>${totalConIva.toFixed(2)}€</span></div>
            <div class="flex justify-between text-green-600 italic"><span>Anticipo:</span><span>-${anticipo.toFixed(2)}€</span></div>
        </div>
    `;
    
    trabajoActual.total = totalFinal;
    document.getElementById('total-final').innerText = totalFinal.toFixed(2) + "€";
}

// --- GESTIÓN DE CLIENTES ---
function nuevoCliente() {
    const n = prompt("Nombre del cliente:");
    if(n) { db.clientes.push({id: Date.now(), nombre: n, presupuestos: []}); save(); }
}

function renderListaClientes() {
    const filtro = document.getElementById('buscador').value.toLowerCase();
    const lista = db.clientes.filter(c => c.nombre.toLowerCase().includes(filtro));
    document.getElementById('lista-clientes').innerHTML = lista.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center">
            <div>
                <div class="font-black text-slate-800">${c.nombre}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold">${c.presupuestos.length} Trabajos realizados</div>
            </div>
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
        <div class="bg-white p-3 rounded-xl border flex justify-between items-center mb-2 shadow-sm">
            <div>
                <div class="text-[10px] font-bold text-blue-500 uppercase">${p.numero}</div>
                <div class="text-xs text-slate-500">${p.fecha} - <span class="${p.estado === 'Aprobado' ? 'text-green-500' : 'text-orange-500'}">${p.estado}</span></div>
            </div>
            <div class="font-black text-slate-700">${parseFloat(p.total).toFixed(2)}€</div>
        </div>
    `).join('');
}

function iniciarNuevaMedicion() {
    trabajoActual = { 
        numero: `PRE-2025-${String(db.contador).padStart(3,'0')}`, 
        lineas: [], 
        estado: 'Pendiente',
        iva: 21,
        total: 0,
        fecha: new Date().toLocaleDateString()
    };
    document.getElementById('num-presu-header').innerText = trabajoActual.numero;
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    cambiarVista('tecnico');
    irAPantalla('trabajo');
}

function save() { localStorage.setItem('presupro_v3', JSON.stringify(db)); renderListaClientes(); }

function guardarTodo() {
    // Capturar estados finales antes de guardar
    trabajoActual.estado = document.getElementById('select-estado')?.value || 'Pendiente';
    trabajoActual.observaciones = document.getElementById('input-notas')?.value || "";
    
    clienteActual.presupuestos.push({...trabajoActual});
    db.contador++;
    save();
    irAPantalla('expediente');
}

function actualizarDash() {
    let t = 0;
    db.clientes.forEach(c => c.presupuestos.forEach(p => t += p.total));
    document.getElementById('dash-pendiente').innerText = t.toFixed(2) + "€";
}

window.onload = () => { renderListaClientes(); };

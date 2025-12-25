// 1. CONFIGURACIÓN DE RENDIMIENTOS
const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', fPlaca: 2.10, fPerfil: 2.1, fPasta: 0.5, esM2: true },
    'techos': { n: 'Techos', i: '🏠', fPlaca: 1.05, fPerfil: 3.2, fPasta: 0.6, esM2: true },
    'cajones': { n: 'Cajones', i: '📦', fPlaca: 0.2, fPerfil: 1.5, fPasta: 0.1, esM2: false },
    'tabicas': { n: 'Tabicas', i: '📐', fPlaca: 0.1, fPerfil: 1.0, fPasta: 0.1, esM2: false },
    'cantoneras': { n: 'Cantoneras', i: '📏', fPlaca: 0, fPerfil: 0, fPasta: 0.05, esM2: false },
    'horas': { n: 'Horas de Trabajo', i: '⏱️', fPlaca: 0, fPerfil: 0, fPasta: 0, esM2: false }
};

// 2. BASE DE DATOS Y VARIABLES GLOBALES
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], estado: 'Pendiente', iva: 21, descuento: 0, anticipo: 0, observaciones: "" };

// 3. FUNCIONES DE UTILIDAD (GUARDAR Y DASHBOARD)
window.save = function() {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    window.renderListaClientes();
};

window.actualizarDash = function() {
    let t = 0;
    db.clientes.forEach(c => {
        if(c.presupuestos) {
            c.presupuestos.forEach(p => t += (parseFloat(p.total) || 0));
        }
    });
    const dash = document.getElementById('dash-pendiente');
    if(dash) dash.innerText = t.toFixed(2) + "€";
};

// 4. GESTIÓN DE CLIENTES
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
    const buscador = document.getElementById('buscador');
    const filtro = buscador ? buscador.value.toLowerCase() : "";
    const lista = db.clientes.filter(c => c.nombre.toLowerCase().includes(filtro));
    
    listaCont.innerHTML = lista.map(c => `
        <div onclick="window.abrirExpediente(${c.id})" class="bg-white p-4 rounded-2xl border mb-3 shadow-sm flex justify-between items-center">
            <div>
                <div class="font-black text-slate-800">${c.nombre}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold">${c.presupuestos ? c.presupuestos.length : 0} Trabajos</div>
            </div>
            <span class="text-blue-500">→</span>
        </div>
    `).join('');
    window.actualizarDash();
};

// 5. NAVEGACIÓN
window.irAPantalla = function(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    const pantalla = document.getElementById(`pantalla-${id}`);
    if(pantalla) pantalla.classList.remove('hidden');
    if(id === 'clientes') window.renderListaClientes();
};

window.cambiarVista = function(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    const vista = document.getElementById(`vista-${v}`);
    if(vista) vista.classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    const tab = document.getElementById(`tab-${v}`);
    if(tab) tab.classList.add('tab-active');
    
    if(v === 'materiales') window.renderCalculadora();
    if(v === 'economico') window.renderPresupuesto();
};

// 6. TRABAJOS Y MEDICIONES
window.abrirExpediente = function(id) { 
    clienteActual = db.clientes.find(c => c.id === id); 
    const titulo = document.getElementById('titulo-cliente');
    if(titulo) titulo.innerText = clienteActual.nombre; 
    window.renderHistorial(); 
    window.irAPantalla('expediente'); 
};

window.renderHistorial = function() { 
    const archivo = document.getElementById('archivo-presupuestos');
    if(!archivo) return;
    archivo.innerHTML = clienteActual.presupuestos.map(p => `
        <div class="bg-white p-3 rounded-xl border mb-2 flex justify-between">
            <span class="text-xs font-bold">${p.numero}</span>
            <span class="font-bold">${parseFloat(p.total).toFixed(2)}€</span>
        </div>`).join(''); 
};

window.iniciarNuevaMedicion = function() {
    trabajoActual = { numero: `PRE-${Date.now().toString().slice(-4)}`, lineas: [], estado: 'Pendiente', iva: 21, total: 0 };
    const header = document.getElementById('num-presu-header');
    if(header) header.innerText = trabajoActual.numero;
    const resumen = document.getElementById('resumen-medidas-pantalla');
    if(resumen) resumen.innerHTML = "";
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
        const largoInput = prompt(`${conf.n}: Introduce largo (ej: 10+5+2.5):`, "0");
        if(largoInput === null) return;
        const altoInput = prompt("Introduce Alto/Ancho:", "0");
        if(altoInput === null) return;
        const alto = parseFloat(altoInput) || 0;
        const sumaLargo = largoInput.split('+').reduce((a, b) => a + Number(b || 0), 0);
        cantidad = sumaLargo * alto;
    } else {
        const cantInput = prompt(`Cantidad de ${conf.n}:`, "0");
        if(cantInput === null) return;
        cantidad = parseFloat(cantInput) || 0;
    }

    if(cantidad > 0) {
        trabajoActual.lineas.push({ tipo, cantidad, precio, icono: conf.i });
        window.renderListaMedidas();
    }
};

window.renderListaMedidas = function() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    if(!cont) return;
    if(trabajoActual.lineas.length === 0) {
        cont.innerHTML = `<p class="text-center text-slate-400 text-xs py-4">Sin datos</p>`;
        return;
    }
    cont.innerHTML = trabajoActual.lineas.map(l => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2 shadow-sm text-sm">
            <span class="mr-2">${l.icono} ${CONFIG[l.tipo].n}</span>
            <span class="font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span>
        </div>
    `).join('');
};

// 7. ECONÓMICO Y MATERIALES
window.renderPresupuesto = function() {
    let subtotal = 0;
    let h = `<h3 class="font-black text-slate-800 border-b pb-2 uppercase text-[10px] mb-3">📄 Desglose Detallado</h3>`;
    
    trabajoActual.lineas.forEach(l => {
        let totalL = l.cantidad * l.precio;
        subtotal += totalL;
        h += `<div class="flex justify-between text-xs mb-1">
                <span class="text-slate-500">${l.icono} ${CONFIG[l.tipo].n}:</span>
                <span class="font-medium">${totalL.toFixed(2)}€</span>
              </div>`;
    });

    const ivaPct = parseFloat(document.getElementById('select-iva').value) || 0;
    const descPct = parseFloat(document.getElementById('input-descuento').value) || 0;
    const ant = parseFloat(document.getElementById('input-anticipo').value) || 0;

    const dto = subtotal * (descPct / 100);
    const base = subtotal - dto;
    const cuotaIva = base * (ivaPct / 100);
    const totalFinal = base + cuotaIva - ant;

    h += `<div class="border-t mt-3 pt-2 text-sm space-y-1">
            <div class="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}€</span></div>
            ${dto > 0 ? `<div class="flex justify-between text-red-500"><span>Dto:</span><span>-${dto.toFixed(2)}€</span></div>` : ''}
            <div class="flex justify-between font-bold"><span>Base:</span><span>${base.toFixed(2)}€</span></div>
            <div class="flex justify-between text-slate-500"><span>IVA (${ivaPct}%):</span><span>${cuotaIva.toFixed(2)}€</span></div>
            ${ant > 0 ? `<div class="flex justify-between text-green-600 italic"><span>Anticipo:</span><span>-${ant.toFixed(2)}€</span></div>` : ''}
          </div>`;

    document.getElementById('desglose-precios').innerHTML = h;
    document.getElementById('total-final').innerText = totalFinal.toFixed(2) + "€";
    trabajoActual.total = totalFinal;
};

window.renderCalculadora = function() {
    const modo = document.getElementById('selector-modo-material').value;
    const cont = document.getElementById('contenedor-pedido');
    if(!cont) return;
    
    if (modo === 'sin') {
        cont.innerHTML = `<p class="text-center py-4 italic text-slate-400">Solo Mano de Obra</p>`;
        return;
    }

    const placa = document.getElementById('tipo-placa').value;
    const pasta = document.getElementById('tipo-pasta').value;
    let m2Totales = 0;
    let mLinealesCantonera = 0;

    trabajoActual.lineas.forEach(l => {
        if(CONFIG[l.tipo].esM2) m2Totales += l.cantidad;
        if(l.tipo === 'cantoneras') mLinealesCantonera += l.cantidad;
    });

    const numPlacas = Math.ceil((m2Totales * 1.05) / 2.88);
    const sacosPasta = Math.ceil(m2Totales * 0.5 / 20);
    const perfiles = Math.ceil(m2Totales * 2.5);

    cont.innerHTML = `
        <div class="space-y-3 text-white">
            <div class="flex justify-between border-b border-slate-700 pb-2"><span>${placa}:</span><span class="text-blue-400 font-bold">${numPlacas} uds</span></div>
            <div class="flex justify-between border-b border-slate-700 pb-2"><span>${pasta}:</span><span class="text-blue-400 font-bold">${sacosPasta} sacos</span></div>
            <div class="flex justify-between border-b border-slate-700 pb-2"><span>Perfilería aprox:</span><span class="text-blue-400 font-bold">${perfiles} ml</span></div>
            <div class="flex justify-between"><span>Cinta Juntas:</span><span class="text-blue-400 font-bold">${Math.ceil(m2Totales * 1.5 / 150)} rollos</span></div>
        </div>
    `;
};

window.guardarTodo = function() {
    trabajoActual.estado = document.getElementById('select-estado').value;
    clienteActual.presupuestos.push({...trabajoActual});
    window.save();
    window.irAPantalla('expediente');
};

// 8. INICIO
window.onload = () => { 
    window.renderListaClientes(); 
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
};

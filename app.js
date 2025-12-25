const CONFIG = {
    'tabiques': { n: 'Tabiques', fPlaca: 1.05, fPerfil: 2.1, fPasta: 0.5, esM2: true },
    'techos': { n: 'Techos', fPlaca: 1.05, fPerfil: 3.2, fPasta: 0.6, esM2: true },
    'cajones': { n: 'Cajones', fPlaca: 0.2, fPerfil: 1.5, fPasta: 0.1, esM2: false },
    'tabicas': { n: 'Tabicas', fPlaca: 0.1, fPerfil: 1.0, fPasta: 0.1, esM2: false },
    'cantoneras': { n: 'Cantoneras', fPlaca: 0, fPerfil: 0, fPasta: 0.05, esM2: false },
    'horas': { n: 'Horas Trabajadas', fPlaca: 0, fPerfil: 0, fPasta: 0, esM2: false }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], total: 0 };

// Funciones de navegación
function irAPantalla(id) {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
}

function cambiarVista(v) {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.querySelectorAll('#pantalla-trabajo button').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`tab-${v}`).classList.add('tab-active');
    if(v === 'materiales') renderCalculadora();
    if(v === 'economico') renderPresupuesto();
}

// Lógica de cálculo (La que conecta con los botones)
function abrirPrompt(tipo) {
    const conf = CONFIG[tipo];
    let cantidad = 0;
    const precio = parseFloat(prompt(`Precio para ${conf.n}:`, "0")) || 0;

    if(conf.esM2) {
        const largo = prompt("Largo (ej: 4+2.5):", "0");
        const alto = parseFloat(prompt("Alto:", "0")) || 0;
        const sumaLargo = largo.split('+').reduce((a,b) => a + Number(b||0), 0);
        cantidad = sumaLargo * alto;
    } else {
        cantidad = parseFloat(prompt(`Cantidad de ${conf.n}:`, "0")) || 0;
    }

    if(cantidad > 0) {
        trabajoActual.lineas.push({ tipo, cantidad, precio });
        renderListaMedidas();
    }
}

function renderListaMedidas() {
    document.getElementById('resumen-medidas-pantalla').innerHTML = trabajoActual.lineas.map(l => `
        <div class="card-partida flex justify-between bg-white p-3 rounded-lg border-l-4 border-blue-500 mb-2 shadow-sm">
            <span class="text-sm"><b>${CONFIG[l.tipo].n}</b>: ${l.cantidad.toFixed(2)}</span>
            <span class="font-bold text-blue-600">${(l.cantidad * l.precio).toFixed(2)}€</span>
        </div>
    `).join('');
}

// ... (Resto de funciones: renderCalculadora, renderPresupuesto, guardarTodo, etc.)
// Asegúrate de incluir la función de firma y guardado que te pasé anteriormente.

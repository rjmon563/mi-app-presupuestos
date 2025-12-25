// CONFIGURACIÓN DE SISTEMAS Y FACTORES
const SISTEMAS = {
    'tabique_estandar': { nombre: 'Tabique Blanca', desc: 'Tabique de PYL 13mm blanca y estructura 48mm.', placa: 'Placa 13mm Blanca', factorPlaca: 1, factorPerfil: 2.1 },
    'tabique_hidro': { nombre: 'Tabique Verde', desc: 'Tabique de PYL 13mm verde hidrófuga y estructura 48mm.', placa: 'Placa 13mm Verde (H1)', factorPlaca: 1, factorPerfil: 2.1 },
    'trasdosado': { nombre: 'Trasdosado', desc: 'Trasdosado autoportante con placa de 15mm.', placa: 'Placa 15mm Blanca', factorPlaca: 1, factorPerfil: 1.8 },
    'techo_continuo': { nombre: 'Techo', desc: 'Techo continuo de PYL 13mm y estructura F-47.', placa: 'Placa 13mm Blanca', factorPlaca: 1, factorPerfil: 3.2 }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [], contador: 1 };
let clienteActual = null;
let trabajoActual = { lineas: [], agenda: [], firma: null, observaciones: "" };

// NAVEGACIÓN
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
    if(v === 'materiales') renderPedido();
    if(v === 'economico') renderPresupuestoEconomico();
}

// CLIENTES
function nuevoCliente() {
    const nombre = prompt("Nombre completo del cliente:");
    if(!nombre) return;
    const c = { id: Date.now(), nombre, presupuestos: [] };
    db.clientes.push(c);
    save();
}

function filtrarClientes(val) {
    const filtrados = db.clientes.filter(c => c.nombre.toLowerCase().includes(val.toLowerCase()));
    renderListaClientes(filtrados);
}

function renderListaClientes(lista = db.clientes) {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = lista.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="card flex justify-between items-center active:scale-95 transition-transform">
            <div><div class="font-bold text-slate-800">${c.nombre}</div><div class="text-[10px] text-slate-400 font-bold uppercase">${c.presupuestos.length} Trabajos</div></div>
            <div class="bg-blue-50 p-2 rounded-full text-blue-600">→</div>
        </div>
    `).join('');
    actualizarDashboard();
}

function abrirExpediente(id) {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('titulo-cliente').innerText = clienteActual.nombre;
    renderHistorial();
    irAPantalla('expediente');
}

function renderHistorial() {
    const cont = document.getElementById('archivo-presupuestos');
    cont.innerHTML = clienteActual.presupuestos.length === 0 ? '<p class="text-center py-10 text-slate-400 text-sm italic">No hay trabajos registrados.</p>' :
    clienteActual.presupuestos.map(p => `
        <div class="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm flex justify-between items-center">
            <div>
                <div class="text-[9px] font-black text-blue-500 uppercase">${p.numero}</div>
                <div class="text-sm font-bold text-slate-700">${p.fecha}</div>
            </div>
            <div class="text-right">
                <div class="font-black text-slate-800">${p.total.toFixed(2)}€</div>
                <div class="text-[9px] font-bold px-2 rounded-full inline-block ${p.estado === 'aceptado' ? 'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}">${p.estado.toUpperCase()}</div>
            </div>
        </div>
    `).join('');
}

// TRABAJO
function iniciarNuevaMedicion() {
    trabajoActual = { 
        numero: `PRE-2025-${String(db.contador).padStart(3,'0')}`,
        lineas: [], agenda: [], observaciones: "", estado: 'pendiente' 
    };
    document.getElementById('num-presu-header').innerText = trabajoActual.numero;
    document.getElementById('resumen-medidas-pantalla').innerHTML = "";
    document.getElementById('input-observaciones').value = "";
    cambiarVista('tecnico');
    irAPantalla('trabajo');
    setTimeout(iniciarCanvas, 100);
}

function agregarLinea() {
    const sistemaKey = document.getElementById('tipo-sistema').value;
    const medidas = document.getElementById('input-medida').value;
    const alto = parseFloat(document.getElementById('input-alto').value) || 0;
    const precio = parseFloat(document.getElementById('input-precio').value) || 0;
    const descManual = document.getElementById('input-descripcion').value;

    if(!medidas || alto <= 0) return alert("Pon medidas válidas");

    const sumaLong = medidas.split('+').reduce((a,b) => a + Number(b||0), 0);
    const m2 = sumaLong * alto;

    trabajoActual.lineas.push({ 
        sistema: sistemaKey, 
        descripcion: descManual || SISTEMAS[sistemaKey].desc,
        medidas, alto, m2, precio 
    });

    document.getElementById('input-medida').value = "";
    document.getElementById('input-descripcion').value = "";
    renderResumenLineas();
    actualizarTotales();
}

function renderResumenLineas() {
    const cont = document.getElementById('resumen-medidas-pantalla');
    cont.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between bg-white p-2 rounded text-xs border">
            <span>${l.medidas} x ${l.alto}m</span>
            <span class="font-bold text-blue-600">${l.m2.toFixed(2)} m²</span>
        </div>
    `).join('');
}

function agregarFilaAgenda() {
    const id = Date.now();
    trabajoActual.agenda.push({ id, fecha: new Date().toISOString().split('T')[0], horas: 8, tipo: 'normal' });
    renderAgenda();
}

function renderAgenda() {
    const cont = document.getElementById('lista-agenda');
    cont.innerHTML = trabajoActual.agenda.map(a => `
        <div class="flex gap-2 items-center bg-slate-50 p-2 rounded">
            <input type="number" value="${a.horas}" class="w-16 mb-0 p-1" oninput="actualizarHora(${a.id}, this.value)">
            <select class="text-xs mb-0 p-1" onchange="actualizarTipoHora(${a.id}, this.value)">
                <option value="normal" ${a.tipo==='normal'?'selected':''}>Normal (18€)</option>
                <option value="extra" ${a.tipo==='extra'?'selected':''}>Extra (25€)</option>
            </select>
            <button onclick="borrarHora(${a.id})" class="text-red-400">×</button>
        </div>
    `).join('');
    actualizarTotales();
}

function actualizarHora(id, val) { trabajoActual.agenda.find(a => a.id === id).horas = val; actualizarTotales(); }
function actualizarTipoHora(id, val) { trabajoActual.agenda.find(a => a.id === id).tipo = val; actualizarTotales(); }
function borrarHora(id) { trabajoActual.agenda = trabajoActual.agenda.filter(a => a.id !== id); renderAgenda(); }

function renderPresupuestoEconomico() {
    const cont = document.getElementById('desglose-precios');
    cont.innerHTML = trabajoActual.lineas.map(l => `
        <div class="border-b border-blue-100 pb-2 mb-2">
            <div class="font-bold text-slate-800 text-sm">${l.descripcion}</div>
            <div class="flex justify-between text-[11px] text-slate-500 italic">
                <span>${l.m2.toFixed(2)}m² x ${l.precio}€</span>
                <span class="text-blue-700 font-bold">${(l.m2 * l.precio).toFixed(2)}€</span>
            </div>
        </div>
    `).join('');
    actualizarTotales();
}

function renderPedido() {
    const pedido = {};
    trabajoActual.lineas.forEach(l => {
        const s = SISTEMAS[l.sistema];
        const m2 = l.m2;
        const numPlacas = Math.ceil((m2 * s.factorPlaca) / 2.88);
        pedido[s.placa] = (pedido[s.placa] || 0) + numPlacas;
        const mlPerfil = Math.ceil(m2 * s.factorPerfil);
        pedido[s.perfiles || 'Perfilería Estándar'] = (pedido[s.perfiles || 'Perfilería Estándar'] || 0) + mlPerfil;
    });
    
    let html = `<div class="text-center border-b border-green-900 pb-2 mb-4 font-black">MATERIALES ESTIMADOS</div>`;
    for(let [mat, cant] of Object.entries(pedido)) {
        html += `<div class="flex justify-between mb-1"><span>> ${mat}</span><span>${cant} uds</span></div>`;
    }
    document.getElementById('contenedor-pedido').innerHTML = html;
}

function actualizarTotales() {
    let base = 0;
    trabajoActual.lineas.forEach(l => base += (l.m2 * l.precio));
    trabajoActual.agenda.forEach(a => base += (a.horas * (a.tipo === 'extra' ? 25 : 18)));
    
    const totalConIva = base * 1.21;
    document.getElementById('total-final').innerText = totalConIva.toFixed(2) + "€";
    trabajoActual.total = totalConIva;
}

// FIRMA
let canvas, ctx, dibujando = false;
function iniciarCanvas() {
    canvas = document.getElementById('canvasFirma');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e293b';

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => { dibujando = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e) => { if(!dibujando) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
    const stop = () => { dibujando = false; };

    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move); window.addEventListener('touchend', stop);
}
function limpiarFirma() { ctx.clearRect(0,0,canvas.width,canvas.height); }

// COMUNICACIÓN
function enviarPedidoWhatsApp() {
    const pedido = document.getElementById('contenedor-pedido').innerText;
    const msg = encodeURIComponent(`*PEDIDO MATERIALES - ${clienteActual.nombre}*\n\n${pedido}\n\nEnviado desde PresuPro App`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`);
}

function generarPDF_Oficial() {
    const firmaData = canvas.toDataURL();
    const qrDiv = document.getElementById('qr-gen');
    qrDiv.innerHTML = "";
    new QRCode(qrDiv, { text: "https://presupro.app", width: 80, height: 80 });

    setTimeout(() => {
        const qrImg = qrDiv.querySelector('img').src;
        const opt = { margin: 10, filename: `${trabajoActual.numero}.pdf`, html2canvas: { scale: 3 }, jsPDF: { unit: 'mm', format: 'a4' } };
        const content = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <h1 style="color: #2563eb; margin:0">PRESUPUESTO</h1>
                        <p style="font-size: 12px; margin:0">${trabajoActual.numero}</p>
                    </div>
                    <img src="${qrImg}" style="width: 60px;">
                </div>
                <hr style="margin: 20px 0;">
                <p><strong>Cliente:</strong> ${clienteActual.nombre}</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr style="background: #f1f5f9; text-align: left;">
                        <th style="padding: 10px;">Descripción</th>
                        <th style="padding: 10px; text-align: right;">Total</th>
                    </tr>
                    ${trabajoActual.lineas.map(l => `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <strong>${l.descripcion}</strong><br>
                                <small>${l.m2.toFixed(2)}m² x ${l.precio}€</small>
                            </td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                                ${(l.m2 * l.precio).toFixed(2)}€
                            </td>
                        </tr>
                    `).join('')}
                </table>
                <div style="text-align: right; margin-top: 20px;">
                    <h2 style="color: #2563eb;">TOTAL: ${trabajoActual.total.toFixed(2)}€</h2>
                    <small>IVA 21% incluido</small>
                </div>
                <div style="margin-top: 30px; padding: 10px; background: #fff9db; font-size: 11px;">
                    <strong>OBSERVACIONES:</strong><br>${trabajoActual.observaciones || 'Sin notas.'}
                </div>
                <div style="margin-top: 40px;">
                    <p style="font-size: 10px;">Firma de conformidad:</p>
                    <img src="${firmaData}" style="width: 200px; border-bottom: 1px solid #000;">
                </div>
            </div>
        `;
        html2pdf().set(opt).from(content).save();
    }, 500);
}

// PERSISTENCIA
function save() { localStorage.setItem('presupro_v3', JSON.stringify(db)); renderListaClientes(); }
function guardarTodo() {
    trabajoActual.fecha = new Date().toLocaleDateString();
    clienteActual.presupuestos.push(trabajoActual);
    db.contador++;
    save();
    irAPantalla('expediente');
}

function exportarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Backup_PresuPro_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
}

function importarBackup(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        db = JSON.parse(e.target.result);
        save();
        location.reload();
    };
    reader.readAsText(event.target.files[0]);
}

function actualizarDashboard() {
    let pen = 0, gan = 0;
    db.clientes.forEach(c => c.presupuestos.forEach(p => {
        if(p.estado === 'pendiente') pen += p.total;
        else gan += p.total;
    }));
    document.getElementById('dash-pendiente').innerText = pen.toFixed(2) + "€";
    document.getElementById('dash-aceptado').innerText = gan.toFixed(2) + "€";
}

window.onload = () => renderListaClientes();
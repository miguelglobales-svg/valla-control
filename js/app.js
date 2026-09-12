/**
 * APP: Controlador de Interfaz de Usuario y Lógica de Navegación
 */

document.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  if (typeof loadLocalData === "function") {
    try {
      await loadLocalData();
    } catch (e) {
      console.warn("Error local:", e);
    }
  }

  if (navigator.onLine && typeof syncWithSheets === "function") {
    try {
      await syncWithSheets(false);
    } catch (e) {
      console.warn("Error sync:", e);
    }
  }

  if (typeof renderCurrentView === "function") {
    renderCurrentView();
  }
});

// Función auxiliar para mostrar un indicador visual de carga (opcional)
function mostrarCargando(activar) {
  const loader = document.getElementById("loading-spinner");
  if (loader) {
    loader.style.display = activar ? "flex" : "none";
  }
}

  // Manejador del prompt de instalación de PWA
  let deferredPrompt = null;
  const installBtn = document.getElementById("pwa-install-btn");
  const installBanner = document.getElementById("pwa-install-banner");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove("hidden");
    if (installBanner) installBanner.classList.remove("hidden");
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          installBtn.classList.add("hidden");
          if (installBanner) installBanner.classList.add("hidden");
        }
        deferredPrompt = null;
      }
    });
  }

  // Estado de navegación
  let currentView = "dashboard";
  let vallaFilter = "all";
  let contratoFilter = "all";
  let searchClientQuery = "";
  let searchVallaQuery = "";
  let searchContratoQuery = "";

  // Elementos principales de vistas
  const views = {
    dashboard: document.getElementById("view-dashboard"),
    vallas: document.getElementById("view-vallas"),
    clientes: document.getElementById("view-clientes"),
    contratos: document.getElementById("view-contratos"),
    configuracion: document.getElementById("view-configuracion")
  };

  // Botones de navegación
  const navButtons = document.querySelectorAll("[data-nav]");

  function switchView(viewName) {
    currentView = viewName;
    for (const key in views) {
      if (views[key]) {
        if (key === viewName) {
          views[key].classList.remove("hidden");
        } else {
          views[key].classList.add("hidden");
        }
      }
    }

    // Actualizar estilo activo de botones
    navButtons.forEach(btn => {
      const target = btn.getAttribute("data-nav");
      if (target === viewName) {
        btn.classList.add("bg-blue-600", "text-white");
        btn.classList.remove("text-slate-300", "hover:bg-slate-800");
      } else {
        btn.classList.remove("bg-blue-600", "text-white");
        btn.classList.add("text-slate-300", "hover:bg-slate-800");
      }
    });

    // Renderizar vista seleccionada
    renderCurrentView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      switchView(btn.getAttribute("data-nav"));
    });
  });

  // Renderizador principal
  function renderCurrentView() {
    switch (currentView) {
      case "dashboard":
        renderDashboard();
        break;
      case "vallas":
        renderVallas();
        break;
      case "clientes":
        renderClientes();
        break;
      case "contratos":
        renderContratos();
        break;
      case "configuracion":
        renderConfiguracion();
        break;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // 1. DASHBOARD
  // ==========================================
  function renderDashboard() {
    const metrics = window.store.getMetrics();

    // Actualizar métricas numéricas
    document.getElementById("metric-total-vallas").textContent = metrics.totalVallas;
    document.getElementById("metric-vallas-alquiladas").textContent = metrics.vallasAlquiladas;
    document.getElementById("metric-vallas-disponibles").textContent = metrics.vallasDisponibles;
    document.getElementById("metric-contratos-activos").textContent = metrics.contratosActivos;
    document.getElementById("metric-alertas-15").textContent = metrics.proximosAVencer;
    document.getElementById("metric-ingresos").textContent = `$${metrics.ingresosMensuales.toFixed(2)}`;

    // Barra de ocupación
    const pct = metrics.totalVallas > 0 ? Math.round((metrics.vallasAlquiladas / metrics.totalVallas) * 100) : 0;
    const bar = document.getElementById("metric-ocupacion-bar");
    if (bar) bar.style.width = `${pct}%`;
    const pctText = document.getElementById("metric-ocupacion-pct");
    if (pctText) pctText.textContent = `${pct}% de ocupación`;

    // Sección de alertas de 15 días
    const alertContainer = document.getElementById("dashboard-alerts-container");
    const alertList = document.getElementById("dashboard-alerts-list");

    if (metrics.proximosAVencer > 0) {
      alertContainer.classList.remove("hidden");
      alertList.innerHTML = metrics.contratosListAlertas.map(c => `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-3 gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <i data-lucide="clock" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-base">${escapeHtml(c.nombre_cliente)}</span>
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Vence en ${c.dias_restantes} día${c.dias_restantes === 1 ? '' : 's'}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Valla: <span class="font-medium text-slate-200">#${c.id_valla}</span> | Fin: <span class="text-amber-300 font-semibold">${c.fecha_fin}</span> | Tel: ${escapeHtml(c.telefono_cliente || "N/A")}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 self-end sm:self-center">
            ${c.telefono_cliente ? `
              <a href="https://wa.me/${cleanPhoneForWa(c.telefono_cliente)}?text=${encodeURIComponent(`Hola ${c.nombre_cliente}, le saludamos para recordarle que el contrato de alquiler de su valla publicitaria está próximo a finalizar el ${c.fecha_fin}. ¿Desea renovar el servicio?`)}" 
                 target="_blank"
                 class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                <i data-lucide="message-circle" class="w-4 h-4"></i> WhatsApp
              </a>
            ` : ''}
            <button onclick="window.appActions.editContrato('${c.id}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition">
              <i data-lucide="edit" class="w-4 h-4"></i> Renovar
            </button>
          </div>
        </div>
      `).join("");
    } else {
      alertContainer.classList.add("hidden");
    }

    // Lista reciente de vallas
    const recentVallasContainer = document.getElementById("dashboard-recent-vallas");
    const vallas = window.store.getVallas().slice(0, 4);
    if (recentVallasContainer) {
      recentVallasContainer.innerHTML = vallas.map(v => createVallaCardHtml(v, true)).join("");
    }
  }

  // ==========================================
  // 2. VALLAS
  // ==========================================
  function renderVallas() {
    let vallas = window.store.getVallas();

    // Filtros
    if (vallaFilter === "disponible") {
      vallas = vallas.filter(v => v.estado === "Disponible");
    } else if (vallaFilter === "alquilada") {
      vallas = vallas.filter(v => v.estado === "Alquilada");
    }

    // Buscador
    if (searchVallaQuery.trim()) {
      const q = searchVallaQuery.toLowerCase();
      vallas = vallas.filter(v => 
        (v.direccion && v.direccion.toLowerCase().includes(q)) ||
        (v.codigo && v.codigo.toLowerCase().includes(q)) ||
        String(v.id).includes(q)
      );
    }

    const container = document.getElementById("vallas-grid");
    if (!container) return;

    if (vallas.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700/50">
          <i data-lucide="image-off" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
          <p class="text-slate-300 font-medium">No se encontraron vallas publicitarias</p>
          <p class="text-xs text-slate-500 mt-1">Intenta cambiar los filtros o agrega una nueva valla</p>
        </div>
      `;
      return;
    }

    container.innerHTML = vallas.map(v => createVallaCardHtml(v, false)).join("");
  }

  function createVallaCardHtml(v, isCompact = false) {
    const isAlquilada = v.estado === "Alquilada";
    const area = (parseFloat(v.ancho) || 0) * (parseFloat(v.alto) || 0);

    return `
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-lg hover:border-slate-600 transition flex flex-col group">
        <!-- Foto con badge de estado -->
        <div class="relative h-48 bg-slate-900 overflow-hidden">
          <img src="${v.foto_url || './icons/icon.svg'}" 
               alt="Valla ${v.id}" 
               class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
               onerror="this.src='./icons/icon.svg'; this.className='w-full h-full object-contain p-8 opacity-40';">
          
          <div class="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/80 text-xs font-bold text-white flex items-center gap-1.5 shadow">
            <span class="w-2 h-2 rounded-full ${isAlquilada ? 'bg-indigo-400' : 'bg-emerald-400'}"></span>
            Valla #${v.id}
          </div>

          <div class="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow ${
            isAlquilada 
              ? 'bg-blue-600 text-white' 
              : 'bg-emerald-600 text-white'
          }">
            ${v.estado || "Disponible"}
          </div>

          <div class="absolute bottom-2 left-3 right-3 bg-slate-950/70 backdrop-blur-md rounded-lg px-2 py-1 text-xs text-slate-300 flex items-center justify-between">
            <span>${v.ancho}m × ${v.alto}m</span>
            <span class="font-semibold text-blue-400">${area.toFixed(1)} m²</span>
          </div>
        </div>

        <!-- Información -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-start gap-2 mb-2">
              <i data-lucide="map-pin" class="w-4 h-4 text-blue-400 shrink-0 mt-0.5"></i>
              <p class="text-sm font-medium text-slate-100 line-clamp-2">${escapeHtml(v.direccion || "Sin dirección especificada")}</p>
            </div>
            ${v.notas ? `<p class="text-xs text-slate-400 mb-3 italic line-clamp-2">"${escapeHtml(v.notas)}"</p>` : ''}
          </div>

          <!-- Acciones -->
          <div class="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2 mt-2">
            ${!isCompact ? `
              <div class="flex items-center gap-1">
                <button onclick="window.appActions.editValla(${v.id})" class="p-2 text-slate-300 hover:text-blue-400 hover:bg-slate-700/60 rounded-lg transition" title="Editar Valla">
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="window.appActions.deleteValla(${v.id})" class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition" title="Eliminar Valla">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            ` : '<div></div>'}

            ${!isAlquilada ? `
              <button onclick="window.appActions.newContratoForValla(${v.id})" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ml-auto">
                <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Alquilar
              </button>
            ` : `
              <button onclick="window.appActions.viewContratoOfValla(${v.id})" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ml-auto">
                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Ver Contrato
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 3. CLIENTES
  // ==========================================
  function renderClientes() {
    let clientes = window.store.getClientes();

    if (searchClientQuery.trim()) {
      const q = searchClientQuery.toLowerCase();
      clientes = clientes.filter(c => 
        (c.nombre && c.nombre.toLowerCase().includes(q)) ||
        (c.telefono && c.telefono.toLowerCase().includes(q))
      );
    }

    const container = document.getElementById("clientes-list");
    if (!container) return;

    if (clientes.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700/50">
          <i data-lucide="users" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
          <p class="text-slate-300 font-medium">No se encontraron clientes</p>
          <p class="text-xs text-slate-500 mt-1">Agrega clientes para comenzar a gestionar sus contratos</p>
        </div>
      `;
      return;
    }

    container.innerHTML = clientes.map(c => {
      const contratos = window.store.getContratos().filter(con => String(con.id_cliente) === String(c.id));
      const contratosActivos = contratos.filter(con => con.estado === "Activo").length;

      return `
        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-600 transition">
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-lg border border-blue-500/30">
              ${escapeHtml(c.nombre ? c.nombre.substring(0, 1).toUpperCase() : "C")}
            </div>
            <div>
              <h4 class="font-bold text-slate-100 text-base flex items-center gap-2">
                ${escapeHtml(c.nombre)}
                ${contratosActivos > 0 ? `
                  <span class="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ${contratosActivos} contrato${contratosActivos > 1 ? 's' : ''} activo${contratosActivos > 1 ? 's' : ''}
                  </span>
                ` : ''}
              </h4>
              <p class="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-500"></i> ${escapeHtml(c.telefono || "Sin teléfono")}
              </p>
              ${c.notas ? `<p class="text-xs text-slate-400 mt-2 bg-slate-900/40 p-2 rounded-lg italic">"${escapeHtml(c.notas)}"</p>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700/50 w-full sm:w-auto justify-end">
            ${c.telefono ? `
              <a href="https://wa.me/${cleanPhoneForWa(c.telefono)}" target="_blank" class="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition" title="Enviar WhatsApp">
                <i data-lucide="message-circle" class="w-4 h-4"></i>
              </a>
              <a href="tel:${c.telefono}" class="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition" title="Llamar">
                <i data-lucide="phone-call" class="w-4 h-4"></i>
              </a>
            ` : ''}
            <button onclick="window.appActions.newContratoForCliente('${c.id}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Contrato
            </button>
            <button onclick="window.appActions.editCliente('${c.id}')" class="p-2 text-slate-300 hover:text-blue-400 hover:bg-slate-700/60 rounded-lg transition" title="Editar">
              <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
            <button onclick="window.appActions.deleteCliente('${c.id}')" class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition" title="Eliminar">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // ==========================================
  // 4. CONTRATOS
  // ==========================================
  function renderContratos() {
    let contratos = window.store.getContratosAlertas();

    // Filtros
    if (contratoFilter === "activos") {
      contratos = contratos.filter(c => c.estado === "Activo");
    } else if (contratoFilter === "alertas") {
      contratos = contratos.filter(c => c.alerta === "warning" && c.estado === "Activo");
    } else if (contratoFilter === "vencidos") {
      contratos = contratos.filter(c => c.estado === "Vencido" || c.alerta === "expired");
    }

    // Buscador
    if (searchContratoQuery.trim()) {
      const q = searchContratoQuery.toLowerCase();
      contratos = contratos.filter(c => 
        (c.nombre_cliente && c.nombre_cliente.toLowerCase().includes(q)) ||
        (c.telefono_cliente && c.telefono_cliente.toLowerCase().includes(q)) ||
        String(c.id_valla).includes(q) ||
        (c.tipo_servicio && c.tipo_servicio.toLowerCase().includes(q))
      );
    }

    const container = document.getElementById("contratos-list");
    if (!container) return;

    if (contratos.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700/50">
          <i data-lucide="file-x" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
          <p class="text-slate-300 font-medium">No se encontraron contratos</p>
          <p class="text-xs text-slate-500 mt-1">Crea un contrato para asociar una valla a un cliente</p>
        </div>
      `;
      return;
    }

    container.innerHTML = contratos.map(c => {
      const isAlerta15 = c.alerta === "warning" && c.estado === "Activo";
      const isVencido = c.estado === "Vencido" || c.alerta === "expired";
      const extraTiempo = (c.tiempo_extra_meses > 0 || c.tiempo_extra_dias > 0)
        ? `${c.tiempo_extra_meses || 0} meses, ${c.tiempo_extra_dias || 0} días gratis`
        : null;

      return `
        <div class="bg-slate-800/80 border ${isAlerta15 ? 'border-amber-500/60 pulse-warning' : isVencido ? 'border-red-500/40' : 'border-slate-700/60'} rounded-2xl p-5 shadow-lg flex flex-col gap-4 hover:border-slate-600 transition">
          <!-- Cabecera del contrato -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-blue-400 font-semibold">${c.id}</span>
                <h3 class="text-base font-bold text-slate-100">${escapeHtml(c.nombre_cliente)}</h3>
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  isAlerta15 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : isVencido 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }">
                  ${isAlerta15 ? `⚠️ Vence en ${c.dias_restantes} días` : isVencido ? 'Vencido' : 'Activo'}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>Valla asignada: <strong class="text-white">#${c.id_valla}</strong></span>
                <span>Servicio: <strong class="text-blue-400">${escapeHtml(c.tipo_servicio || "Alquiler")}</strong></span>
                ${c.telefono_cliente ? `<span>Tel: <strong class="text-slate-300">${escapeHtml(c.telefono_cliente)}</strong></span>` : ''}
              </p>
            </div>

            <div class="text-left sm:text-right">
              <span class="text-xs text-slate-400">Total a Pagar:</span>
              <p class="text-xl font-extrabold text-emerald-400">$${(parseFloat(c.total) || 0).toFixed(2)}</p>
            </div>
          </div>

          <!-- Período y Tiempo Extra -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/50 p-3 rounded-xl text-xs">
            <div>
              <span class="text-slate-400 block">Fecha de Inicio:</span>
              <strong class="text-slate-200">${c.fecha_inicio || "No def."}</strong>
            </div>
            <div>
              <span class="text-slate-400 block">Fecha de Finalización:</span>
              <strong class="${isAlerta15 ? 'text-amber-400 font-bold' : 'text-slate-200'}">${c.fecha_fin || "No def."}</strong>
            </div>
            <div>
              <span class="text-slate-400 block">Tiempo Extra Gratis:</span>
              <strong class="text-emerald-400">${extraTiempo || "Sin tiempo extra"}</strong>
            </div>
          </div>

          <!-- Desglose de Impuestos de El Salvador -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center bg-slate-900/30 p-2.5 rounded-xl border border-slate-700/40 text-xs">
            <div>
              <span class="text-slate-400 block text-[11px]">Subtotal:</span>
              <span class="font-semibold text-slate-200">$${(parseFloat(c.subtotal) || 0).toFixed(2)}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">IVA (13%):</span>
              <span class="font-semibold text-blue-400">+$${(parseFloat(c.iva_13) || 0).toFixed(2)}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Subtotal c/ IVA:</span>
              <span class="font-semibold text-slate-200">$${(parseFloat(c.subtotal_iva) || 0).toFixed(2)}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Renta (10%):</span>
              <span class="font-semibold text-amber-400">$${(parseFloat(c.renta_10) || 0).toFixed(2)}</span>
            </div>
            <div class="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-1 sm:pt-0 border-slate-700">
              <span class="text-slate-400 block text-[11px]">Precio Mes × ${c.cantidad_meses}m:</span>
              <span class="font-bold text-white">$${(parseFloat(c.precio_mensual) || 0).toFixed(2)}/mes</span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/50 flex-wrap">
            <div class="flex items-center gap-2">
              ${c.telefono_cliente ? `
                <a href="https://wa.me/${cleanPhoneForWa(c.telefono_cliente)}?text=${encodeURIComponent(`Estimado/a ${c.nombre_cliente}, le compartimos el detalle de su contrato de alquiler de valla #${c.id_valla}. Total: $${(parseFloat(c.total) || 0).toFixed(2)} con vencimiento el ${c.fecha_fin}.`)}" 
                   target="_blank" 
                   class="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                  <i data-lucide="message-circle" class="w-4 h-4"></i> WhatsApp
                </a>
              ` : ''}
              <button onclick="window.appActions.printContratoReceipt('${c.id}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                <i data-lucide="printer" class="w-4 h-4"></i> Comprobante
              </button>
            </div>

            <div class="flex items-center gap-1">
              <button onclick="window.appActions.editContrato('${c.id}')" class="p-2 text-slate-300 hover:text-blue-400 hover:bg-slate-700/60 rounded-lg transition" title="Editar">
                <i data-lucide="edit" class="w-4 h-4"></i>
              </button>
              <button onclick="window.appActions.deleteContrato('${c.id}')" class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // ==========================================
  // 5. CONFIGURACIÓN
  // ==========================================
  function renderConfiguracion() {
    const inputUrl = document.getElementById("cfg-script-url");
    if (inputUrl) {
      inputUrl.value = window.store.config.scriptUrl || "";
    }

    const statusBadge = document.getElementById("cfg-connection-status");
    if (statusBadge) {
      if (window.api.hasValidUrl()) {
        statusBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Conectado a Google Sheets</span>`;
      } else {
        statusBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Modo Local (Sin sincronizar con Sheets)</span>`;
      }
    }

    const lastSyncElem = document.getElementById("cfg-last-sync");
    if (lastSyncElem) {
      lastSyncElem.textContent = window.store.config.lastSync 
        ? new Date(window.store.config.lastSync).toLocaleString() 
        : "Nunca";
    }
  }

  // ==========================================
  // FILTROS Y EVENTOS DE BÚSQUEDA
  // ==========================================
  // Vallas filtros
  const vallaFilterBtns = document.querySelectorAll("[data-valla-filter]");
  vallaFilterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      vallaFilter = btn.getAttribute("data-valla-filter");
      vallaFilterBtns.forEach(b => {
        if (b === btn) {
          b.classList.add("bg-blue-600", "text-white");
          b.classList.remove("bg-slate-800", "text-slate-300");
        } else {
          b.classList.remove("bg-blue-600", "text-white");
          b.classList.add("bg-slate-800", "text-slate-300");
        }
      });
      renderVallas();
      if (window.lucide) window.lucide.createIcons();
    });
  });

  const searchVallaInput = document.getElementById("search-valla-input");
  if (searchVallaInput) {
    searchVallaInput.addEventListener("input", (e) => {
      searchVallaQuery = e.target.value;
      renderVallas();
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // Clientes búsqueda
  const searchClientInput = document.getElementById("search-client-input");
  if (searchClientInput) {
    searchClientInput.addEventListener("input", (e) => {
      searchClientQuery = e.target.value;
      renderClientes();
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // Contratos filtros
  const contratoFilterBtns = document.querySelectorAll("[data-contrato-filter]");
  contratoFilterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      contratoFilter = btn.getAttribute("data-contrato-filter");
      contratoFilterBtns.forEach(b => {
        if (b === btn) {
          b.classList.add("bg-blue-600", "text-white");
          b.classList.remove("bg-slate-800", "text-slate-300");
        } else {
          b.classList.remove("bg-blue-600", "text-white");
          b.classList.add("bg-slate-800", "text-slate-300");
        }
      });
      renderContratos();
      if (window.lucide) window.lucide.createIcons();
    });
  });

  const searchContratoInput = document.getElementById("search-contrato-input");
  if (searchContratoInput) {
    searchContratoInput.addEventListener("input", (e) => {
      searchContratoQuery = e.target.value;
      renderContratos();
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // ==========================================
  // MODALES Y FORMULARIOS
  // ==========================================
  const modalCliente = document.getElementById("modal-cliente");
  const formCliente = document.getElementById("form-cliente");

  const modalValla = document.getElementById("modal-valla");
  const formValla = document.getElementById("form-valla");

  const modalContrato = document.getElementById("modal-contrato");
  const formContrato = document.getElementById("form-contrato");

  const modalReceipt = document.getElementById("modal-receipt");

  // Abrir y cerrar modal genérico
  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal-container");
      closeModal(modal);
    });
  });

  // --- CLIENTE FORM ---
  document.getElementById("btn-new-cliente")?.addEventListener("click", () => {
    formCliente.reset();
    document.getElementById("cliente-id").value = "";
    document.getElementById("cliente-modal-title").textContent = "Nuevo Cliente";
    openModal(modalCliente);
  });

  formCliente?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("cliente-id").value;
    const nombre = document.getElementById("cliente-nombre").value.trim();
    const telefono = document.getElementById("cliente-telefono").value.trim();
    const notas = document.getElementById("cliente-notas").value.trim();

    if (!nombre) {
      alert("Por favor ingresa el nombre del cliente");
      return;
    }

    const clienteData = {
      id: id || undefined,
      nombre,
      telefono,
      notas
    };

    await window.api.saveCliente(clienteData);
    closeModal(modalCliente);
    renderCurrentView();
    showToast("Cliente guardado correctamente");
  });

  // --- VALLA FORM ---
  document.getElementById("btn-new-valla")?.addEventListener("click", () => {
    formValla.reset();
    document.getElementById("valla-id").value = "";
    const nextId = window.store.getNextVallaId();
    document.getElementById("valla-modal-title").textContent = `Nueva Valla Publicitaria #${nextId}`;
    document.getElementById("valla-preview-img").src = "./icons/icon.svg";
    document.getElementById("valla-foto-url").value = "";
    openModal(modalValla);
  });

  // Preview de foto y carga
  const vallaFotoInput = document.getElementById("valla-foto-input");
  vallaFotoInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = document.getElementById("valla-preview-img");
      const loading = document.getElementById("valla-photo-loading");
      loading?.classList.remove("hidden");

      try {
        const uploadResult = await window.api.uploadPhotoToDrive(file);
        if (uploadResult.success) {
          preview.src = uploadResult.foto_url;
          document.getElementById("valla-foto-url").value = uploadResult.foto_url;
          if (uploadResult.fileId) {
            document.getElementById("valla-drive-id").value = uploadResult.fileId;
          }
          showToast("Fotografía procesada con éxito");
        } else {
          alert("Error al procesar fotografía: " + (uploadResult.error || ""));
        }
      } finally {
        loading?.classList.add("hidden");
      }
    }
  });

  formValla?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("valla-id").value;
    const direccion = document.getElementById("valla-direccion").value.trim();
    const ancho = parseFloat(document.getElementById("valla-ancho").value) || 0;
    const alto = parseFloat(document.getElementById("valla-alto").value) || 0;
    const foto_url = document.getElementById("valla-foto-url").value || "";
    const drive_id = document.getElementById("valla-drive-id")?.value || "";
    const notas = document.getElementById("valla-notas").value.trim();

    if (!direccion) {
      alert("Por favor ingresa la dirección de la valla");
      return;
    }

    const vallaData = {
      id: id ? parseInt(id, 10) : undefined,
      direccion,
      ancho,
      alto,
      foto_url,
      drive_id,
      notas
    };

    await window.api.saveValla(vallaData);
    closeModal(modalValla);
    renderCurrentView();
    showToast("Valla guardada correctamente");
  });

  // --- CONTRATO FORM & CÁLCULOS DINÁMICOS ---
  document.getElementById("btn-new-contrato")?.addEventListener("click", () => {
    openContratoModal();
  });

  function populateContratoSelects(selectedClienteId = "", selectedVallaId = "") {
    // Clientes
    const clienteSelect = document.getElementById("contrato-cliente-select");
    const clientes = window.store.getClientes();
    clienteSelect.innerHTML = `<option value="">-- Selecciona un Cliente --</option>` + 
      clientes.map(c => `
        <option value="${c.id}" ${String(c.id) === String(selectedClienteId) ? 'selected' : ''}>
          ${escapeHtml(c.nombre)} (${c.telefono || 'Sin tel'})
        </option>
      `).join("");

    // Vallas
    const vallaSelect = document.getElementById("contrato-valla-select");
    const vallas = window.store.getVallas();
    vallaSelect.innerHTML = `<option value="">-- Selecciona una Valla --</option>` +
      vallas.map(v => {
        const isSelected = String(v.id) === String(selectedVallaId);
        const disabled = v.estado === "Alquilada" && !isSelected;
        return `
          <option value="${v.id}" ${isSelected ? 'selected' : ''} ${disabled ? 'disabled class="text-slate-500 bg-slate-900"' : ''}>
            Valla #${v.id} - ${escapeHtml(v.direccion.substring(0, 45))}... [${v.estado}]
          </option>
        `;
      }).join("");
  }

  function openContratoModal(contratoId = null, prefillClienteId = null, prefillVallaId = null) {
    formContrato.reset();
    document.getElementById("contrato-id").value = "";

    const hoy = new Date().toISOString().split("T")[0];
    document.getElementById("contrato-fecha-inicio").value = hoy;

    if (contratoId) {
      const c = window.store.getContratoById(contratoId);
      if (c) {
        document.getElementById("contrato-id").value = c.id;
        document.getElementById("contrato-modal-title").textContent = `Editar Contrato ${c.id}`;
        populateContratoSelects(c.id_cliente, c.id_valla);
        document.getElementById("contrato-tipo-servicio").value = c.tipo_servicio || "Alquiler con publicidad";
        document.getElementById("contrato-precio-mensual").value = c.precio_mensual || "";
        document.getElementById("contrato-meses").value = c.cantidad_meses || 1;
        document.getElementById("contrato-fecha-inicio").value = c.fecha_inicio || hoy;
        document.getElementById("contrato-fecha-fin").value = c.fecha_fin || "";
        document.getElementById("contrato-extra-meses").value = c.tiempo_extra_meses || 0;
        document.getElementById("contrato-extra-dias").value = c.tiempo_extra_dias || 0;
        document.getElementById("contrato-estado").value = c.estado || "Activo";
        document.getElementById("contrato-notas").value = c.notas || "";
      }
    } else {
      document.getElementById("contrato-modal-title").textContent = "Nuevo Contrato de Alquiler";
      populateContratoSelects(prefillClienteId, prefillVallaId);
      document.getElementById("contrato-precio-mensual").value = "";
      document.getElementById("contrato-meses").value = "1";
      document.getElementById("contrato-extra-meses").value = "0";
      document.getElementById("contrato-extra-dias").value = "0";
      // Calcular fecha fin estimada sumando 1 mes
      calcularFechaFinAutomatica();
    }

    recalcularImpuestosFormulario();
    openModal(modalContrato);
  }

  // Autocalcular fecha fin cuando cambia inicio o meses
  function calcularFechaFinAutomatica() {
    const inicioStr = document.getElementById("contrato-fecha-inicio").value;
    const meses = parseInt(document.getElementById("contrato-meses").value, 10) || 1;
    if (!inicioStr) return;

    const fecha = new Date(inicioStr + "T00:00:00");
    fecha.setMonth(fecha.getMonth() + meses);
    const finStr = fecha.toISOString().split("T")[0];
    document.getElementById("contrato-fecha-fin").value = finStr;
  }

  document.getElementById("contrato-fecha-inicio")?.addEventListener("change", calcularFechaFinAutomatica);
  document.getElementById("contrato-meses")?.addEventListener("input", () => {
    calcularFechaFinAutomatica();
    recalcularImpuestosFormulario();
  });
  document.getElementById("contrato-precio-mensual")?.addEventListener("input", recalcularImpuestosFormulario);

  function recalcularImpuestosFormulario() {
    const precio = parseFloat(document.getElementById("contrato-precio-mensual").value) || 0;
    const meses = parseFloat(document.getElementById("contrato-meses").value) || 0;
    const fin = window.store.calculateContractFinancials(precio, meses);

    document.getElementById("calc-subtotal").textContent = `$${fin.subtotal.toFixed(2)}`;
    document.getElementById("calc-iva").textContent = `+$${fin.iva_13.toFixed(2)}`;
    document.getElementById("calc-subtotal-iva").textContent = `$${fin.subtotal_iva.toFixed(2)}`;
    document.getElementById("calc-renta").textContent = `-$${fin.renta_10.toFixed(2)}`;
    document.getElementById("calc-total").textContent = `$${fin.total.toFixed(2)}`;
  }

  // Guardar contrato
  formContrato?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("contrato-id").value;
    const clienteId = document.getElementById("contrato-cliente-select").value;
    const vallaId = document.getElementById("contrato-valla-select").value;
    const tipoServicio = document.getElementById("contrato-tipo-servicio").value;
    const precioMensual = parseFloat(document.getElementById("contrato-precio-mensual").value) || 0;
    const meses = parseInt(document.getElementById("contrato-meses").value, 10) || 1;
    const fechaInicio = document.getElementById("contrato-fecha-inicio").value;
    const fechaFin = document.getElementById("contrato-fecha-fin").value;
    const extraMeses = parseInt(document.getElementById("contrato-extra-meses").value, 10) || 0;
    const extraDias = parseInt(document.getElementById("contrato-extra-dias").value, 10) || 0;
    const estado = document.getElementById("contrato-estado").value;
    const notas = document.getElementById("contrato-notas").value.trim();

    if (!clienteId) {
      alert("Por favor selecciona o crea un cliente para el contrato");
      return;
    }
    if (!vallaId) {
      alert("Por favor selecciona una valla para el contrato");
      return;
    }
    if (precioMensual <= 0) {
      alert("Por favor ingresa un precio mensual válido");
      return;
    }

    const cliente = window.store.getClienteById(clienteId);

    const contratoData = {
      id: id || undefined,
      id_cliente: clienteId,
      nombre_cliente: cliente ? cliente.nombre : "",
      telefono_cliente: cliente ? cliente.telefono : "",
      id_valla: parseInt(vallaId, 10),
      tipo_servicio: tipoServicio,
      precio_mensual: precioMensual,
      cantidad_meses: meses,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      tiempo_extra_meses: extraMeses,
      tiempo_extra_dias: extraDias,
      estado,
      notas
    };

    await window.api.saveContrato(contratoData);
    closeModal(modalContrato);
    renderCurrentView();
    showToast("Contrato guardado correctamente");
  });

  // Botón rápido para crear nuevo cliente desde dentro del modal de contrato
  document.getElementById("btn-quick-new-client")?.addEventListener("click", () => {
    const nombre = prompt("Ingresa el Nombre Completo o Razón Social del nuevo cliente:");
    if (!nombre) return;
    const telefono = prompt("Ingresa el Número de Teléfono:");

    const newCli = window.store.saveCliente({
      nombre: nombre.trim(),
      telefono: (telefono || "").trim(),
      notas: "Creado desde contrato"
    });

    if (window.api.hasValidUrl()) {
      window.api.saveCliente(newCli);
    }

    populateContratoSelects(newCli.id, document.getElementById("contrato-valla-select").value);
    showToast(`Cliente "${newCli.nombre}" creado y seleccionado`);
  });

  // ==========================================
  // CONFIGURACIÓN Y SINCRONIZACIÓN
  // ==========================================
  document.getElementById("btn-save-cfg")?.addEventListener("click", () => {
    const url = document.getElementById("cfg-script-url").value.trim();
    window.store.saveConfig({ scriptUrl: url });
    renderConfiguracion();
    showToast("Configuración guardada exitosamente");
  });

  document.getElementById("btn-test-connection")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-test-connection");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Probando...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const ping = await window.api.ping();
      if (ping && ping.success) {
        alert("¡Conexión exitosa con Google Apps Script y Google Sheets!");
      } else {
        alert("No se pudo conectar: " + (ping?.error || "Verifica la URL del Web App y que el acceso esté configurado en 'Cualquiera'"));
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="activity" class="w-4 h-4"></i> Probar Conexión`;
      renderConfiguracion();
      if (window.lucide) window.lucide.createIcons();
    }
  });

  document.getElementById("btn-sync-now")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-sync-now");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Sincronizando...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await window.api.syncAllData();
      if (res.success) {
        showToast("¡Datos sincronizados desde Google Sheets!");
        renderCurrentView();
      } else {
        alert("Error al sincronizar: " + (res.error || "Asegúrate de haber configurado la URL"));
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> Sincronizar Ahora`;
      renderConfiguracion();
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Exportar Backup JSON
  document.getElementById("btn-export-backup")?.addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.store.data, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `vallas_backup_${new Date().toISOString().split("T")[0]}.json`);
    dlAnchor.click();
  });

  // Cargar datos de prueba
  document.getElementById("btn-reset-demo")?.addEventListener("click", () => {
    if (confirm("¿Deseas recargar los datos de prueba iniciales? Se mantendrán en tu memoria local.")) {
      localStorage.removeItem("vallas_control_data_v1");
      window.location.reload();
    }
  });

  // ==========================================
  // COMPROBANTE DE PAGO / RECIBO IMPRIMIBLE
  // ==========================================
  function showReceipt(contratoId) {
    const c = window.store.getContratoById(contratoId);
    if (!c) return;

    const valla = window.store.getVallaById(c.id_valla);
    const container = document.getElementById("receipt-content");

    container.innerHTML = `
      <div class="p-6 bg-white text-slate-900 font-sans print-card">
        <!-- Cabecera Comprobante -->
        <div class="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">CONTROL DE VALLAS SV</h2>
            <p class="text-xs text-slate-600 font-medium">Gestión y Alquiler de Espacios Publicitarios</p>
            <p class="text-xs text-slate-500">El Salvador</p>
          </div>
          <div class="text-right">
            <span class="inline-block px-3 py-1 bg-slate-100 text-slate-800 rounded font-mono font-bold text-sm">
              ${c.id}
            </span>
            <p class="text-xs text-slate-500 mt-1">Fecha: ${c.fecha_registro || new Date().toISOString().split("T")[0]}</p>
          </div>
        </div>

        <!-- Información del Cliente y Valla -->
        <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div class="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span class="text-xs text-slate-500 uppercase font-bold tracking-wider block mb-1">Cliente:</span>
            <p class="font-bold text-slate-900">${escapeHtml(c.nombre_cliente)}</p>
            <p class="text-slate-600 text-xs mt-0.5">Tel: ${escapeHtml(c.telefono_cliente || "N/A")}</p>
          </div>
          <div class="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span class="text-xs text-slate-500 uppercase font-bold tracking-wider block mb-1">Espacio Publicitario:</span>
            <p class="font-bold text-slate-900">Valla #${c.id_valla}</p>
            <p class="text-slate-600 text-xs mt-0.5">${escapeHtml(valla?.direccion || "San Salvador, El Salvador")}</p>
            <p class="text-slate-500 text-xs">Medidas: ${valla ? `${valla.ancho}m × ${valla.alto}m` : 'N/A'}</p>
          </div>
        </div>

        <!-- Detalle del Contrato -->
        <table class="w-full text-left border-collapse text-sm mb-6">
          <thead>
            <tr class="border-b border-slate-300 text-xs text-slate-600 uppercase">
              <th class="py-2 font-bold">Descripción del Servicio</th>
              <th class="py-2 text-center font-bold">Meses</th>
              <th class="py-2 text-right font-bold">Precio / Mes</th>
              <th class="py-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-slate-200">
              <td class="py-3">
                <p class="font-semibold text-slate-900">${escapeHtml(c.tipo_servicio)}</p>
                <p class="text-xs text-slate-500">Período: ${c.fecha_inicio} al ${c.fecha_fin}</p>
                ${(c.tiempo_extra_meses > 0 || c.tiempo_extra_dias > 0) ? `
                  <p class="text-xs text-emerald-600 font-medium">✓ Incluye cortesía: ${c.tiempo_extra_meses} meses, ${c.tiempo_extra_dias} días gratis</p>
                ` : ''}
              </td>
              <td class="py-3 text-center font-medium">${c.cantidad_meses}</td>
              <td class="py-3 text-right font-medium">$${(parseFloat(c.precio_mensual) || 0).toFixed(2)}</td>
              <td class="py-3 text-right font-bold text-slate-900">$${(parseFloat(c.subtotal) || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Desglose de Impuestos de El Salvador -->
        <div class="flex justify-end mb-8">
          <div class="w-64 text-sm space-y-1.5 border-t border-slate-300 pt-3">
            <div class="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span class="font-semibold text-slate-900">$${(parseFloat(c.subtotal) || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>IVA (13%):</span>
              <span class="font-semibold text-slate-900">+$${(parseFloat(c.iva_13) || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-slate-700 font-medium border-t border-slate-200 pt-1">
              <span>Subtotal con IVA:</span>
              <span>$${(parseFloat(c.subtotal_iva) || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-slate-600 text-xs">
              <span>Renta Sujeto Excluido (10%):</span>
              <span class="font-medium">$${(parseFloat(c.renta_10) || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
              <span>TOTAL A PAGAR:</span>
              <span class="text-blue-700">$${(parseFloat(c.total) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
          ¡Gracias por confiar en nuestros espacios publicitarios!
        </div>
      </div>
    `;

    openModal(modalReceipt);
  }

  // ==========================================
  // ACCIONES GLOBALES EXPUESTAS EN WINDOW
  // ==========================================
  window.appActions = {
    // Vallas
    editValla: (id) => {
      const v = window.store.getVallaById(id);
      if (!v) return;
      document.getElementById("valla-id").value = v.id;
      document.getElementById("valla-modal-title").textContent = `Editar Valla #${v.id}`;
      document.getElementById("valla-direccion").value = v.direccion || "";
      document.getElementById("valla-ancho").value = v.ancho || "";
      document.getElementById("valla-alto").value = v.alto || "";
      document.getElementById("valla-foto-url").value = v.foto_url || "";
      document.getElementById("valla-drive-id").value = v.drive_id || "";
      document.getElementById("valla-notas").value = v.notas || "";
      document.getElementById("valla-preview-img").src = v.foto_url || "./icons/icon.svg";
      openModal(modalValla);
    },
    deleteValla: async (id) => {
      if (confirm(`¿Estás seguro de eliminar la Valla #${id}?`)) {
        await window.api.deleteValla(id);
        renderCurrentView();
        showToast("Valla eliminada");
      }
    },
    newContratoForValla: (vallaId) => {
      openContratoModal(null, null, vallaId);
    },
    viewContratoOfValla: (vallaId) => {
      const c = window.store.getContratos().find(con => String(con.id_valla) === String(vallaId) && con.estado === "Activo");
      if (c) {
        showReceipt(c.id);
      } else {
        alert("No se encontró contrato activo para esta valla");
      }
    },

    // Clientes
    editCliente: (id) => {
      const c = window.store.getClienteById(id);
      if (!c) return;
      document.getElementById("cliente-id").value = c.id;
      document.getElementById("cliente-modal-title").textContent = "Editar Cliente";
      document.getElementById("cliente-nombre").value = c.nombre || "";
      document.getElementById("cliente-telefono").value = c.telefono || "";
      document.getElementById("cliente-notas").value = c.notas || "";
      openModal(modalCliente);
    },
    deleteCliente: async (id) => {
      if (confirm("¿Estás seguro de eliminar este cliente?")) {
        await window.api.deleteCliente(id);
        renderCurrentView();
        showToast("Cliente eliminado");
      }
    },
    newContratoForCliente: (clienteId) => {
      openContratoModal(null, clienteId, null);
    },

    // Contratos
    editContrato: (id) => {
      openContratoModal(id);
    },
    deleteContrato: async (id) => {
      if (confirm("¿Estás seguro de eliminar este contrato? La valla volverá a estar disponible.")) {
        await window.api.deleteContrato(id);
        renderCurrentView();
        showToast("Contrato eliminado");
      }
    },
    printContratoReceipt: (id) => {
      showReceipt(id);
    }
  };

  // Botón imprimir comprobante
  document.getElementById("btn-print-receipt")?.addEventListener("click", () => {
    window.print();
  });

  // Toast Notificaciones
  function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-message");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.remove("translate-y-24", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
      toast.classList.add("translate-y-24", "opacity-0");
      toast.classList.remove("translate-y-0", "opacity-100");
    }, 3000);
  }

function cleanPhoneForWa(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/[^\d+]/g, "");
  if (clean.startsWith("+")) clean = clean.substring(1);
  if (clean.length === 8) clean = "503" + clean;
  return clean;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// ==========================================
// AUTO-SINCRONIZACIÓN USANDO EL BOTÓN REAL
// ==========================================

async function ejecutarSincronizacionTotal() {
  if (!navigator.onLine) return;
  
  // Buscamos el botón real de sincronizar en el DOM
  const btnSync = document.getElementById("btn-sync") || document.querySelector("[onclick*='syncWithSheets']");
  
  if (btnSync) {
    // Si el botón existe en la vista actual, simulamos el clic físico
    btnSync.click();
  } else if (typeof syncWithSheets === "function") {
    // Si no está el botón visible en pantalla, ejecutamos la función directa sin silenciar
    await syncWithSheets(false);
    if (typeof renderCurrentView === "function") renderCurrentView();
  }
}

// 1. Ejecutar automáticamente 1.5 segundos después de abrir la PWA
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(ejecutarSincronizacionTotal, 1500);
});

// 2. Ejecutar cada vez que el celular/PC vuelva a la app (desbloquear pantalla o cambiar pestaña)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    ejecutarSincronizacionTotal();
  }
});

window.addEventListener("focus", ejecutarSincronizacionTotal);

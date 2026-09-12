/**
 * STORE: Manejo de Estado, Almacenamiento Local y Cálculos de Impuestos de El Salvador
 */

const STORAGE_KEY = "vallas_control_data_v1";
const CONFIG_KEY = "vallas_control_config_v1";

// Datos de ejemplo iniciales para demostración inmediata
const DEFAULT_INITIAL_DATA = {
  clientes: [
    {
      id: "CLI-1",
      nombre: "Distribuidora San Salvador S.A. de C.V.",
      telefono: "+503 7123-4567",
      notas: "Contacto: Lic. Carlos Méndez. Pagos puntuales el 1 de cada mes.",
      fecha_creacion: "2026-08-01"
    },
    {
      id: "CLI-2",
      nombre: "Farmacias La Esperanza",
      telefono: "+503 7987-6543",
      notas: "Encargada de mercadeo: Licda. Claudia Ramos.",
      fecha_creacion: "2026-08-15"
    },
    {
      id: "CLI-3",
      nombre: "Restaurante El Boquerón",
      telefono: "+503 7555-8899",
      notas: "Campaña de temporada.",
      fecha_creacion: "2026-08-20"
    }
  ],
  vallas: [
    {
      id: 1,
      codigo: "VALLA-001",
      direccion: "Alameda Roosevelt y 49 Av. Sur, San Salvador",
      foto_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
      ancho: 8.5,
      alto: 4.0,
      estado: "Alquilada",
      notas: "Excelente visibilidad desde el monumento a la Revolución."
    },
    {
      id: 2,
      codigo: "VALLA-002",
      direccion: "Carretera al Puerto de La Libertad, Km 12.5",
      foto_url: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80",
      ancho: 10.0,
      alto: 5.0,
      estado: "Alquilada",
      notas: "Flujo vehicular constante hacia la costa."
    },
    {
      id: 3,
      codigo: "VALLA-003",
      direccion: "Bulevar Los Próceres, frente a Torre Cuscatlán",
      foto_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
      ancho: 7.2,
      alto: 3.6,
      estado: "Disponible",
      notas: "Estructura metálica con iluminación LED nocturna."
    },
    {
      id: 4,
      codigo: "VALLA-004",
      direccion: "Paseo General Escalón y Calle El Mirador",
      foto_url: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&q=80",
      ancho: 9.0,
      alto: 4.5,
      estado: "Disponible",
      notas: "Zona comercial de alto poder adquisitivo."
    }
  ],
  contratos: [
    {
      id: "CONT-101",
      id_cliente: "CLI-1",
      nombre_cliente: "Distribuidora San Salvador S.A. de C.V.",
      telefono_cliente: "+503 7123-4567",
      id_valla: 1,
      tipo_servicio: "Alquiler con publicidad",
      precio_mensual: 650.00,
      cantidad_meses: 6,
      fecha_inicio: "2026-03-20",
      fecha_fin: "2026-09-20", // ¡A pocos días de vencer para demostrar la alerta de 15 días!
      tiempo_extra_meses: 0,
      tiempo_extra_dias: 15,
      subtotal: 3900.00,
      iva_13: 507.00,
      subtotal_iva: 4407.00,
      renta_10: 390.00,
      total: 4407.00,
      estado: "Activo",
      notas: "Incluye impresión de lona e instalación.",
      fecha_registro: "2026-03-20"
    },
    {
      id: "CONT-102",
      id_cliente: "CLI-2",
      nombre_cliente: "Farmacias La Esperanza",
      telefono_cliente: "+503 7987-6543",
      id_valla: 2,
      tipo_servicio: "Solo alquiler",
      precio_mensual: 800.00,
      cantidad_meses: 12,
      fecha_inicio: "2026-05-01",
      fecha_fin: "2027-05-01",
      tiempo_extra_meses: 1,
      tiempo_extra_dias: 0,
      subtotal: 9600.00,
      iva_13: 1248.00,
      subtotal_iva: 10848.00,
      renta_10: 960.00,
      total: 10848.00,
      estado: "Activo",
      notas: "Cliente provee la lona.",
      fecha_registro: "2026-05-01"
    }
  ]
};

class Store {
  constructor() {
    this.data = this.loadData();
    this.config = this.loadConfig();
    this.recalculateAllBillboardStatuses();
  }

  loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.saveData(DEFAULT_INITIAL_DATA);
      return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Error al cargar datos locales:", e);
      return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
    }
  }

saveData(data = this.data) {
  this.data = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("No se pudo guardar en almacenamiento local:", e);
  }
}

  loadConfig() {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      return {
        scriptUrl: "",
        autoSync: true,
        lastSync: null
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { scriptUrl: "", autoSync: true, lastSync: null };
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  // --- CÁLCULOS DE IMPUESTOS DE EL SALVADOR ---
  // Fuente legal: Art. 156 Código Tributario de El Salvador
  // IVA (13%): Se calcula sobre el Precio Base (Subtotal)
  // Renta (10%): Se calcula sobre el Precio Base (Subtotal ANTES del IVA)
  //              El cliente retiene este monto y lo entera al Ministerio de Hacienda
  // Neto a Cobrar = Subtotal con IVA - Renta retenida
  calculateContractFinancials(precioMensual, cantidadMeses) {
    const precio = parseFloat(precioMensual) || 0;
    const meses = parseFloat(cantidadMeses) || 0;
    const subtotal = Math.round(precio * meses * 100) / 100;           // Base imponible
    const iva = Math.round(subtotal * 0.13 * 100) / 100;              // IVA 13% sobre la base
    const subtotalConIva = Math.round((subtotal + iva) * 100) / 100;  // Subtotal + IVA
    const renta = Math.round(subtotal * 0.10 * 100) / 100;            // Renta 10% sobre la BASE (antes de IVA) - Art.156 CT
    const neto = Math.round((subtotalConIva - renta) * 100) / 100;    // Lo que el prestador recibe en mano

    return {
      subtotal,
      iva_13: iva,
      subtotal_iva: subtotalConIva,
      renta_10: renta,
      total: neto   // Neto a cobrar = SubTotal c/IVA - Renta retenida por el cliente
    };
  }


  // --- GESTIÓN DE CLIENTES ---
  getClientes() {
    return this.data.clientes || [];
  }

  getClienteById(id) {
    return this.getClientes().find(c => String(c.id) === String(id));
  }

  saveCliente(cliente) {
    if (!cliente.id) {
      cliente.id = "CLI-" + Date.now();
      cliente.fecha_creacion = new Date().toISOString().split("T")[0];
      this.data.clientes.push(cliente);
    } else {
      const idx = this.data.clientes.findIndex(c => String(c.id) === String(cliente.id));
      if (idx >= 0) {
        this.data.clientes[idx] = { ...this.data.clientes[idx], ...cliente };
      } else {
        this.data.clientes.push(cliente);
      }
    }
    this.saveData();
    return cliente;
  }

  deleteCliente(id) {
    this.data.clientes = this.data.clientes.filter(c => String(c.id) !== String(id));
    this.saveData();
  }

  // --- GESTIÓN DE VALLAS ---
  getVallas() {
    this.recalculateAllBillboardStatuses();
    return this.data.vallas || [];
  }

  getVallaById(id) {
    return this.getVallas().find(v => String(v.id) === String(id));
  }

  getNextVallaId() {
    const vallas = this.data.vallas || [];
    if (vallas.length === 0) return 1;
    let maxId = 0;
    vallas.forEach(v => {
      const num = parseInt(v.id, 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    return maxId + 1;
  }

  saveValla(valla) {
    if (!valla.id) {
      valla.id = this.getNextVallaId();
      valla.codigo = `VALLA-${String(valla.id).padStart(3, "0")}`;
      valla.estado = "Disponible";
      this.data.vallas.push(valla);
    } else {
      const idx = this.data.vallas.findIndex(v => String(v.id) === String(valla.id));
      if (idx >= 0) {
        this.data.vallas[idx] = { ...this.data.vallas[idx], ...valla };
      } else {
        this.data.vallas.push(valla);
      }
    }
    this.recalculateAllBillboardStatuses();
    this.saveData();
    return valla;
  }

  deleteValla(id) {
    this.data.vallas = this.data.vallas.filter(v => String(v.id) !== String(id));
    this.saveData();
  }

  // --- GESTIÓN DE CONTRATOS ---
  getContratos() {
    return this.data.contratos || [];
  }

  getContratoById(id) {
    return this.getContratos().find(c => String(c.id) === String(id));
  }

  saveContrato(contrato) {
    // Calcular automáticamente finanzas
    const fin = this.calculateContractFinancials(contrato.precio_mensual, contrato.cantidad_meses);
    contrato.subtotal = fin.subtotal;
    contrato.iva_13 = fin.iva_13;
    contrato.subtotal_iva = fin.subtotal_iva;
    contrato.renta_10 = fin.renta_10;
    contrato.total = fin.total;

    if (!contrato.id) {
      contrato.id = "CONT-" + Date.now();
      contrato.fecha_registro = new Date().toISOString().split("T")[0];
      if (!contrato.estado) contrato.estado = "Activo";
      this.data.contratos.push(contrato);
    } else {
      const idx = this.data.contratos.findIndex(c => String(c.id) === String(contrato.id));
      if (idx >= 0) {
        this.data.contratos[idx] = { ...this.data.contratos[idx], ...contrato };
      } else {
        this.data.contratos.push(contrato);
      }
    }

    this.recalculateAllBillboardStatuses();
    this.saveData();
    return contrato;
  }

  deleteContrato(id) {
    this.data.contratos = this.data.contratos.filter(c => String(c.id) !== String(id));
    this.recalculateAllBillboardStatuses();
    this.saveData();
  }

  // --- CÁLCULO DINÁMICO DE ESTADOS DE VALLAS ---
  recalculateAllBillboardStatuses() {
    const today = new Date().toISOString().split("T")[0];
    const activeVallaIds = new Set();

    (this.data.contratos || []).forEach(c => {
      // Si el contrato está activo y no ha caducado
      if (c.estado === "Activo") {
        if (!c.fecha_fin || c.fecha_fin >= today) {
          activeVallaIds.add(String(c.id_valla));
        } else {
          // Si ya venció la fecha, marcar el contrato como vencido automáticamente
          c.estado = "Vencido";
        }
      }
    });

    (this.data.vallas || []).forEach(v => {
      if (activeVallaIds.has(String(v.id))) {
        v.estado = "Alquilada";
      } else {
        v.estado = "Disponible";
      }
    });
  }

  // --- ALERTA DE 15 DÍAS ANTES DEL VENCIMIENTO ---
  getDaysRemaining(fechaFin) {
    if (!fechaFin) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(fechaFin + "T00:00:00");
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getContratosAlertas() {
    const contratos = this.getContratos();
    return contratos.map(c => {
      const days = this.getDaysRemaining(c.fecha_fin);
      let alertLevel = "normal"; // normal, warning (<= 15 dias), expired (< 0)
      
      if (days < 0) {
        alertLevel = "expired";
      } else if (days <= 15) {
        alertLevel = "warning";
      }

      return {
        ...c,
        dias_restantes: days,
        alerta: alertLevel
      };
    });
  }

  getContratosProximosAVencer() {
    return this.getContratosAlertas().filter(c => c.alerta === "warning" && c.estado === "Activo");
  }

  getMetrics() {
    this.recalculateAllBillboardStatuses();
    const vallas = this.getVallas();
    const contratos = this.getContratos();
    const proximos = this.getContratosProximosAVencer();

    const totalVallas = vallas.length;
    const vallasAlquiladas = vallas.filter(v => v.estado === "Alquilada").length;
    const vallasDisponibles = totalVallas - vallasAlquiladas;
    const contratosActivos = contratos.filter(c => c.estado === "Activo").length;
    
    // Ingreso mensual estimado de contratos activos
    const ingresosMensuales = contratos
      .filter(c => c.estado === "Activo")
      .reduce((sum, c) => sum + (parseFloat(c.precio_mensual) || 0), 0);

    return {
      totalVallas,
      vallasAlquiladas,
      vallasDisponibles,
      contratosActivos,
      proximosAVencer: proximos.length,
      contratosListAlertas: proximos,
      ingresosMensuales
    };
  }

  // --- SINCRONIZACIÓN CON GOOGLE SHEETS ---
  syncFromRemote(remoteData) {
    if (!remoteData) return;
    if (Array.isArray(remoteData.clientes)) this.data.clientes = remoteData.clientes;
    if (Array.isArray(remoteData.vallas)) this.data.vallas = remoteData.vallas;
    if (Array.isArray(remoteData.contratos)) this.data.contratos = remoteData.contratos;
    
    this.recalculateAllBillboardStatuses();
    this.saveData();
    this.saveConfig({ lastSync: new Date().toISOString() });
  }
}

// Exportar instancia global
window.store = new Store();

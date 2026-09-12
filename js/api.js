/**
 * API: Conector con Google Apps Script (Google Sheets y Google Drive)
 * Incluye optimización y compresión de fotos antes de subirlas a Google Drive
 */

class ApiService {
  constructor() {
    this.isSyncing = false;
  }

  getScriptUrl() {
    return window.store.config.scriptUrl || "";
  }

  hasValidUrl() {
    const url = this.getScriptUrl();
    return url && url.startsWith("https://script.google.com/macros/s/");
  }

  /**
   * Petición POST a Google Apps Script usando text/plain para evitar problemas de CORS preflight (OPTIONS)
   */
  async postRequest(data) {
    if (!this.hasValidUrl()) {
      return { success: false, localOnly: true, message: "Modo Local: Sin URL de Google Apps Script configurada" };
    }

    try {
      const response = await fetch(this.getScriptUrl(), {
        method: "POST",
        // Crucial para Google Apps Script: text/plain previene bloqueo de CORS en navegadores
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error("Error en petición a Google Apps Script:", err);
      return { success: false, error: err.toString() };
    }
  }

  /**
   * Petición GET a Google Apps Script
   */
async getRequest(action = "getAllData") {
    if (!this.hasValidUrl()) return null;
    try {
      const timestamp = new Date().getTime();
      const url = `${this.scriptUrl}?action=${action}&_t=${timestamp}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error("Error en getRequest:", error);
      return null;
    }
  }
  /**
   * Prueba de conexión con la hoja
   */
  async ping() {
    return await this.getRequest("ping");
  }

  /**
   * Sincronización completa con Google Sheets
   */
  async syncAllData() {
    if (!this.hasValidUrl()) return { success: false, localOnly: true };
    this.isSyncing = true;
    try {
      const result = await this.getRequest("getAllData");
      if (result && result.success && result.data) {
        window.store.syncFromRemote(result.data);
        if (typeof renderCurrentView === "function") {
          renderCurrentView();
        }
        return { success: true, data: result.data };
      }
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Guardar o actualizar cliente
   */
  async saveCliente(cliente) {
    // Guardar primero en el store local para respuesta instantánea (Optimistic UI)
    const localSaved = window.store.saveCliente(cliente);

    if (this.hasValidUrl()) {
      this.postRequest({
        action: "saveCliente",
        data: localSaved
      }).then(res => {
        if (!res.success) console.warn("No se pudo sincronizar cliente en Google Sheets:", res.error);
      });
    }

    return localSaved;
  }

  /**
   * Eliminar cliente
   */
  async deleteCliente(id) {
    window.store.deleteCliente(id);
    if (this.hasValidUrl()) {
      this.postRequest({ action: "deleteCliente", id });
    }
    return true;
  }

  /**
   * Guardar o actualizar valla
   */
  async saveValla(valla) {
    const localSaved = window.store.saveValla(valla);

    if (this.hasValidUrl()) {
      this.postRequest({
        action: "saveValla",
        data: localSaved
      }).then(res => {
        if (!res.success) console.warn("No se pudo sincronizar valla en Google Sheets:", res.error);
      });
    }

    return localSaved;
  }

  /**
   * Eliminar valla
   */
  async deleteValla(id) {
    window.store.deleteValla(id);
    if (this.hasValidUrl()) {
      this.postRequest({ action: "deleteValla", id });
    }
    return true;
  }

  /**
   * Guardar o actualizar contrato
   */
  async saveContrato(contrato) {
    const localSaved = window.store.saveContrato(contrato);

    if (this.hasValidUrl()) {
      this.postRequest({
        action: "saveContrato",
        data: localSaved
      }).then(res => {
        if (!res.success) console.warn("No se pudo sincronizar contrato en Google Sheets:", res.error);
      });
    }

    return localSaved;
  }

  /**
   * Eliminar contrato
   */
  async deleteContrato(id) {
    window.store.deleteContrato(id);
    if (this.hasValidUrl()) {
      this.postRequest({ action: "deleteContrato", id });
    }
    return true;
  }

  /**
   * Comprime y redimensiona una imagen antes de enviarla a Google Drive
   * Reduce fotos de 10MB a menos de 300KB sin pérdida perceptible de calidad
   */
  compressImage(file, maxDimension = 1400, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = (e) => reject(e);
      };
      reader.onerror = (e) => reject(e);
    });
  }

  /**
   * Sube foto a Google Drive
   */
  async uploadPhotoToDrive(file) {
    try {
      const base64 = await this.compressImage(file);

      if (!this.hasValidUrl()) {
        // En modo local (sin Google Script configurado), se usa la cadena base64 directamente
        return {
          success: true,
          foto_url: base64,
          localOnly: true
        };
      }

      const res = await this.postRequest({
        action: "uploadPhoto",
        base64Data: base64,
        fileName: file.name || "valla_" + Date.now() + ".jpg",
        mimeType: "image/jpeg"
      });

      if (res.success && res.foto_url) {
        return {
          success: true,
          foto_url: res.foto_url,
          fileId: res.fileId,
          viewUrl: res.viewUrl
        };
      } else {
        // Fallback a base64 local en caso de error de red
        return {
          success: true,
          foto_url: base64,
          warning: "Foto guardada localmente debido a error en Google Drive: " + (res.error || "")
        };
      }
    } catch (err) {
      console.error("Error al procesar foto:", err);
      return { success: false, error: err.toString() };
    }
  }
}

window.api = new ApiService();

// Sincronización automática periódica (Cada 30 segundos)
setInterval(async () => {
  if (navigator.onLine && typeof api !== "undefined") {
    try {
      const res = await api.syncAllData();
      if (res && res.success && typeof renderCurrentView === "function") {
        renderCurrentView();
      }
    } catch (e) {
      console.warn("Sincronización periódica en espera...", e);
    }
  }
}, 30000); // 30000 ms = 30 segundos

/**
 * SISTEMA DE CONTROL DE VALLAS PUBLICITARIAS - BACKEND GOOGLE APPS SCRIPT
 * 100% Gratuito - Utiliza Google Sheets como Base de Datos y Google Drive para Fotos
 * 
 * Instrucciones breves:
 * 1. Abre tu hoja de Google Sheets.
 * 2. Ve a Extensiones > Apps Script.
 * 3. Pega este código reemplazando todo.
 * 4. Haz clic en "Implementar" > "Nueva implementación" > Tipo: "Aplicación web".
 * 5. Acceso: "Cualquiera" (para permitir que tu PWA se comunique con la hoja).
 * 6. Copia la URL generada y pégala en la configuración de tu aplicación PWA.
 */

const FOLDER_NAME = "Vallas_Publicitarias_Fotos";

// Configuración de Hojas y Encabezados
const SHEETS_CONFIG = {
  Clientes: ["id", "nombre", "telefono", "notas", "fecha_creacion"],
  Vallas: ["id", "codigo", "direccion", "foto_url", "ancho", "alto", "estado", "notas", "drive_id"],
  Contratos: [
    "id", "id_cliente", "nombre_cliente", "telefono_cliente", "id_valla",
    "tipo_servicio", "precio_mensual", "cantidad_meses", "fecha_inicio", "fecha_fin",
    "tiempo_extra_meses", "tiempo_extra_dias", "subtotal", "iva_13", "subtotal_iva",
    "renta_10", "total", "estado", "notas", "fecha_registro"
  ]
};

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Inicializa las pestañas si no existen
 */
function initSheets() {
  const ss = getSpreadsheet();
  for (const sheetName in SHEETS_CONFIG) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(SHEETS_CONFIG[sheetName]);
      // Estilo de encabezados
      const headerRange = sheet.getRange(1, 1, 1, SHEETS_CONFIG[sheetName].length);
      headerRange.setBackground("#1E293B");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
}

/**
 * Obtiene o crea la carpeta en Google Drive para las fotos
 */
function getOrCreateDriveFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    const folder = DriveApp.createFolder(FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return folder;
  }
}

/**
 * Manejador GET
 */
function doGet(e) {
  try {
    initSheets();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAllData";

    if (action === "ping") {
      return createJsonResponse({ success: true, message: "Conectado correctamente a Google Sheets" });
    }

    if (action === "getAllData") {
      const data = {
        clientes: readSheetData("Clientes"),
        vallas: readSheetData("Vallas"),
        contratos: readSheetData("Contratos")
      };
      return createJsonResponse({ success: true, data: data });
    }

    return createJsonResponse({ success: false, error: "Acción no reconocida" });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Manejador POST
 */
function doPost(e) {
  try {
    initSheets();
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else {
      return createJsonResponse({ success: false, error: "No se recibieron datos en la solicitud" });
    }

    const action = body.action;

    switch (action) {
      case "saveCliente":
        return createJsonResponse(saveRecord("Clientes", body.data, "CLI-"));
      
      case "deleteCliente":
        return createJsonResponse(deleteRecord("Clientes", body.id));

      case "saveValla":
        return createJsonResponse(saveVallaRecord(body.data));

      case "deleteValla":
        return createJsonResponse(deleteRecord("Vallas", body.id));

      case "saveContrato":
        return createJsonResponse(saveContratoRecord(body.data));

      case "deleteContrato":
        return createJsonResponse(deleteRecord("Contratos", body.id));

      case "uploadPhoto":
        return createJsonResponse(handlePhotoUpload(body.base64Data, body.fileName, body.mimeType));

      default:
        return createJsonResponse({ success: false, error: "Acción POST no válida: " + action });
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Lee datos de una pestaña como arreglo de objetos
 */
function readSheetData(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const rows = values.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[h] = val !== undefined ? val : "";
    });
    return obj;
  });
}

/**
 * Guarda o actualiza un registro genérico
 */
function saveRecord(sheetName, data, idPrefix) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = SHEETS_CONFIG[sheetName];
  const lastRow = sheet.getLastRow();

  if (!data.id) {
    data.id = idPrefix + new Date().getTime();
  }

  // Buscar si ya existe para actualizar
  let rowIndexToUpdate = -1;
  if (lastRow > 1) {
    const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < idColumnValues.length; i++) {
      if (String(idColumnValues[i][0]) === String(data.id)) {
        rowIndexToUpdate = i + 2;
        break;
      }
    }
  }

  const rowValues = headers.map(h => data[h] !== undefined ? data[h] : "");

  if (rowIndexToUpdate > 0) {
    sheet.getRange(rowIndexToUpdate, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return { success: true, record: data };
}

/**
 * Guarda o actualiza una valla, asegurando código correlativo numérico 1, 2, 3...
 */
function saveVallaRecord(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Vallas");
  const headers = SHEETS_CONFIG.Vallas;
  const lastRow = sheet.getLastRow();

  if (!data.id) {
    // Calcular siguiente número correlativo correlativo (1, 2, 3...)
    let maxId = 0;
    if (lastRow > 1) {
      const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      idValues.forEach(r => {
        const num = parseInt(r[0], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      });
    }
    data.id = maxId + 1;
    data.codigo = "VALLA-" + String(data.id).padStart(3, "0");
    if (!data.estado) data.estado = "Disponible";
  }

  let rowIndexToUpdate = -1;
  if (lastRow > 1) {
    const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < idColumnValues.length; i++) {
      if (String(idColumnValues[i][0]) === String(data.id)) {
        rowIndexToUpdate = i + 2;
        break;
      }
    }
  }

  const rowValues = headers.map(h => data[h] !== undefined ? data[h] : "");

  if (rowIndexToUpdate > 0) {
    sheet.getRange(rowIndexToUpdate, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return { success: true, record: data };
}

/**
 * Guarda o actualiza un contrato y sincroniza el estado de la valla a "Alquilada" o "Disponible"
 */
function saveContratoRecord(data) {
  if (!data.id) {
    data.id = "CONT-" + new Date().getTime();
    data.fecha_registro = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  const res = saveRecord("Contratos", data, "CONT-");

  // Actualizar estado de la valla asociada
  if (data.id_valla) {
    actualizarEstadoValla(data.id_valla);
  }

  return res;
}

/**
 * Recalcula el estado de la valla según contratos activos
 */
function actualizarEstadoValla(idValla) {
  const ss = getSpreadsheet();
  const contratos = readSheetData("Contratos");
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

  let estaAlquilada = false;
  contratos.forEach(c => {
    if (String(c.id_valla) === String(idValla)) {
      if (c.estado === "Activo" && (!c.fecha_fin || c.fecha_fin >= hoy)) {
        estaAlquilada = true;
      }
    }
  });

  const sheetVallas = ss.getSheetByName("Vallas");
  const lastRow = sheetVallas.getLastRow();
  if (lastRow > 1) {
    const ids = sheetVallas.getRange(2, 1, lastRow - 1, 1).getValues();
    const estadoColIdx = SHEETS_CONFIG.Vallas.indexOf("estado") + 1;
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(idValla)) {
        sheetVallas.getRange(i + 2, estadoColIdx).setValue(estaAlquilada ? "Alquilada" : "Disponible");
        break;
      }
    }
  }
}

/**
 * Elimina un registro por ID
 */
function deleteRecord(sheetName, id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return { success: false, error: "No hay registros para eliminar" };

  const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      return { success: true };
    }
  }

  return { success: false, error: "Registro no encontrado" };
}

/**
 * Guarda foto en Google Drive desde Base64 y retorna URL pública directa
 */
function handlePhotoUpload(base64Data, fileName, mimeType) {
  if (!base64Data) {
    return { success: false, error: "No se enviaron datos de imagen" };
  }

  const folder = getOrCreateDriveFolder();
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const decodedBytes = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decodedBytes, mimeType || "image/jpeg", fileName || "valla_" + new Date().getTime() + ".jpg");
  
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  // URL directa para mostrar imagen en la app
  const directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
  const webViewLink = file.getUrl();

  return {
    success: true,
    fileId: fileId,
    foto_url: directUrl,
    viewUrl: webViewLink
  };
}

/**
 * Devuelve respuesta JSON con cabeceras CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

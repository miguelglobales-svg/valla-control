# Sistema PWA de Control y Alquiler de Vallas Publicitarias (El Salvador)

Aplicación Web Progresiva (PWA) moderna, responsiva para teléfonos Android y computadoras de escritorio, **100% gratuita y sin costos de servidores ni APIs de pago**. Utiliza **Google Sheets** como base de datos y **Google Drive** para el almacenamiento de fotografías y archivos.

---

## 🌟 Características Principales

1. **Gestión de Clientes**:
   - Nombre completo o razón social.
   - Número de teléfono con enlaces directos a **WhatsApp** (`wa.me`) y llamadas.
   - Campo de notas y seguimiento.

2. **Gestión de Vallas Publicitarias**:
   - **Código correlativo numérico automático** iniciando en `1` (`Valla #1`, `Valla #2`, etc.).
   - Dirección física completa.
   - Dimensiones: Ancho (m) y Alto (m) con cálculo instantáneo de área en $m^2$.
   - **Fotografías con subida automática a Google Drive**: compresión inteligente en el dispositivo para ahorrar datos y no saturar el almacenamiento.
   - **Estado automático**: *"Disponible"* o *"Alquilada"* (se calcula dinámicamente según la vigencia de los contratos).

3. **Gestión de Contratos y Facturación (El Salvador)**:
   - Selección de cliente existente o **creación rápida de nuevo cliente** dentro del mismo formulario sin salir.
   - Asignación de valla (pasa automáticamente a *"Alquilada"*).
   - Tipo de servicio: *"Solo alquiler"* o *"Alquiler con publicidad"*.
   - Precio mensual y cantidad de meses.
   - Fechas editables: Fecha de inicio y Fecha de fin (con sugerencia automática).
   - **Tiempo Extra Gratis**: Espacio para especificar meses y días de cortesía adicionales.
   - **Cálculos Financieros Automáticos (Leyes de El Salvador)**:
     - **Precio SubTotal**: $\text{Precio Mensual} \times \text{Meses}$.
     - **Precio con IVA Automático (13%)**: $\text{Subtotal} \times 0.13$.
     - **Precio SubTotal con IVA Incluido**: $\text{Subtotal} + \text{IVA}$.
     - **Impuesto sobre la Renta de El Salvador (10%)**: $\text{Subtotal} \times 0.10$.
     - **Total a Pagar**: Total líquido con los impuestos aplicados.
   - Estado del contrato: *"Activo"* o *"Vencido"*.

4. **Sistema de Alerta de 15 Días**:
   - Detección automática de contratos que están a **15 días o menos** de vencer.
   - Badges visuales de advertencia (*"⚠️ Vence en X días"*).
   - Panel de alerta prioritaria en el Dashboard con botón directo de WhatsApp para ofrecer renovación al cliente.

5. **Comprobante de Contrato Imprimible**:
   - Vista formateada para imprimir o guardar como PDF lista para entregar al cliente.

6. **Instalable como PWA (Offline First)**:
   - Funciona sin internet en modo local gracias a su Service Worker (`sw.js`) y `manifest.json`.
   - Se instala en la pantalla de inicio de Android y en el escritorio de PC.

---

## 🚀 Guía de Configuración en Google Sheets y Google Drive (100% Gratis)

No necesitas tarjetas de crédito, cuentas de desarrollador de pago ni cuotas de Google Cloud. Solo tu cuenta normal de Google (Gmail).

### Paso 1: Crear la Hoja de Google Sheets
1. Entra a [Google Sheets](https://sheets.new) y crea una hoja de cálculo en blanco.
2. Nómbrala como gustes, por ejemplo: `Control de Vallas Publicitarias`.

### Paso 2: Pegar el Código de Google Apps Script
1. En el menú superior de la hoja, ve a **Extensiones > Apps Script**.
2. Borra todo el código que aparece por defecto en el editor.
3. Abre el archivo [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) de este proyecto, copia todo su contenido y pégalo en el editor de Apps Script.
4. Haz clic en el ícono de **Guardar** (disquete).

### Paso 3: Publicar la Aplicación Web
1. En la esquina superior derecha de Apps Script, haz clic en el botón azul **Implementar** (Deploy) > **Nueva implementación**.
2. En el engranaje de tipo de implementación, selecciona **Aplicación web**.
3. Configura los siguientes campos:
   - **Descripción**: `Backend Vallas PWA`
   - **Ejecutar como**: `Yo (tu correo electrónico)`
   - **Quién tiene acceso**: `Cualquiera` *(IMPORTANTE: debe ser "Cualquiera" para que tu PWA pueda comunicarse con la hoja sin exigir que el usuario inicie sesión en Google)*.
4. Haz clic en **Implementar**.
5. Google te pedirá autorizar los permisos:
   - Haz clic en *Revisar permisos* > selecciona tu cuenta Google > *Avanzado* > *Ir a Proyecto (no seguro)* > *Permitir*.
6. Copia la **URL de la aplicación web** generada (termina en `/exec`).

### Paso 4: Conectar la PWA con tu Hoja
1. Abre tu aplicación PWA en el navegador (`index.html`).
2. Ve a la pestaña **Ajustes** (ícono de engranaje).
3. Pega la URL de la aplicación web en el campo correspondiente.
4. Haz clic en **Guardar URL** y luego en **Probar Conexión**.
5. ¡Listo! El script creará automáticamente en tu hoja de cálculo las pestañas `Clientes`, `Vallas` y `Contratos`, y creará en tu Google Drive la carpeta `Vallas_Publicitarias_Fotos`.

---

## 📱 Cómo Instalar la Aplicación (PWA)

### En Teléfonos Android:
1. Abre el enlace de la aplicación en **Google Chrome**.
2. Verás un botón de instalación en la cabecera, o bien presiona los **tres puntos** (menú de Chrome en la esquina superior derecha).
3. Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
4. Ahora tendrás el ícono de la app en tu pantalla con acceso directo a la cámara para fotos de vallas.

### En Computadora (Windows / Mac):
1. Abre la aplicación en **Google Chrome** o **Microsoft Edge**.
2. En la barra de direcciones del navegador aparecerá un ícono de instalación (computadora con flecha abajo) o haz clic en el botón **"Instalar App"** de la cabecera.
3. Se abrirá como una aplicación de escritorio nativa e independiente.

---

## 🌐 Publicación Web Gratuita (Opciones Recomendadas)

Para tener tu PWA disponible en tu teléfono y computadora mediante una dirección web segura (`https://` es requisito para que se pueda instalar como PWA):
1. **GitHub Pages (Gratis)**: Sube esta carpeta a un repositorio de GitHub y activa GitHub Pages en la rama `main`.
2. **Netlify o Vercel (Gratis)**: Arrastra la carpeta del proyecto a Netlify Drop y obtendrás una URL instantánea con SSL.
3. **Firebase Hosting (Gratis)**: Si usas Firebase CLI, puedes desplegarla en segundos.

---

## 📁 Estructura del Código

```
vallas-control-pwa/
├── index.html              # Interfaz completa responsiva y modales
├── manifest.json           # Configuración PWA para Android y PC
├── sw.js                   # Service Worker para instalación y caché offline
├── css/
│   └── styles.css          # Animaciones, pulsos de alerta y estilos de impresión
├── js/
│   ├── store.js            # Base de datos local, cálculos de IVA 13% y Renta 10% de SV
│   ├── api.js              # Conector con Google Apps Script y compresión de fotos para Drive
│   └── app.js              # Controlador de vistas, filtros, eventos y WhatsApp
├── icons/
│   └── icon.svg            # Icono vectorial de alta resolución de valla publicitaria
└── google-apps-script/
    └── Code.gs             # Backend gratuito para Google Sheets y Google Drive
```

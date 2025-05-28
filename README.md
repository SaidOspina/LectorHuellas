# 📚 Sistema de Control de Asistencia con Lector de Huellas

Un sistema completo de gestión de asistencia académica que utiliza sensores biométricos (AS608) conectados a Arduino para el registro automático de estudiantes.

## 🌟 Características Principales

### 🔐 Autenticación y Roles
- **Sistema de autenticación JWT**: Sesiones seguras con tokens
- **Roles de usuario**: Administrador y Docente
- **Gestión de perfiles**: Edición de datos personales y cambio de contraseñas

### 👨‍🏫 Panel de Administración
- **Gestión completa de usuarios**: Crear, editar, desactivar docentes
- **Estadísticas del sistema**: Métricas de usuarios activos y registros
- **Control de permisos**: Administración centralizada del sistema

### 📖 Gestión Académica
- **Materias**: Crear y gestionar asignaturas con códigos únicos
- **Estudiantes**: Registro completo con programas académicos
- **Inscripciones**: Asignación de estudiantes a materias específicas

### 👆 Sistema de Huellas Dactilares
- **Sensor AS608**: Integración completa con Arduino
- **Registro automático**: Proceso guiado para registrar huellas
- **Identificación rápida**: Reconocimiento en tiempo real
- **Gestión de IDs**: Control automático de hasta 127 huellas

### ✅ Control de Asistencia
- **Registro por huella**: Identificación automática de estudiantes
- **Registro manual**: Opción alternativa para casos especiales
- **Asistencia masiva**: Marcar múltiples estudiantes simultáneamente
- **Validaciones**: Prevención de registros duplicados por día

### 📊 Reportes y Análisis
- **Reportes detallados**: Estadísticas por materia y período
- **Filtros avanzados**: Por fecha, materia o estudiante
- **Exportación**: Informes listos para imprimir
- **Visualización intuitiva**: Tablas y gráficos claros

### 🔄 Comunicación en Tiempo Real
- **Socket.IO**: Actualizaciones instantáneas
- **Estados del Arduino**: Monitor de conexión en vivo
- **Notificaciones**: Alertas de registro y errores
- **Sincronización**: Datos actualizados automáticamente

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js + Express**: Servidor y API REST
- **MongoDB + Mongoose**: Base de datos NoSQL
- **Socket.IO**: Comunicación bidireccional en tiempo real
- **JWT**: Autenticación segura con tokens
- **bcrypt**: Encriptación de contraseñas
- **SerialPort**: Comunicación con Arduino

### Frontend
- **HTML5 + CSS3**: Estructura y estilos modernos
- **Bootstrap 5**: Framework responsive
- **JavaScript ES6+**: Funcionalidad dinámica
- **Socket.IO Client**: Comunicación en tiempo real
- **Bootstrap Icons**: Iconografía consistente

### Hardware
- **Arduino Uno/Nano**: Microcontrolador principal
- **Sensor AS608**: Lector de huellas dactilares
- **LED indicador**: Feedback visual del estado

### Herramientas de Desarrollo
- **PM2**: Gestor de procesos Node.js
- **ngrok**: Túnel HTTP para desarrollo
- **nodemon**: Recarga automática en desarrollo

## 📋 Requisitos del Sistema

### Software
- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **MongoDB** >= 5.0 (local o MongoDB Atlas)
- **PM2** (opcional, para producción)
- **ngrok** (opcional, para acceso externo)

### Hardware
- **Arduino Uno/Nano** con cable USB
- **Sensor AS608** de huellas dactilares
- **Protoboard y cables** para conexiones
- **LED** (opcional, para indicador visual)

## 🔧 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/control-asistencia.git
cd control-asistencia
```

### 2. Configurar el Backend
```bash
cd backend
npm install
```

### 3. Configurar Variables de Entorno
Crear archivo `.env` en la carpeta `backend`:
```env
# Base de datos MongoDB
MONGODB_URI=link proporcionado por la aplicacion

# Puerto del servidor
PORT=3000

# Puerto serial del Arduino (verificar en Administrador de dispositivos)
ARDUINO_PORT=COM6

# Configuración JWT
JWT_SECRET=tu_clave_secreta_aqui
JWT_EXPIRE=7d

# URL del frontend
FRONTEND_URL=http://localhost:3000
```

### 4. Configurar Arduino
Cargar el código `arduino/lector_huella/lector_huella.ino` al Arduino:

#### Conexiones del Sensor AS608:
```
Arduino    <->    AS608
5V         <->    VCC (Rojo)
GND        <->    GND (Negro) 
Pin 2      <->    TX (Blanco)
Pin 3      <->    RX (Verde)
Pin 12     <->    LED (opcional)
```

### 5. Inicializar la Base de Datos
Al ejecutar por primera vez, se creará automáticamente:
- **Usuario administrador por defecto**:
  - Usuario: `admin`
  - Contraseña: `admin123`
  - ⚠️ **Importante**: Cambiar esta contraseña en producción

## 🚀 Ejecución del Sistema

### Desarrollo Local
```bash
cd backend
npm run dev
```

### Producción con PM2
```bash
cd backend
pm2 start server.js --name "control-asistencia"
```

### Acceso Externo con ngrok
```bash
ngrok http --url=popular-accurately-ladybug.ngrok-free.app 3000
```

### Detener Servicios
```bash
pm2 delete control-asistencia
```

## 📱 Uso del Sistema

### 1. Acceso Inicial
- Navegar a `http://localhost:3000/login`
- Usar credenciales de administrador por defecto
- Cambiar contraseña inmediatamente

### 2. Configuración Inicial (Admin)
1. **Crear docentes**: Ir a panel de administración
2. **Configurar materias**: Definir asignaturas y códigos
3. **Registrar estudiantes**: Datos completos y programas
4. **Asignar materias**: Inscribir estudiantes en asignaturas

### 3. Registro de Huellas
1. **Seleccionar estudiante** en la sección correspondiente
2. **Iniciar registro** de huella dactilar
3. **Seguir instrucciones** del sistema paso a paso
4. **Confirmar registro** exitoso

### 4. Toma de Asistencia
#### Por Huella (Automático):
1. **Seleccionar materia** en modal de asistencia
2. **Activar modo huella** continuo
3. **Estudiantes colocan dedo** en el sensor
4. **Sistema registra** automáticamente

#### Manual:
1. **Seleccionar materia** y estudiante
2. **Elegir fecha/hora** del registro
3. **Marcar presente/ausente** según corresponda
4. **Guardar registro** manualmente

#### Masiva:
1. **Seleccionar materia** y fecha
2. **Marcar estudiantes** presentes en lista
3. **Confirmar asistencia** de todos los seleccionados

### 5. Consulta de Reportes
1. **Filtrar por materia** o período de tiempo
2. **Generar reporte** detallado
3. **Exportar o imprimir** según necesidades

## 🔍 Solución de Problemas

### Arduino no se conecta
- **Verificar puerto COM**: Comprobar en Administrador de dispositivos
- **Driver USB**: Instalar drivers CH340 o FTDI según el Arduino
- **Permisos**: Ejecutar como administrador si es necesario
- **Puerto ocupado**: Cerrar Arduino IDE u otros programas

### Sensor AS608 no responde
- **Conexiones**: Verificar cables y polaridad
- **Alimentación**: Confirmar 5V estables
- **Baudrate**: Probar diferentes velocidades (9600, 57600)
- **Sensor defectuoso**: Probar con otro sensor

### Error de base de datos
- **Conexión MongoDB**: Verificar URL y credenciales
- **Firewall**: Permitir conexiones a MongoDB Atlas
- **Memoria**: Verificar espacio disponible en disco

### Problemas de rendimiento
- **PM2**: Usar gestor de procesos en producción
- **Memoria**: Monitorear uso de RAM
- **Conexiones**: Limitar conexiones simultáneas

## 🔧 Arquitectura del Sistema

### Estructura de Carpetas
```
control-asistencia/
├── arduino/
│   └── lector_huella/
│       └── lector_huella.ino
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── database.js
├── frontend/
│   ├── css/
│   ├── js/
│   ├── img/
│   ├── index.html
│   ├── login.html
│   └── admin.html
└── README.md
```

### Base de Datos (MongoDB)
- **usuarios**: Admins y docentes
- **materias**: Asignaturas por docente
- **estudiantes**: Datos y huellas por docente
- **asistencias**: Registros de asistencia

### API REST Endpoints
```
GET    /api/auth/me                    - Usuario actual
POST   /api/auth/login                - Iniciar sesión
GET    /api/materias                  - Listar materias
POST   /api/estudiantes               - Crear estudiante
POST   /api/asistencia/huella         - Registrar por huella
GET    /api/asistencia                - Consultar registros
```

## 🤝 Contribución

1. **Fork** el repositorio
2. **Crear rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crear Pull Request**

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Soporte

Para soporte técnico o consultas:
- **Issues**: Crear issue en GitHub
- **Documentación**: Revisar código y comentarios
- **Wiki**: Consultar wiki del proyecto

## 🔄 Historial de Versiones

### v1.0.0
- ✅ Sistema de autenticación completo
- ✅ Gestión de materias y estudiantes
- ✅ Integración con sensor AS608
- ✅ Registro de asistencia por huella
- ✅ Panel de administración
- ✅ Reportes básicos

---

**Desarrollado para la gestión educativa moderna**

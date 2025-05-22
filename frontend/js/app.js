// Configuración y utilidades generales
const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://lectorhuellas.onrender.com'  // URL de Render
    : '/api'; 
let socket;

// Estado global de la aplicación
const appState = {
    materias: [],
    estudiantes: [],
    materiaSeleccionada: null,
    arduinoConectado: false,
    arduinoReady: false,
    socketConnected: false
};

// Elementos del DOM
const elements = {
    // Navegación
    navMaterias: document.getElementById('nav-materias'),
    navEstudiantes: document.getElementById('nav-estudiantes'),
    navAsistencia: document.getElementById('nav-asistencia'),
    navPapelera: document.getElementById('nav-papelera'),
    
    // Secciones
    materiasSection: document.getElementById('materias-section'),
    estudiantesSection: document.getElementById('estudiantes-section'),
    asistenciaSection: document.getElementById('asistencia-section'),
    papeleraSection: document.getElementById('papelera-section'),
    
    // Estado Arduino
    arduinoStatus: document.getElementById('arduino-status'),
    
    // Contenedor de alertas
    alertsContainer: document.getElementById('alerts-container')
};

// Inicialización principal
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando aplicación...');
    
    // 1. Inicializar Socket.io primero
    initializeSocket();
    
    // 2. Configurar eventos de navegación
    configureNavigation();
    
    // 3. Verificar estado del Arduino
    checkArduinoStatus();
    
    // 4. Configurar verificación periódica del Arduino
    setInterval(checkArduinoStatus, 10000); // Cada 10 segundos
    
    // 5. Cargar datos iniciales después de un breve delay
    setTimeout(() => {
        loadInitialData();
        configureGlobalModals();
        console.log('✅ Aplicación completamente inicializada');
    }, 1000);
});

// ====== INICIALIZACIÓN DE SOCKET.IO ======
function initializeSocket() {
    console.log('🔌 Inicializando Socket.io...');
    
    socket = io();
    
    // Hacer socket disponible globalmente de múltiples formas
    window.socket = socket;
    window.appSocket = socket;
    
    socket.on('connect', () => {
        console.log('✅ Socket.io conectado exitosamente');
        appState.socketConnected = true;
        
        // Notificar a otros módulos que el socket está listo
        window.dispatchEvent(new CustomEvent('socketReady', { detail: socket }));
        
        // Solicitar estado actual del Arduino
        socket.emit('request-arduino-status');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Socket.io desconectado');
        appState.socketConnected = false;
    });

    socket.on('connect_error', (error) => {
        console.error('Error de conexión Socket.io:', error);
        showAlert('Error de conexión en tiempo real', 'warning');
    });

    // Eventos del Arduino
    socket.on('arduino-status', (data) => {
        console.log('📟 Estado Arduino actualizado:', data);
        updateArduinoStatus(data.connected, data.ready);
    });
    
    // Eventos de huella digital - CORREGIDO
    socket.on('fingerprint-scan', (data) => {
        console.log('👆 Huella escaneada:', data);
        handleFingerprintScan(data);
    });
    
    // Eventos de progreso de huella (para registro de estudiantes)
    socket.on('huella-progress', (data) => {
        console.log('🔄 Progreso de huella:', data);
        // Estos eventos se manejan específicamente en estudiantes.js
        if (window.registroHuellaEnProgreso) {
            console.log('Delegando evento huella-progress a estudiantes.js');
        }
    });
    
    socket.on('huella-registered', (data) => {
        console.log('✅ Huella registrada:', data);
        // Estos eventos se manejan específicamente en estudiantes.js
        if (window.registroHuellaEnProgreso) {
            console.log('Delegando evento huella-registered a estudiantes.js');
        }
    });
    
    socket.on('huella-error', (data) => {
        console.log('❌ Error de huella:', data);
        // Estos eventos se manejan específicamente en estudiantes.js
        if (window.registroHuellaEnProgreso) {
            console.log('Delegando evento huella-error a estudiantes.js');
        }
    });
    
    // Eventos de asistencia
    socket.on('nueva-asistencia', (data) => {
        console.log('📝 Nueva asistencia registrada:', data);
        showAlert(`Asistencia registrada: ${data.estudiante.nombre}`, 'success');
        // Recargar datos si estamos en la sección de asistencia
        if (!elements.asistenciaSection.classList.contains('d-none')) {
            if (typeof loadAsistenciaRecords === 'function') {
                loadAsistenciaRecords();
            }
        }
    });
    
    socket.on('asistencia-actualizada', (data) => {
        console.log('✏️ Asistencia actualizada:', data);
        // Recargar datos si estamos en la sección de asistencia
        if (!elements.asistenciaSection.classList.contains('d-none')) {
            if (typeof loadAsistenciaRecords === 'function') {
                loadAsistenciaRecords();
            }
        }
    });
    
    socket.on('asistencia-eliminada', (data) => {
        console.log('🗑️ Asistencia eliminada:', data);
        // Recargar datos si estamos en la sección de asistencia
        if (!elements.asistenciaSection.classList.contains('d-none')) {
            if (typeof loadAsistenciaRecords === 'function') {
                loadAsistenciaRecords();
            }
        }
    });
}

// ====== NAVEGACIÓN ======
function configureNavigation() {
    console.log('🧭 Configurando navegación...');
    
    elements.navMaterias.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('materias');
        updateActiveNav(elements.navMaterias);
    });
    
    elements.navEstudiantes.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('estudiantes');
        updateActiveNav(elements.navEstudiantes);
    });
    
    elements.navAsistencia.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('asistencia');
        updateActiveNav(elements.navAsistencia);
    });
    
    elements.navPapelera.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('papelera');
        updateActiveNav(elements.navPapelera);
    });
}

function showSection(sectionName) {
    console.log(`📄 Mostrando sección: ${sectionName}`);
    
    // Ocultar todas las secciones
    elements.materiasSection.classList.add('d-none');
    elements.estudiantesSection.classList.add('d-none');
    elements.asistenciaSection.classList.add('d-none');
    elements.papeleraSection.classList.add('d-none');
    
    // Mostrar la sección solicitada y cargar datos
    switch (sectionName) {
        case 'materias':
            elements.materiasSection.classList.remove('d-none');
            if (typeof loadMaterias === 'function') {
                loadMaterias();
            }
            break;
        case 'estudiantes':
            elements.estudiantesSection.classList.remove('d-none');
            if (typeof loadEstudiantes === 'function') {
                loadEstudiantes();
            }
            break;
        case 'asistencia':
            elements.asistenciaSection.classList.remove('d-none');
            if (typeof loadAsistenciaData === 'function') {
                loadAsistenciaData();
            }
            break;
        case 'papelera':
            elements.papeleraSection.classList.remove('d-none');
            if (typeof loadPapelera === 'function') {
                loadPapelera();
            }
            break;
    }
}

function updateActiveNav(activeNavElement) {
    // Quitar clase activa de todos los elementos de navegación
    elements.navMaterias.classList.remove('active');
    elements.navEstudiantes.classList.remove('active');
    elements.navAsistencia.classList.remove('active');
    elements.navPapelera.classList.remove('active');
    
    // Añadir clase activa al elemento seleccionado
    activeNavElement.classList.add('active');
}

// ====== ESTADO DEL ARDUINO ======
function checkArduinoStatus() {
    fetch(`${API_URL}/arduino/status`)
        .then(response => response.json())
        .then(data => {
            updateArduinoStatus(data.connected, data.ready);
        })
        .catch(error => {
            console.error('❌ Error al verificar estado del Arduino:', error);
            updateArduinoStatus(false, false);
        });
}

function updateArduinoStatus(connected, ready = false) {
    appState.arduinoConectado = connected;
    appState.arduinoReady = ready;
    
    if (!elements.arduinoStatus) return;
    
    if (connected && ready) {
        elements.arduinoStatus.innerHTML = '<i class="bi bi-usb-fill text-success"></i> Arduino conectado';
        elements.arduinoStatus.classList.remove('desconectado');
        elements.arduinoStatus.classList.add('conectado');
        elements.arduinoStatus.title = 'Arduino conectado y listo';
    } else if (connected && !ready) {
        elements.arduinoStatus.innerHTML = '<i class="bi bi-usb-fill text-warning"></i> Arduino iniciando...';
        elements.arduinoStatus.classList.remove('desconectado', 'conectado');
        elements.arduinoStatus.title = 'Arduino conectado pero no está listo';
    } else {
        elements.arduinoStatus.innerHTML = '<i class="bi bi-usb-fill text-danger"></i> Arduino desconectado';
        elements.arduinoStatus.classList.remove('conectado');
        elements.arduinoStatus.classList.add('desconectado');
        elements.arduinoStatus.title = 'Arduino no está conectado';
    }
}

// ====== MANEJO DE EVENTOS DE HUELLA - CORREGIDO ======
function handleFingerprintScan(data) {
    const huellaID = data.id;
    console.log(`👆 Procesando huella escaneada ID: ${huellaID}`);
    
    // 1. Verificar si hay un proceso de registro de huella en curso (estudiantes.js)
    if (window.registroHuellaEnProgreso) {
        console.log('🔄 Proceso de registro de huella en curso, delegando a estudiantes.js...');
        return; // Los eventos específicos de huella se manejan en estudiantes.js
    }
    
    // 2. Verificar si hay un proceso de asistencia por huella en curso
    if (window.asistenciaPorHuellaEnProgreso) {
        console.log('📝 Proceso de asistencia por huella en curso, procesando...');
        
        // Llamar directamente a la función global
        if (typeof window.handleAsistenciaHuella === 'function') {
            window.handleAsistenciaHuella(huellaID);
        } else {
            console.error('❌ Función window.handleAsistenciaHuella no encontrada');
            console.log('Funciones disponibles:', Object.keys(window).filter(key => key.includes('Asistencia')));
        }
        return;
    }
    
    // 3. Si no hay procesos activos, mostrar información
    console.log('ℹ️ Huella detectada sin proceso activo');
    
    // Intentar buscar el estudiante con esa huella para mostrar información
    if (appState.estudiantes && appState.estudiantes.length > 0) {
        const estudiante = appState.estudiantes.find(est => est.huellaID === huellaID);
        if (estudiante) {
            showAlert(`Huella detectada: ${estudiante.nombre} (ID: ${huellaID}). No hay procesos activos.`, 'info');
        } else {
            showAlert(`Huella detectada (ID: ${huellaID}). Estudiante no encontrado.`, 'warning');
        }
    } else {
        showAlert(`Huella detectada (ID: ${huellaID}). No hay procesos activos.`, 'info');
    }
}

// ====== CARGA DE DATOS INICIALES ======
function loadInitialData() {
    console.log('📊 Cargando datos iniciales...');
    
    // Cargar materias primero
    if (typeof loadMaterias === 'function') {
        loadMaterias();
    } else {
        console.warn('⚠️ Función loadMaterias no está disponible');
    }
    
    // Cargar estudiantes para tenerlos disponibles
    if (typeof loadEstudiantes === 'function') {
        setTimeout(() => {
            loadEstudiantes();
        }, 500);
    } else {
        console.warn('⚠️ Función loadEstudiantes no está disponible');
    }
}

// ====== MODALES GLOBALES ======
function configureGlobalModals() {
    console.log('🔧 Configurando modales globales...');
    
    // Modal de confirmación
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    if (modalConfirmacion) {
        modalConfirmacion.addEventListener('hidden.bs.modal', () => {
            // Limpiar datos cuando se cierre el modal
            document.getElementById('confirmacion-title').textContent = 'Confirmar acción';
            document.getElementById('confirmacion-mensaje').textContent = '¿Está seguro de realizar esta acción?';
            
            // Quitar evento del botón de confirmar
            const btnConfirmar = document.getElementById('btn-confirmar');
            if (btnConfirmar) {
                const newBtnConfirmar = btnConfirmar.cloneNode(true);
                btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);
            }
        });
    }
}

// ====== FUNCIONES DE UTILIDAD ======

// Mostrar mensaje de alerta
function showAlert(message, type = 'info', timeout = 5000) {
    if (!elements.alertsContainer) {
        console.warn('⚠️ Contenedor de alertas no encontrado');
        return;
    }
    
    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            <div class="d-flex align-items-center">
                <i class="bi bi-${getAlertIcon(type)} me-2"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    elements.alertsContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Configurar temporizador para ocultar la alerta
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.classList.remove('show');
            setTimeout(() => {
                alertElement.remove();
            }, 300);
        }
    }, timeout);
}

function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle',
        'primary': 'info-circle',
        'secondary': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Formatear fecha
function formatDate(dateString, includeTime = false) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = false;
    }
    
    return date.toLocaleDateString('es-ES', options);
}

// Función para confirmar acción
function confirmAction(title, message, callback, btnText = 'Confirmar', btnType = 'danger') {
    const modalElement = document.getElementById('modal-confirmacion');
    if (!modalElement) {
        console.error('❌ Modal de confirmación no encontrado');
        return;
    }
    
    const modalConfirmacion = new bootstrap.Modal(modalElement);
    
    // Configurar contenido del modal
    document.getElementById('confirmacion-title').textContent = title;
    document.getElementById('confirmacion-mensaje').textContent = message;
    
    const btnConfirmar = document.getElementById('btn-confirmar');
    if (btnConfirmar) {
        btnConfirmar.textContent = btnText;
        btnConfirmar.className = `btn btn-${btnType}`;
        
        // Remover listeners anteriores y agregar nuevo
        const newBtnConfirmar = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);
        
        newBtnConfirmar.addEventListener('click', () => {
            modalConfirmacion.hide();
            if (typeof callback === 'function') {
                callback();
            }
        });
    }
    
    modalConfirmacion.show();
}

// Función helper para obtener el socket
function getSocket() {
    return socket || window.socket || window.appSocket;
}

// Función para verificar si el socket está conectado
function isSocketConnected() {
    const currentSocket = getSocket();
    return currentSocket && currentSocket.connected;
}

// ====== FUNCIONES DE DEBUG ======
function debugAppState() {
    console.log('=== DEBUG ESTADO APLICACIÓN ===');
    console.log('Estado global:', appState);
    console.log('Socket conectado:', isSocketConnected());
    console.log('Variables globales importantes:', {
        registroHuellaEnProgreso: window.registroHuellaEnProgreso,
        asistenciaPorHuellaEnProgreso: window.asistenciaPorHuellaEnProgreso,
        materiaAsistenciaActual: window.materiaAsistenciaActual
    });
    console.log('Funciones disponibles:', {
        loadMaterias: typeof loadMaterias,
        loadEstudiantes: typeof loadEstudiantes,
        loadAsistenciaData: typeof loadAsistenciaData,
        handleAsistenciaHuella: typeof window.handleAsistenciaHuella
    });
    console.log('===============================');
}

// ====== MANEJO DE ERRORES GLOBALES ======
window.addEventListener('error', (event) => {
    console.error('❌ Error global capturado:', event.error);
    showAlert('Ha ocurrido un error inesperado. Revise la consola para más detalles.', 'danger');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    showAlert('Error de red o servidor. Intente nuevamente.', 'warning');
});

// ====== EXPORTACIÓN GLOBAL ======
window.appUtils = {
    // Configuración
    API_URL,
    
    // Estado
    appState,
    
    // Funciones de utilidad
    showAlert,
    formatDate,
    confirmAction,
    debugAppState,
    
    // Socket
    getSocket,
    isSocketConnected,
    
    // Funciones de carga (se definen en otros archivos)
    loadMaterias: function() {
        if (typeof loadMaterias === 'function') {
            loadMaterias();
        } else {
            console.warn('⚠️ loadMaterias no está definida');
        }
    },
    
    loadEstudiantes: function() {
        if (typeof loadEstudiantes === 'function') {
            loadEstudiantes();
        } else {
            console.warn('⚠️ loadEstudiantes no está definida');
        }
    },
    
    loadAsistenciaData: function() {
        if (typeof loadAsistenciaData === 'function') {
            loadAsistenciaData();
        } else {
            console.warn('⚠️ loadAsistenciaData no está definida');
        }
    },
    
    // Navegación
    showSection,
    updateActiveNav,
    
    // Arduino
    checkArduinoStatus,
    updateArduinoStatus,
    
    // Manejo de huellas
    handleFingerprintScan
};

// Evento personalizado para cuando la app esté completamente lista
window.addEventListener('load', () => {
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('appReady', { 
            detail: { 
                socket: getSocket(), 
                appUtils: window.appUtils 
            }
        }));
        console.log('🎉 Aplicación completamente cargada y lista');
    }, 1500);
});

// Exponer función de debug globalmente
window.debugAppState = debugAppState;

console.log('📱 app.js cargado correctamente');
// Configuración y utilidades generales
const API_URL = '/api';
let socket;

// Estado global de la aplicación
const appState = {
    materias: [],
    estudiantes: [],
    materiaSeleccionada: null,
    arduinoConectado: false
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

window.appUtils = {
    API_URL: '/api',
    appState: {
        materias: [],
        estudiantes: [],
        materiaSeleccionada: null,
        arduinoConectado: false
    },
    showAlert,
    formatDate,
    confirmAction,
    loadMaterias: function() {
        // Solo una referencia - la función real está en materias.js
        if (typeof loadMaterias === 'function') {
            loadMaterias();
        } else {
            console.error('loadMaterias no está definida');
        }
    },
    loadEstudiantes: function() {
        // Solo una referencia - la función real está en estudiantes.js
        if (typeof loadEstudiantes === 'function') {
            loadEstudiantes();
        } else {
            console.error('loadEstudiantes no está definida');
        }
    },
    loadAsistenciaData: function() {
        // Solo una referencia - la función real está en asistencia.js
        if (typeof loadAsistenciaData === 'function') {
            loadAsistenciaData();
        } else {
            console.error('loadAsistenciaData no está definida');
        }
    }
};

// Modificar la inicialización para asegurar que todo se carga en el orden correcto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Socket.io primero
    initializeSocket();
    
    // Configurar eventos de navegación
    configureNavigation();
    
    // Verificar estado del Arduino
    checkArduinoStatus();
    // Configurar intervalo para verificar el estado del Arduino
    setInterval(checkArduinoStatus, 10000);
    // Esperar un momento para asegurar que los otros scripts se han cargado
    setTimeout(() => {
        // Cargar datos iniciales
        loadInitialData();
        
        // Configurar modales globales
        configureGlobalModals();
    }, 100);
});

// Configurar eventos de navegación
function configureNavigation() {
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

// Mostrar sección específica y ocultar las demás
function showSection(sectionName) {
    // Ocultar todas las secciones
    elements.materiasSection.classList.add('d-none');
    elements.estudiantesSection.classList.add('d-none');
    elements.asistenciaSection.classList.add('d-none');
    elements.papeleraSection.classList.add('d-none');
    
    // Mostrar la sección solicitada
    switch (sectionName) {
        case 'materias':
            elements.materiasSection.classList.remove('d-none');
            // Cargar datos actualizados de materias
            loadMaterias();
            break;
        case 'estudiantes':
            elements.estudiantesSection.classList.remove('d-none');
            // Cargar datos actualizados de estudiantes
            loadEstudiantes();
            break;
        case 'asistencia':
            elements.asistenciaSection.classList.remove('d-none');
            // Cargar datos para la sección de asistencia
            loadAsistenciaData();
            break;
        case 'papelera':
            elements.papeleraSection.classList.remove('d-none');
            // Cargar materias en papelera
            loadPapelera();
            break;
    }
}

// Actualizar navegación activa
function updateActiveNav(activeNavElement) {
    // Quitar clase activa de todos los elementos de navegación
    elements.navMaterias.classList.remove('active');
    elements.navEstudiantes.classList.remove('active');
    elements.navAsistencia.classList.remove('active');
    elements.navPapelera.classList.remove('active');
    
    // Añadir clase activa al elemento seleccionado
    activeNavElement.classList.add('active');
}

// Inicializar Socket.io
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Conexión con Socket.io establecida');
    });
    
    socket.on('disconnect', () => {
        console.log('Conexión con Socket.io perdida');
    });

    // En la función initializeSocket en app.js
    socket.on('arduino-status', (data) => {
        updateArduinoStatus(data.connected);
    });
    
    // Escuchar eventos de Socket.io
    socket.on('fingerprint-scan', (data) => {
        console.log('Huella escaneada:', data);
        handleFingerprintScan(data);
    });
    
    socket.on('nueva-asistencia', (data) => {
        console.log('Nueva asistencia registrada:', data);
        showAlert('Asistencia registrada: ' + data.estudiante.nombre, 'success');
        // Actualizar tabla de asistencia si es visible
        if (!elements.asistenciaSection.classList.contains('d-none')) {
            loadAsistenciaRecords();
        }
    });
    
    socket.on('asistencia-actualizada', (data) => {
        console.log('Asistencia actualizada:', data);
        // Actualizar tabla de asistencia si es visible
        if (!elements.asistenciaSection.classList.contains('d-none')) {
            loadAsistenciaRecords();
        }
    });
    
    socket.on('asistencia-eliminada', (data) => {
        console.log('Asistencia eliminada:', data);
        // Actualizar tabla de asistencia si es visible
        if (!elements.asistenciaSection.classList.contains('d-none')) {
            loadAsistenciaRecords();
        }
    });
    
    socket.on('arduino-status', (data) => {
        updateArduinoStatus(data.connected);
    });
}

// Verificar estado del Arduino
function checkArduinoStatus() {
    fetch(`${API_URL}/arduino/status`)
        .then(response => response.json())
        .then(data => {
            updateArduinoStatus(data.connected);
        })
        .catch(error => {
            console.error('Error al verificar estado del Arduino:', error);
            updateArduinoStatus(false);
        });
}



// Actualizar indicador de estado del Arduino
function updateArduinoStatus(connected) {
    appState.arduinoConectado = connected;
    
    if (connected) {
        elements.arduinoStatus.innerHTML = '<i class="bi bi-usb-fill text-success"></i> Arduino conectado';
        elements.arduinoStatus.classList.remove('desconectado');
        elements.arduinoStatus.classList.add('conectado');
    } else {
        elements.arduinoStatus.innerHTML = '<i class="bi bi-usb-fill text-danger"></i> Arduino desconectado';
        elements.arduinoStatus.classList.remove('conectado');
        elements.arduinoStatus.classList.add('desconectado');
    }
}

// Cargar datos iniciales
function loadInitialData() {
    // Cargar materias
    loadMaterias();
}

// Funciones para manejar eventos de huella digital
function handleFingerprintScan(data) {
    const huellaID = data.id;
    
    // Si hay un modal de registro de huella abierto
    const huellaProgress = document.getElementById('huella-progress');
    if (huellaProgress && !huellaProgress.classList.contains('d-none')) {
        // Estamos en proceso de registro de huella
        handleHuellaRegistration(huellaID);
        return;
    }
    
    // Si hay un modal de asistencia por huella abierto
    const registroHuellaContainer = document.getElementById('registro-huella-container');
    if (registroHuellaContainer && !registroHuellaContainer.classList.contains('d-none')) {
        // Estamos en proceso de registro de asistencia por huella
        handleAsistenciaHuella(huellaID);
        return;
    }
}

// Configurar modales globales
function configureGlobalModals() {
    // Modal de confirmación
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    if (modalConfirmacion) {
        modalConfirmacion.addEventListener('hidden.bs.modal', () => {
            // Limpiar datos cuando se cierre el modal
            document.getElementById('confirmacion-title').textContent = 'Confirmar acción';
            document.getElementById('confirmacion-mensaje').textContent = '¿Está seguro de realizar esta acción?';
            
            // Quitar evento del botón de confirmar
            const btnConfirmar = document.getElementById('btn-confirmar');
            const newBtnConfirmar = btnConfirmar.cloneNode(true);
            btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);
        });
    }
}

// Funciones de utilidad

// Mostrar mensaje de alerta
function showAlert(message, type = 'info', timeout = 5000) {
    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
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

// Formatear fecha
function formatDate(dateString, includeTime = false) {
    const date = new Date(dateString);
    
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('es-ES', options);
}

// Función para confirmar acción
function confirmAction(title, message, callback, btnText = 'Confirmar', btnType = 'danger') {
    const modalConfirmacion = new bootstrap.Modal(document.getElementById('modal-confirmacion'));
    
    document.getElementById('confirmacion-title').textContent = title;
    document.getElementById('confirmacion-mensaje').textContent = message;
    
    const btnConfirmar = document.getElementById('btn-confirmar');
    btnConfirmar.textContent = btnText;
    btnConfirmar.className = `btn btn-${btnType}`;
    
    btnConfirmar.addEventListener('click', () => {
        modalConfirmacion.hide();
        callback();
    });
    
    modalConfirmacion.show();
}

// Exportar funciones y variables globales
window.appUtils = {
    API_URL,
    appState,
    showAlert,
    formatDate,
    confirmAction,
    loadMaterias,
    loadEstudiantes,
    loadAsistenciaData
};
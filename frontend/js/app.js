// Configuración y utilidades generales
const API_URL = '/api';
let socket;
let currentUser = null;

// Estado global de la aplicación
const appState = {
    materias: [],
    estudiantes: [],
    materiaSeleccionada: null,
    arduinoConectado: false,
    arduinoReady: false,
    socketConnected: false,
    authenticated: false
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

// Función helper para fetch con autenticación
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        redirectToLogin();
        return;
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        credentials: 'include'
    };
    
    const response = await fetch(`${API_URL}${url}`, { ...defaultOptions, ...options });
    
    // Si el token expiró, redirigir al login
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        redirectToLogin();
        return;
    }
    
    return response;
}

// Redirigir al login
function redirectToLogin() {
    window.location.href = '/login';
}

// Verificar autenticación
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        redirectToLogin();
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentUser = data.usuario;
                appState.authenticated = true;
                
                // Verificar que sea docente (los admin deberían estar en /admin)
                if (currentUser.rol !== 'docente') {
                    if (currentUser.rol === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        showAlert('No tienes permisos para acceder a esta aplicación', 'danger');
                    }
                    return false;
                }
                
                // *** AGREGAR ESTAS LÍNEAS ***
                // Cargar perfil de usuario en el menú
                loadUserProfile();
                
                return true;
            }
        }
        
        throw new Error('Token inválido');
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        localStorage.removeItem('auth_token');
        redirectToLogin();
        return false;
    }
}

// 2. MODIFICAR LA FUNCIÓN DE INICIALIZACIÓN - Agregar después de configureGlobalModals();
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    // 1. Verificar autenticación primero
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;
    
    // 2. Inicializar Socket.io con autenticación
    initializeSocket();
    
    // 3. Configurar eventos de navegación
    configureNavigation();
    
    // 4. Verificar estado del Arduino
    checkArduinoStatus();
    
    // 5. Configurar verificación periódica del Arduino
    setInterval(checkArduinoStatus, 10000); // Cada 10 segundos
    
    // 6. Cargar datos iniciales después de un breve delay
    setTimeout(() => {
        loadInitialData();
        configureGlobalModals();
        
        // *** AGREGAR ESTAS LÍNEAS ***
        // Configurar menú de usuario y eventos de perfil
        setupUserMenu();
        setupProfileFormEvents();
        
        console.log('✅ Aplicación completamente inicializada');
    }, 1000);
});


// ====== INICIALIZACIÓN DE SOCKET.IO CON AUTENTICACIÓN ======
function initializeSocket() {
    console.log('🔌 Inicializando Socket.io con autenticación...');
    
    const token = localStorage.getItem('auth_token');
    
    socket = io({
        auth: {
            token: token
        }
    });
    
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
        if (error.message === 'Authentication error' || error.message === 'Invalid token') {
            localStorage.removeItem('auth_token');
            redirectToLogin();
        } else {
            showAlert('Error de conexión en tiempo real', 'warning');
        }
    });

    // Eventos del Arduino
    socket.on('arduino-status', (data) => {
        console.log('📟 Estado Arduino actualizado:', data);
        updateArduinoStatus(data.connected, data.ready);
    });
    
    // Eventos de huella digital
    socket.on('fingerprint-scan', (data) => {
        console.log('👆 Huella escaneada:', data);
        handleFingerprintScan(data);
    });
    
    // Eventos de progreso de huella (para registro de estudiantes)
    socket.on('huella-progress', (data) => {
        console.log('🔄 Progreso de huella:', data);
        if (window.registroHuellaEnProgreso) {
            console.log('Delegando evento huella-progress a estudiantes.js');
        }
    });
    
    socket.on('huella-registered', (data) => {
        console.log('✅ Huella registrada:', data);
        if (window.registroHuellaEnProgreso) {
            console.log('Delegando evento huella-registered a estudiantes.js');
        }
    });
    
    socket.on('huella-error', (data) => {
        console.log('❌ Error de huella:', data);
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
        if (!elements.asistenciaSection.classList.contains('d-none')) {
            if (typeof loadAsistenciaRecords === 'function') {
                loadAsistenciaRecords();
            }
        }
    });
    
    socket.on('asistencia-eliminada', (data) => {
        console.log('🗑️ Asistencia eliminada:', data);
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
    fetchWithAuth('/arduino/status')
        .then(response => response?.json())
        .then(data => {
            if (data) {
                updateArduinoStatus(data.connected, data.ready);
            }
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

// ====== MANEJO DE EVENTOS DE HUELLA ======
function handleFingerprintScan(data) {
    const huellaID = data.id;
    console.log(`👆 Procesando huella escaneada ID: ${huellaID}`);
    
    // 1. Verificar si hay un proceso de registro de huella en curso (estudiantes.js)
    if (window.registroHuellaEnProgreso) {
        console.log('🔄 Proceso de registro de huella en curso, delegando a estudiantes.js...');
        return;
    }
    
    // 2. Verificar si hay un proceso de asistencia por huella en curso
    if (window.asistenciaPorHuellaEnProgreso) {
        console.log('📝 Proceso de asistencia por huella en curso, procesando...');
        
        if (typeof window.handleAsistenciaHuella === 'function') {
            window.handleAsistenciaHuella(huellaID);
        } else {
            console.error('❌ Función window.handleAsistenciaHuella no encontrada');
        }
        return;
    }
    
    // 3. Si no hay procesos activos, mostrar información
    console.log('ℹ️ Huella detectada sin proceso activo');
    
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
    
    if (typeof loadMaterias === 'function') {
        loadMaterias();
    } else {
        console.warn('⚠️ Función loadMaterias no está disponible');
    }
    
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
    
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    if (modalConfirmacion) {
        modalConfirmacion.addEventListener('hidden.bs.modal', () => {
            document.getElementById('confirmacion-title').textContent = 'Confirmar acción';
            document.getElementById('confirmacion-mensaje').textContent = '¿Está seguro de realizar esta acción?';
            
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
    
    document.getElementById('confirmacion-title').textContent = title;
    document.getElementById('confirmacion-mensaje').textContent = message;
    
    const btnConfirmar = document.getElementById('btn-confirmar');
    if (btnConfirmar) {
        btnConfirmar.textContent = btnText;
        btnConfirmar.className = `btn btn-${btnType}`;
        
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

// ====== EXPORTACIÓN GLOBAL ======
window.appUtils = {
    // Configuración
    API_URL,
    
    // Estado
    appState,
    currentUser,
    
    // Funciones de utilidad
    showAlert,
    formatDate,
    confirmAction,
    fetchWithAuth,
    
    // Socket
    getSocket,
    isSocketConnected,
    
    // Funciones de carga
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

// ====== MANEJO DE ERRORES GLOBALES ======
window.addEventListener('error', (event) => {
    console.error('❌ Error global capturado:', event.error);
    showAlert('Ha ocurrido un error inesperado. Revise la consola para más detalles.', 'danger');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    showAlert('Error de red o servidor. Intente nuevamente.', 'warning');
});

// ====== FUNCIONES DE PERFIL DE USUARIO Y LOGOUT ======

// Variables para modales de perfil
let modalEditProfile = null;
let modalChangePassword = null;
    

// Elementos del menú de usuario
const userMenuElements = {
    currentUserName: document.getElementById('current-user-name'),
    userInfo: document.getElementById('user-info'),
    btnEditProfile: document.getElementById('btn-edit-profile'),
    btnChangePassword: document.getElementById('btn-change-password'),
    btnLogout: document.getElementById('btn-logout')
};

// Cargar información del perfil de usuario
function loadUserProfile() {
    if (!currentUser) return;
    
    console.log('👤 Cargando perfil de usuario:', currentUser.username);
    
    // Actualizar nombre en el menú
    if (userMenuElements.currentUserName) {
        userMenuElements.currentUserName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
    }
    
    // Actualizar información completa en dropdown
    if (userMenuElements.userInfo) {
        userMenuElements.userInfo.innerHTML = `
            <i class="bi bi-person me-2"></i>
            ${currentUser.nombre} ${currentUser.apellido}
            <br>
            <small class="text-muted">${currentUser.email}</small>
        `;
    }
    
    console.log('✅ Perfil de usuario cargado');
}

// Configurar eventos del menú de usuario
function setupUserMenu() {
    console.log('🔧 Configurando menú de usuario...');
    
    // Inicializar modales
    const modalEditProfileElement = document.getElementById('modal-edit-profile');
    const modalChangePasswordElement = document.getElementById('modal-change-password');
    
    if (modalEditProfileElement) {
        modalEditProfile = new bootstrap.Modal(modalEditProfileElement);
    }
    
    if (modalChangePasswordElement) {
        modalChangePassword = new bootstrap.Modal(modalChangePasswordElement);
    }
    
    // Configurar eventos
    if (userMenuElements.btnEditProfile) {
        userMenuElements.btnEditProfile.addEventListener('click', (e) => {
            e.preventDefault();
            showEditProfileModal();
        });
    }
    
    if (userMenuElements.btnChangePassword) {
        userMenuElements.btnChangePassword.addEventListener('click', (e) => {
            e.preventDefault();
            showChangePasswordModal();
        });
    }
    
    if (userMenuElements.btnLogout) {
        userMenuElements.btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    console.log('✅ Menú de usuario configurado');
}

// Mostrar modal de editar perfil
function showEditProfileModal() {
    if (!currentUser || !modalEditProfile) {
        showAlert('Error: No se puede cargar el perfil de usuario', 'danger');
        return;
    }
    
    console.log('📝 Abriendo modal de editar perfil');
    
    // Llenar formulario con datos actuales
    const formElements = {
        profileNombre: document.getElementById('profile-nombre'),
        profileApellido: document.getElementById('profile-apellido'),
        profileEmail: document.getElementById('profile-email'),
        profileUsername: document.getElementById('profile-username')
    };
    
    if (formElements.profileNombre) formElements.profileNombre.value = currentUser.nombre || '';
    if (formElements.profileApellido) formElements.profileApellido.value = currentUser.apellido || '';
    if (formElements.profileEmail) formElements.profileEmail.value = currentUser.email || '';
    if (formElements.profileUsername) formElements.profileUsername.value = currentUser.username || '';
    
    // Mostrar modal
    modalEditProfile.show();
}

// Guardar cambios del perfil
async function saveUserProfile() {
    console.log('💾 Guardando cambios del perfil...');
    
    const formElements = {
        profileNombre: document.getElementById('profile-nombre'),
        profileApellido: document.getElementById('profile-apellido'),
        profileEmail: document.getElementById('profile-email'),
        profileUsername: document.getElementById('profile-username')
    };
    
    // Validar que todos los campos estén llenos
    if (!formElements.profileNombre?.value.trim() || 
        !formElements.profileApellido?.value.trim() || 
        !formElements.profileEmail?.value.trim() || 
        !formElements.profileUsername?.value.trim()) {
        showAlert('Todos los campos son obligatorios', 'warning');
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formElements.profileEmail.value.trim())) {
        showAlert('Por favor, ingrese un email válido', 'warning');
        return;
    }
    
    const profileData = {
        nombre: formElements.profileNombre.value.trim(),
        apellido: formElements.profileApellido.value.trim(),
        email: formElements.profileEmail.value.trim().toLowerCase(),
        username: formElements.profileUsername.value.trim().toLowerCase()
    };
    
    // Mostrar indicador de carga
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.disabled = true;
        btnSaveProfile.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Guardando...
        `;
    }
    
    try {
        const response = await fetchWithAuth('/auth/actualizar-perfil', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        
        if (!response) return;
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Actualizar usuario actual
            currentUser = { ...currentUser, ...profileData };
            
            // Actualizar interfaz
            loadUserProfile();
            
            // Cerrar modal
            modalEditProfile.hide();
            
            showAlert('Perfil actualizado correctamente', 'success');
            console.log('✅ Perfil actualizado exitosamente');
        } else {
            throw new Error(data.error || 'Error al actualizar perfil');
        }
        
    } catch (error) {
        console.error('❌ Error al actualizar perfil:', error);
        showAlert(error.message, 'danger');
    } finally {
        // Restaurar botón
        if (btnSaveProfile) {
            btnSaveProfile.disabled = false;
            btnSaveProfile.innerHTML = `
                <i class="bi bi-save me-2"></i>Guardar Cambios
            `;
        }
    }
}

// Mostrar modal de cambiar contraseña
function showChangePasswordModal() {
    if (!modalChangePassword) {
        showAlert('Error: Modal de cambiar contraseña no disponible', 'danger');
        return;
    }
    
    console.log('🔑 Abriendo modal de cambiar contraseña');
    
    // Limpiar formulario
    const formElements = {
        currentPassword: document.getElementById('current-password'),
        newPassword: document.getElementById('new-password'),
        confirmNewPassword: document.getElementById('confirm-new-password')
    };
    
    Object.values(formElements).forEach(element => {
        if (element) element.value = '';
    });
    
    // Mostrar modal
    modalChangePassword.show();
}

// Cambiar contraseña del usuario
async function changeUserPassword() {
    console.log('🔐 Cambiando contraseña de usuario...');
    
    const formElements = {
        currentPassword: document.getElementById('current-password'),
        newPassword: document.getElementById('new-password'),
        confirmNewPassword: document.getElementById('confirm-new-password')
    };
    
    // Validar que todos los campos estén llenos
    if (!formElements.currentPassword?.value || 
        !formElements.newPassword?.value || 
        !formElements.confirmNewPassword?.value) {
        showAlert('Todos los campos son obligatorios', 'warning');
        return;
    }
    
    // Validar que la nueva contraseña tenga al menos 6 caracteres
    if (formElements.newPassword.value.length < 6) {
        showAlert('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
        return;
    }
    
    // Validar que las contraseñas coincidan
    if (formElements.newPassword.value !== formElements.confirmNewPassword.value) {
        showAlert('Las contraseñas nuevas no coinciden', 'warning');
        return;
    }
    
    // Validar que la nueva contraseña sea diferente a la actual
    if (formElements.currentPassword.value === formElements.newPassword.value) {
        showAlert('La nueva contraseña debe ser diferente a la actual', 'warning');
        return;
    }
    
    const passwordData = {
        passwordActual: formElements.currentPassword.value,
        passwordNueva: formElements.newPassword.value
    };
    
    // Mostrar indicador de carga
    const btnSavePassword = document.getElementById('btn-save-password');
    if (btnSavePassword) {
        btnSavePassword.disabled = true;
        btnSavePassword.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Cambiando...
        `;
    }
    
    try {
        const response = await fetchWithAuth('/auth/cambiar-password', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
        
        if (!response) return;
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Cerrar modal
            modalChangePassword.hide();
            
            showAlert('Contraseña cambiada correctamente', 'success');
            console.log('✅ Contraseña cambiada exitosamente');
            
            // Opcional: Limpiar formulario
            Object.values(formElements).forEach(element => {
                if (element) element.value = '';
            });
        } else {
            throw new Error(data.error || 'Error al cambiar contraseña');
        }
        
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        let errorMessage = error.message;
        
        // Personalizar mensajes de error comunes
        if (errorMessage.includes('incorrecta')) {
            errorMessage = 'La contraseña actual es incorrecta';
        } else if (errorMessage.includes('TOKEN_EXPIRED')) {
            errorMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente';
            setTimeout(() => {
                redirectToLogin();
            }, 2000);
        }
        
        showAlert(errorMessage, 'danger');
    } finally {
        // Restaurar botón
        if (btnSavePassword) {
            btnSavePassword.disabled = false;
            btnSavePassword.innerHTML = `
                <i class="bi bi-key me-2"></i>Cambiar Contraseña
            `;
        }
    }
}

// Cerrar sesión
function logout() {
    console.log('🚪 Iniciando proceso de cierre de sesión...');
    
    confirmAction(
        'Cerrar Sesión',
        '¿Está seguro de que desea cerrar sesión?',
        async () => {
            console.log('✅ Usuario confirmó cierre de sesión');
            
            try {
                // Notificar al servidor sobre el logout
                const response = await fetchWithAuth('/auth/logout', {
                    method: 'POST'
                });
                
                // No importa si falla la solicitud al servidor, proceder con el logout local
                if (response) {
                    const data = await response.json();
                    console.log('📡 Respuesta del servidor al logout:', data);
                }
                
            } catch (error) {
                console.warn('⚠️ Error al notificar logout al servidor (continuando):', error);
            }
            
            // Limpiar datos locales
            localStorage.removeItem('auth_token');
            localStorage.removeItem('remembered_username'); // Opcional: mantener usuario recordado
            
            // Limpiar variables globales
            currentUser = null;
            appState.authenticated = false;
            
            // Cerrar conexión de socket si existe
            if (socket && socket.connected) {
                console.log('🔌 Cerrando conexión de socket...');
                socket.disconnect();
            }
            
            console.log('🧹 Datos de sesión limpiados');
            
            // Mostrar mensaje de despedida
            showAlert('Sesión cerrada correctamente. Redirigiendo...', 'success', 2000);
            
            // Redirigir al login después de un breve delay
            setTimeout(() => {
                console.log('🔄 Redirigiendo al login...');
                window.location.href = '/login';
            }, 1500);
        },
        'Cerrar Sesión',
        'danger'
    );
}

// Configurar eventos de formularios en modales
function setupProfileFormEvents() {
    // Evento para guardar perfil
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', saveUserProfile);
    }
    
    const formEditProfile = document.getElementById('form-edit-profile');
    if (formEditProfile) {
        formEditProfile.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUserProfile();
        });
    }
    
    // Evento para cambiar contraseña
    const btnSavePassword = document.getElementById('btn-save-password');
    if (btnSavePassword) {
        btnSavePassword.addEventListener('click', changeUserPassword);
    }
    
    const formChangePassword = document.getElementById('form-change-password');
    if (formChangePassword) {
        formChangePassword.addEventListener('submit', (e) => {
            e.preventDefault();
            changeUserPassword();
        });
    }
    
    console.log('✅ Eventos de formularios de perfil configurados');
}


// Exportar funciones al objeto global appUtils
if (window.appUtils) {
    window.appUtils.loadUserProfile = loadUserProfile;
    window.appUtils.setupUserMenu = setupUserMenu;
    window.appUtils.logout = logout;
    window.appUtils.showEditProfileModal = showEditProfileModal;
    window.appUtils.showChangePasswordModal = showChangePasswordModal;
}

console.log('📱 app.js cargado correctamente');
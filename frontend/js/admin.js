// Configuración global
const API_URL = '/api';
let currentUser = null;
let users = [];
let currentPage = 1;
let totalPages = 1;

// Elementos DOM
const elements = {
    // Usuario actual
    currentUserName: document.getElementById('current-user-name'),
    btnLogout: document.getElementById('btn-logout'),
    btnChangePassword: document.getElementById('btn-change-password'),
    btnGoToApp: document.getElementById('btn-go-to-app'),
    
    // Estadísticas
    statTotalUsers: document.getElementById('stat-total-users'),
    statActiveUsers: document.getElementById('stat-active-users'),
    statAdmins: document.getElementById('stat-admins'),
    statTeachers: document.getElementById('stat-teachers'),
    
    // Tabla de usuarios
    usersTableBody: document.getElementById('users-table-body'),
    searchUsers: document.getElementById('search-users'),
    filterRole: document.getElementById('filter-role'),
    filterStatus: document.getElementById('filter-status'),
    btnClearFilters: document.getElementById('btn-clear-filters'),
    pagination: document.getElementById('pagination'),
    noUsersMessage: document.getElementById('no-users-message'),
    
    // Botones
    btnNewUser: document.getElementById('btn-new-user'),
    
    // Modal de usuario
    modalUser: new bootstrap.Modal(document.getElementById('modal-user')),
    modalUserTitle: document.getElementById('modal-user-title'),
    formUser: document.getElementById('form-user'),
    userId: document.getElementById('user-id'),
    userUsername: document.getElementById('user-username'),
    userEmail: document.getElementById('user-email'),
    userNombre: document.getElementById('user-nombre'),
    userApellido: document.getElementById('user-apellido'),
    userRol: document.getElementById('user-rol'),
    userEstado: document.getElementById('user-estado'),
    userPassword: document.getElementById('user-password'),
    passwordSection: document.getElementById('password-section'),
    passwordRequired: document.getElementById('password-required'),
    passwordHelp: document.getElementById('password-help'),
    toggleUserPassword: document.getElementById('toggle-user-password'),
    btnSaveUser: document.getElementById('btn-save-user'),
    saveSpinner: document.getElementById('save-spinner'),
    
    // Modal de cambiar contraseña
    modalChangePassword: new bootstrap.Modal(document.getElementById('modal-change-password')),
    formChangePassword: document.getElementById('form-change-password'),
    currentPassword: document.getElementById('current-password'),
    newPassword: document.getElementById('new-password'),
    confirmPassword: document.getElementById('confirm-password'),
    btnSavePassword: document.getElementById('btn-save-password'),
    
    // Modal de confirmación
    modalConfirm: new bootstrap.Modal(document.getElementById('modal-confirm')),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    btnConfirm: document.getElementById('btn-confirm'),
    
    // Alertas
    alertsContainer: document.getElementById('alerts-container')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando panel de administración...');
    
    // Verificar autenticación
    await checkAuth();
    
    // Configurar eventos
    setupEventListeners();
    
    // Cargar datos iniciales
    await loadInitialData();
    
    console.log('✅ Panel de administración listo');
});

// Verificar autenticación y permisos
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        redirectToLogin();
        return;
    }
    
    try {
        const response = await fetchWithAuth('/auth/me');
        const data = await response.json();
        
        if (response.ok && data.success) {
            currentUser = data.usuario;
            
            // Verificar que sea admin
            if (currentUser.rol !== 'admin') {
                showAlert('No tienes permisos para acceder a esta sección', 'danger');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }
            
            // Actualizar interfaz con datos del usuario
            elements.currentUserName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
            
        } else {
            throw new Error('Token inválido');
        }
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        redirectToLogin();
    }
}

// Redirigir al login
function redirectToLogin() {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
}

// Función helper para fetch con autenticación
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        credentials: 'include'
    };
    
    return fetch(`${API_URL}${url}`, { ...defaultOptions, ...options });
}

// Configurar event listeners
function setupEventListeners() {
    // Logout
    elements.btnLogout.addEventListener('click', logout);
    
    // Cambiar contraseña
    elements.btnChangePassword.addEventListener('click', () => {
        elements.modalChangePassword.show();
    });
    
    // Ir a la aplicación principal
    elements.btnGoToApp.addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // Nuevo usuario
    elements.btnNewUser.addEventListener('click', showNewUserModal);
    
    // Búsqueda y filtros
    elements.searchUsers.addEventListener('input', debounce(loadUsers, 300));
    elements.filterRole.addEventListener('change', loadUsers);
    elements.filterStatus.addEventListener('change', loadUsers);
    elements.btnClearFilters.addEventListener('click', clearFilters);
    
    // Guardar usuario
    elements.btnSaveUser.addEventListener('click', saveUser);
    elements.formUser.addEventListener('submit', (e) => {
        e.preventDefault();
        saveUser();
    });
    
    // Mostrar/ocultar contraseña en modal de usuario
    elements.toggleUserPassword.addEventListener('click', () => {
        const type = elements.userPassword.type === 'password' ? 'text' : 'password';
        elements.userPassword.setAttribute('type', type);
        
        const icon = elements.toggleUserPassword.querySelector('i');
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });
    
    // Cambiar contraseña
    elements.btnSavePassword.addEventListener('click', changePassword);
    elements.formChangePassword.addEventListener('submit', (e) => {
        e.preventDefault();
        changePassword();
    });
}

// Función debounce para búsqueda
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Logout
async function logout() {
    try {
        await fetchWithAuth('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Error en logout:', error);
    } finally {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
    }
}

// Cargar datos iniciales
async function loadInitialData() {
    await Promise.all([
        loadStatistics(),
        loadUsers()
    ]);
}

// Cargar estadísticas
async function loadStatistics() {
    try {
        const response = await fetchWithAuth('/usuarios/estadisticas/resumen');
        const data = await response.json();
        
        if (response.ok && data.success) {
            const stats = data.estadisticas;
            elements.statTotalUsers.textContent = stats.totalUsuarios;
            elements.statActiveUsers.textContent = stats.usuariosActivos;
            elements.statAdmins.textContent = stats.totalAdmins;
            elements.statTeachers.textContent = stats.totalDocentes;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showAlert('Error al cargar estadísticas', 'warning');
    }
}

// Cargar usuarios
async function loadUsers(page = 1) {
    try {
        currentPage = page;
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            search: elements.searchUsers.value.trim(),
            rol: elements.filterRole.value,
            estado: elements.filterStatus.value
        });
        
        const response = await fetchWithAuth(`/usuarios?${params}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            users = data.usuarios;
            renderUsers(users);
            renderPagination(data.paginacion);
        } else {
            throw new Error(data.error || 'Error al cargar usuarios');
        }
        
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showAlert('Error al cargar usuarios', 'danger');
        renderUsers([]);
    }
}

// Renderizar usuarios en la tabla
function renderUsers(usersList) {
    elements.usersTableBody.innerHTML = '';
    
    if (usersList.length === 0) {
        elements.noUsersMessage.classList.remove('d-none');
        return;
    }
    
    elements.noUsersMessage.classList.add('d-none');
    
    usersList.forEach(user => {
        const row = document.createElement('tr');
        
        // Avatar del usuario
        const avatarClass = user.rol === 'admin' ? 'admin' : 'docente';
        const initials = `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase();
        
        // Estado del usuario
        const statusBadge = user.estado === 'activo' 
            ? '<span class="badge bg-success status-badge">Activo</span>'
            : '<span class="badge bg-danger status-badge">Inactivo</span>';
        
        // Rol del usuario
        const roleBadge = user.rol === 'admin'
            ? '<span class="badge bg-danger">Administrador</span>'
            : '<span class="badge bg-primary">Docente</span>';
        
        // Último acceso
        const lastAccess = user.ultimoAcceso 
            ? formatDate(user.ultimoAcceso, true)
            : 'Nunca';
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar ${avatarClass}">${initials}</div>
                    <div>
                        <div class="fw-bold">${user.username}</div>
                        <small class="text-muted">ID: ${user._id.slice(-8)}</small>
                    </div>
                </div>
            </td>
            <td>
                <div class="fw-bold">${user.nombre} ${user.apellido}</div>
                <small class="text-muted">Creado: ${formatDate(user.fechaCreacion)}</small>
            </td>
            <td>${user.email}</td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <small>${lastAccess}</small>
            </td>
            <td class="table-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="editUser('${user._id}')" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="resetPassword('${user._id}')" title="Resetear contraseña">
                    <i class="bi bi-key"></i>
                </button>
                ${user._id !== currentUser.id ? 
                    `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>` : 
                    ''
                }
            </td>
        `;
        
        elements.usersTableBody.appendChild(row);
    });
}

// Renderizar paginación
function renderPagination(paginacion) {
    const { paginaActual, totalPaginas } = paginacion;
    totalPages = totalPaginas;
    
    elements.pagination.innerHTML = '';
    
    if (totalPaginas <= 1) return;
    
    // Botón anterior
    const prevDisabled = paginaActual === 1 ? 'disabled' : '';
    elements.pagination.innerHTML += `
        <li class="page-item ${prevDisabled}">
            <a class="page-link" href="#" onclick="loadUsers(${paginaActual - 1})">Anterior</a>
        </li>
    `;
    
    // Páginas
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === paginaActual || i === 1 || i === totalPaginas || 
            (i >= paginaActual - 1 && i <= paginaActual + 1)) {
            
            const active = i === paginaActual ? 'active' : '';
            elements.pagination.innerHTML += `
                <li class="page-item ${active}">
                    <a class="page-link" href="#" onclick="loadUsers(${i})">${i}</a>
                </li>
            `;
        } else if (i === paginaActual - 2 || i === paginaActual + 2) {
            elements.pagination.innerHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }
    
    // Botón siguiente
    const nextDisabled = paginaActual === totalPaginas ? 'disabled' : '';
    elements.pagination.innerHTML += `
        <li class="page-item ${nextDisabled}">
            <a class="page-link" href="#" onclick="loadUsers(${paginaActual + 1})">Siguiente</a>
        </li>
    `;
}

// Mostrar modal de nuevo usuario
function showNewUserModal() {
    elements.formUser.reset();
    elements.userId.value = '';
    elements.modalUserTitle.textContent = 'Nuevo Usuario';
    
    // Mostrar campos de contraseña como requeridos
    elements.passwordSection.style.display = 'block';
    elements.passwordRequired.style.display = 'inline';
    elements.userPassword.required = true;
    elements.passwordHelp.textContent = 'Mínimo 6 caracteres';
    
    elements.modalUser.show();
}

// Editar usuario
function editUser(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;
    
    elements.userId.value = user._id;
    elements.userUsername.value = user.username;
    elements.userEmail.value = user.email;
    elements.userNombre.value = user.nombre;
    elements.userApellido.value = user.apellido;
    elements.userRol.value = user.rol;
    elements.userEstado.value = user.estado;
    
    // Ocultar campos de contraseña para edición
    elements.passwordSection.style.display = 'none';
    elements.userPassword.required = false;
    elements.userPassword.value = '';
    
    elements.modalUserTitle.textContent = 'Editar Usuario';
    elements.modalUser.show();
}

// Guardar usuario
async function saveUser() {
    if (!elements.formUser.checkValidity()) {
        elements.formUser.reportValidity();
        return;
    }
    
    const isEditing = elements.userId.value !== '';
    const userData = {
        username: elements.userUsername.value.trim(),
        email: elements.userEmail.value.trim(),
        nombre: elements.userNombre.value.trim(),
        apellido: elements.userApellido.value.trim(),
        rol: elements.userRol.value,
        estado: elements.userEstado.value
    };
    
    // Solo incluir contraseña si es un nuevo usuario o si se proporcionó
    if (!isEditing && elements.userPassword.value) {
        userData.password = elements.userPassword.value;
    }
    
    // Mostrar spinner
    elements.saveSpinner.classList.remove('d-none');
    elements.btnSaveUser.disabled = true;
    
    try {
        const url = isEditing ? `/usuarios/${elements.userId.value}` : '/usuarios';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetchWithAuth(url, {
            method,
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            elements.modalUser.hide();
            showAlert(`Usuario ${isEditing ? 'actualizado' : 'creado'} correctamente`, 'success');
            
            // Recargar datos
            await Promise.all([
                loadStatistics(),
                loadUsers(currentPage)
            ]);
        } else {
            throw new Error(data.error || 'Error al guardar usuario');
        }
        
    } catch (error) {
        console.error('Error al guardar usuario:', error);
        showAlert(error.message, 'danger');
    } finally {
        elements.saveSpinner.classList.add('d-none');
        elements.btnSaveUser.disabled = false;
    }
}

// Resetear contraseña de usuario
function resetPassword(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;
    
    const newPassword = prompt(`Nueva contraseña para ${user.username}:\n(Mínimo 6 caracteres)`);
    
    if (!newPassword || newPassword.length < 6) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'warning');
        return;
    }
    
    confirmAction(
        'Resetear Contraseña',
        `¿Está seguro de cambiar la contraseña de ${user.username}?`,
        async () => {
            try {
                const response = await fetchWithAuth(`/usuarios/${userId}/password`, {
                    method: 'PUT',
                    body: JSON.stringify({ password: newPassword })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    showAlert('Contraseña actualizada correctamente', 'success');
                } else {
                    throw new Error(data.error || 'Error al cambiar contraseña');
                }
                
            } catch (error) {
                console.error('Error al cambiar contraseña:', error);
                showAlert(error.message, 'danger');
            }
        }
    );
}

// Eliminar usuario
function deleteUser(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;
    
    confirmAction(
        'Eliminar Usuario',
        `¿Está seguro de eliminar al usuario "${user.username}"?\n\nEsta acción no se puede deshacer.`,
        async () => {
            try {
                const response = await fetchWithAuth(`/usuarios/${userId}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    showAlert('Usuario eliminado correctamente', 'success');
                    
                    // Recargar datos
                    await Promise.all([
                        loadStatistics(),
                        loadUsers(currentPage)
                    ]);
                } else {
                    throw new Error(data.error || 'Error al eliminar usuario');
                }
                
            } catch (error) {
                console.error('Error al eliminar usuario:', error);
                showAlert(error.message, 'danger');
            }
        }
    );
}

// Cambiar contraseña del usuario actual
async function changePassword() {
    if (!elements.formChangePassword.checkValidity()) {
        elements.formChangePassword.reportValidity();
        return;
    }
    
    const currentPassword = elements.currentPassword.value;
    const newPassword = elements.newPassword.value;
    const confirmPassword = elements.confirmPassword.value;
    
    if (newPassword !== confirmPassword) {
        showAlert('Las contraseñas no coinciden', 'warning');
        return;
    }
    
    try {
        const response = await fetchWithAuth('/auth/cambiar-password', {
            method: 'PUT',
            body: JSON.stringify({
                passwordActual: currentPassword,
                passwordNueva: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            elements.modalChangePassword.hide();
            elements.formChangePassword.reset();
            showAlert('Contraseña cambiada correctamente', 'success');
        } else {
            throw new Error(data.error || 'Error al cambiar contraseña');
        }
        
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        showAlert(error.message, 'danger');
    }
}

// Limpiar filtros
function clearFilters() {
    elements.searchUsers.value = '';
    elements.filterRole.value = 'todos';
    elements.filterStatus.value = 'todos';
    loadUsers(1);
}

// Función para mostrar confirmación
function confirmAction(title, message, callback) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    
    // Limpiar event listeners anteriores
    const newBtn = elements.btnConfirm.cloneNode(true);
    elements.btnConfirm.parentNode.replaceChild(newBtn, elements.btnConfirm);
    elements.btnConfirm = newBtn;
    
    elements.btnConfirm.addEventListener('click', () => {
        elements.modalConfirm.hide();
        callback();
    });
    
    elements.modalConfirm.show();
}

// Función para mostrar alertas
function showAlert(message, type = 'info') {
    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="bi bi-${getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    elements.alertsContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto-hide después de 5 segundos
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.classList.remove('show');
            setTimeout(() => alertElement.remove(), 300);
        }
    }, 5000);
}

// Obtener icono para alertas
function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle',
        'primary': 'info-circle'
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

// Funciones globales (para usar en onclick)
window.editUser = editUser;
window.deleteUser = deleteUser;
window.resetPassword = resetPassword;
window.loadUsers = loadUsers;
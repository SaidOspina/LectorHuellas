window.asistenciaPorHuellaEnProgreso = false;
window.materiaAsistenciaActual = null;

// Elementos DOM relacionados con asistencia
const asistenciaElements = {
    // Tabs de asistencia
    tabRegistro: document.getElementById('tab-registro'),
    tabReportes: document.getElementById('tab-reportes'),
    registroTabContent: document.getElementById('registro-tab-content'),
    reportesTabContent: document.getElementById('reportes-tab-content'),
    
    // Filtros y tabla de registro
    asistenciaMateria: document.getElementById('asistencia-materia'),
    asistenciaFecha: document.getElementById('asistencia-fecha'),
    btnFiltrarAsistencia: document.getElementById('btn-filtrar-asistencia'),
    asistenciaTable: document.getElementById('asistencia-table'),
    asistenciaTableBody: document.querySelector('#asistencia-table tbody'),
    asistenciaEmpty: document.getElementById('asistencia-empty'),
    
    // Botones de acción
    btnRegistrarAsistencia: document.getElementById('btn-registrar-asistencia'),
    btnAsistenciaMasiva: document.getElementById('btn-asistencia-masiva'),
    
    // Modal de registro de asistencia
    modalAsistencia: new bootstrap.Modal(document.getElementById('modal-asistencia')),
    formAsistencia: document.getElementById('form-asistencia'),
    asistenciaModalMateria: document.getElementById('asistencia-modal-materia'),
    metodoHuella: document.getElementById('metodo-huella'),
    metodoManual: document.getElementById('metodo-manual'),
    registroHuellaContainer: document.getElementById('registro-huella-container'),
    registroManualContainer: document.getElementById('registro-manual-container'),
    asistenciaEstudiante: document.getElementById('asistencia-estudiante'),
    asistenciaFechaHora: document.getElementById('asistencia-fecha-hora'),
    asistenciaPresente: document.getElementById('asistencia-presente'),
    huellaAsistenciaStatus: document.getElementById('huella-asistencia-status'),
    btnGuardarAsistenciaManual: document.getElementById('btn-guardar-asistencia-manual'),
    
    // Modal de asistencia masiva
    modalAsistenciaMasiva: new bootstrap.Modal(document.getElementById('modal-asistencia-masiva')),
    formAsistenciaMasiva: document.getElementById('form-asistencia-masiva'),
    asistenciaMasivaMateria: document.getElementById('asistencia-masiva-materia'),
    asistenciaMasivaFecha: document.getElementById('asistencia-masiva-fecha'),
    asistenciaMasivaTable: document.getElementById('asistencia-masiva-table'),
    asistenciaMasivaTableBody: document.querySelector('#asistencia-masiva-table tbody'),
    asistenciaMasivaEmpty: document.getElementById('asistencia-masiva-empty'),
    checkAllEstudiantes: document.getElementById('check-all-estudiantes'),
    btnGuardarAsistenciaMasiva: document.getElementById('btn-guardar-asistencia-masiva'),
    
    // Sección de reportes
    reporteMateria: document.getElementById('reporte-materia'),
    reporteFechaInicio: document.getElementById('reporte-fecha-inicio'),
    reporteFechaFin: document.getElementById('reporte-fecha-fin'),
    btnGenerarReporte: document.getElementById('btn-generar-reporte'),
    reporteResultado: document.getElementById('reporte-resultado')
};

// Variables para la gestión de asistencia
let asistenciaPorHuellaEnProgreso = false;
let materiaAsistenciaActual = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Configurar eventos de las pestañas
    if (asistenciaElements.tabRegistro) {
        asistenciaElements.tabRegistro.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarTabRegistro();
        });
    }
    
    if (asistenciaElements.tabReportes) {
        asistenciaElements.tabReportes.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarTabReportes();
        });
    }
    
    // Inicializar fecha actual en los campos de fecha
    const fechaActual = new Date().toISOString().split('T')[0];
    
    if (asistenciaElements.asistenciaFecha) {
        asistenciaElements.asistenciaFecha.value = fechaActual;
    }
    
    if (asistenciaElements.asistenciaMasivaFecha) {
        asistenciaElements.asistenciaMasivaFecha.value = fechaActual;
    }
    
    if (asistenciaElements.asistenciaFechaHora) {
        const ahora = new Date().toISOString().slice(0, 16);
        asistenciaElements.asistenciaFechaHora.value = ahora;
    }
    
    // Configurar fechas para reportes
    if (asistenciaElements.reporteFechaInicio) {
        // Primer día del mes actual
        const primerDia = new Date();
        primerDia.setDate(1);
        asistenciaElements.reporteFechaInicio.value = primerDia.toISOString().split('T')[0];
    }
    
    if (asistenciaElements.reporteFechaFin) {
        asistenciaElements.reporteFechaFin.value = fechaActual;
    }
    
    // Configurar eventos para botones y acciones
    setupEventListeners();

    setupModalEvents();
    
    // Escuchar eventos de socket para asistencia
    setupSocketEvents();
}); 

// Configurar listeners de eventos
function setupEventListeners() {
    // Evento para filtrar asistencia
    if (asistenciaElements.btnFiltrarAsistencia) {
        asistenciaElements.btnFiltrarAsistencia.addEventListener('click', cargarRegistrosAsistencia);
    }
    
    // Eventos para registrar asistencia
    if (asistenciaElements.btnRegistrarAsistencia) {
        asistenciaElements.btnRegistrarAsistencia.addEventListener('click', abrirModalRegistroAsistencia);
    }
    
    // Eventos para asistencia masiva
    if (asistenciaElements.btnAsistenciaMasiva) {
        asistenciaElements.btnAsistenciaMasiva.addEventListener('click', abrirModalAsistenciaMasiva);
    }
    
    // Eventos para el método de registro de asistencia
    if (asistenciaElements.metodoHuella && asistenciaElements.metodoManual) {
        asistenciaElements.metodoHuella.addEventListener('change', toggleMetodoRegistroAsistencia);
        asistenciaElements.metodoManual.addEventListener('change', toggleMetodoRegistroAsistencia);
    }
    
    // Evento para cambio de materia en modal de asistencia
    if (asistenciaElements.asistenciaModalMateria) {
        asistenciaElements.asistenciaModalMateria.addEventListener('change', cargarEstudiantesParaAsistencia);
    }
    
    // Evento para guardar asistencia manual
    if (asistenciaElements.btnGuardarAsistenciaManual) {
        asistenciaElements.btnGuardarAsistenciaManual.addEventListener('click', guardarAsistenciaManual);
    }
    
    // Evento para cambio de materia en asistencia masiva
    if (asistenciaElements.asistenciaMasivaMateria) {
        asistenciaElements.asistenciaMasivaMateria.addEventListener('change', cargarEstudiantesParaAsistenciaMasiva);
    }
    
    // Evento para seleccionar/deseleccionar todos los estudiantes
    if (asistenciaElements.checkAllEstudiantes) {
        asistenciaElements.checkAllEstudiantes.addEventListener('change', toggleSelectAllEstudiantes);
    }
    
    // Evento para guardar asistencia masiva
    if (asistenciaElements.btnGuardarAsistenciaMasiva) {
        asistenciaElements.btnGuardarAsistenciaMasiva.addEventListener('click', guardarAsistenciaMasiva);
    }
    
    // Evento para generar reporte
    if (asistenciaElements.btnGenerarReporte) {
        asistenciaElements.btnGenerarReporte.addEventListener('click', generarReporteAsistencia);
    }
}

// Configurar eventos de socket.io para asistencia
function setupSocketEvents() {
    // Esperar a que el socket esté disponible
    const waitForSocket = () => {
        const currentSocket = window.socket || window.appSocket || (typeof socket !== 'undefined' ? socket : null);
        
        if (!currentSocket) {
            console.log('Socket no disponible, reintentando...');
            setTimeout(waitForSocket, 500);
            return;
        }
        
        console.log('✅ Configurando eventos de socket para asistencia...');
        
        // Escuchar evento de huella escaneada
        currentSocket.on('fingerprint-scan', (data) => {
            console.log('🔍 Huella escaneada en asistencia:', data);
            if (window.asistenciaPorHuellaEnProgreso && window.materiaAsistenciaActual) {
                handleRegistroAsistenciaPorHuella(data.id);
            }
        });
        
        // Escuchar evento de nueva asistencia
        currentSocket.on('nueva-asistencia', (data) => {
            console.log('📝 Nueva asistencia registrada:', data);
            // Recargar registros si estamos en la pestaña de asistencia
            if (!asistenciaElements.registroTabContent.classList.contains('d-none')) {
                cargarRegistrosAsistencia();
            }
        });
        
        // Escuchar evento de asistencia actualizada
        currentSocket.on('asistencia-actualizada', (data) => {
            console.log('✏️ Asistencia actualizada:', data);
            if (!asistenciaElements.registroTabContent.classList.contains('d-none')) {
                cargarRegistrosAsistencia();
            }
        });
        
        // Escuchar evento de asistencia eliminada
        currentSocket.on('asistencia-eliminada', (data) => {
            console.log('🗑️ Asistencia eliminada:', data);
            if (!asistenciaElements.registroTabContent.classList.contains('d-none')) {
                cargarRegistrosAsistencia();
            }
        });
        
        // Escuchar evento de asistencia masiva
        currentSocket.on('asistencia-masiva', (data) => {
            console.log('📊 Asistencia masiva registrada:', data);
            if (!asistenciaElements.registroTabContent.classList.contains('d-none')) {
                cargarRegistrosAsistencia();
            }
        });
    };
    
    waitForSocket();
}



// Cargar datos iniciales para la sección de asistencia
function loadAsistenciaData() {
    // Cargar materias en selectores
    if (window.updateMateriasSelectors) {
        window.updateMateriasSelectors();
    }
    
    // Cargar registros de asistencia con los filtros actuales
    cargarRegistrosAsistencia();
}

// Funciones para tabs
function mostrarTabRegistro() {
    // Actualizar clases activas de las pestañas
    asistenciaElements.tabRegistro.classList.add('active');
    asistenciaElements.tabReportes.classList.remove('active');
    
    // Mostrar/ocultar contenido
    asistenciaElements.registroTabContent.classList.remove('d-none');
    asistenciaElements.reportesTabContent.classList.add('d-none');
    
    // Cargar datos actualizados
    cargarRegistrosAsistencia();
}

function mostrarTabReportes() {
    // Actualizar clases activas de las pestañas
    asistenciaElements.tabRegistro.classList.remove('active');
    asistenciaElements.tabReportes.classList.add('active');
    
    // Mostrar/ocultar contenido
    asistenciaElements.registroTabContent.classList.add('d-none');
    asistenciaElements.reportesTabContent.classList.remove('d-none');
}

// Cargar registros de asistencia según filtros
function cargarRegistrosAsistencia() {
    // Obtener valores de filtros
    const materiaId = asistenciaElements.asistenciaMateria ? asistenciaElements.asistenciaMateria.value : '';
    const fecha = asistenciaElements.asistenciaFecha ? asistenciaElements.asistenciaFecha.value : '';
    
    // Construir URL con filtros
    let url = `${window.appUtils.API_URL}/asistencia`;
    const params = [];
    
    if (materiaId) params.push(`materia=${materiaId}`);
    if (fecha) params.push(`fecha=${fecha}`);
    
    if (params.length > 0) {
        url += `?${params.join('&')}`;
    }
    
    // Realizar solicitud a la API
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Renderizar registros en la tabla
            renderizarRegistrosAsistencia(data);
        })
        .catch(error => {
            console.error('Error al cargar registros de asistencia:', error);
            window.appUtils.showAlert('Error al cargar registros de asistencia', 'danger');
        });
}

// Renderizar registros de asistencia en la tabla
function renderizarRegistrosAsistencia(registros) {
    if (!asistenciaElements.asistenciaTableBody) return;
    
    // Limpiar tabla
    asistenciaElements.asistenciaTableBody.innerHTML = '';
    
    if (registros.length === 0) {
        // Mostrar mensaje de vacío
        asistenciaElements.asistenciaTable.classList.add('d-none');
        asistenciaElements.asistenciaEmpty.classList.remove('d-none');
        return;
    }
    
    // Ocultar mensaje de vacío y mostrar tabla
    asistenciaElements.asistenciaTable.classList.remove('d-none');
    asistenciaElements.asistenciaEmpty.classList.add('d-none');
    
    // Ordenar registros por fecha (más recientes primero)
    registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Renderizar cada registro
    registros.forEach(registro => {
        const row = document.createElement('tr');
        row.dataset.id = registro._id;
        
        // Determinar el estado
        const estadoClass = registro.presente ? 'bg-success' : 'bg-danger';
        const estadoText = registro.presente ? 'Presente' : 'Ausente';
        
        row.innerHTML = `
            <td>${registro.estudiante ? registro.estudiante.nombre : 'Desconocido'}</td>
            <td>${registro.estudiante ? registro.estudiante.codigo : 'N/A'}</td>
            <td>${registro.materia ? registro.materia.nombre : 'Desconocida'}</td>
            <td>${window.appUtils.formatDate(registro.fecha, true)}</td>
            <td><span class="badge ${estadoClass}">${estadoText}</span></td>
            <td>
                <button class="btn btn-sm btn-warning btn-accion btn-cambiar-estado" title="Cambiar estado">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-accion btn-eliminar-asistencia" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        // Configurar eventos para botones de acción
        const btnCambiarEstado = row.querySelector('.btn-cambiar-estado');
        const btnEliminar = row.querySelector('.btn-eliminar-asistencia');
        
        if (btnCambiarEstado) {
            btnCambiarEstado.addEventListener('click', () => {
                cambiarEstadoAsistencia(registro);
            });
        }
        
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => {
                eliminarRegistroAsistencia(registro);
            });
        }
        
        asistenciaElements.asistenciaTableBody.appendChild(row);
    });
}

// Exportar funciones necesarias globalmente
window.loadAsistenciaData = loadAsistenciaData;
// Segunda parte: Funciones para registro de asistencia individual

// Abrir modal para registrar asistencia
function abrirModalRegistroAsistencia() {
    // Verificar si hay materias disponibles
    if (window.appUtils.appState.materias.length === 0) {
        window.appUtils.showAlert('No hay materias disponibles. Debe crear al menos una materia antes de registrar asistencia.', 'warning');
        return;
    }
    
    // Seleccionar método de huella por defecto
    if (asistenciaElements.metodoHuella) {
        asistenciaElements.metodoHuella.checked = true;
    }
    
    // Inicializar fecha y hora actual
    if (asistenciaElements.asistenciaFechaHora) {
        const ahora = new Date().toISOString().slice(0, 16);
        asistenciaElements.asistenciaFechaHora.value = ahora;
    }
    
    // Mostrar/ocultar contenedores según método seleccionado
    toggleMetodoRegistroAsistencia();
    
    // Restablecer estado de huella
    if (asistenciaElements.huellaAsistenciaStatus) {
        asistenciaElements.huellaAsistenciaStatus.textContent = 'Esperando huella...';
        asistenciaElements.huellaAsistenciaStatus.classList.remove('text-success', 'text-danger');
    }
    
    // Restablecer variables de control
    asistenciaPorHuellaEnProgreso = false;
    materiaAsistenciaActual = null;
    
    // Mostrar modal
    asistenciaElements.modalAsistencia.show();
}

// Alternar entre métodos de registro de asistencia
function toggleMetodoRegistroAsistencia() {
    console.log('🔄 Cambiando método de registro...');
    
    const usarHuella = asistenciaElements.metodoHuella && asistenciaElements.metodoHuella.checked;
    
    if (usarHuella) {
        console.log('📱 Modo: Registro por huella');
        
        // Mostrar interfaz de huella
        asistenciaElements.registroHuellaContainer.classList.remove('d-none');
        asistenciaElements.registroManualContainer.classList.add('d-none');
        asistenciaElements.btnGuardarAsistenciaManual.classList.add('d-none');
        
        // Verificar que se haya seleccionado una materia antes de iniciar
        if (asistenciaElements.asistenciaModalMateria.value) {
            iniciarRegistroAsistenciaPorHuella();
        } else {
            if (asistenciaElements.huellaAsistenciaStatus) {
                asistenciaElements.huellaAsistenciaStatus.textContent = 'Seleccione una materia primero...';
                asistenciaElements.huellaAsistenciaStatus.className = 'mt-3 text-warning';
            }
        }
    } else {
        console.log('✍️ Modo: Registro manual');
        
        // Mostrar interfaz manual
        asistenciaElements.registroHuellaContainer.classList.add('d-none');
        asistenciaElements.registroManualContainer.classList.remove('d-none');
        asistenciaElements.btnGuardarAsistenciaManual.classList.remove('d-none');
        
        // Cargar estudiantes para selección manual
        cargarEstudiantesParaAsistencia();
        
        // Cancelar proceso de huella si estaba en progreso
        if (window.asistenciaPorHuellaEnProgreso) {
            window.asistenciaPorHuellaEnProgreso = false;
            window.materiaAsistenciaActual = null;
        }
    }
}

function setupModalEvents() {
    // Evento para cambio de materia - reiniciar proceso de huella
    if (asistenciaElements.asistenciaModalMateria) {
        asistenciaElements.asistenciaModalMateria.addEventListener('change', () => {
            console.log('📋 Materia cambiada en modal de asistencia');
            
            // Si estamos en modo huella, reiniciar el proceso
            if (asistenciaElements.metodoHuella && asistenciaElements.metodoHuella.checked) {
                if (asistenciaElements.asistenciaModalMateria.value) {
                    // Reiniciar proceso con nueva materia
                    window.asistenciaPorHuellaEnProgreso = false;
                    setTimeout(() => {
                        iniciarRegistroAsistenciaPorHuella();
                    }, 500);
                } else {
                    // Detener proceso si no hay materia seleccionada
                    window.asistenciaPorHuellaEnProgreso = false;
                    window.materiaAsistenciaActual = null;
                    if (asistenciaElements.huellaAsistenciaStatus) {
                        asistenciaElements.huellaAsistenciaStatus.textContent = 'Seleccione una materia...';
                        asistenciaElements.huellaAsistenciaStatus.className = 'mt-3 text-muted';
                    }
                }
            }
            
            // Para modo manual, cargar estudiantes
            cargarEstudiantesParaAsistencia();
        });
    }
    
    // Evento para cuando se cierre el modal - limpiar estado
    const modalElement = document.getElementById('modal-asistencia');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            console.log('🚪 Modal de asistencia cerrado - limpiando estado');
            window.asistenciaPorHuellaEnProgreso = false;
            window.materiaAsistenciaActual = null;
        });
    }
}

// Iniciar proceso de registro de asistencia por huella
function iniciarRegistroAsistenciaPorHuella() {
    console.log('🔄 Iniciando registro de asistencia por huella...');
    
    // Verificar si el Arduino está conectado
    if (!window.appUtils.appState.arduinoConectado || !window.appUtils.appState.arduinoReady) {
        window.appUtils.showAlert('El Arduino no está conectado o no está listo. Verifique la conexión.', 'danger');
        return;
    }
    
    // Verificar si hay una materia seleccionada
    if (!asistenciaElements.asistenciaModalMateria.value) {
        window.appUtils.showAlert('Debe seleccionar una materia antes de registrar asistencia.', 'warning');
        return;
    }
    
    // Guardar materia seleccionada
    window.materiaAsistenciaActual = asistenciaElements.asistenciaModalMateria.value;
    
    // Marcar como en progreso
    window.asistenciaPorHuellaEnProgreso = true;
    
    // Actualizar mensaje
    if (asistenciaElements.huellaAsistenciaStatus) {
        asistenciaElements.huellaAsistenciaStatus.textContent = 'Coloque el dedo en el lector...';
        asistenciaElements.huellaAsistenciaStatus.className = 'mt-3 text-primary';
    }
    
    // Enviar comando para escanear huella
    fetch(`${window.appUtils.API_URL}/arduino/command`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: 'scan' })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.error || 'Error al iniciar escaneo');
        }
        console.log('✅ Comando de escaneo enviado correctamente');
    })
    .catch(error => {
        console.error('Error al iniciar escaneo de huella:', error);
        window.appUtils.showAlert('Error al comunicarse con el Arduino', 'danger');
        window.asistenciaPorHuellaEnProgreso = false;
        window.materiaAsistenciaActual = null;
    });
}


// Cargar estudiantes para selector en modal de asistencia
function cargarEstudiantesParaAsistencia() {
    if (!asistenciaElements.asistenciaEstudiante) return;
    
    // Obtener materia seleccionada
    const materiaId = asistenciaElements.asistenciaModalMateria.value;
    
    if (!materiaId) {
        // Limpiar selector si no hay materia seleccionada
        asistenciaElements.asistenciaEstudiante.innerHTML = '<option value="">Seleccionar estudiante...</option>';
        return;
    }
    
    // Cargar estudiantes de la materia seleccionada
    fetch(`${window.appUtils.API_URL}/materias/${materiaId}/estudiantes`)
        .then(response => response.json())
        .then(estudiantes => {
            // Limpiar selector
            asistenciaElements.asistenciaEstudiante.innerHTML = '<option value="">Seleccionar estudiante...</option>';
            
            // Agregar opciones de estudiantes
            estudiantes.forEach(est => {
                const option = document.createElement('option');
                option.value = est._id;
                option.textContent = `${est.nombre} (${est.codigo})`;
                asistenciaElements.asistenciaEstudiante.appendChild(option);
            });
            
            // Mostrar mensaje si no hay estudiantes
            if (estudiantes.length === 0) {
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = 'No hay estudiantes inscritos en esta materia';
                asistenciaElements.asistenciaEstudiante.appendChild(option);
            }
        })
        .catch(error => {
            console.error('Error al cargar estudiantes de la materia:', error);
            window.appUtils.showAlert('Error al cargar estudiantes', 'danger');
        });
}

// Guardar asistencia manual
function guardarAsistenciaManual() {
    // Validar formulario
    if (!asistenciaElements.asistenciaModalMateria.value) {
        window.appUtils.showAlert('Debe seleccionar una materia', 'warning');
        return;
    }
    
    if (!asistenciaElements.asistenciaEstudiante.value) {
        window.appUtils.showAlert('Debe seleccionar un estudiante', 'warning');
        return;
    }
    
    // Preparar datos para la API
    const asistenciaData = {
        estudiante: asistenciaElements.asistenciaEstudiante.value,
        materia: asistenciaElements.asistenciaModalMateria.value,
        fecha: asistenciaElements.asistenciaFechaHora.value,
        presente: asistenciaElements.asistenciaPresente.checked
    };
    
    // Enviar solicitud a la API
    fetch(`${window.appUtils.API_URL}/asistencia`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(asistenciaData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Error al registrar asistencia');
            });
        }
        return response.json();
    })
    .then(data => {
        // Cerrar modal
        asistenciaElements.modalAsistencia.hide();
        
        // Mostrar mensaje de éxito
        const mensaje = data.mensaje || 'Asistencia registrada correctamente';
        window.appUtils.showAlert(mensaje, 'success');
        
        // Recargar registros de asistencia
        cargarRegistrosAsistencia();
    })
    .catch(error => {
        console.error('Error al registrar asistencia:', error);
        window.appUtils.showAlert(error.message, 'danger');
    });
}

// Manejar registro de asistencia por huella
function handleRegistroAsistenciaPorHuella(huellaID) {
    console.log(`👆 Procesando huella ${huellaID} para asistencia`);
    
    if (!window.asistenciaPorHuellaEnProgreso || !window.materiaAsistenciaActual) {
        console.log('❌ No hay proceso de asistencia por huella en curso');
        return;
    }
    
    // Actualizar mensaje de estado
    if (asistenciaElements.huellaAsistenciaStatus) {
        asistenciaElements.huellaAsistenciaStatus.textContent = 'Procesando huella...';
        asistenciaElements.huellaAsistenciaStatus.className = 'mt-3 text-primary';
    }
    
    // Enviar solicitud de registro por huella
    fetch(`${window.appUtils.API_URL}/asistencia/huella`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            huellaID,
            materia: window.materiaAsistenciaActual
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Error al registrar asistencia');
            });
        }
        return response.json();
    })
    .then(data => {
        // Marcar como exitoso
        if (asistenciaElements.huellaAsistenciaStatus) {
            asistenciaElements.huellaAsistenciaStatus.textContent = `¡Asistencia registrada para ${data.asistencia.estudiante.nombre}!`;
            asistenciaElements.huellaAsistenciaStatus.className = 'mt-3 text-success';
        }
        
        // Mostrar alerta de éxito
        window.appUtils.showAlert(`✅ Asistencia registrada para ${data.asistencia.estudiante.nombre}`, 'success');
        
        // Recargar registros de asistencia
        cargarRegistrosAsistencia();
        
        // Reiniciar proceso después de un tiempo
        setTimeout(() => {
            if (asistenciaElements.modalAsistencia._element && 
                asistenciaElements.modalAsistencia._element.classList.contains('show')) {
                iniciarRegistroAsistenciaPorHuella();
            }
        }, 3000);
    })
    .catch(error => {
        console.error('Error al registrar asistencia por huella:', error);
        
        // Mostrar error en el modal
        if (asistenciaElements.huellaAsistenciaStatus) {
            asistenciaElements.huellaAsistenciaStatus.textContent = error.message;
            asistenciaElements.huellaAsistenciaStatus.className = 'mt-3 text-danger';
        }
        
        // Mostrar alerta de error
        window.appUtils.showAlert(`❌ ${error.message}`, 'danger');
        
        // Reiniciar proceso después de un tiempo
        setTimeout(() => {
            if (asistenciaElements.modalAsistencia._element && 
                asistenciaElements.modalAsistencia._element.classList.contains('show')) {
                iniciarRegistroAsistenciaPorHuella();
            }
        }, 3000);
    });
}

// Cambiar estado de un registro de asistencia
function cambiarEstadoAsistencia(registro) {
    // Preparar datos para actualizar
    const nuevoEstado = !registro.presente;
    const updateData = { presente: nuevoEstado };
    
    // Enviar solicitud a la API
    fetch(`${window.appUtils.API_URL}/asistencia/${registro._id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Error al actualizar asistencia');
            });
        }
        return response.json();
    })
    .then(data => {
        // Mensaje de éxito
        const nuevoEstadoTexto = nuevoEstado ? 'presente' : 'ausente';
        window.appUtils.showAlert(`Estado de asistencia actualizado a ${nuevoEstadoTexto}`, 'success');
        
        // Recargar registros
        cargarRegistrosAsistencia();
    })
    .catch(error => {
        console.error('Error al cambiar estado de asistencia:', error);
        window.appUtils.showAlert(error.message, 'danger');
    });
}

// Eliminar registro de asistencia
function eliminarRegistroAsistencia(registro) {
    window.appUtils.confirmAction(
        'Eliminar registro de asistencia',
        `¿Está seguro de eliminar el registro de asistencia de ${registro.estudiante.nombre} del ${window.appUtils.formatDate(registro.fecha, true)}?`,
        () => {
            fetch(`${window.appUtils.API_URL}/asistencia/${registro._id}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Error al eliminar asistencia');
                    });
                }
                return response.json();
            })
            .then(data => {
                window.appUtils.showAlert('Registro de asistencia eliminado correctamente', 'success');
                cargarRegistrosAsistencia();
            })
            .catch(error => {
                console.error('Error al eliminar registro de asistencia:', error);
                window.appUtils.showAlert(error.message, 'danger');
            });
        },
        'Eliminar',
        'danger'
    );
}
// Tercera parte: Funciones para asistencia masiva y reportes

// Abrir modal para asistencia masiva
function abrirModalAsistenciaMasiva() {
    // Verificar si hay materias disponibles
    if (window.appUtils.appState.materias.length === 0) {
        window.appUtils.showAlert('No hay materias disponibles. Debe crear al menos una materia antes de registrar asistencia.', 'warning');
        return;
    }
    
    // Inicializar fecha actual
    const fechaActual = new Date().toISOString().split('T')[0];
    if (asistenciaElements.asistenciaMasivaFecha) {
        asistenciaElements.asistenciaMasivaFecha.value = fechaActual;
    }
    
    // Limpiar tabla de estudiantes
    if (asistenciaElements.asistenciaMasivaTableBody) {
        asistenciaElements.asistenciaMasivaTableBody.innerHTML = '';
    }
    
    // Deseleccionar "seleccionar todos"
    if (asistenciaElements.checkAllEstudiantes) {
        asistenciaElements.checkAllEstudiantes.checked = false;
    }
    
    // Mostrar modal
    asistenciaElements.modalAsistenciaMasiva.show();
}

// Cargar estudiantes para asistencia masiva
function cargarEstudiantesParaAsistenciaMasiva() {
    if (!asistenciaElements.asistenciaMasivaTableBody) return;
    
    // Obtener materia seleccionada
    const materiaId = asistenciaElements.asistenciaMasivaMateria.value;
    
    if (!materiaId) {
        // Limpiar tabla si no hay materia seleccionada
        asistenciaElements.asistenciaMasivaTableBody.innerHTML = '';
        asistenciaElements.asistenciaMasivaTable.classList.add('d-none');
        asistenciaElements.asistenciaMasivaEmpty.classList.remove('d-none');
        asistenciaElements.asistenciaMasivaEmpty.textContent = 'Seleccione una materia para ver los estudiantes';
        return;
    }
    
    // Cargar estudiantes de la materia seleccionada
    fetch(`${window.appUtils.API_URL}/materias/${materiaId}/estudiantes`)
        .then(response => response.json())
        .then(estudiantes => {
            // Limpiar tabla
            asistenciaElements.asistenciaMasivaTableBody.innerHTML = '';
            
            if (estudiantes.length === 0) {
                // Mostrar mensaje de vacío
                asistenciaElements.asistenciaMasivaTable.classList.add('d-none');
                asistenciaElements.asistenciaMasivaEmpty.classList.remove('d-none');
                asistenciaElements.asistenciaMasivaEmpty.textContent = 'No hay estudiantes inscritos en esta materia';
                return;
            }
            
            // Ocultar mensaje de vacío y mostrar tabla
            asistenciaElements.asistenciaMasivaTable.classList.remove('d-none');
            asistenciaElements.asistenciaMasivaEmpty.classList.add('d-none');
            
            // Verificar registros de asistencia existentes
            const fecha = asistenciaElements.asistenciaMasivaFecha.value;
            const queryParams = `?materia=${materiaId}&fecha=${fecha}`;
            
            fetch(`${window.appUtils.API_URL}/asistencia${queryParams}`)
                .then(response => response.json())
                .then(asistencias => {
                    // Crear mapa de asistencias por estudiante
                    const asistenciasPorEstudiante = {};
                    asistencias.forEach(asist => {
                        if (asist.estudiante && asist.estudiante._id) {
                            asistenciasPorEstudiante[asist.estudiante._id] = asist;
                        }
                    });
                    
                    // Renderizar cada estudiante
                    estudiantes.forEach(estudiante => {
                        const row = document.createElement('tr');
                        row.dataset.id = estudiante._id;
                        
                        // Verificar si ya tiene asistencia
                        const tieneAsistencia = asistenciasPorEstudiante[estudiante._id];
                        const estaPresenteClase = tieneAsistencia ? tieneAsistencia.presente : false;
                        const estadoTexto = tieneAsistencia 
                            ? (estaPresenteClase ? 'Presente' : 'Ausente')
                            : 'Sin registrar';
                        const estadoClass = tieneAsistencia
                            ? (estaPresenteClase ? 'text-success' : 'text-danger')
                            : 'text-muted';
                        
                        row.innerHTML = `
                            <td>
                                <div class="form-check">
                                    <input class="form-check-input check-estudiante" type="checkbox" id="check-${estudiante._id}" 
                                        ${estaPresenteClase ? 'checked' : ''}>
                                    <label class="form-check-label" for="check-${estudiante._id}"></label>
                                </div>
                            </td>
                            <td>${estudiante.nombre}</td>
                            <td>${estudiante.codigo}</td>
                            <td>${estudiante.programaAcademico}</td>
                            <td class="${estadoClass}">${estadoTexto}</td>
                        `;
                        
                        asistenciaElements.asistenciaMasivaTableBody.appendChild(row);
                    });
                })
                .catch(error => {
                    console.error('Error al cargar asistencias existentes:', error);
                    
                    // Renderizar estudiantes sin verificar asistencias
                    estudiantes.forEach(estudiante => {
                        const row = document.createElement('tr');
                        row.dataset.id = estudiante._id;
                        
                        row.innerHTML = `
                            <td>
                                <div class="form-check">
                                    <input class="form-check-input check-estudiante" type="checkbox" id="check-${estudiante._id}">
                                    <label class="form-check-label" for="check-${estudiante._id}"></label>
                                </div>
                            </td>
                            <td>${estudiante.nombre}</td>
                            <td>${estudiante.codigo}</td>
                            <td>${estudiante.programaAcademico}</td>
                            <td class="text-muted">Sin registrar</td>
                        `;
                        
                        asistenciaElements.asistenciaMasivaTableBody.appendChild(row);
                    });
                });
        })
        .catch(error => {
            console.error('Error al cargar estudiantes de la materia:', error);
            window.appUtils.showAlert('Error al cargar estudiantes', 'danger');
        });
}

// Seleccionar/deseleccionar todos los estudiantes
function toggleSelectAllEstudiantes() {
    if (!asistenciaElements.checkAllEstudiantes) return;
    
    const seleccionarTodos = asistenciaElements.checkAllEstudiantes.checked;
    
    // Obtener todos los checkboxes de estudiantes
    const checkboxes = document.querySelectorAll('.check-estudiante');
    
    // Actualizar estado de todos los checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.checked = seleccionarTodos;
    });
}

// Guardar asistencia masiva
function guardarAsistenciaMasiva() {
    // Validar formulario
    if (!asistenciaElements.asistenciaMasivaMateria.value) {
        window.appUtils.showAlert('Debe seleccionar una materia', 'warning');
        return;
    }
    
    if (!asistenciaElements.asistenciaMasivaFecha.value) {
        window.appUtils.showAlert('Debe seleccionar una fecha', 'warning');
        return;
    }
    
    // Obtener estudiantes seleccionados
    const checkboxes = document.querySelectorAll('.check-estudiante:checked');
    const estudiantesIds = Array.from(checkboxes).map(checkbox => {
        const id = checkbox.id.replace('check-', '');
        return id;
    });
    
    if (estudiantesIds.length === 0) {
        window.appUtils.showAlert('Debe seleccionar al menos un estudiante', 'warning');
        return;
    }
    
    // Preparar datos para la API
    const asistenciaData = {
        materia: asistenciaElements.asistenciaMasivaMateria.value,
        estudiantes: estudiantesIds,
        fecha: asistenciaElements.asistenciaMasivaFecha.value,
        presente: true
    };
    
    // Enviar solicitud a la API
    fetch(`${window.appUtils.API_URL}/asistencia/masiva`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(asistenciaData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Error al registrar asistencia masiva');
            });
        }
        return response.json();
    })
    .then(data => {
        // Cerrar modal
        asistenciaElements.modalAsistenciaMasiva.hide();
        
        // Mostrar mensaje de éxito
        const mensaje = `Asistencia registrada para ${estudiantesIds.length} estudiante(s)`;
        window.appUtils.showAlert(mensaje, 'success');
        
        // Recargar registros de asistencia
        cargarRegistrosAsistencia();
    })
    .catch(error => {
        console.error('Error al registrar asistencia masiva:', error);
        window.appUtils.showAlert(error.message, 'danger');
    });
}

// Generar reporte de asistencia
function generarReporteAsistencia() {
    // Validar formulario
    if (!asistenciaElements.reporteMateria.value) {
        window.appUtils.showAlert('Debe seleccionar una materia', 'warning');
        return;
    }
    
    // Obtener valores del formulario
    const materiaId = asistenciaElements.reporteMateria.value;
    const fechaInicio = asistenciaElements.reporteFechaInicio.value;
    const fechaFin = asistenciaElements.reporteFechaFin.value;
    
    // Construir URL con filtros
    let url = `${window.appUtils.API_URL}/materias/${materiaId}/asistencia/reporte`;
    const params = [];
    
    if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
    if (fechaFin) params.push(`fechaFin=${fechaFin}`);
    
    if (params.length > 0) {
        url += `?${params.join('&')}`;
    }
    
    // Mostrar indicador de carga
    asistenciaElements.reporteResultado.innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        </div>
        <p class="text-center mt-2">Generando reporte...</p>
    `;
    
    // Realizar solicitud a la API
    fetch(url)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Error al generar reporte');
                });
            }
            return response.json();
        })
        .then(data => {
            // Renderizar reporte
            renderizarReporte(data);
        })
        .catch(error => {
            console.error('Error al generar reporte de asistencia:', error);
            asistenciaElements.reporteResultado.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> ${error.message}
                </div>
            `;
        });
}

// Renderizar reporte de asistencia
function renderizarReporte(data) {
    if (!asistenciaElements.reporteResultado) return;
    
    // Obtener información del reporte
    const { materia, fechas, reporte } = data;
    
    if (!fechas || fechas.length === 0 || !reporte || reporte.length === 0) {
        asistenciaElements.reporteResultado.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No hay datos de asistencia para los filtros seleccionados
            </div>
        `;
        return;
    }
    
    // Crear estructura del reporte
    let reporteHTML = `
        <div class="reporte-container">
            <div class="reporte-header">
                <h4>Reporte de Asistencia</h4>
                <div class="reporte-info">
                    <div class="reporte-info-item">
                        <strong>Materia:</strong> ${materia.nombre} (${materia.codigo})
                    </div>
                    <div class="reporte-info-item">
                        <strong>Período:</strong> ${window.appUtils.formatDate(fechas[0])} - ${window.appUtils.formatDate(fechas[fechas.length - 1])}
                    </div>
                    <div class="reporte-info-item">
                        <strong>Total estudiantes:</strong> ${reporte.length}
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-bordered reporte-tabla">
                    <thead>
                        <tr>
                            <th rowspan="2">Estudiante</th>
                            <th rowspan="2">Código</th>
                            <th colspan="${fechas.length}">Fechas</th>
                            <th rowspan="2">% Asistencia</th>
                        </tr>
                        <tr>
    `;
    
    // Agregar fechas en encabezado
    fechas.forEach(fecha => {
        reporteHTML += `<th>${window.appUtils.formatDate(fecha)}</th>`;
    });
    
    reporteHTML += `
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    // Agregar filas de estudiantes
    reporte.forEach(item => {
        const estudiante = item.estudiante;
        const asistencias = item.asistencias;
        
        // Calcular porcentaje de asistencia
        let presentesCount = 0;
        
        fechas.forEach(fecha => {
            if (asistencias[fecha]) {
                presentesCount++;
            }
        });
        
        const porcentajeAsistencia = (presentesCount / fechas.length) * 100;
        
        reporteHTML += `
            <tr>
                <td>${estudiante.nombre}</td>
                <td>${estudiante.codigo}</td>
        `;
        
        // Agregar estado para cada fecha
        fechas.forEach(fecha => {
            const presente = asistencias[fecha];
            const estadoClass = presente ? 'reporte-tabla-presente' : 'reporte-tabla-ausente';
            const estadoIcon = presente ? '<i class="bi bi-check-circle"></i>' : '<i class="bi bi-x-circle"></i>';
            
            reporteHTML += `<td class="${estadoClass}">${estadoIcon}</td>`;
        });
        
        // Agregar porcentaje de asistencia
        reporteHTML += `
                <td>${porcentajeAsistencia.toFixed(1)}%</td>
            </tr>
        `;
    });
    
    reporteHTML += `
                    </tbody>
                </table>
            </div>
            
            <div class="reporte-footer">
                <div class="fecha-generacion">
                    Reporte generado el ${window.appUtils.formatDate(new Date(), true)}
                </div>
                <div>
                    <button type="button" class="btn btn-success" id="btn-descargar-reporte">
                        <i class="bi bi-file-earmark-excel"></i> Exportar a Excel
                    </button>
                    <button type="button" class="btn btn-primary" id="btn-imprimir-reporte">
                        <i class="bi bi-printer"></i> Imprimir
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Actualizar contenido
    asistenciaElements.reporteResultado.innerHTML = reporteHTML;
    
    // Configurar eventos para botones de acciones
    const btnDescargar = document.getElementById('btn-descargar-reporte');
    const btnImprimir = document.getElementById('btn-imprimir-reporte');
    
    if (btnDescargar) {
        btnDescargar.addEventListener('click', () => {
            exportarReporteExcel(data);
        });
    }
    
    if (btnImprimir) {
        btnImprimir.addEventListener('click', () => {
            imprimirReporte();
        });
    }
}

// Exportar reporte a Excel
function exportarReporteExcel(data) {
    // Esta función requeriría alguna biblioteca adicional para generar el Excel
    // Por ahora, mostraremos un mensaje indicando que la funcionalidad está en desarrollo
    window.appUtils.showAlert('La exportación a Excel está en desarrollo. Por favor, use la opción de imprimir mientras tanto.', 'info');
    
    // En una implementación completa, aquí se podría usar una biblioteca como SheetJS
    // para generar el archivo Excel y descargarlo
}

// Imprimir reporte
function imprimirReporte() {
    // Crear una ventana de impresión
    const ventanaImpresion = window.open('', '_blank');
    
    // Obtener estilos de la página actual
    const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
            try {
                return Array.from(styleSheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
            } catch (e) {
                // Algunas hojas de estilo pueden bloquear el acceso debido a CORS
                return '';
            }
        })
        .join('\n');
    
    // Contenido de la ventana de impresión
    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Asistencia</title>
            <style>
                ${styles}
                body { 
                    padding: 20px; 
                    font-family: Arial, sans-serif;
                }
                @media print {
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${asistenciaElements.reporteResultado.innerHTML}
            </div>
            <div class="text-center mt-4 no-print">
                <button onclick="window.print()" class="btn btn-primary">Imprimir</button>
                <button onclick="window.close()" class="btn btn-secondary">Cerrar</button>
            </div>
        </body>
        </html>
    `);
    
    ventanaImpresion.document.close();
    
    // Modificar elementos para impresión
    const btnDescargar = ventanaImpresion.document.getElementById('btn-descargar-reporte');
    const btnImprimir = ventanaImpresion.document.getElementById('btn-imprimir-reporte');
    
    if (btnDescargar) btnDescargar.classList.add('no-print');
    if (btnImprimir) btnImprimir.classList.add('no-print');
}

// Agregar funciones al objeto global
window.handleAsistenciaHuella = handleRegistroAsistenciaPorHuella;
window.asistenciaFunctions = {
    ...window.asistenciaFunctions,
    handleRegistroAsistenciaPorHuella,
    iniciarRegistroAsistenciaPorHuella,
    toggleMetodoRegistroAsistencia
};
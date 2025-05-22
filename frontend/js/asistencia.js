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
    // Evento para filtrar asistencia - CAMBIAR para usar la nueva función
    if (asistenciaElements.btnFiltrarAsistencia) {
        asistenciaElements.btnFiltrarAsistencia.addEventListener('click', aplicarFiltrosAsistencia);
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
    
    // NUEVO: Agregar botón para limpiar filtros
    agregarBotonLimpiarFiltros();
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
        
        // Escuchar evento de huella escaneada - CON CONTROL DE DUPLICADOS
        currentSocket.on('fingerprint-scan', (data) => {
            console.log('🔍 Evento fingerprint-scan recibido:', data);
            
            // Solo procesar si estamos en modo asistencia por huella Y esperando respuesta
            if (window.asistenciaPorHuellaEnProgreso && window.materiaAsistenciaActual && esperandoRespuestaScan) {
                console.log('✅ Procesando evento de huella válido');
                handleRegistroAsistenciaPorHuella(data.id);
            } else {
                console.log('⚠️ Evento de huella ignorado:', {
                    asistenciaPorHuellaEnProgreso: window.asistenciaPorHuellaEnProgreso,
                    materiaAsistenciaActual: window.materiaAsistenciaActual,
                    esperandoRespuestaScan: esperandoRespuestaScan
                });
            }
        });
        
        // Escuchar evento de error de huella - CON CONTROL DE DUPLICADOS
        currentSocket.on('fingerprint-error', (data) => {
            console.log('❌ Evento fingerprint-error recibido:', data);
            
            // Solo procesar si estamos esperando respuesta
            if (esperandoRespuestaScan) {
                console.log('✅ Procesando error de huella válido');
                esperandoRespuestaScan = false; // Marcar como procesado
                
                // Limpiar timeout de seguridad
                if (scanTimeoutId) {
                    clearTimeout(scanTimeoutId);
                    scanTimeoutId = null;
                }
                
                // Mostrar error en la interfaz
                if (window.asistenciaPorHuellaEnProgreso && window.materiaAsistenciaActual) {
                    actualizarEstadoEscaneo('duplicado', data.message || 'Error en la lectura');
                    window.appUtils.showAlert(`❌ ${data.message || 'Error en la lectura'}`, 'warning');
                    
                    // Volver al estado de escaneo después de 3 segundos
                    setTimeout(() => {
                        if (modalAsistenciaAbierto && asistenciaPorHuellaEnProgreso) {
                            actualizarEstadoEscaneo('escaneando');
                        }
                    }, 3000);
                }
            } else {
                console.log('⚠️ Error de huella ignorado - no se esperaba respuesta');
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
    console.log('🔄 Iniciando carga de datos de asistencia...');
    
    // Limpiar filtros al cargar por primera vez
    if (asistenciaElements.asistenciaMateria) {
        asistenciaElements.asistenciaMateria.value = '';  // Sin materia seleccionada
    }
    
    // NO establecer fecha por defecto - dejar vacío para mostrar todos los registros
    if (asistenciaElements.asistenciaFecha) {
        asistenciaElements.asistenciaFecha.value = '';  // Sin fecha seleccionada
    }
    
    // Verificar que las materias estén cargadas para los selectores
    if (!window.appUtils.appState.materias || window.appUtils.appState.materias.length === 0) {
        console.log('⚠️ Materias no cargadas, cargando primero...');
        
        // Cargar materias primero
        fetch(`${window.appUtils.API_URL}/materias`)
            .then(response => response.json())
            .then(materias => {
                console.log('✅ Materias cargadas:', materias.length);
                window.appUtils.appState.materias = materias;
                
                // Actualizar selectores
                updateMateriasSelectors();
                
                // Cargar registros de asistencia SIN filtros
                setTimeout(() => {
                    console.log('📄 Cargando registros de asistencia sin filtros...');
                    cargarRegistrosAsistencia();
                }, 300);
            })
            .catch(error => {
                console.error('❌ Error al cargar materias:', error);
                window.appUtils.showAlert('Error al cargar materias', 'danger');
                
                // Intentar cargar asistencias de todas formas
                setTimeout(() => {
                    cargarRegistrosAsistencia();
                }, 500);
            });
    } else {
        console.log('✅ Materias ya están cargadas');
        
        // Actualizar selectores
        updateMateriasSelectors();
        
        // Cargar registros de asistencia SIN filtros
        setTimeout(() => {
            console.log('📄 Cargando registros de asistencia sin filtros...');
            cargarRegistrosAsistencia();
        }, 200);
    }
}


function updateMateriasSelectors() {
    console.log('🔄 Actualizando selectores de materias...');
    
    const materias = window.appUtils.appState.materias || [];
    console.log('Materias disponibles:', materias.length);
    
    // Lista de selectores a actualizar
    const selectores = [
        { id: 'asistencia-materia', placeholder: 'Seleccionar materia...' },
        { id: 'asistencia-modal-materia', placeholder: 'Seleccionar materia...' },
        { id: 'asistencia-masiva-materia', placeholder: 'Seleccionar materia...' },
        { id: 'reporte-materia', placeholder: 'Seleccionar materia...' }
    ];
    
    selectores.forEach(selectorInfo => {
        const select = document.getElementById(selectorInfo.id);
        if (select) {
            const currentValue = select.value;
            
            // Limpiar opciones existentes
            select.innerHTML = `<option value="">${selectorInfo.placeholder}</option>`;
            
            // Agregar materias
            materias.forEach(materia => {
                const option = document.createElement('option');
                option.value = materia._id;
                option.textContent = `${materia.nombre} (${materia.codigo})`;
                
                if (materia._id === currentValue) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
            
            console.log(`✅ Selector ${selectorInfo.id} actualizado con ${materias.length} materias`);
        } else {
            console.warn(`⚠️ Selector ${selectorInfo.id} no encontrado`);
        }
    });
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
    console.log('🔍 Iniciando carga de registros de asistencia...');
    
    // Obtener valores de filtros
    const materiaId = asistenciaElements.asistenciaMateria ? asistenciaElements.asistenciaMateria.value : '';
    const fecha = asistenciaElements.asistenciaFecha ? asistenciaElements.asistenciaFecha.value : '';
    
    console.log('Filtros obtenidos:', { materiaId, fecha });
    
    // Construir URL con parámetros SOLO si tienen valores
    let url = `${window.appUtils.API_URL}/asistencia`;
    const params = [];
    
    // Solo agregar parámetros si tienen valores reales
    if (materiaId && materiaId.trim() !== '') {
        params.push(`materia=${encodeURIComponent(materiaId)}`);
        console.log('✅ Agregando filtro de materia:', materiaId);
    }
    
    if (fecha && fecha.trim() !== '') {
        params.push(`fecha=${encodeURIComponent(fecha)}`);
        console.log('✅ Agregando filtro de fecha:', fecha);
    }
    
    if (params.length > 0) {
        url += `?${params.join('&')}`;
        console.log('🔍 URL con filtros:', url);
    } else {
        console.log('📄 URL sin filtros (cargando todos los registros):', url);
    }
    
    // Mostrar indicador de carga
    if (asistenciaElements.asistenciaTableBody) {
        asistenciaElements.asistenciaTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    ${params.length > 0 ? 'Aplicando filtros y cargando registros...' : 'Cargando todos los registros de asistencia...'}
                </td>
            </tr>
        `;
    }
    
    // Realizar solicitud a la API
    fetch(url)
        .then(response => {
            console.log('📡 Respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('📊 Datos de asistencia recibidos:', {
                esArray: Array.isArray(data),
                cantidad: Array.isArray(data) ? data.length : 'No es array',
                tipoData: typeof data
            });
            
            // Verificar si data es un array
            if (!Array.isArray(data)) {
                console.error('❌ Los datos recibidos no son un array:', data);
                throw new Error('Formato de datos incorrecto del servidor');
            }
            
            // Log de muestra de datos si hay registros
            if (data.length > 0) {
                console.log('📄 Muestra del primer registro:', {
                    id: data[0]._id,
                    estudiante: data[0].estudiante?.nombre,
                    materia: data[0].materia?.nombre,
                    fecha: data[0].fecha,
                    presente: data[0].presente
                });
            }
            
            // Renderizar registros en la tabla
            renderizarRegistrosAsistencia(data);
            
            // Mostrar mensaje informativo si no se aplicaron filtros
            if (params.length === 0 && data.length > 0) {
                console.log(`ℹ️ Se cargaron ${data.length} registros más recientes (sin filtros)`);
            } else if (params.length > 0) {
                console.log(`ℹ️ Se encontraron ${data.length} registros con los filtros aplicados`);
            }
            
        })
        .catch(error => {
            console.error('❌ Error al cargar registros de asistencia:', error);
            
            // Mostrar error detallado en la tabla
            if (asistenciaElements.asistenciaTableBody) {
                asistenciaElements.asistenciaTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">
                            <div class="mb-2">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <strong>Error al cargar registros</strong>
                            </div>
                            <small class="text-muted">
                                ${error.message}
                                <br>
                                <button class="btn btn-sm btn-outline-primary mt-2" onclick="cargarRegistrosAsistencia()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>
                                    Reintentar
                                </button>
                            </small>
                        </td>
                    </tr>
                `;
            }
            
            window.appUtils.showAlert(`Error al cargar registros: ${error.message}`, 'danger');
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
        console.log('📱 Modo: Registro por huella continuo');
        
        // Mostrar interfaz de huella
        asistenciaElements.registroHuellaContainer.classList.remove('d-none');
        asistenciaElements.registroManualContainer.classList.add('d-none');
        asistenciaElements.btnGuardarAsistenciaManual.classList.add('d-none');
        
        // Verificar que se haya seleccionado una materia antes de iniciar
        if (asistenciaElements.asistenciaModalMateria.value) {
            console.log('Iniciando proceso de huella continuo con materia seleccionada');
            iniciarRegistroAsistenciaPorHuella();
        } else {
            console.log('Esperando selección de materia');
            if (asistenciaElements.huellaAsistenciaStatus) {
                asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center text-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <span>Seleccione una materia primero...</span>
                    </div>
                `;
            }
        }
    } else {
        console.log('✍️ Modo: Registro manual');
        
        // Detener escaneo continuo
        detenerEscaneoContinuo();
        
        // Mostrar interfaz manual
        asistenciaElements.registroHuellaContainer.classList.add('d-none');
        asistenciaElements.registroManualContainer.classList.remove('d-none');
        asistenciaElements.btnGuardarAsistenciaManual.classList.remove('d-none');
        
        // Cargar estudiantes para selección manual
        cargarEstudiantesParaAsistencia();
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
                    // Detener proceso actual
                    detenerEscaneoContinuo();
                    
                    // Reiniciar proceso con nueva materia
                    setTimeout(() => {
                        iniciarRegistroAsistenciaPorHuella();
                    }, 500);
                } else {
                    // Detener proceso si no hay materia seleccionada
                    detenerEscaneoContinuo();
                    
                    if (asistenciaElements.huellaAsistenciaStatus) {
                        asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                            <div class="d-flex align-items-center justify-content-center text-warning">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <span>Seleccione una materia...</span>
                            </div>
                        `;
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
            detenerEscaneoContinuo();
        });
        
        // Evento para cuando se abra el modal
        modalElement.addEventListener('shown.bs.modal', () => {
            console.log('🚪 Modal de asistencia abierto');
            modalAsistenciaAbierto = true;
        });
    }
}

let scanTimeoutId = null;
let scanIntervalId = null;
let modalAsistenciaAbierto = false;
let esperandoRespuestaScan = false;

// Iniciar proceso de registro de asistencia por huella
function iniciarRegistroAsistenciaPorHuella() {
    console.log('🔄 Iniciando registro de asistencia por huella...');
    
    // Verificar si el Arduino está conectado
    if (!window.appUtils.appState.arduinoConectado || !window.appUtils.appState.arduinoReady) {
        if (asistenciaElements.huellaAsistenciaStatus) {
            asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                <div class="d-flex align-items-center justify-content-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <span>Arduino no conectado</span>
                </div>
            `;
        }
        window.appUtils.showAlert('El Arduino no está conectado o no está listo. Verifique la conexión.', 'danger');
        return;
    }
    
    // Verificar si hay una materia seleccionada
    if (!asistenciaElements.asistenciaModalMateria.value) {
        if (asistenciaElements.huellaAsistenciaStatus) {
            asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                <div class="d-flex align-items-center justify-content-center text-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <span>Seleccione una materia primero</span>
                </div>
            `;
        }
        return;
    }
    
    // Guardar materia seleccionada en variables locales y globales
    materiaAsistenciaActual = asistenciaElements.asistenciaModalMateria.value;
    window.materiaAsistenciaActual = materiaAsistenciaActual;
    
    // Marcar como en progreso en variables locales y globales
    asistenciaPorHuellaEnProgreso = true;
    window.asistenciaPorHuellaEnProgreso = true;
    modalAsistenciaAbierto = true;
    
    console.log('🎯 Variables establecidas:', {
        local: asistenciaPorHuellaEnProgreso,
        global: window.asistenciaPorHuellaEnProgreso,
        materia: materiaAsistenciaActual
    });
    
    // Iniciar ciclo de escaneo continuo
    iniciarCicloEscaneoContinuo();
}

function iniciarCicloEscaneoContinuo() {
    // Limpiar timeouts/intervals anteriores
    if (scanTimeoutId) {
        clearTimeout(scanTimeoutId);
        scanTimeoutId = null;
    }
    if (scanIntervalId) {
        clearInterval(scanIntervalId);
        scanIntervalId = null;
    }
    
    // Función para enviar comando de escaneo
    const enviarComandoScan = () => {
        if (!modalAsistenciaAbierto || !asistenciaPorHuellaEnProgreso) {
            console.log('🛑 Deteniendo escaneo continuo - modal cerrado o proceso cancelado');
            return;
        }
        
        // NO enviar nuevo comando si ya estamos esperando respuesta
        if (esperandoRespuestaScan) {
            console.log('⏳ Esperando respuesta del scan anterior, saltando este ciclo...');
            return;
        }
        
        console.log('📡 Enviando comando scan...');
        esperandoRespuestaScan = true; // Marcar como esperando respuesta
        
        // Actualizar estado visual
        actualizarEstadoEscaneo('escaneando');
        
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
            
            // Timeout de seguridad para respuesta de scan (15 segundos)
            scanTimeoutId = setTimeout(() => {
                if (esperandoRespuestaScan) {
                    console.log('⏰ Timeout de respuesta de scan');
                    esperandoRespuestaScan = false;
                    if (modalAsistenciaAbierto && asistenciaPorHuellaEnProgreso) {
                        actualizarEstadoEscaneo('escaneando');
                    }
                }
            }, 15000);
        })
        .catch(error => {
            console.error('Error al enviar comando scan:', error);
            esperandoRespuestaScan = false;
            actualizarEstadoEscaneo('error', error.message);
        });
    };
    
    // Enviar primer comando inmediatamente
    enviarComandoScan();
    
    // Configurar envío cada 20 segundos (más tiempo para dar oportunidad de respuesta)
    scanIntervalId = setInterval(() => {
        if (modalAsistenciaAbierto && asistenciaPorHuellaEnProgreso) {
            enviarComandoScan();
        } else {
            // Limpiar interval si el modal se cerró
            clearInterval(scanIntervalId);
            scanIntervalId = null;
            esperandoRespuestaScan = false;
        }
    }, 10000); // Cada 10 segundos en lugar de 15
}


function actualizarEstadoEscaneo(estado, mensaje = '') {
    if (!asistenciaElements.huellaAsistenciaStatus) return;
    
    const tiempoActual = new Date().toLocaleTimeString();
    
    switch (estado) {
        case 'escaneando':
            asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center text-primary">
                    <div class="d-flex align-items-center mb-2">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <span class="fw-bold">Esperando huella digital...</span>
                    </div>
                    <small class="text-muted">
                        <i class="bi bi-clock me-1"></i>
                        Último escaneo: ${tiempoActual}
                    </small>
                    <small class="text-info mt-1">
                        <i class="bi bi-arrow-repeat me-1"></i>
                        ${esperandoRespuestaScan ? 'Procesando comando...' : 'Escaneo automático cada 10 segundos'}
                    </small>
                </div>
            `;
            break;
            
        case 'procesando':
            asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center text-primary">
                    <div class="d-flex align-items-center mb-2">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <span class="fw-bold">Procesando huella...</span>
                    </div>
                    <small class="text-muted">
                        ${mensaje || 'Verificando en la base de datos...'}
                    </small>
                </div>
            `;
            break;
            
        case 'exito':
            asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center text-success">
                    <div class="d-flex align-items-center mb-2">
                        <i class="bi bi-check-circle me-2"></i>
                        <span class="fw-bold">${mensaje}</span>
                    </div>
                    <small class="text-muted">
                        Continuando escaneo automático...
                    </small>
                </div>
            `;
            break;
            
        case 'error':
            asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center text-danger">
                    <div class="d-flex align-items-center mb-2">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <span class="fw-bold">Error de comunicación</span>
                    </div>
                    <small class="text-muted">
                        ${mensaje || 'Reintentando automáticamente...'}
                    </small>
                </div>
            `;
            break;
            
        case 'duplicado':
            asistenciaElements.huellaAsistenciaStatus.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center text-warning">
                    <div class="d-flex align-items-center mb-2">
                        <i class="bi bi-info-circle me-2"></i>
                        <span class="fw-bold">${mensaje}</span>
                    </div>
                    <small class="text-muted">
                        Continuando escaneo para otros estudiantes...
                    </small>
                </div>
            `;
            break;
    }
}
function detenerEscaneoContinuo() {
    console.log('🛑 Deteniendo escaneo continuo...');
    
    // Limpiar timeouts e intervals
    if (scanTimeoutId) {
        clearTimeout(scanTimeoutId);
        scanTimeoutId = null;
    }
    if (scanIntervalId) {
        clearInterval(scanIntervalId);
        scanIntervalId = null;
    }
    
    // Si hay un scan en progreso, enviamos comando para detenerlo
    if (esperandoRespuestaScan) {
        console.log('📡 Enviando comando para detener scan en progreso...');
        fetch(`${window.appUtils.API_URL}/arduino/stop-scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ Comando stop-scan enviado:', data);
        })
        .catch(error => {
            console.error('Error al enviar stop-scan:', error);
        });
    }
    
    // Limpiar variables de estado
    asistenciaPorHuellaEnProgreso = false;
    materiaAsistenciaActual = null;
    window.asistenciaPorHuellaEnProgreso = false;
    window.materiaAsistenciaActual = null;
    modalAsistenciaAbierto = false;
    esperandoRespuestaScan = false; // IMPORTANTE: Limpiar flag de espera
    
    console.log('✅ Escaneo continuo detenido y variables limpiadas');
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
    
    // IMPORTANTE: Solo procesar si estamos esperando una respuesta
    if (!esperandoRespuestaScan) {
        console.log('⚠️ Respuesta de huella ignorada - no se esperaba');
        return;
    }
    
    // Marcar respuesta como recibida INMEDIATAMENTE
    esperandoRespuestaScan = false;
    
    // Limpiar timeout de seguridad
    if (scanTimeoutId) {
        clearTimeout(scanTimeoutId);
        scanTimeoutId = null;
    }
    
    console.log('Estado actual:', {
        local: asistenciaPorHuellaEnProgreso,
        global: window.asistenciaPorHuellaEnProgreso,
        materia: materiaAsistenciaActual || window.materiaAsistenciaActual
    });
    
    // Verificar estado usando variables locales o globales
    const enProgreso = asistenciaPorHuellaEnProgreso || window.asistenciaPorHuellaEnProgreso;
    const materia = materiaAsistenciaActual || window.materiaAsistenciaActual;
    
    if (!enProgreso || !materia) {
        console.log('❌ No hay proceso de asistencia por huella en curso');
        return;
    }
    
    // Actualizar mensaje de estado
    actualizarEstadoEscaneo('procesando', `ID de huella: ${huellaID}`);
    
    // Enviar solicitud de registro por huella
    fetch(`${window.appUtils.API_URL}/asistencia/huella`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            huellaID,
            materia
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
        console.log('✅ Respuesta del servidor:', data);
        
        // Determinar el tipo de mensaje según la respuesta
        let mensajeExito, alertaTipo;
        
        if (data.mensaje && (data.mensaje.includes('ya registrada') || data.duplicado)) {
            // Caso de asistencia ya registrada
            mensajeExito = `${data.asistencia.estudiante.nombre} ya tiene asistencia registrada`;
            alertaTipo = 'info';
            actualizarEstadoEscaneo('duplicado', mensajeExito);
            window.appUtils.showAlert(`ℹ️ ${mensajeExito}`, alertaTipo);
        } else {
            // Caso de nueva asistencia
            mensajeExito = `¡Asistencia registrada para ${data.asistencia.estudiante.nombre}!`;
            alertaTipo = 'success';
            actualizarEstadoEscaneo('exito', mensajeExito);
            window.appUtils.showAlert(`✅ ${mensajeExito}`, alertaTipo);
        }
        
        // Recargar registros de asistencia
        cargarRegistrosAsistencia();
        
        // Volver al estado de escaneo después de 3 segundos
        setTimeout(() => {
            if (modalAsistenciaAbierto && asistenciaPorHuellaEnProgreso) {
                actualizarEstadoEscaneo('escaneando');
            }
        }, 3000);
    })
    .catch(error => {
        console.error('Error al registrar asistencia por huella:', error);
        
        // Determinar el tipo de error y mostrar mensaje apropiado
        let mensajeError = error.message;
        let tipoError = 'warning';
        
        // Casos especiales de error
        if (error.message.includes('no está inscrito')) {
            mensajeError = 'Estudiante no inscrito en esta materia';
            tipoError = 'warning';
        } else if (error.message.includes('no encontró')) {
            mensajeError = 'Huella no registrada en el sistema';
            tipoError = 'info';
        } else {
            tipoError = 'danger';
        }
        
        // Mostrar error temporalmente
        actualizarEstadoEscaneo('duplicado', mensajeError);
        window.appUtils.showAlert(`❌ ${mensajeError}`, tipoError);
        
        // Volver al estado de escaneo después de 3 segundos
        setTimeout(() => {
            if (modalAsistenciaAbierto && asistenciaPorHuellaEnProgreso) {
                actualizarEstadoEscaneo('escaneando');
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


// Función mejorada para cargar registros de asistencia
function cargarRegistrosAsistencia() {
    console.log('🔍 Iniciando carga de registros de asistencia...');
    
    // Obtener valores de filtros
    const materiaId = asistenciaElements.asistenciaMateria ? asistenciaElements.asistenciaMateria.value : '';
    const fecha = asistenciaElements.asistenciaFecha ? asistenciaElements.asistenciaFecha.value : '';
    
    console.log('Filtros obtenidos:', { materiaId, fecha });
    
    // Construir URL con parámetros SOLO si tienen valores
    let url = `${window.appUtils.API_URL}/asistencia`;
    const params = [];
    
    // Solo agregar parámetros si tienen valores reales
    if (materiaId && materiaId.trim() !== '') {
        params.push(`materia=${encodeURIComponent(materiaId)}`);
        console.log('✅ Agregando filtro de materia:', materiaId);
    }
    
    if (fecha && fecha.trim() !== '') {
        params.push(`fecha=${encodeURIComponent(fecha)}`);
        console.log('✅ Agregando filtro de fecha:', fecha);
    }
    
    if (params.length > 0) {
        url += `?${params.join('&')}`;
        console.log('🔍 URL con filtros:', url);
    } else {
        console.log('📄 URL sin filtros (cargando todos los registros):', url);
    }
    
    // Mostrar indicador de carga
    if (asistenciaElements.asistenciaTableBody) {
        asistenciaElements.asistenciaTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    ${params.length > 0 ? 'Aplicando filtros y cargando registros...' : 'Cargando todos los registros de asistencia...'}
                </td>
            </tr>
        `;
    }
    
    // Realizar solicitud a la API
    fetch(url)
        .then(response => {
            console.log('📡 Respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('📊 Datos de asistencia recibidos:', {
                esArray: Array.isArray(data),
                cantidad: Array.isArray(data) ? data.length : 'No es array',
                tipoData: typeof data
            });
            
            // Verificar si data es un array
            if (!Array.isArray(data)) {
                console.error('❌ Los datos recibidos no son un array:', data);
                throw new Error('Formato de datos incorrecto del servidor');
            }
            
            // Log de muestra de datos si hay registros
            if (data.length > 0) {
                console.log('📄 Muestra del primer registro:', {
                    id: data[0]._id,
                    estudiante: data[0].estudiante?.nombre,
                    materia: data[0].materia?.nombre,
                    fecha: data[0].fecha,
                    presente: data[0].presente
                });
            }
            
            // Renderizar registros en la tabla
            renderizarRegistrosAsistencia(data);
            
            // Mostrar mensaje informativo si no se aplicaron filtros
            if (params.length === 0 && data.length > 0) {
                console.log(`ℹ️ Se cargaron ${data.length} registros más recientes (sin filtros)`);
            } else if (params.length > 0) {
                console.log(`ℹ️ Se encontraron ${data.length} registros con los filtros aplicados`);
            }
            
        })
        .catch(error => {
            console.error('❌ Error al cargar registros de asistencia:', error);
            
            // Mostrar error detallado en la tabla
            if (asistenciaElements.asistenciaTableBody) {
                asistenciaElements.asistenciaTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">
                            <div class="mb-2">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <strong>Error al cargar registros</strong>
                            </div>
                            <small class="text-muted">
                                ${error.message}
                                <br>
                                <button class="btn btn-sm btn-outline-primary mt-2" onclick="cargarRegistrosAsistencia()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>
                                    Reintentar
                                </button>
                            </small>
                        </td>
                    </tr>
                `;
            }
            
            window.appUtils.showAlert(`Error al cargar registros: ${error.message}`, 'danger');
        });
}

// Función mejorada para cargar datos iniciales de asistencia
function loadAsistenciaData() {
    console.log('🔄 Iniciando carga de datos de asistencia...');
    
    // Limpiar filtros al cargar por primera vez
    if (asistenciaElements.asistenciaMateria) {
        asistenciaElements.asistenciaMateria.value = '';  // Sin materia seleccionada
    }
    
    // NO establecer fecha por defecto - dejar vacío para mostrar todos los registros
    if (asistenciaElements.asistenciaFecha) {
        asistenciaElements.asistenciaFecha.value = '';  // Sin fecha seleccionada
    }
    
    // Verificar que las materias estén cargadas para los selectores
    if (!window.appUtils.appState.materias || window.appUtils.appState.materias.length === 0) {
        console.log('⚠️ Materias no cargadas, cargando primero...');
        
        // Cargar materias primero
        fetch(`${window.appUtils.API_URL}/materias`)
            .then(response => response.json())
            .then(materias => {
                console.log('✅ Materias cargadas:', materias.length);
                window.appUtils.appState.materias = materias;
                
                // Actualizar selectores
                updateMateriasSelectors();
                
                // Cargar registros de asistencia SIN filtros
                setTimeout(() => {
                    console.log('📄 Cargando registros de asistencia sin filtros...');
                    cargarRegistrosAsistencia();
                }, 300);
            })
            .catch(error => {
                console.error('❌ Error al cargar materias:', error);
                window.appUtils.showAlert('Error al cargar materias', 'danger');
                
                // Intentar cargar asistencias de todas formas
                setTimeout(() => {
                    cargarRegistrosAsistencia();
                }, 500);
            });
    } else {
        console.log('✅ Materias ya están cargadas');
        
        // Actualizar selectores
        updateMateriasSelectors();
        
        // Cargar registros de asistencia SIN filtros
        setTimeout(() => {
            console.log('📄 Cargando registros de asistencia sin filtros...');
            cargarRegistrosAsistencia();
        }, 200);
    }
}

// Función específica para aplicar filtros (llamada por el botón "Filtrar")
function aplicarFiltrosAsistencia() {
    console.log('🔍 Aplicando filtros de asistencia...');
    
    const materiaSeleccionada = asistenciaElements.asistenciaMateria ? asistenciaElements.asistenciaMateria.value : '';
    const fechaSeleccionada = asistenciaElements.asistenciaFecha ? asistenciaElements.asistenciaFecha.value : '';
    
    if (!materiaSeleccionada && !fechaSeleccionada) {
        window.appUtils.showAlert('Seleccione al menos un filtro (materia o fecha)', 'warning');
        return;
    }
    
    // Cargar con filtros
    cargarRegistrosAsistencia();
}

// Función para limpiar filtros
function limpiarFiltrosAsistencia() {
    console.log('🗑️ Limpiando filtros de asistencia...');
    
    if (asistenciaElements.asistenciaMateria) {
        asistenciaElements.asistenciaMateria.value = '';
    }
    
    if (asistenciaElements.asistenciaFecha) {
        asistenciaElements.asistenciaFecha.value = '';
    }
    
    // Recargar sin filtros
    cargarRegistrosAsistencia();
    
    window.appUtils.showAlert('Filtros eliminados - mostrando todos los registros', 'info');
}

function agregarBotonLimpiarFiltros() {
    // Buscar el botón de filtrar
    const btnFiltrar = asistenciaElements.btnFiltrarAsistencia;
    if (btnFiltrar && !document.getElementById('btn-limpiar-filtros')) {
        // Crear botón de limpiar filtros
        const btnLimpiar = document.createElement('button');
        btnLimpiar.type = 'button';
        btnLimpiar.id = 'btn-limpiar-filtros';
        btnLimpiar.className = 'btn btn-outline-secondary ms-2';
        btnLimpiar.innerHTML = '<i class="bi bi-x-circle"></i> Limpiar';
        btnLimpiar.title = 'Limpiar filtros y mostrar todos los registros';
        
        // Insertar después del botón de filtrar
        btnFiltrar.parentNode.insertBefore(btnLimpiar, btnFiltrar.nextSibling);
        
        // Agregar event listener
        btnLimpiar.addEventListener('click', limpiarFiltrosAsistencia);
        
        console.log('✅ Botón de limpiar filtros agregado');
    }
}



// Agregar funciones al objeto global
window.handleAsistenciaHuella = handleRegistroAsistenciaPorHuella;
window.detenerEscaneoContinuo = detenerEscaneoContinuo;
window.asistenciaFunctions = {
    ...window.asistenciaFunctions,
    handleRegistroAsistenciaPorHuella,
    iniciarRegistroAsistenciaPorHuella,
    toggleMetodoRegistroAsistencia
};


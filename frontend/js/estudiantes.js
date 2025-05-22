// Elementos DOM relacionados con estudiantes
const estudiantesElements = {
    table: document.getElementById('estudiantes-table'),
    tableBody: document.querySelector('#estudiantes-table tbody'),
    emptyMessage: document.getElementById('estudiantes-empty'),
    btnNuevoEstudiante: document.getElementById('btn-nuevo-estudiante'),
    btnNuevoEstudianteEmpty: document.getElementById('btn-nuevo-estudiante-empty'),
    searchInput: document.getElementById('estudiantes-search'),
    
    // Modal de estudiante
    modalEstudiante: new bootstrap.Modal(document.getElementById('modal-estudiante')),
    modalTitle: document.getElementById('modal-estudiante-title'),
    formEstudiante: document.getElementById('form-estudiante'),
    estudianteId: document.getElementById('estudiante-id'),
    estudianteNombre: document.getElementById('estudiante-nombre'),
    estudianteCodigo: document.getElementById('estudiante-codigo'),
    estudiantePrograma: document.getElementById('estudiante-programa'),
    estudianteMaterias: document.getElementById('estudiante-materias'),
    estudianteHuellaStatus: document.getElementById('estudiante-huella-status'),
    btnRegistrarHuella: document.getElementById('btn-registrar-huella'),
    btnEliminarHuella: document.getElementById('btn-eliminar-huella'),
    huellaProgress: document.getElementById('huella-progress'),
    huellaMensaje: document.getElementById('huella-mensaje'),
    btnCancelarHuella: document.getElementById('btn-cancelar-huella'),
    progressPercentage: document.getElementById('progress-percentage'),
    btnGuardarEstudiante: document.getElementById('btn-guardar-estudiante')
};

// Variables para gestión de huella
let registroHuellaEnProgreso = false;
let estudianteHuellaActual = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Configurar eventos para nuevo estudiante
    estudiantesElements.btnNuevoEstudiante.addEventListener('click', showNuevoEstudianteModal);
    if (estudiantesElements.btnNuevoEstudianteEmpty) {
        estudiantesElements.btnNuevoEstudianteEmpty.addEventListener('click', showNuevoEstudianteModal);
    }
    
    // Configurar evento para guardar estudiante
    estudiantesElements.btnGuardarEstudiante.addEventListener('click', saveEstudiante);
    
    // Configurar evento para validación del formulario
    estudiantesElements.formEstudiante.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEstudiante();
    });
    
    // Configurar evento para búsqueda
    if (estudiantesElements.searchInput) {
        estudiantesElements.searchInput.addEventListener('input', debounce(searchEstudiantes, 300));
    }
    
    // Configurar eventos para gestión de huella
    if (estudiantesElements.btnRegistrarHuella) {
        estudiantesElements.btnRegistrarHuella.addEventListener('click', iniciarRegistroHuella);
    }
    
    if (estudiantesElements.btnEliminarHuella) {
        estudiantesElements.btnEliminarHuella.addEventListener('click', eliminarHuella);
    }
    
    // Configurar evento para cancelar registro de huella
    if (estudiantesElements.btnCancelarHuella) {
        estudiantesElements.btnCancelarHuella.addEventListener('click', () => {
            cancelarRegistroHuella('Registro de huella cancelado por el usuario');
        });
    }
    
    // Configurar eventos de Socket.io para el progreso de huella
    setupHuellaSocketEvents();
});

// Configurar eventos de Socket.io para huella
function setupHuellaSocketEvents() {
    // Intentar obtener socket de diferentes maneras
    let currentSocket = null;
    
    if (window.socket) {
        currentSocket = window.socket;
    } else if (window.appUtils && window.appUtils.getSocket) {
        currentSocket = window.appUtils.getSocket();
    } else if (typeof socket !== 'undefined') {
        currentSocket = socket;
    }
    
    // Si no está disponible, reintentar
    if (!currentSocket) {
        console.log('Socket no disponible aún, reintentando en 500ms...');
        setTimeout(setupHuellaSocketEvents, 500);
        return;
    }
    
    console.log('✅ Socket disponible, configurando eventos de huella...');
    
    // Escuchar progreso del registro de huella
    currentSocket.on('huella-progress', (data) => {
        console.log('Evento huella-progress recibido:', data);
        if (registroHuellaEnProgreso) {
            updateHuellaProgress(data);
        } else {
            console.log('Evento ignorado - no hay registro en progreso');
        }
    });
    
    // Escuchar registro exitoso de huella
    currentSocket.on('huella-registered', (data) => {
        console.log('Evento huella-registered recibido:', data);
        if (registroHuellaEnProgreso) {
            completarRegistroHuella(data.id, data.message);
        } else {
            console.log('Evento ignorado - no hay registro en progreso');
        }
    });
    
    // Escuchar errores de huella
    socket.on('huella-error', (data) => {
        console.log('Evento huella-error recibido:', data);
        if (registroHuellaEnProgreso) {
            // Mostrar error en la barra de progreso
            const progressBar = estudiantesElements.huellaProgress.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.classList.remove('bg-primary', 'progress-bar-striped', 'progress-bar-animated');
                progressBar.classList.add('bg-danger');
            }
            
            // Mostrar mensaje de error
            if (estudiantesElements.huellaMensaje) {
                estudiantesElements.huellaMensaje.textContent = `Error: ${data.message}`;
                estudiantesElements.huellaMensaje.style.color = '#dc3545'; // Rojo bootstrap
            }
            
            // Cancelar el proceso después de un momento
            setTimeout(() => {
                cancelarRegistroHuella(`Error en el registro: ${data.message}`);
            }, 3000);
        } else {
            console.log('Evento error ignorado - no hay registro en progreso');
        }
    });
    
    // Mantener el evento original de fingerprint-scan para compatibilidad
    socket.on('fingerprint-scan', (data) => {
        console.log('Evento fingerprint-scan recibido:', data);
        if (registroHuellaEnProgreso) {
            console.log('Huella escaneada durante registro:', data);
            // Este evento se maneja ahora por huella-registered
        }
    });
    
    console.log('✅ Todos los eventos de huella configurados correctamente');
}

// Actualizar progreso de registro de huella
function updateHuellaProgress(data) {
    if (!estudiantesElements.huellaMensaje) return;
    
    console.log('Actualizando progreso de huella:', data);
    
    // Usar el mensaje exacto del Arduino si está disponible, sino usar uno predeterminado
    let mensaje = data.message;
    let progressValue = 0;
    
    switch (data.step) {
        case 'iniciando':
            progressValue = 10;
            if (!mensaje || mensaje === 'Iniciando registro de huella...') {
                mensaje = 'Iniciando registro de huella...';
            }
            break;
        case 'primera_captura':
            progressValue = 30;
            if (!mensaje || mensaje.includes('Coloque')) {
                // Usar el mensaje del Arduino o uno predeterminado
                mensaje = mensaje || 'Coloque el dedo en el lector...';
            }
            break;
        case 'retirar':
            progressValue = 50;
            if (!mensaje || mensaje.includes('Retire')) {
                mensaje = mensaje || 'Retire el dedo del lector';
            }
            break;
        case 'segunda_captura':
            progressValue = 70;
            if (!mensaje || mensaje.includes('mismo')) {
                mensaje = mensaje || 'Coloque el mismo dedo otra vez...';
            }
            break;
        case 'procesando':
            progressValue = 90;
            if (!mensaje) {
                mensaje = 'Procesando huella...';
            }
            break;
        case 'completado':
            progressValue = 100;
            if (!mensaje) {
                mensaje = '✅ ¡REGISTRO COMPLETADO EXITOSAMENTE!';
            }
            // Cambiar el color del texto para destacar el éxito
            estudiantesElements.huellaMensaje.style.color = '#198754'; // Verde bootstrap
            estudiantesElements.huellaMensaje.style.fontWeight = 'bold';
            break;
        default:
            // Para cualquier otro mensaje del Arduino, usar el mensaje tal como viene
            mensaje = data.message || 'Procesando...';
            // Mantener el progreso anterior si no reconocemos el paso
            const currentProgress = estudiantesElements.huellaProgress.querySelector('.progress-bar');
            if (currentProgress) {
                progressValue = parseInt(currentProgress.getAttribute('aria-valuenow')) || 0;
            }
            break;
    }
    
    // Actualizar texto del mensaje
    estudiantesElements.huellaMensaje.textContent = mensaje;
    
    // Actualizar barra de progreso
    const progressBar = estudiantesElements.huellaProgress.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progressValue}%`;
        progressBar.setAttribute('aria-valuenow', progressValue);
    }
    
    // Actualizar porcentaje
    if (estudiantesElements.progressPercentage) {
        estudiantesElements.progressPercentage.textContent = `${progressValue}%`;
    }
    
    console.log(`Progreso de huella actualizado: ${data.step} - ${mensaje} (${progressValue}%)`);
}

// Función para debounce (retrasar ejecución)
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Cargar estudiantes desde la API
function loadEstudiantes(filterMateriaId = null) {
    fetch(`${window.appUtils.API_URL}/estudiantes`)
        .then(response => response.json())
        .then(data => {
            // Guardar estudiantes en el estado global
            window.appUtils.appState.estudiantes = data;
            
            // Filtrar por materia si se especifica
            if (filterMateriaId) {
                data = data.filter(est => 
                    est.materias.some(mat => 
                        typeof mat === 'object' ? mat._id === filterMateriaId : mat === filterMateriaId
                    )
                );
            }
            
            // Filtrar por término de búsqueda si hay uno
            if (estudiantesElements.searchInput && estudiantesElements.searchInput.value.trim() !== '') {
                const searchTerm = estudiantesElements.searchInput.value.trim().toLowerCase();
                data = data.filter(est => 
                    est.nombre.toLowerCase().includes(searchTerm) || 
                    est.codigo.toLowerCase().includes(searchTerm)
                );
            }
            
            // Mostrar estudiantes en la tabla
            renderEstudiantes(data);
        })
        .catch(error => {
            console.error('Error al cargar estudiantes:', error);
            window.appUtils.showAlert('Error al cargar estudiantes. Intente de nuevo.', 'danger');
        });
}

// Renderizar estudiantes en la tabla
function renderEstudiantes(estudiantes) {
    if (!estudiantesElements.tableBody) return;
    
    // Limpiar tabla
    estudiantesElements.tableBody.innerHTML = '';
    
    if (estudiantes.length === 0) {
        // Mostrar mensaje de vacío
        estudiantesElements.table.classList.add('d-none');
        estudiantesElements.emptyMessage.classList.remove('d-none');
        return;
    }
    
    // Ocultar mensaje de vacío y mostrar tabla
    estudiantesElements.table.classList.remove('d-none');
    estudiantesElements.emptyMessage.classList.add('d-none');
    
    // Renderizar cada estudiante
    estudiantes.forEach(estudiante => {
        const row = document.createElement('tr');
        row.dataset.id = estudiante._id;
        
        // Estado de la huella
        const tieneHuella = estudiante.huellaID !== undefined && estudiante.huellaID !== null;
        const huellaHTML = tieneHuella
            ? `<span class="badge-huella registrada" title="Huella registrada (ID: ${estudiante.huellaID})"><i class="bi bi-fingerprint"></i> Registrada</span>`
            : `<span class="badge-huella no-registrada"><i class="bi bi-fingerprint"></i> No registrada</span>`;
        
        // Lista de materias
        let materiasHTML = '';
        if (estudiante.materias && estudiante.materias.length > 0) {
            materiasHTML = estudiante.materias.map(materia => {
                const nombreMateria = typeof materia === 'object' ? materia.nombre : 'Cargando...';
                return `<span class="badge bg-primary me-1">${nombreMateria}</span>`;
            }).join('');
        } else {
            materiasHTML = '<span class="text-muted">Sin materias</span>';
        }
        
        row.innerHTML = `
            <td>${estudiante.nombre}</td>
            <td>${estudiante.codigo}</td>
            <td>${estudiante.programaAcademico}</td>
            <td>${huellaHTML}</td>
            <td>${materiasHTML}</td>
            <td>
                <button class="btn btn-sm btn-info btn-accion btn-editar-estudiante" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-success btn-accion btn-asistencia" title="Registrar asistencia">
                    <i class="bi bi-check2-square"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-accion btn-eliminar-estudiante" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        // Configurar eventos para botones de acción
        const btnEditar = row.querySelector('.btn-editar-estudiante');
        const btnAsistencia = row.querySelector('.btn-asistencia');
        const btnEliminar = row.querySelector('.btn-eliminar-estudiante');
        
        if (btnEditar) {
            btnEditar.addEventListener('click', () => {
                editarEstudiante(estudiante);
            });
        }
        
        if (btnAsistencia) {
            btnAsistencia.addEventListener('click', () => {
                registrarAsistenciaEstudiante(estudiante);
            });
        }
        
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => {
                eliminarEstudiante(estudiante);
            });
        }
        
        estudiantesElements.tableBody.appendChild(row);
    });
}

// Mostrar modal para nuevo estudiante
function showNuevoEstudianteModal() {
    // Limpiar formulario
    estudiantesElements.formEstudiante.reset();
    estudiantesElements.estudianteId.value = '';
    
    // Actualizar estado de huella
    actualizarEstadoHuella(null);
    
    // Actualizar título del modal
    estudiantesElements.modalTitle.textContent = 'Nuevo Estudiante';
    
    // Cargar materias disponibles
    updateSelectMaterias();
    
    // Mostrar modal
    estudiantesElements.modalEstudiante.show();
}

// Actualizar selector de materias en el formulario
function updateSelectMaterias() {
    if (!estudiantesElements.estudianteMaterias) return;
    
    // Obtener materias del estado global
    const materias = window.appUtils.appState.materias || [];
    
    // Guardar selecciones actuales
    const selectedValues = Array.from(estudiantesElements.estudianteMaterias.selectedOptions).map(opt => opt.value);
    
    // Limpiar selector
    estudiantesElements.estudianteMaterias.innerHTML = '';
    
    // Agregar opciones de materias
    materias.forEach(materia => {
        const option = document.createElement('option');
        option.value = materia._id;
        option.textContent = `${materia.nombre} (${materia.codigo})`;
        option.selected = selectedValues.includes(materia._id);
        estudiantesElements.estudianteMaterias.appendChild(option);
    });
}

// Guardar estudiante (crear o actualizar)
function saveEstudiante() {
    // Validar formulario
    if (!estudiantesElements.formEstudiante.checkValidity()) {
        estudiantesElements.formEstudiante.reportValidity();
        return;
    }
    
    // Obtener materias seleccionadas
    const materiasSeleccionadas = Array.from(estudiantesElements.estudianteMaterias.selectedOptions).map(opt => opt.value);
    
    // Obtener datos del formulario
    const estudianteData = {
        nombre: estudiantesElements.estudianteNombre.value,
        codigo: estudiantesElements.estudianteCodigo.value,
        programaAcademico: estudiantesElements.estudiantePrograma.value,
        materias: materiasSeleccionadas
    };
    
    // Si hay un huellaID asociado, incluirlo
    if (estudianteHuellaActual) {
        estudianteData.huellaID = estudianteHuellaActual;
    }
    
    const estudianteId = estudiantesElements.estudianteId.value;
    const isEditing = estudianteId !== '';
    
    // Configurar solicitud
    const url = isEditing 
        ? `${window.appUtils.API_URL}/estudiantes/${estudianteId}` 
        : `${window.appUtils.API_URL}/estudiantes`;
    
    const method = isEditing ? 'PUT' : 'POST';
    
    // Enviar solicitud a la API
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(estudianteData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Error al guardar estudiante');
            });
        }
        return response.json();
    })
    .then(data => {
        // Cerrar modal
        estudiantesElements.modalEstudiante.hide();
        
        // Mostrar mensaje de éxito
        const message = isEditing 
            ? `Estudiante "${data.nombre}" actualizado correctamente` 
            : `Estudiante "${data.nombre}" creado correctamente`;
        window.appUtils.showAlert(message, 'success');
        
        // Recargar estudiantes
        loadEstudiantes();
    })
    .catch(error => {
        console.error('Error al guardar estudiante:', error);
        window.appUtils.showAlert(error.message, 'danger');
    });
}

// Editar estudiante existente
function editarEstudiante(estudiante) {
    // Llenar formulario con datos del estudiante
    estudiantesElements.estudianteId.value = estudiante._id;
    estudiantesElements.estudianteNombre.value = estudiante.nombre;
    estudiantesElements.estudianteCodigo.value = estudiante.codigo;
    estudiantesElements.estudiantePrograma.value = estudiante.programaAcademico;
    
    // Actualizar estado de huella
    actualizarEstadoHuella(estudiante.huellaID);
    
    // Cargar materias y seleccionar las del estudiante
    updateSelectMaterias();
    
    // Seleccionar materias del estudiante
    if (estudiante.materias && estudiante.materias.length > 0) {
        const materiasIds = estudiante.materias.map(m => typeof m === 'object' ? m._id : m);
        
        Array.from(estudiantesElements.estudianteMaterias.options).forEach(option => {
            option.selected = materiasIds.includes(option.value);
        });
    }
    
    // Actualizar título del modal
    estudiantesElements.modalTitle.textContent = 'Editar Estudiante';
    
    // Mostrar modal
    estudiantesElements.modalEstudiante.show();
}

// Eliminar estudiante
function eliminarEstudiante(estudiante) {
    console.log('🗑️ Eliminando estudiante:', estudiante.nombre);
    
    // OPCIÓN 1: Una sola confirmación con modal
    window.appUtils.confirmAction(
        'Eliminar Estudiante',
        `¿Está seguro de eliminar al estudiante "${estudiante.nombre}" (${estudiante.codigo})?\n\n` +
        `Esta acción eliminará:\n` +
        `• Los datos del estudiante de la base de datos\n` +
        `${estudiante.huellaID ? `• Su huella digital del sensor AS608 (ID: ${estudiante.huellaID})\n` : ''}` +
        `\n⚠️ Esta acción NO se puede deshacer.`,
        () => {
            // Ejecutar eliminación directamente
            console.log('✅ Usuario confirmó eliminación');
            
            fetch(`${window.appUtils.API_URL}/estudiantes/${estudiante._id}?confirmar=true`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Error al eliminar estudiante');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('✅ Estudiante eliminado:', data);
                window.appUtils.showAlert(`Estudiante "${estudiante.nombre}" eliminado correctamente`, 'success');
                loadEstudiantes();
            })
            .catch(error => {
                console.error('❌ Error al eliminar estudiante:', error);
                window.appUtils.showAlert(error.message, 'danger');
            });
        },
        'Eliminar Definitivamente',
        'danger'
    );
}


// Registrar asistencia para un estudiante
function registrarAsistenciaEstudiante(estudiante) {
    // Cambiar a la sección de asistencia
    document.getElementById('nav-asistencia').click();
    
    // Seleccionar el estudiante en el modal de asistencia
    setTimeout(() => {
        const btnRegistrarAsistencia = document.getElementById('btn-registrar-asistencia');
        if (btnRegistrarAsistencia) {
            btnRegistrarAsistencia.click();
            
            setTimeout(() => {
                // Cambiar a registro manual
                document.getElementById('metodo-manual').checked = true;
                document.getElementById('metodo-manual').dispatchEvent(new Event('change'));
                
                // Seleccionar el estudiante
                const selectEstudiante = document.getElementById('asistencia-estudiante');
                if (selectEstudiante) {
                    // Esperar a que se carguen los estudiantes
                    const checkEstudianteLoaded = setInterval(() => {
                        if (selectEstudiante.options.length > 1) {
                            clearInterval(checkEstudianteLoaded);
                            
                            // Buscar y seleccionar el estudiante
                            Array.from(selectEstudiante.options).forEach(option => {
                                if (option.value === estudiante._id) {
                                    option.selected = true;
                                    selectEstudiante.dispatchEvent(new Event('change'));
                                }
                            });
                        }
                    }, 100);
                }
            }, 300);
        }
    }, 300);
}

// Buscar estudiantes según término de búsqueda
function searchEstudiantes() {
    if (!estudiantesElements.searchInput) return;
    
    const searchTerm = estudiantesElements.searchInput.value.trim();
    
    if (searchTerm === '') {
        // Si se borra el término, cargar todos los estudiantes
        loadEstudiantes();
        return;
    }
    
    // Filtrar estudiantes del estado global
    const estudiantes = window.appUtils.appState.estudiantes || [];
    const searchTermLower = searchTerm.toLowerCase();
    
    const filteredEstudiantes = estudiantes.filter(est => 
        est.nombre.toLowerCase().includes(searchTermLower) || 
        est.codigo.toLowerCase().includes(searchTermLower)
    );
    
    // Renderizar estudiantes filtrados
    renderEstudiantes(filteredEstudiantes);
}

// Filtrar estudiantes por materia
function filtrarEstudiantesPorMateria(materiaId) {
    loadEstudiantes(materiaId);
    
    // Mostrar mensaje indicando el filtro
    const materia = window.appUtils.appState.materias.find(m => m._id === materiaId);
    if (materia) {
        window.appUtils.showAlert(`Mostrando estudiantes inscritos en "${materia.nombre}"`, 'info');
    }
}

// Iniciar proceso de registro de huella
function iniciarRegistroHuella() {
    // Verificar si el Arduino está conectado
    if (!window.appUtils.appState.arduinoConectado) {
        window.appUtils.showAlert('El Arduino no está conectado. Verifique la conexión.', 'danger');
        return;
    }
    
    // Mostrar interfaz de progreso
    estudiantesElements.huellaProgress.classList.remove('d-none');
    estudiantesElements.huellaMensaje.textContent = 'Iniciando proceso de registro...';
    
    // Resetear estilo del mensaje
    estudiantesElements.huellaMensaje.style.color = '';
    estudiantesElements.huellaMensaje.style.fontWeight = '';
    
    // Inicializar barra de progreso
    const progressBar = estudiantesElements.huellaProgress.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        progressBar.classList.remove('bg-success', 'bg-danger');
        progressBar.classList.add('progress-bar-striped', 'progress-bar-animated', 'bg-primary');
    }
    
    // Deshabilitar botón de registro y habilitar cancelar
    estudiantesElements.btnRegistrarHuella.disabled = true;
    if (estudiantesElements.btnCancelarHuella) {
        estudiantesElements.btnCancelarHuella.disabled = false;
    }
    
    // Indicar que el registro está en progreso
    registroHuellaEnProgreso = true;
    
    // Obtener el siguiente ID disponible
    fetch(`${window.appUtils.API_URL}/arduino/command`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: 'count' })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.error || 'Error al obtener conteo de huellas');
        }
        
        console.log('Comando count enviado, esperando respuesta...');
        
        // Esperar un momento para que el Arduino procese el conteo, luego obtener estudiantes
        setTimeout(() => {
            obtenerSiguienteIdYRegistrar();
        }, 1000); // Esperar 1 segundo para el conteo
    })
    .catch(error => {
        console.error('Error al iniciar registro de huella:', error);
        cancelarRegistroHuella('Error al iniciar el registro de huella. Intente nuevamente.');
    });
}

// Función separada para obtener el siguiente ID y enviar comando de registro
function obtenerSiguienteIdYRegistrar() {
    // Obtener todos los estudiantes para ver qué IDs están ocupados
    fetch(`${window.appUtils.API_URL}/estudiantes`)
        .then(response => response.json())
        .then(estudiantes => {
            // Obtener IDs de huella ya utilizados
            const idsUsados = estudiantes
                .filter(est => est.huellaID !== null && est.huellaID !== undefined)
                .map(est => est.huellaID);
            
            // Encontrar el primer ID disponible (1-127)
            let nextId = 1;
            while (idsUsados.includes(nextId) && nextId <= 127) {
                nextId++;
            }
            
            if (nextId > 127) {
                throw new Error('No hay IDs de huella disponibles (máximo 127)');
            }
            
            console.log('Iniciando registro de huella con ID:', nextId);
            
            // Actualizar mensaje inicial
            updateHuellaProgress({
                step: 'iniciando',
                message: `Preparando registro con ID ${nextId}...`
            });
            
            // Enviar comando de registro
            return fetch(`${window.appUtils.API_URL}/arduino/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: `enroll:${nextId}` })
            });
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Error al iniciar registro de huella');
            }
            
            console.log('Comando de registro enviado exitosamente');
            
            // SINCRONIZAR TIMEOUT CON EL ARDUINO (2 minutos exactamente)
            setTimeout(() => {
                if (registroHuellaEnProgreso) {
                    console.log('Timeout del frontend alcanzado - sincronizado con Arduino');
                    cancelarRegistroHuella('Tiempo de espera agotado. El Arduino también canceló el proceso.');
                }
            }, 120000); // 120 segundos = 2 minutos, exactamente igual que el servidor
        })
        .catch(error => {
            console.error('Error en el proceso de registro:', error);
            cancelarRegistroHuella('Error al iniciar el registro de huella. Intente nuevamente.');
        });
}

// Cancelar proceso de registro de huella
function cancelarRegistroHuella(mensaje) {
    console.log('Cancelando registro de huella:', mensaje);
    
    registroHuellaEnProgreso = false;
    estudiantesElements.btnRegistrarHuella.disabled = false;
    estudiantesElements.huellaProgress.classList.add('d-none');
    
    // Resetear estilo del mensaje
    estudiantesElements.huellaMensaje.style.color = '';
    estudiantesElements.huellaMensaje.style.fontWeight = '';
    
    // Resetear barra de progreso
    const progressBar = estudiantesElements.huellaProgress.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        progressBar.classList.remove('bg-success', 'bg-danger');
        progressBar.classList.add('progress-bar-striped', 'progress-bar-animated', 'bg-primary');
    }
    
    // Resetear porcentaje
    if (estudiantesElements.progressPercentage) {
        estudiantesElements.progressPercentage.textContent = '0%';
    }
    
    // Resetear botón de cancelar
    if (estudiantesElements.btnCancelarHuella) {
        estudiantesElements.btnCancelarHuella.disabled = false;
        estudiantesElements.btnCancelarHuella.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar Registro';
    }
    
    if (mensaje) {
        window.appUtils.showAlert(mensaje, 'warning');
    }
    
    console.log('Registro de huella cancelado y interfaz resetada');
}

// Completar registro de huella con el ID asignado
function completarRegistroHuella(huellaID, mensaje) {
    if (!registroHuellaEnProgreso) {
        console.log('Intento de completar registro pero no hay proceso en progreso');
        return;
    }
    
    console.log(`REGISTRO COMPLETADO - ID de huella: ${huellaID}`);
    
    // MARCAR INMEDIATAMENTE COMO COMPLETADO
    registroHuellaEnProgreso = false;
    
    // Actualizar progreso al 100% con estado completado
    updateHuellaProgress({
        step: 'completado',
        message: mensaje || `✅ REGISTRO COMPLETADO - Huella registrada con ID ${huellaID}`
    });
    
    // Completar barra de progreso con color de éxito
    const progressBar = estudiantesElements.huellaProgress.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.setAttribute('aria-valuenow', 100);
        progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated', 'bg-primary');
        progressBar.classList.add('bg-success');
    }
    
    // Actualizar porcentaje al 100%
    if (estudiantesElements.progressPercentage) {
        estudiantesElements.progressPercentage.textContent = '100%';
    }
    
    // ACTUALIZAR INMEDIATAMENTE EL ESTADO DE HUELLA EN LA INTERFAZ
    actualizarEstadoHuella(huellaID);
    
    // Deshabilitar el botón de cancelar ya que el proceso terminó
    if (estudiantesElements.btnCancelarHuella) {
        estudiantesElements.btnCancelarHuella.disabled = true;
        estudiantesElements.btnCancelarHuella.textContent = 'Proceso Completado';
    }
    
    // Mostrar mensaje de éxito inmediatamente
    window.appUtils.showAlert(
        `🎉 Huella registrada exitosamente con ID ${huellaID}`, 
        'success',
        5000 // 5 segundos
    );
    
    console.log('✅ ESTADO ACTUALIZADO - Huella marcada como registrada en la interfaz');
    
    // Ocultar el progreso y restaurar la interfaz después de mostrar el éxito
    setTimeout(() => {
        console.log('Restaurando interfaz después del registro exitoso');
        
        // Ocultar barra de progreso
        estudiantesElements.huellaProgress.classList.add('d-none');
        
        // Habilitar botón de registro nuevamente
        estudiantesElements.btnRegistrarHuella.disabled = false;
        
        // Restaurar botón de cancelar
        if (estudiantesElements.btnCancelarHuella) {
            estudiantesElements.btnCancelarHuella.disabled = false;
            estudiantesElements.btnCancelarHuella.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar Registro';
        }
        
        // Resetear barra de progreso para futuros usos
        if (progressBar) {
            progressBar.classList.remove('bg-success');
            progressBar.classList.add('progress-bar-striped', 'progress-bar-animated', 'bg-primary');
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', 0);
        }
        
        // Resetear porcentaje
        if (estudiantesElements.progressPercentage) {
            estudiantesElements.progressPercentage.textContent = '0%';
        }
        
        console.log('✅ PROCESO COMPLETAMENTE FINALIZADO - Interfaz restaurada');
        
    }, 4000); // 4 segundos para que el usuario vea el estado completado
}

// Eliminar huella del estudiante actual
function eliminarHuella() {
    if (!estudianteHuellaActual) return;
    
    window.appUtils.confirmAction(
        'Eliminar Huella',
        '¿Está seguro de eliminar la huella digital registrada? Esta acción no se puede deshacer.',
        () => {
            const estudianteId = estudiantesElements.estudianteId.value;
            
            if (!estudianteId) {
                window.appUtils.showAlert('No hay un estudiante seleccionado.', 'danger');
                return;
            }
            
            // Enviar comando para eliminar huella en el sensor
            fetch(`${window.appUtils.API_URL}/arduino/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: `delete:${estudianteHuellaActual}` })
            })
            .then(response => response.json())
            .then(data => {
                // Eliminar asociación de huella en la base de datos
                return fetch(`${window.appUtils.API_URL}/estudiantes/${estudianteId}/huella`, {
                    method: 'DELETE'
                });
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Error al eliminar huella');
                    });
                }
                return response.json();
            })
            .then(data => {
                // Actualizar estado de huella
                actualizarEstadoHuella(null);
                
                window.appUtils.showAlert('Huella eliminada correctamente', 'success');
            })
            .catch(error => {
                console.error('Error al eliminar huella:', error);
                window.appUtils.showAlert(error.message, 'danger');
            });
        },
        'Eliminar',
        'danger'
    );
}

// Actualizar estado visual de la huella
function actualizarEstadoHuella(huellaID) {
    console.log(`Actualizando estado visual de huella a ID: ${huellaID}`);
    
    estudianteHuellaActual = huellaID;
    
    if (huellaID) {
        estudiantesElements.estudianteHuellaStatus.innerHTML = `
            <i class="bi bi-fingerprint text-success"></i> Registrada (ID: ${huellaID})
        `;
        estudiantesElements.btnRegistrarHuella.textContent = 'Actualizar Huella';
        estudiantesElements.btnEliminarHuella.classList.remove('d-none');
        
        // Agregar una pequeña animación para destacar el cambio
        estudiantesElements.estudianteHuellaStatus.classList.add('fingerprint-pulse');
        setTimeout(() => {
            estudiantesElements.estudianteHuellaStatus.classList.remove('fingerprint-pulse');
        }, 2000);
        
        console.log('Estado de huella actualizado a registrada');
    } else {
        estudiantesElements.estudianteHuellaStatus.innerHTML = `
            <i class="bi bi-fingerprint text-danger"></i> Sin registrar
        `;
        estudiantesElements.btnRegistrarHuella.textContent = 'Registrar Huella';
        estudiantesElements.btnEliminarHuella.classList.add('d-none');
        
        console.log('Estado de huella actualizado a sin registrar');
    }
}

// Exponer funciones necesarias globalmente
window.loadEstudiantes = loadEstudiantes;
window.filtrarEstudiantesPorMateria = filtrarEstudiantesPorMateria;
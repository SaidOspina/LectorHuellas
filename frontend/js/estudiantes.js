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
});

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
    window.appUtils.confirmAction(
        'Eliminar Estudiante',
        `¿Está seguro de eliminar al estudiante "${estudiante.nombre}"? Esta acción requiere confirmación adicional.`,
        () => {
            // Primera confirmación pasada, ahora pedir segunda confirmación
            window.appUtils.confirmAction(
                'Confirmar Eliminación',
                `Por favor, confirme nuevamente que desea eliminar al estudiante "${estudiante.nombre}" (Código: ${estudiante.codigo})`,
                () => {
                    // Segunda confirmación pasada, proceder con eliminación
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
                        window.appUtils.showAlert(`Estudiante "${estudiante.nombre}" eliminado correctamente`, 'success');
                        loadEstudiantes();
                    })
                    .catch(error => {
                        console.error('Error al eliminar estudiante:', error);
                        window.appUtils.showAlert(error.message, 'danger');
                    });
                },
                'Eliminar definitivamente',
                'danger'
            );
        },
        'Eliminar',
        'warning'
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
// Iniciar proceso de registro de huella
function iniciarRegistroHuella() {
    // Verificar si el Arduino está conectado
    if (!window.appUtils.appState.arduinoConectado) {
        window.appUtils.showAlert('El Arduino no está conectado. Verifique la conexión.', 'danger');
        return;
    }
    
    // Mostrar interfaz de progreso
    estudiantesElements.huellaProgress.classList.remove('d-none');
    estudiantesElements.huellaMensaje.textContent = 'Iniciando lector de huella...';
    
    // Deshabilitar botón
    estudiantesElements.btnRegistrarHuella.disabled = true;
    
    // Indicar que el registro está en progreso
    registroHuellaEnProgreso = true;
    
    // Generar ID de huella (siguiente disponible)
    fetch(`${window.appUtils.API_URL}/arduino/command`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: 'count' })
    })
    .then(response => response.json())
    .then(data => {
        // El problema puede estar aquí - necesitamos asegurarnos de que estamos
        // interpretando correctamente la respuesta y generando un ID válido
        
        // Modificar esta parte para asegurarnos de tener un ID válido
        let nextId = 1; // Valor predeterminado
        
        // Si data.count existe, incrementarlo. Si no, usar un valor fijo
        if (data && data.count !== undefined) {
            nextId = parseInt(data.count) + 1;
        }
        
        console.log('Iniciando registro de huella con ID:', nextId);
        
        // Actualizar mensaje
        estudiantesElements.huellaMensaje.textContent = 'Coloque su dedo en el lector...';
        
        // MODIFICAR: Asegurarnos de enviar el comando exactamente como lo espera el Arduino
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
        // Agregar más logs para depuración
        console.log('Respuesta del servidor al comando enroll:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Error al iniciar registro de huella');
        }
        
        // Configurar un temporizador para mostrar actualizaciones periódicas
        let dots = 0;
        const updateInterval = setInterval(() => {
            if (!registroHuellaEnProgreso) {
                clearInterval(updateInterval);
                return;
            }
            
            dots = (dots + 1) % 4;
            const dotStr = '.'.repeat(dots);
            estudiantesElements.huellaMensaje.textContent = `Esperando dedo en el lector${dotStr}`;
        }, 500);
        
        // Configurar un temporizador para cancelar si demora demasiado
        setTimeout(() => {
            if (registroHuellaEnProgreso) {
                clearInterval(updateInterval);
                cancelarRegistroHuella('El tiempo de espera ha expirado. Intente nuevamente.');
            }
        }, 30000); // 30 segundos de timeout
    })
    .catch(error => {
        console.error('Error al iniciar registro de huella:', error);
        cancelarRegistroHuella('Error al iniciar el registro de huella. Intente nuevamente.');
    });
}

// Cancelar proceso de registro de huella
function cancelarRegistroHuella(mensaje) {
    registroHuellaEnProgreso = false;
    estudiantesElements.btnRegistrarHuella.disabled = false;
    estudiantesElements.huellaProgress.classList.add('d-none');
    
    if (mensaje) {
        window.appUtils.showAlert(mensaje, 'danger');
    }
}

// Completar registro de huella con el ID asignado
function completarRegistroHuella(huellaID) {
    if (!registroHuellaEnProgreso) return;
    
    registroHuellaEnProgreso = false;
    
    // Actualizar estado de huella
    actualizarEstadoHuella(huellaID);
    
    // Ocultar progreso
    estudiantesElements.huellaProgress.classList.add('d-none');
    estudiantesElements.btnRegistrarHuella.disabled = false;
    
    // Mostrar mensaje de éxito
    window.appUtils.showAlert(`Huella registrada correctamente con ID: ${huellaID}`, 'success');
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
    estudianteHuellaActual = huellaID;
    
    if (huellaID) {
        estudiantesElements.estudianteHuellaStatus.innerHTML = `
            <i class="bi bi-fingerprint text-success"></i> Registrada (ID: ${huellaID})
        `;
        estudiantesElements.btnRegistrarHuella.textContent = 'Actualizar Huella';
        estudiantesElements.btnEliminarHuella.classList.remove('d-none');
    } else {
        estudiantesElements.estudianteHuellaStatus.innerHTML = `
            <i class="bi bi-fingerprint text-danger"></i> Sin registrar
        `;
        estudiantesElements.btnRegistrarHuella.textContent = 'Registrar Huella';
        estudiantesElements.btnEliminarHuella.classList.add('d-none');
    }
}

// Manejar evento de huella escaneada desde socket
if (typeof socket !== 'undefined') { // Verificar si socket está definido
    socket.on('fingerprint-scan', (data) => {
        const huellaID = data.id;
        
        if (registroHuellaEnProgreso) {
            // Estamos en proceso de registro
            completarRegistroHuella(huellaID);
        }
    });
}


// Exponer funciones necesarias globalmente
window.loadEstudiantes = loadEstudiantes;
window.filtrarEstudiantesPorMateria = filtrarEstudiantesPorMateria;
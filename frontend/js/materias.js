// Elementos DOM relacionados con materias
const materiasElements = {
    table: document.getElementById('materias-table'),
    tableBody: document.querySelector('#materias-table tbody'),
    emptyMessage: document.getElementById('materias-empty'),
    btnNuevaMateria: document.getElementById('btn-nueva-materia'),
    btnNuevaMateriaEmpty: document.getElementById('btn-nueva-materia-empty'),
    
    // Modal de materia
    modalMateria: new bootstrap.Modal(document.getElementById('modal-materia')),
    modalTitle: document.getElementById('modal-materia-title'),
    formMateria: document.getElementById('form-materia'),
    materiaId: document.getElementById('materia-id'),
    materiaNombre: document.getElementById('materia-nombre'),
    materiaCodigo: document.getElementById('materia-codigo'),
    materiaDescripcion: document.getElementById('materia-descripcion'),
    btnGuardarMateria: document.getElementById('btn-guardar-materia'),
    
    // Papelera de materias
    papeleraTable: document.getElementById('materias-papelera-table'),
    papeleraTableBody: document.querySelector('#materias-papelera-table tbody'),
    papeleraEmptyMessage: document.getElementById('materias-papelera-empty')
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Configurar eventos para nueva materia
    materiasElements.btnNuevaMateria.addEventListener('click', showNuevaMateriaModal);
    if (materiasElements.btnNuevaMateriaEmpty) {
        materiasElements.btnNuevaMateriaEmpty.addEventListener('click', showNuevaMateriaModal);
    }
    
    // Configurar evento para guardar materia
    materiasElements.btnGuardarMateria.addEventListener('click', saveMateria);
    
    // Configurar evento para validación del formulario
    materiasElements.formMateria.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMateria();
    });
    
    // Configurar pestaña de papelera
    const tabMateriasPapelera = document.getElementById('tab-materias-papelera');
    if (tabMateriasPapelera) {
        tabMateriasPapelera.addEventListener('click', (e) => {
            e.preventDefault();
            loadPapelera();
        });
    }
});

// Cargar materias desde la API
// Cargar materias desde la API
function loadMaterias() {
    // Verificar si window.appUtils está definido
    if (!window.appUtils || !window.appUtils.API_URL) {
        console.error('Error: window.appUtils no está definido o API_URL no está disponible');
        setTimeout(loadMaterias, 500); // Intentar de nuevo después de 500ms
        return;
    }
    
    fetch(`${window.appUtils.API_URL}/materias`)
        .then(response => response.json())
        .then(data => {
            // Guardar materias en el estado global
            window.appUtils.appState.materias = data;
            
            // Mostrar materias en la tabla
            renderMaterias(data);
            
            // Actualizar selectores de materias en la aplicación
            updateMateriasSelectors();
        })
        .catch(error => {
            console.error('Error al cargar materias:', error);
            if (window.appUtils && window.appUtils.showAlert) {
                window.appUtils.showAlert('Error al cargar materias. Intente de nuevo.', 'danger');
            }
        });
}

// Cargar materias en papelera
function loadPapelera() {
    fetch(`${window.appUtils.API_URL}/materias?estado=papelera`)
        .then(response => response.json())
        .then(data => {
            // Mostrar materias en la tabla de papelera
            renderMateriasPapelera(data);
        })
        .catch(error => {
            console.error('Error al cargar materias en papelera:', error);
            window.appUtils.showAlert('Error al cargar papelera. Intente de nuevo.', 'danger');
        });
}

// Renderizar materias en la tabla
function renderMaterias(materias) {
    if (!materiasElements.tableBody) return;
    
    // Limpiar tabla
    materiasElements.tableBody.innerHTML = '';
    
    if (materias.length === 0) {
        // Mostrar mensaje de vacío
        materiasElements.table.classList.add('d-none');
        materiasElements.emptyMessage.classList.remove('d-none');
        return;
    }
    
    // Ocultar mensaje de vacío y mostrar tabla
    materiasElements.table.classList.remove('d-none');
    materiasElements.emptyMessage.classList.add('d-none');
    
    // Renderizar cada materia
    materias.forEach(materia => {
        const row = document.createElement('tr');
        row.dataset.id = materia._id;
        
        // Contar estudiantes inscritos
        fetch(`${window.appUtils.API_URL}/materias/${materia._id}/estudiantes`)
            .then(response => response.json())
            .then(estudiantes => {
                const estudiantesCount = estudiantes.length;
                
                // Actualizar fila con la información
                row.innerHTML = `
                    <td>${materia.nombre}</td>
                    <td>${materia.codigo}</td>
                    <td>${materia.descripcion || 'N/A'}</td>
                    <td>
                        <span class="badge bg-info">${estudiantesCount} estudiante(s)</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-accion btn-ver-estudiantes" title="Ver estudiantes">
                            <i class="bi bi-people"></i>
                        </button>
                        <button class="btn btn-sm btn-success btn-accion btn-tomar-asistencia" title="Tomar asistencia">
                            <i class="bi bi-check2-square"></i>
                        </button>
                        <button class="btn btn-sm btn-info btn-accion btn-editar-materia" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-warning btn-accion btn-papelera" title="Mover a papelera">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                
                // Configurar eventos para botones de acción
                const btnVerEstudiantes = row.querySelector('.btn-ver-estudiantes');
                const btnTomarAsistencia = row.querySelector('.btn-tomar-asistencia');
                const btnEditar = row.querySelector('.btn-editar-materia');
                const btnPapelera = row.querySelector('.btn-papelera');
                
                if (btnVerEstudiantes) {
                    btnVerEstudiantes.addEventListener('click', () => {
                        verEstudiantesMateria(materia);
                    });
                }
                
                if (btnTomarAsistencia) {
                    btnTomarAsistencia.addEventListener('click', () => {
                        abrirTomarAsistencia(materia);
                    });
                }
                
                if (btnEditar) {
                    btnEditar.addEventListener('click', () => {
                        editarMateria(materia);
                    });
                }
                
                if (btnPapelera) {
                    btnPapelera.addEventListener('click', () => {
                        moverAPapelera(materia);
                    });
                }
            })
            .catch(error => {
                console.error('Error al obtener estudiantes de la materia:', error);
                row.innerHTML = `
                    <td>${materia.nombre}</td>
                    <td>${materia.codigo}</td>
                    <td>${materia.descripcion || 'N/A'}</td>
                    <td>
                        <span class="badge bg-secondary">Error al cargar</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info btn-accion btn-editar-materia" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-warning btn-accion btn-papelera" title="Mover a papelera">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                
                // Configurar eventos para botones de acción
                const btnEditar = row.querySelector('.btn-editar-materia');
                const btnPapelera = row.querySelector('.btn-papelera');
                
                if (btnEditar) {
                    btnEditar.addEventListener('click', () => {
                        editarMateria(materia);
                    });
                }
                
                if (btnPapelera) {
                    btnPapelera.addEventListener('click', () => {
                        moverAPapelera(materia);
                    });
                }
            });
        
        materiasElements.tableBody.appendChild(row);
    });
}

// Renderizar materias en la tabla de papelera
function renderMateriasPapelera(materias) {
    if (!materiasElements.papeleraTableBody) return;
    
    // Limpiar tabla
    materiasElements.papeleraTableBody.innerHTML = '';
    
    if (materias.length === 0) {
        // Mostrar mensaje de vacío
        materiasElements.papeleraTable.classList.add('d-none');
        materiasElements.papeleraEmptyMessage.classList.remove('d-none');
        return;
    }
    
    // Ocultar mensaje de vacío y mostrar tabla
    materiasElements.papeleraTable.classList.remove('d-none');
    materiasElements.papeleraEmptyMessage.classList.add('d-none');
    
    // Renderizar cada materia
    materias.forEach(materia => {
        const row = document.createElement('tr');
        row.dataset.id = materia._id;
        
        row.innerHTML = `
            <td>${materia.nombre}</td>
            <td>${materia.codigo}</td>
            <td>${materia.descripcion || 'N/A'}</td>
            <td>${window.appUtils.formatDate(materia.fechaCreacion)}</td>
            <td>
                <button class="btn btn-sm btn-success btn-accion btn-restaurar" title="Restaurar">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-accion btn-eliminar" title="Eliminar permanentemente">
                    <i class="bi bi-x-circle"></i>
                </button>
            </td>
        `;
        
        // Configurar eventos para botones de acción
        const btnRestaurar = row.querySelector('.btn-restaurar');
        const btnEliminar = row.querySelector('.btn-eliminar');
        
        if (btnRestaurar) {
            btnRestaurar.addEventListener('click', () => {
                restaurarMateria(materia);
            });
        }
        
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => {
                eliminarMateriaPermanente(materia);
            });
        }
        
        materiasElements.papeleraTableBody.appendChild(row);
    });
}

// Mostrar modal para nueva materia
function showNuevaMateriaModal() {
    // Limpiar formulario
    materiasElements.formMateria.reset();
    materiasElements.materiaId.value = '';
    
    // Actualizar título del modal
    materiasElements.modalTitle.textContent = 'Nueva Materia';
    
    // Mostrar modal
    materiasElements.modalMateria.show();
}

// Guardar materia (crear o actualizar)
function saveMateria() {
    // Validar formulario
    if (!materiasElements.formMateria.checkValidity()) {
        materiasElements.formMateria.reportValidity();
        return;
    }
    
    // Obtener datos del formulario
    const materiaData = {
        nombre: materiasElements.materiaNombre.value,
        codigo: materiasElements.materiaCodigo.value,
        descripcion: materiasElements.materiaDescripcion.value
    };
    
    const materiaId = materiasElements.materiaId.value;
    const isEditing = materiaId !== '';
    
    // Configurar solicitud
    const url = isEditing 
        ? `${window.appUtils.API_URL}/materias/${materiaId}` 
        : `${window.appUtils.API_URL}/materias`;
    
    const method = isEditing ? 'PUT' : 'POST';
    
    // Enviar solicitud a la API
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(materiaData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Error al guardar materia');
            });
        }
        return response.json();
    })
    .then(data => {
        // Cerrar modal
        materiasElements.modalMateria.hide();
        
        // Mostrar mensaje de éxito
        const message = isEditing 
            ? `Materia "${data.nombre}" actualizada correctamente` 
            : `Materia "${data.nombre}" creada correctamente`;
        window.appUtils.showAlert(message, 'success');
        
        // Recargar materias
        loadMaterias();
    })
    .catch(error => {
        console.error('Error al guardar materia:', error);
        window.appUtils.showAlert(error.message, 'danger');
    });
}

// Editar materia existente
function editarMateria(materia) {
    // Llenar formulario con datos de la materia
    materiasElements.materiaId.value = materia._id;
    materiasElements.materiaNombre.value = materia.nombre;
    materiasElements.materiaCodigo.value = materia.codigo;
    materiasElements.materiaDescripcion.value = materia.descripcion || '';
    
    // Actualizar título del modal
    materiasElements.modalTitle.textContent = 'Editar Materia';
    
    // Mostrar modal
    materiasElements.modalMateria.show();
}

// Mover materia a papelera
function moverAPapelera(materia) {
    window.appUtils.confirmAction(
        'Mover a papelera',
        `¿Está seguro de mover la materia "${materia.nombre}" a la papelera?`,
        () => {
            fetch(`${window.appUtils.API_URL}/materias/${materia._id}/papelera`, {
                method: 'PATCH'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Error al mover materia a papelera');
                    });
                }
                return response.json();
            })
            .then(data => {
                window.appUtils.showAlert(`Materia "${materia.nombre}" movida a papelera`, 'success');
                loadMaterias();
            })
            .catch(error => {
                console.error('Error al mover materia a papelera:', error);
                window.appUtils.showAlert(error.message, 'danger');
            });
        },
        'Mover a papelera',
        'warning'
    );
}

// Restaurar materia desde papelera
function restaurarMateria(materia) {
    fetch(`${window.appUtils.API_URL}/materias/${materia._id}/restaurar`, {
        method: 'PATCH'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Error al restaurar materia');
            });
        }
        return response.json();
    })
    .then(data => {
        window.appUtils.showAlert(`Materia "${materia.nombre}" restaurada correctamente`, 'success');
        loadPapelera();
    })
    .catch(error => {
        console.error('Error al restaurar materia:', error);
        window.appUtils.showAlert(error.message, 'danger');
    });
}

// Eliminar materia permanentemente
function eliminarMateriaPermanente(materia) {
    window.appUtils.confirmAction(
        'Eliminar permanentemente',
        `¿Está seguro de eliminar permanentemente la materia "${materia.nombre}"? Esta acción no se puede deshacer.`,
        () => {
            fetch(`${window.appUtils.API_URL}/materias/${materia._id}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Error al eliminar materia');
                    });
                }
                return response.json();
            })
            .then(data => {
                window.appUtils.showAlert(`Materia "${materia.nombre}" eliminada permanentemente`, 'success');
                loadPapelera();
            })
            .catch(error => {
                console.error('Error al eliminar materia:', error);
                window.appUtils.showAlert(error.message, 'danger');
            });
        },
        'Eliminar permanentemente',
        'danger'
    );
}

// Ver estudiantes de una materia
function verEstudiantesMateria(materia) {
    // Cambiar a la sección de estudiantes
    document.getElementById('nav-estudiantes').click();
    
    // Filtrar estudiantes por materia
    window.filtrarEstudiantesPorMateria && window.filtrarEstudiantesPorMateria(materia._id);
}

// Abrir modal de tomar asistencia para una materia
function abrirTomarAsistencia(materia) {
    // Cambiar a la sección de asistencia
    document.getElementById('nav-asistencia').click();
    
    // Seleccionar la materia en el selector de asistencia
    setTimeout(() => {
        const selectMateria = document.getElementById('asistencia-materia');
        if (selectMateria) {
            selectMateria.value = materia._id;
            
            // Activar evento de cambio para cargar los estudiantes
            selectMateria.dispatchEvent(new Event('change'));
            
            // Abrir modal de registro de asistencia
            setTimeout(() => {
                const btnRegistrarAsistencia = document.getElementById('btn-registrar-asistencia');
                if (btnRegistrarAsistencia) btnRegistrarAsistencia.click();
            }, 200);
        }
    }, 300);
}

// Actualizar selectores de materias en la aplicación
function updateMateriasSelectors() {
    const materias = window.appUtils.appState.materias;
    
    // Actualizar selector en modal de estudiante
    const selectEstudianteMaterias = document.getElementById('estudiante-materias');
    if (selectEstudianteMaterias) {
        const currentSelections = Array.from(selectEstudianteMaterias.selectedOptions).map(opt => opt.value);
        
        selectEstudianteMaterias.innerHTML = '';
        
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia._id;
            option.textContent = `${materia.nombre} (${materia.codigo})`;
            option.selected = currentSelections.includes(materia._id);
            selectEstudianteMaterias.appendChild(option);
        });
    }
    
    // Actualizar selector en sección de asistencia
    const selectAsistenciaMateria = document.getElementById('asistencia-materia');
    if (selectAsistenciaMateria) {
        const currentValue = selectAsistenciaMateria.value;
        
        // Mantener solo la primera opción (placeholder)
        const placeholder = selectAsistenciaMateria.options[0];
        selectAsistenciaMateria.innerHTML = '';
        selectAsistenciaMateria.appendChild(placeholder);
        
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia._id;
            option.textContent = `${materia.nombre} (${materia.codigo})`;
            option.selected = materia._id === currentValue;
            selectAsistenciaMateria.appendChild(option);
        });
    }
    
    // Actualizar selector en modal de asistencia
    const selectAsistenciaModalMateria = document.getElementById('asistencia-modal-materia');
    if (selectAsistenciaModalMateria) {
        const currentValue = selectAsistenciaModalMateria.value;
        
        // Mantener solo la primera opción (placeholder)
        const placeholder = selectAsistenciaModalMateria.options[0];
        selectAsistenciaModalMateria.innerHTML = '';
        selectAsistenciaModalMateria.appendChild(placeholder);
        
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia._id;
            option.textContent = `${materia.nombre} (${materia.codigo})`;
            option.selected = materia._id === currentValue;
            selectAsistenciaModalMateria.appendChild(option);
        });
    }
    
    // Actualizar selector en sección de reportes
    const selectReporteMateria = document.getElementById('reporte-materia');
    if (selectReporteMateria) {
        const currentValue = selectReporteMateria.value;
        
        // Mantener solo la primera opción (placeholder)
        const placeholder = selectReporteMateria.options[0];
        selectReporteMateria.innerHTML = '';
        selectReporteMateria.appendChild(placeholder);
        
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia._id;
            option.textContent = `${materia.nombre} (${materia.codigo})`;
            option.selected = materia._id === currentValue;
            selectReporteMateria.appendChild(option);
        });
    }
    
    // Actualizar selector en modal de asistencia masiva
    const selectAsistenciaMasivaMateria = document.getElementById('asistencia-masiva-materia');
    if (selectAsistenciaMasivaMateria) {
        const currentValue = selectAsistenciaMasivaMateria.value;
        
        // Mantener solo la primera opción (placeholder)
        const placeholder = selectAsistenciaMasivaMateria.options[0];
        selectAsistenciaMasivaMateria.innerHTML = '';
        selectAsistenciaMasivaMateria.appendChild(placeholder);
        
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia._id;
            option.textContent = `${materia.nombre} (${materia.codigo})`;
            option.selected = materia._id === currentValue;
            selectAsistenciaMasivaMateria.appendChild(option);
        });
    }
}

// Exponer funciones necesarias globalmente
window.loadMaterias = loadMaterias;
window.loadPapelera = loadPapelera;
window.updateMateriasSelectors = updateMateriasSelectors;

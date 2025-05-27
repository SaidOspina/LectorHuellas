const express = require('express');
const router = express.Router();
const { Materia, Estudiante, Asistencia } = require('../database');

// Obtener todas las materias (activas por defecto) - MODIFICADO: Solo del docente actual
router.get('/', async (req, res) => {
  try {
    const estado = req.query.estado || 'activo';
    
    // Filtrar solo las materias creadas por el docente actual
    const materias = await Materia.find({ 
      estado,
      creadoPor: req.user._id 
    }).populate('creadoPor', 'nombre apellido username');
    
    res.json(materias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener una materia por ID - MODIFICADO: Verificar propiedad
router.get('/:id', async (req, res) => {
  try {
    const materia = await Materia.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    }).populate('creadoPor', 'nombre apellido username');
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada o no tiene permisos para acceder' });
    }
    
    res.json(materia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva materia - MODIFICADO: Asignar docente creador
router.post('/', async (req, res) => {
  try {
    const { nombre, codigo, descripcion } = req.body;
    
    // Verificar si ya existe una materia con ese código para este docente
    const materiaExistente = await Materia.findOne({ 
      codigo, 
      creadoPor: req.user._id 
    });
    
    if (materiaExistente) {
      return res.status(400).json({ error: 'Ya tiene una materia con ese código' });
    }
    
    const nuevaMateria = new Materia({
      nombre,
      codigo,
      descripcion,
      creadoPor: req.user._id
    });
    
    const materiaSaved = await nuevaMateria.save();
    
    // Poblar información del creador para la respuesta
    await materiaSaved.populate('creadoPor', 'nombre apellido username');
    
    res.status(201).json(materiaSaved);
  } catch (error) {
    // Manejar error de clave duplicada
    if (error.code === 11000) {
      res.status(400).json({ error: 'Ya tiene una materia con ese código' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Actualizar materia - MODIFICADO: Verificar propiedad
router.put('/:id', async (req, res) => {
  try {
    const { nombre, codigo, descripcion } = req.body;
    
    // Verificar que la materia existe y pertenece al docente
    const materiaExistente = await Materia.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!materiaExistente) {
      return res.status(404).json({ error: 'Materia no encontrada o no tiene permisos para modificarla' });
    }
    
    // Si se cambia el código, verificar que no exista otro con ese código para este docente
    if (codigo && codigo !== materiaExistente.codigo) {
      const codigoExistente = await Materia.findOne({ 
        codigo, 
        creadoPor: req.user._id,
        _id: { $ne: req.params.id }
      });
      
      if (codigoExistente) {
        return res.status(400).json({ error: 'Ya tiene otra materia con ese código' });
      }
    }
    
    const materiaActualizada = await Materia.findByIdAndUpdate(
      req.params.id,
      { nombre, codigo, descripcion },
      { new: true }
    ).populate('creadoPor', 'nombre apellido username');
    
    res.json(materiaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mover materia a la papelera - MODIFICADO: Verificar propiedad
router.patch('/:id/papelera', async (req, res) => {
  try {
    const materiaActualizada = await Materia.findOneAndUpdate(
      { 
        _id: req.params.id,
        creadoPor: req.user._id
      },
      { estado: 'papelera' },
      { new: true }
    ).populate('creadoPor', 'nombre apellido username');
    
    if (!materiaActualizada) {
      return res.status(404).json({ error: 'Materia no encontrada o no tiene permisos para modificarla' });
    }
    
    res.json(materiaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restaurar materia de la papelera - MODIFICADO: Verificar propiedad
router.patch('/:id/restaurar', async (req, res) => {
  try {
    const materiaActualizada = await Materia.findOneAndUpdate(
      { 
        _id: req.params.id,
        creadoPor: req.user._id
      },
      { estado: 'activo' },
      { new: true }
    ).populate('creadoPor', 'nombre apellido username');
    
    if (!materiaActualizada) {
      return res.status(404).json({ error: 'Materia no encontrada o no tiene permisos para modificarla' });
    }
    
    res.json(materiaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar materia permanentemente - MODIFICADO: Verificar propiedad
router.delete('/:id', async (req, res) => {
  try {
    // Verificar que la materia pertenece al docente
    const materia = await Materia.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada o no tiene permisos para eliminarla' });
    }
    
    // Verificar si hay asistencias asociadas
    const asistencias = await Asistencia.find({ materia: req.params.id });
    
    if (asistencias.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la materia porque tiene registros de asistencia asociados'
      });
    }
    
    // Eliminar la materia
    await Materia.findByIdAndDelete(req.params.id);
    
    // Eliminar la referencia de esta materia en los estudiantes del docente
    await Estudiante.updateMany(
      { 
        materias: req.params.id,
        creadoPor: req.user._id
      },
      { $pull: { materias: req.params.id } }
    );
    
    res.json({ message: 'Materia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estudiantes inscritos en una materia - MODIFICADO: Verificar propiedad
router.get('/:id/estudiantes', async (req, res) => {
  try {
    // Verificar que la materia pertenece al docente
    const materia = await Materia.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada o no tiene permisos para acceder' });
    }
    
    const estudiantes = await Estudiante.find({
      materias: req.params.id,
      creadoPor: req.user._id
    }).populate('creadoPor', 'nombre apellido username');
    
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Descargar reporte de asistencia de una materia - MODIFICADO: Verificar propiedad
router.get('/:id/asistencia/reporte', async (req, res) => {
  try {
    // Verificar que la materia pertenece al docente
    const materia = await Materia.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada o no tiene permisos para acceder' });
    }
    
    // Obtener todos los estudiantes de la materia (del mismo docente)
    const estudiantes = await Estudiante.find({ 
      materias: req.params.id,
      creadoPor: req.user._id
    });
    
    // Obtener todas las asistencias de la materia (registradas por el mismo docente)
    const asistencias = await Asistencia.find({ 
      materia: req.params.id,
      registradoPor: req.user._id
    })
    .populate('estudiante')
    .sort({ fecha: 1 });
    
    // Agrupar asistencias por estudiante y fecha
    const reporte = [];
    
    // Primero obtenemos todas las fechas únicas
    const fechasUnicas = [...new Set(asistencias.map(a => 
      a.fecha.toISOString().split('T')[0]
    ))];
    
    // Crear estructura del reporte
    for (const estudiante of estudiantes) {
      const asistenciasEstudiante = {};
      
      // Inicializar todas las fechas con asistencia false
      for (const fecha of fechasUnicas) {
        asistenciasEstudiante[fecha] = false;
      }
      
      // Marcar las fechas con asistencia
      for (const asistencia of asistencias) {
        if (asistencia.estudiante._id.toString() === estudiante._id.toString()) {
          const fechaStr = asistencia.fecha.toISOString().split('T')[0];
          asistenciasEstudiante[fechaStr] = asistencia.presente;
        }
      }
      
      reporte.push({
        estudiante: {
          id: estudiante._id,
          nombre: estudiante.nombre,
          codigo: estudiante.codigo,
          programaAcademico: estudiante.programaAcademico
        },
        asistencias: asistenciasEstudiante
      });
    }
    
    res.json({
      materia: {
        id: materia._id,
        nombre: materia.nombre,
        codigo: materia.codigo
      },
      fechas: fechasUnicas,
      reporte
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { Materia, Estudiante, Asistencia } = require('../database');

// Obtener todas las materias (activas por defecto)
router.get('/', async (req, res) => {
  try {
    const estado = req.query.estado || 'activo';
    const materias = await Materia.find({ estado });
    res.json(materias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener una materia por ID
router.get('/:id', async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id);
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    res.json(materia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva materia
router.post('/', async (req, res) => {
  try {
    const { nombre, codigo, descripcion } = req.body;
    
    // Verificar si ya existe una materia con ese código
    const materiaExistente = await Materia.findOne({ codigo });
    if (materiaExistente) {
      return res.status(400).json({ error: 'Ya existe una materia con ese código' });
    }
    
    const nuevaMateria = new Materia({
      nombre,
      codigo,
      descripcion
    });
    
    const materiaSaved = await nuevaMateria.save();
    res.status(201).json(materiaSaved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar materia
router.put('/:id', async (req, res) => {
  try {
    const { nombre, codigo, descripcion } = req.body;
    
    // Si se cambia el código, verificar que no exista otro con ese código
    if (codigo) {
      const materiaExistente = await Materia.findOne({ 
        codigo, 
        _id: { $ne: req.params.id } 
      });
      
      if (materiaExistente) {
        return res.status(400).json({ error: 'Ya existe otra materia con ese código' });
      }
    }
    
    const materiaActualizada = await Materia.findByIdAndUpdate(
      req.params.id,
      { nombre, codigo, descripcion },
      { new: true }
    );
    
    if (!materiaActualizada) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    res.json(materiaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mover materia a la papelera
router.patch('/:id/papelera', async (req, res) => {
  try {
    const materiaActualizada = await Materia.findByIdAndUpdate(
      req.params.id,
      { estado: 'papelera' },
      { new: true }
    );
    
    if (!materiaActualizada) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    res.json(materiaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restaurar materia de la papelera
router.patch('/:id/restaurar', async (req, res) => {
  try {
    const materiaActualizada = await Materia.findByIdAndUpdate(
      req.params.id,
      { estado: 'activo' },
      { new: true }
    );
    
    if (!materiaActualizada) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    res.json(materiaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar materia permanentemente
router.delete('/:id', async (req, res) => {
  try {
    // Primero verificamos si hay estudiantes inscritos o asistencias
    const asistencias = await Asistencia.find({ materia: req.params.id });
    
    if (asistencias.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la materia porque tiene registros de asistencia asociados'
      });
    }
    
    // Si no hay impedimentos, eliminamos la materia
    const materiaEliminada = await Materia.findByIdAndDelete(req.params.id);
    
    if (!materiaEliminada) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    // Eliminamos la referencia de esta materia en los estudiantes
    await Estudiante.updateMany(
      { materias: req.params.id },
      { $pull: { materias: req.params.id } }
    );
    
    res.json({ message: 'Materia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estudiantes inscritos en una materia
router.get('/:id/estudiantes', async (req, res) => {
  try {
    const estudiantes = await Estudiante.find({
      materias: req.params.id
    });
    
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Descargar reporte de asistencia de una materia
router.get('/:id/asistencia/reporte', async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id);
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    // Obtener todos los estudiantes de la materia
    const estudiantes = await Estudiante.find({ materias: req.params.id });
    
    // Obtener todas las asistencias de la materia
    const asistencias = await Asistencia.find({ materia: req.params.id })
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
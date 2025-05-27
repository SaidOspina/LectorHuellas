const express = require('express');
const router = express.Router();
const { Estudiante, Materia, Asistencia } = require('../database');

// Obtener todos los estudiantes - MODIFICADO: Solo del docente actual
router.get('/', async (req, res) => {
  try {
    const estudiantes = await Estudiante.find({ 
      creadoPor: req.user._id 
    })
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id } // Solo materias del mismo docente
    })
    .populate('creadoPor', 'nombre apellido username');
    
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un estudiante por ID - MODIFICADO: Verificar propiedad
router.get('/:id', async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    })
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id }
    })
    .populate('creadoPor', 'nombre apellido username');
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para acceder' });
    }
    
    res.json(estudiante);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un estudiante por ID de huella - MODIFICADO: Verificar propiedad
router.get('/huella/:huellaID', async (req, res) => {
  try {
    const huellaID = parseInt(req.params.huellaID);
    const estudiante = await Estudiante.findOne({ 
      huellaID,
      creadoPor: req.user._id
    })
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id }
    })
    .populate('creadoPor', 'nombre apellido username');
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado con esa huella o no tiene permisos para acceder' });
    }
    
    res.json(estudiante);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo estudiante - MODIFICADO: Asignar docente creador
router.post('/', async (req, res) => {
  try {
    const { nombre, codigo, programaAcademico, materias, huellaID } = req.body;
    
    // Verificar si ya existe un estudiante con ese código para este docente
    const estudianteExistente = await Estudiante.findOne({ 
      codigo,
      creadoPor: req.user._id
    });
    
    if (estudianteExistente) {
      return res.status(400).json({ error: 'Ya tiene un estudiante con ese código' });
    }
    
    // Verificar si ya existe un estudiante con esa huella
    if (huellaID) {
      const huellaExistente = await Estudiante.findOne({ huellaID });
      if (huellaExistente) {
        return res.status(400).json({ error: 'Ya existe un estudiante con esa huella registrada' });
      }
    }
    
    // Verificar si las materias existen y pertenecen al docente
    if (materias && materias.length > 0) {
      const materiasValidas = await Materia.find({ 
        _id: { $in: materias },
        estado: 'activo',
        creadoPor: req.user._id
      });
      
      if (materiasValidas.length !== materias.length) {
        return res.status(400).json({ error: 'Una o más materias no existen, están en papelera, o no le pertenecen' });
      }
    }
    
    const nuevoEstudiante = new Estudiante({
      nombre,
      codigo,
      programaAcademico,
      materias: materias || [],
      huellaID: huellaID || null,
      creadoPor: req.user._id
    });
    
    const estudianteSaved = await nuevoEstudiante.save();
    
    // Poblamos las materias para devolver el objeto completo
    const estudianteConMaterias = await Estudiante.findById(estudianteSaved._id)
      .populate({
        path: 'materias',
        match: { creadoPor: req.user._id }
      })
      .populate('creadoPor', 'nombre apellido username');
    
    res.status(201).json(estudianteConMaterias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estudiante - MODIFICADO: Verificar propiedad
router.put('/:id', async (req, res) => {
  try {
    const { nombre, codigo, programaAcademico, materias, huellaID } = req.body;
    
    // Verificar que el estudiante existe y pertenece al docente
    const estudianteExistente = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!estudianteExistente) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para modificarlo' });
    }
    
    // Si se cambia el código, verificar que no exista otro con ese código para este docente
    if (codigo && codigo !== estudianteExistente.codigo) {
      const codigoExistente = await Estudiante.findOne({ 
        codigo,
        creadoPor: req.user._id,
        _id: { $ne: req.params.id } 
      });
      
      if (codigoExistente) {
        return res.status(400).json({ error: 'Ya tiene otro estudiante con ese código' });
      }
    }
    
    // Si se cambia la huella, verificar que no exista otro con esa huella
    if (huellaID) {
      const huellaExistente = await Estudiante.findOne({ 
        huellaID, 
        _id: { $ne: req.params.id } 
      });
      
      if (huellaExistente) {
        return res.status(400).json({ error: 'Ya existe otro estudiante con esa huella registrada' });
      }
    }
    
    // Verificar si las materias existen y pertenecen al docente
    if (materias && materias.length > 0) {
      const materiasValidas = await Materia.find({ 
        _id: { $in: materias },
        estado: 'activo',
        creadoPor: req.user._id
      });
      
      if (materiasValidas.length !== materias.length) {
        return res.status(400).json({ error: 'Una o más materias no existen, están en papelera, o no le pertenecen' });
      }
    }
    
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      { nombre, codigo, programaAcademico, materias, huellaID },
      { new: true }
    )
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id }
    })
    .populate('creadoPor', 'nombre apellido username');
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar huella dactilar para estudiante - MODIFICADO: Verificar propiedad
router.post('/:id/huella', async (req, res) => {
  try {
    const { huellaID } = req.body;
    
    if (!huellaID) {
      return res.status(400).json({ error: 'Se requiere el ID de huella' });
    }
    
    // Verificar que el estudiante pertenece al docente
    const estudiante = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para modificarlo' });
    }
    
    // Verificar si ya existe un estudiante con esa huella
    const huellaExistente = await Estudiante.findOne({ 
      huellaID, 
      _id: { $ne: req.params.id } 
    });
    
    if (huellaExistente) {
      return res.status(400).json({ 
        error: 'Ya existe otro estudiante con esa huella registrada',
        estudiante: {
          id: huellaExistente._id,
          nombre: huellaExistente.nombre,
          codigo: huellaExistente.codigo
        }
      });
    }
    
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      { huellaID },
      { new: true }
    )
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id }
    })
    .populate('creadoPor', 'nombre apellido username');
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar huella dactilar de estudiante - MODIFICADO: Verificar propiedad
router.delete('/:id/huella', async (req, res) => {
  try {
    // Verificar que el estudiante pertenece al docente
    const estudiante = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para modificarlo' });
    }
    
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      { $unset: { huellaID: "" } },
      { new: true }
    )
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id }
    })
    .populate('creadoPor', 'nombre apellido username');
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inscribir estudiante a una materia - MODIFICADO: Verificar propiedad
router.post('/:id/materias/:materiaId', async (req, res) => {
  try {
    // Verificar si la materia existe, está activa y pertenece al docente
    const materia = await Materia.findOne({ 
      _id: req.params.materiaId,
      estado: 'activo',
      creadoPor: req.user._id
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada, está en papelera, o no le pertenece' });
    }
    
    // Verificar que el estudiante pertenece al docente
    const estudiante = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para modificarlo' });
    }
    
    // Verificar si el estudiante ya está inscrito en la materia
    if (estudiante.materias.includes(req.params.materiaId)) {
      return res.status(400).json({ error: 'El estudiante ya está inscrito en esta materia' });
    }
    
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      { $push: { materias: req.params.materiaId } },
      { new: true }
    )
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id }
    })
    .populate('creadoPor', 'nombre apellido username');
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desinscribir estudiante de una materia - MODIFICADO: Verificar propiedad
router.delete('/:id/materias/:materiaId', async (req, res) => {
  try {
    // Verificar que el estudiante pertenece al docente
    const estudiante = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para modificarlo' });
    }
    
    // Verificar que la materia pertenece al docente
    const materia = await Materia.findOne({
      _id: req.params.materiaId,
      creadoPor: req.user._id
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada o no le pertenece' });
    }
    
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      { $pull: { materias: req.params.materiaId } },
      { new: true }
    )
    .populate({
      path: 'materias',
      match: { creadoPor: req.user._id }
    })
    .populate('creadoPor', 'nombre apellido username');
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar estudiante - MODIFICADO: Verificar propiedad
router.delete('/:id', async (req, res) => {
  try {
    // Verificar que el estudiante pertenece al docente
    const estudiante = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para eliminarlo' });
    }
    
    // Verificar si hay asistencias asociadas
    const asistencias = await Asistencia.find({ 
      estudiante: req.params.id,
      registradoPor: req.user._id
    });
    
    if (asistencias.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el estudiante porque tiene registros de asistencia asociados'
      });
    }
    
    await Estudiante.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Estudiante eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener asistencias de un estudiante - MODIFICADO: Verificar propiedad
router.get('/:id/asistencias', async (req, res) => {
  try {
    // Verificar que el estudiante pertenece al docente
    const estudiante = await Estudiante.findOne({
      _id: req.params.id,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no tiene permisos para acceder' });
    }
    
    const { materiaId, fechaInicio, fechaFin } = req.query;
    
    // Construir filtros
    let filtros = { 
      estudiante: req.params.id,
      registradoPor: req.user._id
    };
    
    if (materiaId) {
      // Verificar que la materia pertenece al docente
      const materia = await Materia.findOne({
        _id: materiaId,
        creadoPor: req.user._id
      });
      
      if (!materia) {
        return res.status(400).json({ error: 'Materia no encontrada o no le pertenece' });
      }
      
      filtros.materia = materiaId;
    }
    
    if (fechaInicio || fechaFin) {
      filtros.fecha = {};
      if (fechaInicio) filtros.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.fecha.$lte = new Date(fechaFin);
    }
    
    const asistencias = await Asistencia.find(filtros)
      .populate({
        path: 'materia',
        match: { creadoPor: req.user._id }
      })
      .populate('registradoPor', 'nombre apellido username')
      .sort({ fecha: -1 });
    
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { Estudiante, Materia, Asistencia } = require('../database');

// Obtener todos los estudiantes
router.get('/', async (req, res) => {
  try {
    const estudiantes = await Estudiante.find().populate('materias');
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un estudiante por ID
router.get('/:id', async (req, res) => {
  try {
    const estudiante = await Estudiante.findById(req.params.id).populate('materias');
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    res.json(estudiante);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un estudiante por ID de huella
router.get('/huella/:huellaID', async (req, res) => {
  try {
    const huellaID = parseInt(req.params.huellaID);
    const estudiante = await Estudiante.findOne({ huellaID }).populate('materias');
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado con esa huella' });
    }
    
    res.json(estudiante);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo estudiante
router.post('/', async (req, res) => {
  try {
    const { nombre, codigo, programaAcademico, materias, huellaID } = req.body;
    
    // Verificar si ya existe un estudiante con ese código
    const estudianteExistente = await Estudiante.findOne({ codigo });
    if (estudianteExistente) {
      return res.status(400).json({ error: 'Ya existe un estudiante con ese código' });
    }
    
    // Verificar si ya existe un estudiante con esa huella
    if (huellaID) {
      const huellaExistente = await Estudiante.findOne({ huellaID });
      if (huellaExistente) {
        return res.status(400).json({ error: 'Ya existe un estudiante con esa huella registrada' });
      }
    }
    
    // Verificar si las materias existen
    if (materias && materias.length > 0) {
      const materiasValidas = await Materia.find({ 
        _id: { $in: materias },
        estado: 'activo'
      });
      
      if (materiasValidas.length !== materias.length) {
        return res.status(400).json({ error: 'Una o más materias no existen o están en papelera' });
      }
    }
    
    const nuevoEstudiante = new Estudiante({
      nombre,
      codigo,
      programaAcademico,
      materias: materias || [],
      huellaID: huellaID || null
    });
    
    const estudianteSaved = await nuevoEstudiante.save();
    
    // Poblamos las materias para devolver el objeto completo
    const estudianteConMaterias = await Estudiante.findById(estudianteSaved._id).populate('materias');
    
    res.status(201).json(estudianteConMaterias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estudiante
router.put('/:id', async (req, res) => {
  try {
    const { nombre, codigo, programaAcademico, materias, huellaID } = req.body;
    
    // Si se cambia el código, verificar que no exista otro con ese código
    if (codigo) {
      const estudianteExistente = await Estudiante.findOne({ 
        codigo, 
        _id: { $ne: req.params.id } 
      });
      
      if (estudianteExistente) {
        return res.status(400).json({ error: 'Ya existe otro estudiante con ese código' });
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
    
    // Verificar si las materias existen
    if (materias && materias.length > 0) {
      const materiasValidas = await Materia.find({ 
        _id: { $in: materias },
        estado: 'activo'
      });
      
      if (materiasValidas.length !== materias.length) {
        return res.status(400).json({ error: 'Una o más materias no existen o están en papelera' });
      }
    }
    
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      { nombre, codigo, programaAcademico, materias, huellaID },
      { new: true }
    ).populate('materias');
    
    if (!estudianteActualizado) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar huella dactilar para estudiante
router.post('/:id/huella', async (req, res) => {
  try {
    const { huellaID } = req.body;
    
    if (!huellaID) {
      return res.status(400).json({ error: 'Se requiere el ID de huella' });
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
    ).populate('materias');
    
    if (!estudianteActualizado) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar huella dactilar de estudiante
router.delete('/:id/huella', async (req, res) => {
  try {
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      { $unset: { huellaID: "" } },
      { new: true }
    ).populate('materias');
    
    if (!estudianteActualizado) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inscribir estudiante a una materia
router.post('/:id/materias/:materiaId', async (req, res) => {
  try {
    // Verificar si la materia existe y está activa
    const materia = await Materia.findOne({ 
      _id: req.params.materiaId,
      estado: 'activo'
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada o está en papelera' });
    }
    
    // Actualizar estudiante agregando la materia
    const estudiante = await Estudiante.findById(req.params.id);
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // Verificar si el estudiante ya está inscrito en la materia
    if (estudiante.materias.includes(req.params.materiaId)) {
      return res.status(400).json({ error: 'El estudiante ya está inscrito en esta materia' });
    }
    
    // Agregar materia al estudiante
    estudiante.materias.push(req.params.materiaId);
    await estudiante.save();
    
    // Devolver estudiante actualizado con materias pobladas
    const estudianteActualizado = await Estudiante.findById(req.params.id).populate('materias');
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desinscribir estudiante de una materia
router.delete('/:id/materias/:materiaId', async (req, res) => {
  try {
    const estudiante = await Estudiante.findById(req.params.id);
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // Verificar si el estudiante está inscrito en la materia
    if (!estudiante.materias.includes(req.params.materiaId)) {
      return res.status(400).json({ error: 'El estudiante no está inscrito en esta materia' });
    }
    
    // Verificar si hay asistencias para este estudiante en esta materia
    const asistencias = await Asistencia.find({
      estudiante: req.params.id,
      materia: req.params.materiaId
    });
    
    if (asistencias.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede desinscribir porque el estudiante tiene registros de asistencia en esta materia',
        asistencias: asistencias.length
      });
    }
    
    // Quitar materia del estudiante
    estudiante.materias = estudiante.materias.filter(
      m => m.toString() !== req.params.materiaId
    );
    
    await estudiante.save();
    
    // Devolver estudiante actualizado con materias pobladas
    const estudianteActualizado = await Estudiante.findById(req.params.id).populate('materias');
    
    res.json(estudianteActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar estudiante (con confirmación doble)
router.delete('/:id', async (req, res) => {
  try {
    const { confirmar } = req.query;
    
    if (confirmar !== 'true') {
      return res.status(400).json({ 
        error: 'Se requiere confirmación para eliminar el estudiante',
        mensaje: 'Agregue ?confirmar=true a la URL para confirmar la eliminación'
      });
    }
    
    // Verificar si hay asistencias para este estudiante
    const asistencias = await Asistencia.find({ estudiante: req.params.id });
    
    if (asistencias.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el estudiante porque tiene registros de asistencia',
        asistencias: asistencias.length
      });
    }
    
    const estudianteEliminado = await Estudiante.findByIdAndDelete(req.params.id);
    
    if (!estudianteEliminado) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    res.json({ 
      mensaje: 'Estudiante eliminado correctamente',
      estudiante: {
        id: estudianteEliminado._id,
        nombre: estudianteEliminado.nombre,
        codigo: estudianteEliminado.codigo
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener reporte de asistencia de un estudiante
router.get('/:id/asistencia', async (req, res) => {
  try {
    const estudiante = await Estudiante.findById(req.params.id);
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // Opcionalmente filtrar por materia
    const filtroMateria = req.query.materia ? { materia: req.query.materia } : {};
    
    // Obtener asistencias del estudiante
    const asistencias = await Asistencia.find({
      estudiante: req.params.id,
      ...filtroMateria
    })
    .populate('materia')
    .sort({ fecha: -1 });
    
    // Agrupar asistencias por materia
    const asistenciasPorMateria = {};
    
    for (const asistencia of asistencias) {
      const materiaId = asistencia.materia._id.toString();
      
      if (!asistenciasPorMateria[materiaId]) {
        asistenciasPorMateria[materiaId] = {
          materia: {
            id: asistencia.materia._id,
            nombre: asistencia.materia.nombre,
            codigo: asistencia.materia.codigo
          },
          asistencias: []
        };
      }
      
      asistenciasPorMateria[materiaId].asistencias.push({
        id: asistencia._id,
        fecha: asistencia.fecha,
        presente: asistencia.presente
      });
    }
    
    res.json({
      estudiante: {
        id: estudiante._id,
        nombre: estudiante.nombre,
        codigo: estudiante.codigo,
        programaAcademico: estudiante.programaAcademico
      },
      materias: Object.values(asistenciasPorMateria)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
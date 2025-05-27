const express = require('express');
const router = express.Router();
const { Asistencia, Estudiante, Materia } = require('../database');

// Obtener todas las asistencias - MODIFICADO: Solo del docente actual
router.get('/', async (req, res) => {
  try {
    const { materiaId, estudianteId, fecha, fechaInicio, fechaFin, limite } = req.query;
    
    // Construir filtros base
    let filtros = { 
      registradoPor: req.user._id 
    };
    
    // Filtrar por materia si se especifica y verificar propiedad
    if (materiaId) {
      const materia = await Materia.findOne({
        _id: materiaId,
        creadoPor: req.user._id
      });
      
      if (!materia) {
        return res.status(400).json({ error: 'Materia no encontrada o no le pertenece' });
      }
      
      filtros.materia = materiaId;
    }
    
    // Filtrar por estudiante si se especifica y verificar propiedad
    if (estudianteId) {
      const estudiante = await Estudiante.findOne({
        _id: estudianteId,
        creadoPor: req.user._id
      });
      
      if (!estudiante) {
        return res.status(400).json({ error: 'Estudiante no encontrado o no le pertenece' });
      }
      
      filtros.estudiante = estudianteId;
    }
    
    // Filtros de fecha
    if (fecha) {
      const fechaObj = new Date(fecha);
      const fechaInicio = new Date(fechaObj.setHours(0, 0, 0, 0));
      const fechaFin = new Date(fechaObj.setHours(23, 59, 59, 999));
      filtros.fecha = { $gte: fechaInicio, $lte: fechaFin };
    } else if (fechaInicio || fechaFin) {
      filtros.fecha = {};
      if (fechaInicio) filtros.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.fecha.$lte = new Date(fechaFin);
    }
    
    let query = Asistencia.find(filtros)
      .populate({
        path: 'estudiante',
        match: { creadoPor: req.user._id }
      })
      .populate({
        path: 'materia',
        match: { creadoPor: req.user._id }
      })
      .populate('registradoPor', 'nombre apellido username')
      .sort({ fecha: -1 });
    
    if (limite) {
      query = query.limit(parseInt(limite));
    }
    
    const asistencias = await query;
    
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener una asistencia por ID - MODIFICADO: Verificar propiedad
router.get('/:id', async (req, res) => {
  try {
    const asistencia = await Asistencia.findOne({
      _id: req.params.id,
      registradoPor: req.user._id
    })
    .populate({
      path: 'estudiante',
      match: { creadoPor: req.user._id }
    })
    .populate({
      path: 'materia',
      match: { creadoPor: req.user._id }
    })
    .populate('registradoPor', 'nombre apellido username');
    
    if (!asistencia) {
      return res.status(404).json({ error: 'Asistencia no encontrada o no tiene permisos para acceder' });
    }
    
    res.json(asistencia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar asistencia manual - MODIFICADO: Verificar propiedad y asignar docente
router.post('/', async (req, res) => {
  try {
    const { estudianteId, materiaId, presente = true, fecha } = req.body;
    
    // Verificar que el estudiante pertenece al docente
    const estudiante = await Estudiante.findOne({
      _id: estudianteId,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no le pertenece' });
    }
    
    // Verificar que la materia pertenece al docente
    const materia = await Materia.findOne({ 
      _id: materiaId,
      estado: 'activo',
      creadoPor: req.user._id
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada, está en papelera, o no le pertenece' });
    }
    
    // Verificar que el estudiante está inscrito en la materia
    if (!estudiante.materias.includes(materiaId)) {
      return res.status(400).json({ error: 'El estudiante no está inscrito en esta materia' });
    }
    
    // Determinar fecha de asistencia
    const fechaAsistencia = fecha ? new Date(fecha) : new Date();
    
    // Verificar si ya existe un registro de asistencia para este estudiante, materia y fecha
    const fechaStr = fechaAsistencia.toISOString().split('T')[0];
    const inicioDelDia = new Date(fechaStr + 'T00:00:00.000Z');
    const finDelDia = new Date(fechaStr + 'T23:59:59.999Z');
    
    const asistenciaExistente = await Asistencia.findOne({
      estudiante: estudianteId,
      materia: materiaId,
      registradoPor: req.user._id,
      fecha: {
        $gte: inicioDelDia,
        $lte: finDelDia
      }
    });
    
    if (asistenciaExistente) {
      return res.status(400).json({ 
        error: 'Ya existe un registro de asistencia para este estudiante en esta materia hoy',
        asistencia: asistenciaExistente
      });
    }
    
    const nuevaAsistencia = new Asistencia({
      estudiante: estudianteId,
      materia: materiaId,
      presente,
      fecha: fechaAsistencia,
      registradoPor: req.user._id
    });
    
    const asistenciaSaved = await nuevaAsistencia.save();
    
    // Poblamos los datos para la respuesta
    const asistenciaCompleta = await Asistencia.findById(asistenciaSaved._id)
      .populate({
        path: 'estudiante',
        match: { creadoPor: req.user._id }
      })
      .populate({
        path: 'materia',
        match: { creadoPor: req.user._id }
      })
      .populate('registradoPor', 'nombre apellido username');
    
    res.status(201).json(asistenciaCompleta);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Ya existe un registro de asistencia para este estudiante en esta materia en esta fecha' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Registrar asistencia por huella dactilar - MODIFICADO: Verificar propiedad
router.post('/huella', async (req, res) => {
  try {
    const { huellaID, materiaId, presente = true } = req.body;
    
    if (!huellaID || !materiaId) {
      return res.status(400).json({ error: 'Se requiere huellaID y materiaId' });
    }
    
    // Buscar estudiante por huella que pertenezca al docente
    const estudiante = await Estudiante.findOne({ 
      huellaID,
      creadoPor: req.user._id
    });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado con esa huella o no le pertenece' });
    }
    
    // Verificar que la materia pertenece al docente
    const materia = await Materia.findOne({ 
      _id: materiaId,
      estado: 'activo',
      creadoPor: req.user._id
    });
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada, está en papelera, o no le pertenece' });
    }
    
    // Verificar que el estudiante está inscrito en la materia
    if (!estudiante.materias.includes(materiaId)) {
      return res.status(400).json({ 
        error: 'El estudiante no está inscrito en esta materia',
        estudiante: {
          id: estudiante._id,
          nombre: estudiante.nombre,
          codigo: estudiante.codigo
        },
        materia: {
          id: materia._id,
          nombre: materia.nombre,
          codigo: materia.codigo
        }
      });
    }
    
    // Verificar si ya existe un registro de asistencia para hoy
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    
    const asistenciaExistente = await Asistencia.findOne({
      estudiante: estudiante._id,
      materia: materiaId,
      registradoPor: req.user._id,
      fecha: {
        $gte: inicioDelDia,
        $lte: finDelDia
      }
    });
    
    if (asistenciaExistente) {
      return res.status(400).json({ 
        error: 'Ya se registró asistencia para este estudiante en esta materia hoy',
        asistencia: asistenciaExistente,
        estudiante: {
          id: estudiante._id,
          nombre: estudiante.nombre,
          codigo: estudiante.codigo
        }
      });
    }
    
    const nuevaAsistencia = new Asistencia({
      estudiante: estudiante._id,
      materia: materiaId,
      presente,
      registradoPor: req.user._id
    });
    
    const asistenciaSaved = await nuevaAsistencia.save();
    
    // Poblamos los datos para la respuesta
    const asistenciaCompleta = await Asistencia.findById(asistenciaSaved._id)
      .populate({
        path: 'estudiante',
        match: { creadoPor: req.user._id }
      })
      .populate({
        path: 'materia',
        match: { creadoPor: req.user._id }
      })
      .populate('registradoPor', 'nombre apellido username');
    
    res.status(201).json({
      message: 'Asistencia registrada exitosamente',
      asistencia: asistenciaCompleta,
      estudiante: {
        id: estudiante._id,
        nombre: estudiante.nombre,
        codigo: estudiante.codigo,
        programaAcademico: estudiante.programaAcademico
      }
    });
    
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Ya existe un registro de asistencia para este estudiante en esta materia en esta fecha' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Actualizar asistencia - MODIFICADO: Verificar propiedad
router.put('/:id', async (req, res) => {
  try {
    const { presente, fecha } = req.body;
    
    // Verificar que la asistencia pertenece al docente
    const asistenciaExistente = await Asistencia.findOne({
      _id: req.params.id,
      registradoPor: req.user._id
    });
    
    if (!asistenciaExistente) {
      return res.status(404).json({ error: 'Asistencia no encontrada o no tiene permisos para modificarla' });
    }
    
    const asistenciaActualizada = await Asistencia.findByIdAndUpdate(
      req.params.id,
      { presente, fecha },
      { new: true }
    )
    .populate({
      path: 'estudiante',
      match: { creadoPor: req.user._id }
    })
    .populate({
      path: 'materia',
      match: { creadoPor: req.user._id }
    })
    .populate('registradoPor', 'nombre apellido username');
    
    res.json(asistenciaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar asistencia - MODIFICADO: Verificar propiedad
router.delete('/:id', async (req, res) => {
  try {
    // Verificar que la asistencia pertenece al docente
    const asistencia = await Asistencia.findOne({
      _id: req.params.id,
      registradoPor: req.user._id
    });
    
    if (!asistencia) {
      return res.status(404).json({ error: 'Asistencia no encontrada o no tiene permisos para eliminarla' });
    }
    
    await Asistencia.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Asistencia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas generales - MODIFICADO: Solo del docente actual
router.get('/estadisticas/generales', async (req, res) => {
  try {
    const { materiaId, fechaInicio, fechaFin } = req.query;
    
    // Filtros base
    let filtros = { 
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
    
    // Obtener estadísticas
    const totalRegistros = await Asistencia.countDocuments(filtros);
    const totalPresentes = await Asistencia.countDocuments({ ...filtros, presente: true });
    const totalAusentes = await Asistencia.countDocuments({ ...filtros, presente: false });
    
    // Obtener estudiantes únicos que tienen asistencia
    const estudiantesConAsistencia = await Asistencia.distinct('estudiante', filtros);
    
    // Obtener materias únicas que tienen asistencia
    const materiasConAsistencia = await Asistencia.distinct('materia', filtros);
    
    const porcentajeAsistencia = totalRegistros > 0 ? ((totalPresentes / totalRegistros) * 100).toFixed(2) : 0;
    
    res.json({
      totalRegistros,
      totalPresentes,
      totalAusentes,
      porcentajeAsistencia: parseFloat(porcentajeAsistencia),
      estudiantesUnicos: estudiantesConAsistencia.length,
      materiasUnicas: materiasConAsistencia.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener asistencias por fecha - MODIFICADO: Solo del docente actual
router.get('/fecha/:fecha', async (req, res) => {
  try {
    const fecha = new Date(req.params.fecha);
    const inicioDelDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const finDelDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
    
    const asistencias = await Asistencia.find({
      fecha: {
        $gte: inicioDelDia,
        $lte: finDelDia
      },
      registradoPor: req.user._id
    })
    .populate({
      path: 'estudiante',
      match: { creadoPor: req.user._id }
    })
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
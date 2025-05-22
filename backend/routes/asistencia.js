const express = require('express');
const router = express.Router();
const { Asistencia, Estudiante, Materia } = require('../database');

// Obtener todas las asistencias (con opciones de filtrado)
router.get('/', async (req, res) => {
  try {
    const { materia, estudiante, fecha, presente } = req.query;
    
    // Construir filtro basado en parámetros
    const filtro = {};
    
    if (materia) filtro.materia = materia;
    if (estudiante) filtro.estudiante = estudiante;
    if (presente !== undefined) filtro.presente = presente === 'true';
    
    // Filtro de fecha
    if (fecha) {
      const fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);
      
      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);
      
      filtro.fecha = { $gte: fechaInicio, $lte: fechaFin };
    }
    
    const asistencias = await Asistencia.find(filtro)
      .populate('estudiante', 'nombre codigo programaAcademico')
      .populate('materia', 'nombre codigo')
      .sort({ fecha: -1 });
    
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener asistencia por ID
router.get('/:id', async (req, res) => {
  try {
    const asistencia = await Asistencia.findById(req.params.id)
      .populate('estudiante', 'nombre codigo programaAcademico')
      .populate('materia', 'nombre codigo');
    
    if (!asistencia) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
    }
    
    res.json(asistencia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar asistencia
router.post('/', async (req, res) => {
  try {
    const { estudiante, materia, fecha, presente } = req.body;
    
    // Verificar si el estudiante existe
    const estudianteExiste = await Estudiante.findById(estudiante);
    if (!estudianteExiste) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // Verificar si la materia existe y está activa
    const materiaExiste = await Materia.findOne({ _id: materia, estado: 'activo' });
    if (!materiaExiste) {
      return res.status(404).json({ error: 'Materia no encontrada o está en papelera' });
    }
    
    // Verificar si el estudiante está inscrito en la materia
    if (!estudianteExiste.materias.includes(materia)) {
      return res.status(400).json({
        error: 'El estudiante no está inscrito en esta materia',
        estudiante: {
          id: estudianteExiste._id,
          nombre: estudianteExiste.nombre,
          codigo: estudianteExiste.codigo
        }
      });
    }
    
    // Si no se proporciona una fecha, usar la fecha actual
    const fechaAsistencia = fecha ? new Date(fecha) : new Date();
    
    // Verificar si ya existe un registro para este estudiante, materia y fecha
    const fechaInicio = new Date(fechaAsistencia);
    fechaInicio.setHours(0, 0, 0, 0);
    
    const fechaFin = new Date(fechaAsistencia);
    fechaFin.setHours(23, 59, 59, 999);
    
    const asistenciaExistente = await Asistencia.findOne({
      estudiante,
      materia,
      fecha: { $gte: fechaInicio, $lte: fechaFin }
    });
    
    if (asistenciaExistente) {
      // Si ya existe, actualizar el estado de presencia
      asistenciaExistente.presente = presente !== undefined ? presente : true;
      asistenciaExistente.fecha = fechaAsistencia;
      
      await asistenciaExistente.save();
      
      const asistenciaActualizada = await Asistencia.findById(asistenciaExistente._id)
        .populate('estudiante', 'nombre codigo programaAcademico')
        .populate('materia', 'nombre codigo');
      
      return res.json({
        mensaje: 'Registro de asistencia actualizado',
        asistencia: asistenciaActualizada
      });
    }
    
    // Crear un nuevo registro de asistencia
    const nuevaAsistencia = new Asistencia({
      estudiante,
      materia,
      fecha: fechaAsistencia,
      presente: presente !== undefined ? presente : true
    });
    
    const asistenciaGuardada = await nuevaAsistencia.save();
    
    const asistenciaCompleta = await Asistencia.findById(asistenciaGuardada._id)
      .populate('estudiante', 'nombre codigo programaAcademico')
      .populate('materia', 'nombre codigo');
    
    // Emitir evento para clientes conectados
    global.io.emit('nueva-asistencia', asistenciaCompleta);
    
    res.status(201).json(asistenciaCompleta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar asistencia por huella
router.post('/huella', async (req, res) => {
  try {
    const { huellaID, materia } = req.body;
    
    if (!huellaID) {
      return res.status(400).json({ error: 'Se requiere el ID de huella' });
    }
    
    if (!materia) {
      return res.status(400).json({ error: 'Se requiere el ID de la materia' });
    }
    
    // Buscar estudiante por ID de huella
    const estudiante = await Estudiante.findOne({ huellaID });
    
    if (!estudiante) {
      return res.status(404).json({ error: 'No se encontró ningún estudiante con esa huella' });
    }
    
    // Verificar si la materia existe y está activa
    const materiaExiste = await Materia.findOne({ _id: materia, estado: 'activo' });
    if (!materiaExiste) {
      return res.status(404).json({ error: 'Materia no encontrada o está en papelera' });
    }
    
    // Verificar si el estudiante está inscrito en la materia
    if (!estudiante.materias.includes(materia)) {
      return res.status(400).json({
        error: 'El estudiante no está inscrito en esta materia',
        estudiante: {
          id: estudiante._id,
          nombre: estudiante.nombre,
          codigo: estudiante.codigo
        }
      });
    }
    
    // Verificar si ya existe un registro para este estudiante, materia y fecha actual
    const fechaActual = new Date();
    const fechaInicio = new Date(fechaActual);
    fechaInicio.setHours(0, 0, 0, 0);
    
    const fechaFin = new Date(fechaActual);
    fechaFin.setHours(23, 59, 59, 999);
    
    const asistenciaExistente = await Asistencia.findOne({
      estudiante: estudiante._id,
      materia,
      fecha: { $gte: fechaInicio, $lte: fechaFin }
    });
    
    if (asistenciaExistente) {
      // Si ya existe, actualizar el estado de presencia a presente
      asistenciaExistente.presente = true;
      asistenciaExistente.fecha = fechaActual;
      
      await asistenciaExistente.save();
      
      const asistenciaActualizada = await Asistencia.findById(asistenciaExistente._id)
        .populate('estudiante', 'nombre codigo programaAcademico')
        .populate('materia', 'nombre codigo');
      
      // Emitir evento para clientes conectados
      global.io.emit('asistencia-actualizada', asistenciaActualizada);
      
      return res.json({
        mensaje: 'Asistencia actualizada correctamente',
        asistencia: asistenciaActualizada
      });
    }
    
    // Crear un nuevo registro de asistencia
    const nuevaAsistencia = new Asistencia({
      estudiante: estudiante._id,
      materia,
      fecha: fechaActual,
      presente: true
    });
    
    const asistenciaGuardada = await nuevaAsistencia.save();
    
    const asistenciaCompleta = await Asistencia.findById(asistenciaGuardada._id)
      .populate('estudiante', 'nombre codigo programaAcademico')
      .populate('materia', 'nombre codigo');
    
    // Emitir evento para clientes conectados
    global.io.emit('nueva-asistencia', asistenciaCompleta);
    
    res.status(201).json({
      mensaje: 'Asistencia registrada correctamente',
      asistencia: asistenciaCompleta
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar registro de asistencia
router.put('/:id', async (req, res) => {
  try {
    const { presente, fecha } = req.body;
    
    const actualizacion = {};
    if (presente !== undefined) actualizacion.presente = presente;
    if (fecha) actualizacion.fecha = new Date(fecha);
    
    const asistenciaActualizada = await Asistencia.findByIdAndUpdate(
      req.params.id,
      actualizacion,
      { new: true }
    )
    .populate('estudiante', 'nombre codigo programaAcademico')
    .populate('materia', 'nombre codigo');
    
    if (!asistenciaActualizada) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
    }
    
    // Emitir evento para clientes conectados
    global.io.emit('asistencia-actualizada', asistenciaActualizada);
    
    res.json(asistenciaActualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar registro de asistencia
router.delete('/:id', async (req, res) => {
  try {
    const asistenciaEliminada = await Asistencia.findByIdAndDelete(req.params.id);
    
    if (!asistenciaEliminada) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
    }
    
    // Emitir evento para clientes conectados
    global.io.emit('asistencia-eliminada', { id: req.params.id });
    
    res.json({
      mensaje: 'Registro de asistencia eliminado correctamente',
      id: asistenciaEliminada._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar asistencia masiva para una materia
router.post('/masiva', async (req, res) => {
  try {
    const { materia, estudiantes, fecha, presente } = req.body;
    
    if (!materia) {
      return res.status(400).json({ error: 'Se requiere el ID de la materia' });
    }
    
    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de estudiantes' });
    }
    
    // Verificar si la materia existe y está activa
    const materiaExiste = await Materia.findOne({ _id: materia, estado: 'activo' });
    if (!materiaExiste) {
      return res.status(404).json({ error: 'Materia no encontrada o está en papelera' });
    }
    
    // Si no se proporciona una fecha, usar la fecha actual
    const fechaAsistencia = fecha ? new Date(fecha) : new Date();
    
    // Construir fechas de inicio y fin para el día
    const fechaInicio = new Date(fechaAsistencia);
    fechaInicio.setHours(0, 0, 0, 0);
    
    const fechaFin = new Date(fechaAsistencia);
    fechaFin.setHours(23, 59, 59, 999);
    
    // Array para almacenar resultados
    const resultados = [];
    
    // Procesar cada estudiante
    for (const estudianteId of estudiantes) {
      try {
        // Verificar si el estudiante existe
        const estudiante = await Estudiante.findById(estudianteId);
        
        if (!estudiante) {
          resultados.push({
            estudiante: estudianteId,
            exito: false,
            mensaje: 'Estudiante no encontrado'
          });
          continue;
        }
        
        // Verificar si el estudiante está inscrito en la materia
        if (!estudiante.materias.includes(materia)) {
          resultados.push({
            estudiante: estudianteId,
            nombre: estudiante.nombre,
            codigo: estudiante.codigo,
            exito: false,
            mensaje: 'El estudiante no está inscrito en esta materia'
          });
          continue;
        }
        
        // Verificar si ya existe un registro de asistencia para este estudiante y materia en la fecha dada
        const asistenciaExistente = await Asistencia.findOne({
          estudiante: estudianteId,
          materia,
          fecha: { $gte: fechaInicio, $lte: fechaFin }
        });
        
        if (asistenciaExistente) {
          // Actualizar registro existente
          asistenciaExistente.presente = presente !== undefined ? presente : true;
          await asistenciaExistente.save();
          
          resultados.push({
            estudiante: estudianteId,
            nombre: estudiante.nombre,
            codigo: estudiante.codigo,
            asistencia: asistenciaExistente._id,
            exito: true,
            mensaje: 'Registro de asistencia actualizado'
          });
        } else {
          // Crear nuevo registro
          const nuevaAsistencia = new Asistencia({
            estudiante: estudianteId,
            materia,
            fecha: fechaAsistencia,
            presente: presente !== undefined ? presente : true
          });
          
          const asistenciaGuardada = await nuevaAsistencia.save();
          
          resultados.push({
            estudiante: estudianteId,
            nombre: estudiante.nombre,
            codigo: estudiante.codigo,
            asistencia: asistenciaGuardada._id,
            exito: true,
            mensaje: 'Registro de asistencia creado'
          });
        }
      } catch (error) {
        resultados.push({
          estudiante: estudianteId,
          exito: false,
          mensaje: `Error: ${error.message}`
        });
      }
    }
    
    // Emitir evento para clientes conectados
    global.io.emit('asistencia-masiva', {
      materia,
      fecha: fechaAsistencia,
      resultados
    });
    
    res.json({
      mensaje: 'Proceso de asistencia masiva completado',
      materia: {
        id: materiaExiste._id,
        nombre: materiaExiste.nombre,
        codigo: materiaExiste.codigo
      },
      fecha: fechaAsistencia,
      resultados
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas de asistencia por materia
router.get('/estadisticas/materia/:id', async (req, res) => {
  try {
    const materiaId = req.params.id;
    
    // Verificar si la materia existe
    const materia = await Materia.findById(materiaId);
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    // Obtener todos los estudiantes inscritos en la materia
    const estudiantes = await Estudiante.find({ materias: materiaId });
    
    // Obtener todas las asistencias de la materia
    const asistencias = await Asistencia.find({ materia: materiaId });
    
    // Calcular estadísticas
    const totalEstudiantes = estudiantes.length;
    const totalAsistencias = asistencias.length;
    
    // Contar asistencias por fecha
    const asistenciasPorFecha = {};
    asistencias.forEach(asistencia => {
      const fecha = asistencia.fecha.toISOString().split('T')[0];
      
      if (!asistenciasPorFecha[fecha]) {
        asistenciasPorFecha[fecha] = {
          fecha,
          presentes: 0,
          ausentes: 0,
          total: 0
        };
      }
      
      asistenciasPorFecha[fecha].total++;
      
      if (asistencia.presente) {
        asistenciasPorFecha[fecha].presentes++;
      } else {
        asistenciasPorFecha[fecha].ausentes++;
      }
    });
    
    // Contar asistencias por estudiante
    const asistenciasPorEstudiante = {};
    asistencias.forEach(asistencia => {
      const estudianteId = asistencia.estudiante.toString();
      
      if (!asistenciasPorEstudiante[estudianteId]) {
        asistenciasPorEstudiante[estudianteId] = {
          estudiante: estudianteId,
          presentes: 0,
          ausentes: 0,
          total: 0
        };
      }
      
      asistenciasPorEstudiante[estudianteId].total++;
      
      if (asistencia.presente) {
        asistenciasPorEstudiante[estudianteId].presentes++;
      } else {
        asistenciasPorEstudiante[estudianteId].ausentes++;
      }
    });
    
    // Calcular porcentajes de asistencia
    Object.values(asistenciasPorEstudiante).forEach(est => {
      est.porcentajeAsistencia = est.total > 0 ? (est.presentes / est.total) * 100 : 0;
    });
    
    // Obtener datos de estudiantes para enriquecer la respuesta
    const estudiantesData = await Promise.all(
      Object.keys(asistenciasPorEstudiante).map(async (id) => {
        const est = await Estudiante.findById(id, 'nombre codigo programaAcademico');
        return {
          id,
          nombre: est ? est.nombre : 'Desconocido',
          codigo: est ? est.codigo : 'Desconocido',
          programaAcademico: est ? est.programaAcademico : 'Desconocido',
          ...asistenciasPorEstudiante[id]
        };
      })
    );
    
    res.json({
      materia: {
        id: materia._id,
        nombre: materia.nombre,
        codigo: materia.codigo
      },
      totalEstudiantes,
      totalAsistencias,
      asistenciasPorFecha: Object.values(asistenciasPorFecha),
      estudiantesData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
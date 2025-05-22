const express = require('express');
const router = express.Router();
const { Asistencia, Estudiante, Materia } = require('../database');

// Obtener todas las asistencias (con opciones de filtrado)
router.get('/', async (req, res) => {
  try {
    console.log('📥 [ASISTENCIA] Solicitud GET /asistencia recibida');
    console.log('📥 [ASISTENCIA] Query parameters:', req.query);
    
    const { materia, estudiante, fecha, presente } = req.query;
    
    // Construir filtro basado en parámetros - SOLO si se proporcionan
    const filtro = {};
    let tieneParametros = false;
    
    if (materia && materia.trim() !== '') {
      console.log('🔍 [ASISTENCIA] Aplicando filtro por materia:', materia);
      filtro.materia = materia;
      tieneParametros = true;
    }
    
    if (estudiante && estudiante.trim() !== '') {
      console.log('🔍 [ASISTENCIA] Aplicando filtro por estudiante:', estudiante);
      filtro.estudiante = estudiante;
      tieneParametros = true;
    }
    
    if (presente !== undefined && presente !== '') {
      console.log('🔍 [ASISTENCIA] Aplicando filtro por presente:', presente);
      filtro.presente = presente === 'true';
      tieneParametros = true;
    }
    
    // Filtro de fecha - SOLO si se proporciona
    if (fecha && fecha.trim() !== '') {
      console.log('🔍 [ASISTENCIA] Aplicando filtro por fecha:', fecha);
      const fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);
      
      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);
      
      filtro.fecha = { $gte: fechaInicio, $lte: fechaFin };
      tieneParametros = true;
      
      console.log('🔍 [ASISTENCIA] Rango de fechas configurado:', {
        inicio: fechaInicio.toISOString(),
        fin: fechaFin.toISOString()
      });
    }
    
    if (tieneParametros) {
      console.log('🔍 [ASISTENCIA] Filtros aplicados:', JSON.stringify(filtro, null, 2));
    } else {
      console.log('🔍 [ASISTENCIA] Sin filtros - mostrando todos los registros');
    }
    
    // Realizar consulta
    console.log('🔄 [ASISTENCIA] Ejecutando consulta a MongoDB...');
    
    // Configurar límite por defecto para evitar cargar demasiados registros
    const limite = tieneParametros ? 1000 : 100; // Sin filtros, limitar a 100 registros más recientes
    
    const asistencias = await Asistencia.find(filtro)
      .populate('estudiante', 'nombre codigo programaAcademico')
      .populate('materia', 'nombre codigo')
      .sort({ fecha: -1 }) // Más recientes primero
      .limit(limite);
    
    console.log('📊 [ASISTENCIA] Resultado de la consulta:');
    console.log('   - Total de registros encontrados:', asistencias.length);
    console.log('   - Límite aplicado:', limite);
    
    if (asistencias.length > 0) {
      console.log('   - Registro más reciente:', {
        id: asistencias[0]._id,
        estudiante: asistencias[0].estudiante?.nombre || 'Sin estudiante',
        materia: asistencias[0].materia?.nombre || 'Sin materia',
        fecha: asistencias[0].fecha?.toISOString(),
        presente: asistencias[0].presente
      });
      
      console.log('   - Registro más antiguo:', {
        id: asistencias[asistencias.length - 1]._id,
        estudiante: asistencias[asistencias.length - 1].estudiante?.nombre || 'Sin estudiante',
        materia: asistencias[asistencias.length - 1].materia?.nombre || 'Sin materia',
        fecha: asistencias[asistencias.length - 1].fecha?.toISOString(),
        presente: asistencias[asistencias.length - 1].presente
      });
      
      // Mostrar estadísticas
      const presentes = asistencias.filter(a => a.presente).length;
      const ausentes = asistencias.length - presentes;
      console.log('   - Estadísticas: Presentes:', presentes, ', Ausentes:', ausentes);
      
      // Mostrar distribución por materias
      const materias = {};
      asistencias.forEach(a => {
        const matNombre = a.materia?.nombre || 'Sin materia';
        materias[matNombre] = (materias[matNombre] || 0) + 1;
      });
      console.log('   - Distribución por materias:', materias);
      
    } else {
      console.log('   - No se encontraron registros');
      
      // Verificar si hay registros en total
      const totalRegistros = await Asistencia.countDocuments();
      console.log('   - Total de registros en la colección:', totalRegistros);
      
      if (totalRegistros === 0) {
        console.log('   ⚠️ La colección de asistencias está completamente vacía');
        console.log('   💡 Sugerencia: Registre algunas asistencias para ver datos aquí');
      } else {
        console.log('   ⚠️ Hay registros en la colección pero no coinciden con los filtros');
        
        // Mostrar una muestra de los registros existentes
        const muestra = await Asistencia.find({})
          .populate('estudiante', 'nombre')
          .populate('materia', 'nombre')
          .limit(3);
        
        console.log('   📄 Muestra de registros existentes:');
        muestra.forEach((reg, index) => {
          console.log(`     ${index + 1}. ${reg.estudiante?.nombre || 'Sin estudiante'} - ${reg.materia?.nombre || 'Sin materia'} - ${reg.fecha?.toISOString()} - ${reg.presente ? 'Presente' : 'Ausente'}`);
        });
      }
    }
    
    console.log('✅ [ASISTENCIA] Enviando respuesta al cliente...');
    res.json(asistencias);
    
  } catch (error) {
    console.error('❌ [ASISTENCIA] Error en GET /asistencia:', error);
    console.error('❌ [ASISTENCIA] Stack trace:', error.stack);
    
    // Información adicional de debug
    console.error('❌ [ASISTENCIA] Información adicional del error:');
    console.error('   - Nombre del error:', error.name);
    console.error('   - Código del error:', error.code);
    console.error('   - Query original:', req.query);
    
    res.status(500).json({ 
      error: error.message,
      details: 'Verifique los logs del servidor para más información'
    });
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
    
    const fechaFin = new Date(fechaActual.getTime() + 3 * 60 * 60 * 1000); 
    
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

    const fechaFin = new Date(fechaActual.getTime() + 3 * 60 * 60 * 1000); // 3 horas después

    const asistenciaExistente = await Asistencia.findOne({
      estudiante: estudiante._id,
      materia,
      fecha: { $gte: fechaInicio, $lte: fechaFin }
    });

    if (asistenciaExistente) {
      // NO crear nuevo registro, devolver el existente con mensaje informativo
      const asistenciaCompleta = await Asistencia.findById(asistenciaExistente._id)
        .populate('estudiante', 'nombre codigo programaAcademico')
        .populate('materia', 'nombre codigo');
      
      return res.json({
        mensaje: 'Asistencia ya registrada para este estudiante hoy',
        asistencia: asistenciaCompleta
      });
    }

    console.log('✅ Sistema de escaneo continuo implementado - 15 segundos con re-envío automático');
    // Si no existe, crear un nuevo registro de asistencia    
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
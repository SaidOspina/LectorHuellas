const mongoose = require('mongoose');
require('dotenv').config();

// URI de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/control_asistencia';

// Configuración de conexión a MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Conexión exitosa a MongoDB');
})
.catch(err => {
  console.error('Error al conectar a MongoDB:', err);
  process.exit(1);
});

// Importar modelo de Usuario
const Usuario = require('./models/usuario');

// Definir modelos de datos existentes

// Modelo para las materias - MODIFICADO
const MateriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigo: { type: String, required: true },
  descripcion: { type: String },
  estado: { type: String, enum: ['activo', 'papelera'], default: 'activo' },
  fechaCreacion: { type: Date, default: Date.now },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true // AHORA ES REQUERIDO
  }
});

// Índice compuesto para asegurar códigos únicos por docente
MateriaSchema.index({ codigo: 1, creadoPor: 1 }, { unique: true });

// Modelo para los estudiantes - MODIFICADO
const EstudianteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigo: { type: String, required: true },
  programaAcademico: { type: String, required: true },
  huellaID: { type: Number, unique: true, sparse: true },
  materias: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Materia' }],
  fechaCreacion: { type: Date, default: Date.now },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true // AHORA ES REQUERIDO
  }
});

// Índice compuesto para asegurar códigos únicos por docente
EstudianteSchema.index({ codigo: 1, creadoPor: 1 }, { unique: true });

// Modelo para las asistencias - MODIFICADO
const AsistenciaSchema = new mongoose.Schema({
  estudiante: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudiante', required: true },
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
  fecha: { type: Date, default: Date.now },
  presente: { type: Boolean, default: true },
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true // AHORA ES REQUERIDO
  }
});

// Crear índices compuestos para evitar registros duplicados de asistencia
AsistenciaSchema.index({ estudiante: 1, materia: 1, fecha: 1 }, { unique: true });

// Índice para filtrar por docente
AsistenciaSchema.index({ registradoPor: 1, fecha: -1 });

// Crear índice para huellaID en estudiantes (sparse para permitir nulls)
EstudianteSchema.index({ huellaID: 1 }, { sparse: true });

// Middleware para validar que estudiante y materia pertenezcan al mismo docente
AsistenciaSchema.pre('save', async function(next) {
  try {
    // Solo validar si es un documento nuevo
    if (this.isNew) {
      const estudiante = await mongoose.model('Estudiante').findById(this.estudiante);
      const materia = await mongoose.model('Materia').findById(this.materia);
      
      if (!estudiante || !materia) {
        return next(new Error('Estudiante o materia no encontrados'));
      }
      
      // Verificar que el estudiante esté inscrito en la materia
      if (!estudiante.materias.includes(this.materia)) {
        return next(new Error('El estudiante no está inscrito en esta materia'));
      }
      
      // Verificar que tanto el estudiante como la materia pertenezcan al docente que registra
      if (estudiante.creadoPor.toString() !== this.registradoPor.toString() ||
          materia.creadoPor.toString() !== this.registradoPor.toString()) {
        return next(new Error('No tiene permisos para registrar asistencia entre este estudiante y materia'));
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para validar que las materias de un estudiante pertenezcan al mismo docente
EstudianteSchema.pre('save', async function(next) {
  try {
    if (this.materias && this.materias.length > 0) {
      const materias = await mongoose.model('Materia').find({
        _id: { $in: this.materias },
        creadoPor: this.creadoPor
      });
      
      if (materias.length !== this.materias.length) {
        return next(new Error('Solo puede inscribir al estudiante en materias que usted ha creado'));
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Exportar modelos
const Materia = mongoose.model('Materia', MateriaSchema);
const Estudiante = mongoose.model('Estudiante', EstudianteSchema);
const Asistencia = mongoose.model('Asistencia', AsistenciaSchema);

module.exports = {
  Usuario,
  Materia,
  Estudiante,
  Asistencia
};
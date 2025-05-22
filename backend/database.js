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

// Definir modelos de datos

// Modelo para las materias
const MateriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigo: { type: String, required: true, unique: true },
  descripcion: { type: String },
  estado: { type: String, enum: ['activo', 'papelera'], default: 'activo' },
  fechaCreacion: { type: Date, default: Date.now }
});

// Modelo para los estudiantes
const EstudianteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigo: { type: String, required: true, unique: true },
  programaAcademico: { type: String, required: true },
  huellaID: { type: Number, unique: true },
  materias: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Materia' }]
});

// Modelo para las asistencias
const AsistenciaSchema = new mongoose.Schema({
  estudiante: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudiante', required: true },
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
  fecha: { type: Date, default: Date.now },
  presente: { type: Boolean, default: true }
});

// Crear índices compuestos para evitar registros duplicados de asistencia
AsistenciaSchema.index({ estudiante: 1, materia: 1, fecha: 1 }, { unique: true });

// Exportar modelos
const Materia = mongoose.model('Materia', MateriaSchema);
const Estudiante = mongoose.model('Estudiante', EstudianteSchema);
const Asistencia = mongoose.model('Asistencia', AsistenciaSchema);

module.exports = {
  Materia,
  Estudiante,
  Asistencia
};
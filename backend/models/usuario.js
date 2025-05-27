const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  nombre: { 
    type: String, 
    required: true,
    trim: true
  },
  apellido: { 
    type: String, 
    required: true,
    trim: true
  },
  rol: { 
    type: String, 
    enum: ['admin', 'docente'], 
    default: 'docente'
  },
  estado: { 
    type: String, 
    enum: ['activo', 'inactivo'], 
    default: 'activo'
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now
  },
  ultimoAcceso: { 
    type: Date 
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }
});

// Encriptar contraseña antes de guardar
UsuarioSchema.pre('save', async function(next) {
  // Solo hashear la contraseña si ha sido modificada (o es nueva)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash de la contraseña con salt rounds de 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
UsuarioSchema.methods.compararPassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para obtener datos públicos del usuario
UsuarioSchema.methods.toJSON = function() {
  const usuario = this.toObject();
  delete usuario.password;
  return usuario;
};

// Método estático para crear usuario admin por defecto
UsuarioSchema.statics.crearAdminDefault = async function() {
  try {
    const adminExistente = await this.findOne({ rol: 'admin' });
    
    if (!adminExistente) {
      const adminDefault = new this({
        username: 'admin',
        email: 'admin@sistema.com',
        password: 'admin123',
        nombre: 'Administrador',
        apellido: 'Sistema',
        rol: 'admin',
        estado: 'activo'
      });
      
      await adminDefault.save();
      console.log('✅ Usuario administrador por defecto creado:');
      console.log('   Usuario: admin');
      console.log('   Contraseña: admin123');
      console.log('   ⚠️ CAMBIAR ESTA CONTRASEÑA EN PRODUCCIÓN');
      
      return adminDefault;
    }
    
    return adminExistente;
  } catch (error) {
    console.error('❌ Error al crear usuario admin por defecto:', error);
    throw error;
  }
};

const Usuario = mongoose.model('Usuario', UsuarioSchema);

module.exports = Usuario;
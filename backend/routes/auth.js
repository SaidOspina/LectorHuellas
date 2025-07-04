const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const { generateToken, auth, requireAdmin } = require('../middleware/auth');

// Ruta de login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar datos de entrada
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username y contraseña son requeridos',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Buscar usuario por username o email
    const usuario = await Usuario.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });

    if (!usuario) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar contraseña
    const passwordValida = await usuario.compararPassword(password);
    
    if (!passwordValida) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar que el usuario esté activo
    if (usuario.estado !== 'activo') {
      return res.status(401).json({ 
        error: 'Usuario inactivo. Contacte al administrador.',
        code: 'USER_INACTIVE'
      });
    }

    // Actualizar último acceso
    usuario.ultimoAcceso = new Date();
    await usuario.save();

    // Generar token
    const token = generateToken(usuario);

    // Configurar cookie (opcional)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario._id,
        username: usuario.username,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        ultimoAcceso: usuario.ultimoAcceso
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Ruta de logout
router.post('/logout', auth, async (req, res) => {
  try {
    // Limpiar cookie
    res.clearCookie('token');
    
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Ruta para verificar token y obtener usuario actual
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      usuario: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        nombre: req.user.nombre,
        apellido: req.user.apellido,
        rol: req.user.rol,
        ultimoAcceso: req.user.ultimoAcceso
      }
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Ruta para cambiar contraseña
router.put('/cambiar-password', auth, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    // Validar datos de entrada
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ 
        error: 'Contraseña actual y nueva son requeridas',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({ 
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Buscar usuario con contraseña incluida
    const usuario = await Usuario.findById(req.user._id);

    // Verificar contraseña actual
    const passwordValida = await usuario.compararPassword(passwordActual);
    
    if (!passwordValida) {
      return res.status(401).json({ 
        error: 'Contraseña actual incorrecta',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Actualizar contraseña
    usuario.password = passwordNueva;
    await usuario.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Ruta para actualizar perfil de usuario
router.put('/actualizar-perfil', auth, async (req, res) => {
  try {
    const { nombre, apellido, email, username } = req.body;

    // Validar datos de entrada
    if (!nombre || !apellido || !email || !username) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Formato de email inválido',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    // Validar longitud de username
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ 
        error: 'El nombre de usuario debe tener entre 3 y 50 caracteres',
        code: 'INVALID_USERNAME_LENGTH'
      });
    }

    // Verificar que no exista otro usuario con el mismo email o username
    // (excluyendo al usuario actual)
    const usuarioExistente = await Usuario.findOne({
      _id: { $ne: req.user._id },
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (usuarioExistente) {
      let errorMessage = 'Ya existe otro usuario con ';
      if (usuarioExistente.username === username.toLowerCase()) {
        errorMessage += 'ese nombre de usuario';
      } else {
        errorMessage += 'ese email';
      }
      
      return res.status(400).json({ 
        error: errorMessage,
        code: 'USER_EXISTS'
      });
    }

    // Buscar el usuario actual
    const usuario = await Usuario.findById(req.user._id);
    
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Actualizar campos del usuario
    usuario.nombre = nombre.trim();
    usuario.apellido = apellido.trim();
    usuario.email = email.toLowerCase().trim();
    usuario.username = username.toLowerCase().trim();

    // Guardar cambios
    await usuario.save();

    // Respuesta exitosa (sin incluir password)
    const usuarioActualizado = usuario.toJSON();
    
    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      usuario: usuarioActualizado
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    
    // Manejar errores de validación de MongoDB
    if (error.code === 11000) {
      // Error de clave duplicada
      let field = 'campo';
      if (error.keyPattern && error.keyPattern.username) {
        field = 'nombre de usuario';
      } else if (error.keyPattern && error.keyPattern.email) {
        field = 'email';
      }
      
      return res.status(400).json({ 
        error: `Ya existe otro usuario con ese ${field}`,
        code: 'DUPLICATE_KEY'
      });
    }
    
    if (error.name === 'ValidationError') {
      // Error de validación de Mongoose
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: errorMessages.join(', '),
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Ruta para crear usuario (solo admin)
router.post('/crear-usuario', auth, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, nombre, apellido, rol } = req.body;

    // Validar datos de entrada
    if (!username || !email || !password || !nombre || !apellido) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar que no exista el usuario
    const usuarioExistente = await Usuario.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (usuarioExistente) {
      return res.status(400).json({ 
        error: 'Ya existe un usuario con ese username o email',
        code: 'USER_EXISTS'
      });
    }

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      nombre,
      apellido,
      rol: rol || 'docente',
      creadoPor: req.user._id
    });

    await nuevoUsuario.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      usuario: {
        id: nuevoUsuario._id,
        username: nuevoUsuario.username,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado,
        fechaCreacion: nuevoUsuario.fechaCreacion
      }
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    
    // Manejar errores de validación de MongoDB
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Username o email ya existe',
        code: 'DUPLICATE_KEY'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Ruta para verificar estado del sistema
router.get('/status', async (req, res) => {
  try {
    const totalUsuarios = await Usuario.countDocuments();
    const adminExists = await Usuario.exists({ rol: 'admin' });

    res.json({
      success: true,
      sistema: {
        inicializado: adminExists !== null,
        totalUsuarios,
        tieneAdmin: adminExists !== null
      }
    });
  } catch (error) {
    console.error('Error al verificar status:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
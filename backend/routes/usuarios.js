const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const { auth, requireAdmin } = require('../middleware/auth');

// Obtener todos los usuarios (solo admin)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { rol, estado, page = 1, limit = 10, search } = req.query;
    
    // Construir filtros
    const filtros = {};
    
    if (rol && rol !== 'todos') {
      filtros.rol = rol;
    }
    
    if (estado && estado !== 'todos') {
      filtros.estado = estado;
    }
    
    // Búsqueda por texto
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filtros.$or = [
        { nombre: searchRegex },
        { apellido: searchRegex },
        { username: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // Configurar paginación
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Obtener usuarios
    const usuarios = await Usuario.find(filtros)
      .select('-password')
      .populate('creadoPor', 'nombre apellido username')
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Contar total para paginación
    const total = await Usuario.countDocuments(filtros);
    
    res.json({
      success: true,
      usuarios,
      paginacion: {
        totalUsuarios: total,
        paginaActual: pageNum,
        totalPaginas: Math.ceil(total / limitNum),
        usuariosPorPagina: limitNum
      }
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Obtener usuario por ID (solo admin)
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .select('-password')
      .populate('creadoPor', 'nombre apellido username');

    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      usuario
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Crear nuevo usuario (solo admin)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, nombre, apellido, rol } = req.body;

    // Validar datos de entrada
    if (!username || !email || !password || !nombre || !apellido) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
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

    // Obtener usuario con datos poblados para respuesta
    const usuarioCreado = await Usuario.findById(nuevoUsuario._id)
      .select('-password')
      .populate('creadoPor', 'nombre apellido username');

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      usuario: usuarioCreado
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    
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

// Actualizar usuario (solo admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { username, email, nombre, apellido, rol, estado } = req.body;
    const usuarioId = req.params.id;

    // Verificar que el usuario existe
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevenir que el admin se desactive a sí mismo
    if (usuario._id.toString() === req.user._id.toString() && estado === 'inactivo') {
      return res.status(400).json({ 
        error: 'No puedes desactivar tu propia cuenta',
        code: 'CANNOT_DEACTIVATE_SELF'
      });
    }

    // Verificar duplicados (excluyendo al usuario actual)
    if (username || email) {
      const duplicado = await Usuario.findOne({
        _id: { $ne: usuarioId },
        $or: [
          ...(username ? [{ username: username.toLowerCase() }] : []),
          ...(email ? [{ email: email.toLowerCase() }] : [])
        ]
      });

      if (duplicado) {
        return res.status(400).json({ 
          error: 'Ya existe otro usuario con ese username o email',
          code: 'USER_EXISTS'
        });
      }
    }

    // Actualizar campos
    if (username) usuario.username = username.toLowerCase();
    if (email) usuario.email = email.toLowerCase();
    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;
    if (rol && ['admin', 'docente'].includes(rol)) usuario.rol = rol;
    if (estado && ['activo', 'inactivo'].includes(estado)) usuario.estado = estado;

    await usuario.save();

    // Obtener usuario actualizado con datos poblados
    const usuarioActualizado = await Usuario.findById(usuarioId)
      .select('-password')
      .populate('creadoPor', 'nombre apellido username');

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      usuario: usuarioActualizado
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    
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

// Cambiar contraseña de usuario (solo admin)
router.put('/:id/password', auth, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    const usuarioId = req.params.id;

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    usuario.password = password;
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

// Eliminar usuario (solo admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const usuarioId = req.params.id;

    // Verificar que el usuario existe
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevenir que el admin se elimine a sí mismo
    if (usuario._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'No puedes eliminar tu propia cuenta',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // Verificar si es el último admin
    if (usuario.rol === 'admin') {
      const totalAdmins = await Usuario.countDocuments({ rol: 'admin', estado: 'activo' });
      if (totalAdmins <= 1) {
        return res.status(400).json({ 
          error: 'No se puede eliminar el último administrador del sistema',
          code: 'CANNOT_DELETE_LAST_ADMIN'
        });
      }
    }

    await Usuario.findByIdAndDelete(usuarioId);

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

// Obtener estadísticas de usuarios (solo admin)
router.get('/estadisticas/resumen', auth, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsuarios,
      usuariosActivos,
      totalAdmins,
      totalDocentes,
      usuariosRecientes
    ] = await Promise.all([
      Usuario.countDocuments(),
      Usuario.countDocuments({ estado: 'activo' }),
      Usuario.countDocuments({ rol: 'admin', estado: 'activo' }),
      Usuario.countDocuments({ rol: 'docente', estado: 'activo' }),
      Usuario.countDocuments({
        fechaCreacion: { 
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // últimos 30 días
        }
      })
    ]);

    res.json({
      success: true,
      estadisticas: {
        totalUsuarios,
        usuariosActivos,
        usuariosInactivos: totalUsuarios - usuariosActivos,
        totalAdmins,
        totalDocentes,
        usuariosRecientes
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
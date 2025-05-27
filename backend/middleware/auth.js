const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');

// Clave secreta para JWT (en producción debe estar en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || '1151968';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Middleware de autenticación
const auth = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.body?.token ||
                  req.query?.token;

    if (!token) {
      return res.status(401).json({ 
        error: 'No se proporcionó token de acceso',
        code: 'NO_TOKEN'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const usuario = await Usuario.findById(decoded.id).select('-password');
    
    if (!usuario) {
      return res.status(401).json({ 
        error: 'Token inválido - usuario no encontrado',
        code: 'INVALID_TOKEN'
      });
    }

    // Verificar que el usuario esté activo
    if (usuario.estado !== 'activo') {
      return res.status(401).json({ 
        error: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    // Agregar usuario a la request
    req.user = usuario;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    
    // Manejar diferentes tipos de errores de JWT
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({ 
      error: 'Error del servidor en autenticación',
      code: 'SERVER_ERROR'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (...roles) => {
  return (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Verificar que el usuario tenga el rol requerido
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'No tienes permisos para acceder a este recurso',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.rol
      });
    }

    next();
  };
};

// Middleware para verificar que sea admin
const requireAdmin = requireRole('admin');

// Middleware para verificar que sea docente o admin
const requireDocente = requireRole('docente', 'admin');

// Función para generar JWT
const generateToken = (usuario) => {
  return jwt.sign(
    { 
      id: usuario._id,
      username: usuario.username,
      rol: usuario.rol
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// Función opcional para middleware en rutas que NO requieren autenticación
// pero pueden beneficiarse de saber si hay un usuario logueado
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const usuario = await Usuario.findById(decoded.id).select('-password');
      
      if (usuario && usuario.estado === 'activo') {
        req.user = usuario;
      }
    }
  } catch (error) {
    // Ignorar errores en auth opcional
    console.log('Auth opcional falló (ignorando):', error.message);
  }
  
  next();
};

module.exports = {
  auth,
  requireRole,
  requireAdmin,
  requireDocente,
  optionalAuth,
  generateToken,
  JWT_SECRET
};
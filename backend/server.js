const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();

// Importar modelo de Usuario
const Usuario = require('./models/usuario');

// Importar rutas
const materiasRoutes = require('./routes/materias');
const estudiantesRoutes = require('./routes/estudiantes');
const asistenciaRoutes = require('./routes/asistencia');
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');

// Importar middleware de autenticación
const { auth, requireDocente, optionalAuth } = require('./middleware/auth');

// Inicializar express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir archivos estáticos desde 'frontend'
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de autenticación (públicas)
app.use('/api/auth', authRoutes);

// Rutas protegidas - requieren autenticación
app.use('/api/materias', auth, requireDocente, materiasRoutes);
app.use('/api/estudiantes', auth, requireDocente, estudiantesRoutes);
app.use('/api/asistencia', auth, requireDocente, asistenciaRoutes);
app.use('/api/usuarios', usuariosRoutes); // Ya tiene sus propios middlewares internos

// Variables globales para el Arduino (sin cambios)
let arduinoPort;
let arduinoParser;
let arduinoReady = false;
let commandQueue = [];
let processingCommand = false;
let waitingForScanResponse = false;

// Función para procesar la cola de comandos (sin cambios)
function processCommandQueue() {
  if (processingCommand || commandQueue.length === 0 || !arduinoReady) {
    return;
  }
  
  const command = commandQueue.shift();
  processingCommand = true;
  
  console.log(`Procesando comando de cola: ${command}`);
  
  if (!arduinoPort || !arduinoPort.isOpen) {
    console.error('Error: Arduino no está conectado al procesar comando');
    processingCommand = false;
    processCommandQueue();
    return;
  }
  
  if (command === 'scan') {
    waitingForScanResponse = true;
    console.log('🔍 Marcando como esperando respuesta de scan');
  }
  
  arduinoPort.write(command + '\n', (err) => {
    if (err) {
      console.error('Error al enviar comando:', err);
      processingCommand = false;
      waitingForScanResponse = false;
      processCommandQueue();
    }
  });
  
  const timeoutDuration = command.startsWith('enroll:') ? 120000 : 15000;
  setTimeout(() => {
    if (processingCommand) {
      console.log('Timeout en comando, continuando...');
      processingCommand = false;
      waitingForScanResponse = false;
      processCommandQueue();
    }
  }, timeoutDuration);
}

// Función para inicializar la conexión con Arduino (sin cambios)
function initArduinoConnection() {
  const portPath = process.env.ARDUINO_PORT;
  
  if (!portPath) {
    console.error('No se ha configurado un puerto serial. Verifique la variable ARDUINO_PORT en el archivo .env');
    return;
  }

  try {
    console.log(`Intentando conectar con Arduino en puerto ${portPath}...`);
    
    arduinoPort = new SerialPort({
      path: portPath,
      baudRate: 9600,
      autoOpen: true
    });
    
    arduinoParser = new ReadlineParser({ delimiter: '\n' });
    arduinoPort.pipe(arduinoParser);

    arduinoPort.on('open', () => {
      console.log(`Conexión establecida con Arduino en ${portPath}`);
      global.arduinoConectado = true;
      arduinoReady = false;
      
      setTimeout(() => {
        if (!arduinoReady) {
          arduinoReady = true;
          console.log('Arduino marcado como listo (timeout de seguridad)');
          processCommandQueue();
        }
      }, 5000);
      
      if (global.io) {
        global.io.emit('arduino-status', { connected: true, ready: arduinoReady });
      }
    });

    arduinoPort.on('error', (err) => {
      console.error('Error en la conexión con Arduino:', err.message);
      global.arduinoConectado = false;
      arduinoReady = false;
      waitingForScanResponse = false;
      
      if (global.io) {
        global.io.emit('arduino-status', { connected: false, ready: false });
      }
    });

    arduinoPort.on('close', () => {
      console.log('Conexión con Arduino cerrada');
      global.arduinoConectado = false;
      arduinoReady = false;
      waitingForScanResponse = false;
      
      commandQueue = [];
      processingCommand = false;
      
      if (global.io) {
        global.io.emit('arduino-status', { connected: false, ready: false });
      }
    });

    // Procesamiento de datos del Arduino (sin cambios)
    arduinoParser.on('data', (data) => {
      const cleanData = data.trim();
      console.log(`Datos recibidos de Arduino: ${cleanData}`);
      
      if (cleanData.includes('Sistema listo') || 
          cleanData.includes('Sin sensor - modo prueba') ||
          cleanData === 'READY' ||
          cleanData.includes('Iniciando...')) {
          
          if (!arduinoReady) {
              arduinoReady = true;
              console.log('✅ Arduino está listo para recibir comandos');
              
              if (global.io) {
                  global.io.emit('arduino-status', { 
                      connected: true, 
                      ready: true,
                      sensorMode: cleanData.includes('Sin sensor') ? 'test' : 'normal'
                  });
              }
              
              processCommandQueue();
          }
      }
      
      if (cleanData.startsWith('ID#')) {
          const fingerprintId = parseInt(cleanData.substring(3));
          console.log(`👆 Huella detectada con ID: ${fingerprintId}`);
          
          if (waitingForScanResponse) {
              console.log('✅ Procesando respuesta de scan válida');
              waitingForScanResponse = false;
              
              if (global.io) {
                  global.io.emit('fingerprint-scan', { 
                      id: fingerprintId,
                      timestamp: new Date().toISOString()
                  });
              }
              
              processingCommand = false;
              processCommandQueue();
          } else {
              console.log('⚠️ Respuesta de scan ignorada - no esperada o ya procesada');
          }
      }
      
      else if (cleanData.startsWith('ERROR: No leido') || cleanData === 'ERROR: Sin sensor') {
          console.log('❌ Error en escaneo de huella:', cleanData);
          
          if (waitingForScanResponse) {
              console.log('✅ Procesando error de scan válido');
              waitingForScanResponse = false;
              
              if (global.io) {
                  global.io.emit('fingerprint-error', { 
                      message: cleanData.replace('ERROR:', '').trim(),
                      timestamp: new Date().toISOString()
                  });
              }
              
              processingCommand = false;
              processCommandQueue();
          } else {
              console.log('⚠️ Error de scan ignorado - no esperado o ya procesado');
          }
      }
      
      else if (cleanData === 'SCAN: Detenido' || cleanData === 'SCAN: No activo') {
          console.log('🛑 Scan detenido por Arduino');
          waitingForScanResponse = false;
          processingCommand = false;
          processCommandQueue();
      }
      
      else if (cleanData.includes('Registrando ID') || cleanData.startsWith('Registrando ID')) {
          console.log('🔄 Iniciando proceso de registro de huella');
          if (global.io) {
              global.io.emit('huella-progress', { 
                  step: 'iniciando',
                  message: cleanData
              });
          }
      }
      
      else if (cleanData.includes('Coloque dedo') || cleanData.includes('coloque dedo')) {
          console.log('📱 Solicitando primera captura de huella');
          if (global.io) {
              global.io.emit('huella-progress', { 
                  step: 'primera_captura',
                  message: cleanData
              });
          }
      }
      
      else if (cleanData.includes('Retire dedo') || cleanData.includes('retire dedo')) {
          console.log('✋ Solicitando retirar el dedo');
          if (global.io) {
              global.io.emit('huella-progress', { 
                  step: 'retirar',
                  message: cleanData
              });
          }
      }
      
      else if (cleanData.includes('Mismo dedo otra vez') || cleanData.includes('mismo dedo')) {
          console.log('🔄 Solicitando segunda captura de huella');
          if (global.io) {
              global.io.emit('huella-progress', { 
                  step: 'segunda_captura',
                  message: cleanData
              });
          }
      }
      
      else if (cleanData.startsWith('SUCCESS:')) {
          console.log('✅ Comando ejecutado exitosamente:', cleanData);
          
          if (cleanData.includes('ID')) {
              const idMatch = cleanData.match(/ID\s*(\d+)/);
              if (idMatch) {
                  const huellaID = parseInt(idMatch[1]);
                  console.log(`🎉 Registro de huella completado con ID: ${huellaID}`);
                  if (global.io) {
                      global.io.emit('huella-registered', { 
                          id: huellaID,
                          message: `¡Huella registrada exitosamente con ID ${huellaID}!`
                      });
                  }
              }
          }
          
          processingCommand = false;
          processCommandQueue();
      }
      
      else if (cleanData.startsWith('ERROR:')) {
          console.error('❌ Error del Arduino:', cleanData);
          
          if (global.io) {
              global.io.emit('huella-error', { 
                  message: cleanData.replace('ERROR:', '').trim() || 'Error en el proceso'
              });
          }
          
          processingCommand = false;
          processCommandQueue();
      }
      
      else if (cleanData.startsWith('COUNT:')) {
          const countMatch = cleanData.match(/COUNT:\s*(\d+)/);
          if (countMatch) {
              const count = parseInt(countMatch[1]);
              console.log(`📊 Arduino reporta ${count} huellas almacenadas`);
              if (global.io) {
                  global.io.emit('arduino-count', { count });
              }
          }
          processingCommand = false;
          processCommandQueue();
      }
      
      else if (cleanData.includes('BD limpia') ||
               cleanData === 'RESET: OK' ||
               cleanData.startsWith('STATUS:')) {
          processingCommand = false;
          processCommandQueue();
      }
    });
    
  } catch (error) {
    console.error('Error al inicializar Arduino:', error.message);
  }
}

function stopCurrentScan() {
    if (waitingForScanResponse && arduinoPort && arduinoPort.isOpen) {
        console.log('🛑 Enviando comando para detener scan en progreso');
        arduinoPort.write('stop-scan\n');
        waitingForScanResponse = false;
        processingCommand = false;
    }
}

// Rutas de Arduino (protegidas - requieren autenticación de docente)
app.post('/api/arduino/command', auth, requireDocente, (req, res) => {
    const { command } = req.body;
    
    console.log(`Recibido comando para Arduino: "${command}"`);
    
    if (!arduinoPort || !arduinoPort.isOpen) {
        console.log('Error: Arduino no está conectado');
        return res.status(500).json({ 
            success: false,
            error: 'Arduino no está conectado' 
        });
    }
    
    if (!arduinoReady) {
        console.log('Error: Arduino no está listo');
        return res.status(500).json({ 
            success: false,
            error: 'Arduino no está listo para recibir comandos' 
        });
    }
    
    if (!command || command.trim() === '') {
        return res.status(400).json({ 
            success: false,
            error: 'Comando vacío' 
        });
    }
    
    if (command.trim() === 'scan' && waitingForScanResponse) {
        console.log('⚠️ Comando scan rechazado - ya hay uno en progreso');
        return res.status(429).json({ 
            success: false,
            error: 'Ya hay un comando scan en progreso' 
        });
    }
    
    commandQueue.push(command.trim());
    console.log(`Comando agregado a la cola. Cola actual: ${commandQueue.length} comandos`);
    
    processCommandQueue();
    
    res.json({ 
        success: true, 
        message: 'Comando agregado a la cola',
        queueLength: commandQueue.length
    });
});

// Otras rutas de Arduino (protegidas)
app.get('/api/arduino/status', auth, requireDocente, (req, res) => {
    const isConnected = arduinoPort && arduinoPort.isOpen;
    
    res.json({ 
        connected: isConnected,
        ready: arduinoReady,
        queueLength: commandQueue.length,
        waitingForScan: waitingForScanResponse
    });
});

app.post('/api/arduino/stop-scan', auth, requireDocente, (req, res) => {
    console.log('🛑 Solicitud para detener scan');
    
    if (!arduinoPort || !arduinoPort.isOpen) {
        return res.status(500).json({ 
            success: false,
            error: 'Arduino no está conectado' 
        });
    }
    
    stopCurrentScan();
    
    res.json({ 
        success: true, 
        message: 'Comando de detener scan enviado' 
    });
});

app.post('/api/arduino/reset', auth, requireDocente, (req, res) => {
    if (!arduinoPort || !arduinoPort.isOpen) {
        return res.status(500).json({ 
            success: false,
            error: 'Arduino no está conectado' 
        });
    }
    
    commandQueue = [];
    processingCommand = false;
    arduinoReady = false;
    
    console.log('Enviando comando reset al Arduino...');
    
    arduinoPort.write('reset\n', (err) => {
        if (err) {
            console.error('Error al enviar comando reset:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Error al enviar comando reset' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Comando reset enviado' 
        });
    });
});

app.post('/api/arduino/clear-queue', auth, requireDocente, (req, res) => {
    const previousLength = commandQueue.length;
    commandQueue = [];
    processingCommand = false;
    
    console.log(`Cola de comandos limpiada. Se eliminaron ${previousLength} comandos`);
    
    res.json({ 
        success: true, 
        message: `Cola limpiada. Se eliminaron ${previousLength} comandos`,
        previousLength: previousLength
    });
});

// Rutas para servir diferentes interfaces según el rol
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Ruta para la página principal (docentes)
app.get('/', optionalAuth, (req, res) => {
  // Si no hay usuario autenticado, redirigir a login
  if (!req.user) {
    return res.redirect('/login');
  }
  
  // Si es admin, redirigir al panel de admin
  if (req.user.rol === 'admin') {
    return res.redirect('/admin');
  }
  
  // Si es docente, servir la aplicación principal
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar la base de datos y crear usuario admin por defecto
async function initializeDatabase() {
  try {
    await Usuario.crearAdminDefault();
    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
  }
}

// Iniciar el servidor
const server = app.listen(PORT, async () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  
  // Inicializar base de datos
  await initializeDatabase();
  
  // Inicializar conexión con Arduino después de que el servidor esté listo
  setTimeout(() => {
    initArduinoConnection();
  }, 1000);
});

// Configurar Socket.io para comunicación en tiempo real
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

global.io = io;

// Middleware de autenticación para Socket.io
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('No token provided'));
    }
    
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./middleware/auth');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id).select('-password');
    
    if (!usuario || usuario.estado !== 'activo') {
      return next(new Error('Invalid token'));
    }
    
    socket.user = usuario;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.user.username} (${socket.user.rol})`);
  
  // Enviar estado actual del Arduino al cliente recién conectado
  socket.emit('arduino-status', { 
    connected: global.arduinoConectado || false,
    ready: arduinoReady
  });
  
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.user.username}`);
  });
  
  socket.on('request-arduino-status', () => {
    socket.emit('arduino-status', { 
      connected: global.arduinoConectado || false,
      ready: arduinoReady,
      queueLength: commandQueue.length
    });
  });
});

// Manejar cierre de servidor
process.on('SIGINT', () => {
  console.log('\nCerrando servidor...');
  
  stopCurrentScan();
  
  if (arduinoPort && arduinoPort.isOpen) {
    console.log('Cerrando conexión con Arduino...');
    arduinoPort.close();
  }
  
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});

module.exports = app;
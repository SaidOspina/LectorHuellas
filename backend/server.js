const express = require('express');
const cors = require('cors');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();

// Importar rutas
const materiasRoutes = require('./routes/materias');
const estudiantesRoutes = require('./routes/estudiantes');
const asistenciaRoutes = require('./routes/asistencia');

// Inicializar express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde 'frontend'
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas API
app.use('/api/materias', materiasRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/asistencia', asistenciaRoutes);

// Variables globales para el Arduino
let arduinoPort;
let arduinoParser;
let arduinoReady = false;
let commandQueue = [];
let processingCommand = false;
let waitingForScanResponse = false;

// Función para procesar la cola de comandos
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
  
  // Marcar si estamos esperando respuesta de scan
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
  
  // Timeout para comandos (más tiempo para enroll)
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

// Función para inicializar la conexión con Arduino
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

    // PROCESAMIENTO DE DATOS MODIFICADO - Una sola respuesta por scan
    arduinoParser.on('data', (data) => {
      const cleanData = data.trim();
      console.log(`Datos recibidos de Arduino: ${cleanData}`);
      
      // Verificar si el Arduino está listo
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
      
      // PROCESAR RESPUESTAS DE SCAN - SOLO UNA VEZ
      if (cleanData.startsWith('ID#')) {
          const fingerprintId = parseInt(cleanData.substring(3));
          console.log(`👆 Huella detectada con ID: ${fingerprintId}`);
          
          // SOLO procesar si estamos esperando una respuesta de scan
          if (waitingForScanResponse) {
              console.log('✅ Procesando respuesta de scan válida');
              waitingForScanResponse = false; // Marcar como procesada
              
              // Emitir evento de huella escaneada
              if (global.io) {
                  global.io.emit('fingerprint-scan', { 
                      id: fingerprintId,
                      timestamp: new Date().toISOString()
                  });
              }
              
              // Marcar comando como procesado
              processingCommand = false;
              processCommandQueue();
          } else {
              console.log('⚠️ Respuesta de scan ignorada - no esperada o ya procesada');
          }
      }
      
      // Procesar errores de escaneo
      else if (cleanData.startsWith('ERROR: No leido') || cleanData === 'ERROR: Sin sensor') {
          console.log('❌ Error en escaneo de huella:', cleanData);
          
          // SOLO procesar si estamos esperando una respuesta de scan
          if (waitingForScanResponse) {
              console.log('✅ Procesando error de scan válido');
              waitingForScanResponse = false; // Marcar como procesada
              
              // Emitir evento de error de huella
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
      
      // Procesar comando de detener scan
      else if (cleanData === 'SCAN: Detenido' || cleanData === 'SCAN: No activo') {
          console.log('🛑 Scan detenido por Arduino');
          waitingForScanResponse = false;
          processingCommand = false;
          processCommandQueue();
      }
      
      // Manejar mensajes de progreso del registro de huella
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
      
      // Respuestas de éxito
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
      
      // Respuestas de error
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
      
      // Respuesta de conteo
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
      
      // Otras respuestas que indican fin de comando
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



// Ruta para enviar comandos a Arduino
app.post('/api/arduino/command', (req, res) => {
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
    
    // Si es un comando scan y ya hay uno en progreso, rechazar
    if (command.trim() === 'scan' && waitingForScanResponse) {
        console.log('⚠️ Comando scan rechazado - ya hay uno en progreso');
        return res.status(429).json({ 
            success: false,
            error: 'Ya hay un comando scan en progreso' 
        });
    }
    
    // Agregar comando a la cola
    commandQueue.push(command.trim());
    console.log(`Comando agregado a la cola. Cola actual: ${commandQueue.length} comandos`);
    
    // Procesar cola
    processCommandQueue();
    
    res.json({ 
        success: true, 
        message: 'Comando agregado a la cola',
        queueLength: commandQueue.length
    });
});


// Ruta para obtener estado del Arduino
app.get('/api/arduino/status', (req, res) => {
    const isConnected = arduinoPort && arduinoPort.isOpen;
    
    res.json({ 
        connected: isConnected,
        ready: arduinoReady,
        queueLength: commandQueue.length,
        waitingForScan: waitingForScanResponse // NUEVO
    });
});

// NUEVA RUTA: Detener scan en progreso
app.post('/api/arduino/stop-scan', (req, res) => {
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


// Ruta para reiniciar Arduino
app.post('/api/arduino/reset', (req, res) => {
    if (!arduinoPort || !arduinoPort.isOpen) {
        return res.status(500).json({ 
            success: false,
            error: 'Arduino no está conectado' 
        });
    }
    
    // Limpiar cola de comandos y estado
    commandQueue = [];
    processingCommand = false;
    arduinoReady = false;
    
    console.log('Enviando comando reset al Arduino...');
    
    // Enviar comando de reset
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

// Ruta para limpiar cola de comandos
app.post('/api/arduino/clear-queue', (req, res) => {
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

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  
  // Inicializar conexión con Arduino después de que el servidor esté listo
  setTimeout(() => {
    initArduinoConnection();
  }, 1000);
});

// Configurar Socket.io para comunicación en tiempo real
const io = require('socket.io')(server);
global.io = io;

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  
  // Enviar estado actual del Arduino al cliente recién conectado
  socket.emit('arduino-status', { 
    connected: global.arduinoConectado || false,
    ready: arduinoReady
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
  
  // Manejar solicitudes de estado desde el cliente
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
  
  // Detener cualquier scan en progreso
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

// Manejar errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});

module.exports = app;
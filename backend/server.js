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
  
  arduinoPort.write(command + '\n', (err) => {
    if (err) {
      console.error('Error al enviar comando:', err);
      processingCommand = false;
      processCommandQueue();
    }
  });
  
  // Timeout para comandos
  setTimeout(() => {
    if (processingCommand) {
      console.log('Timeout en comando, continuando...');
      processingCommand = false;
      processCommandQueue();
    }
  }, 15000); // 15 segundos timeout
}

// Función para inicializar la conexión con Arduino
function initArduinoConnection() {
  // Obtener el puerto configurado
  const portPath = process.env.ARDUINO_PORT;
  
  if (!portPath) {
    console.error('No se ha configurado un puerto serial. Verifique la variable ARDUINO_PORT en el archivo .env');
    return;
  }

  try {
    console.log(`Intentando conectar con Arduino en puerto ${portPath}...`);
    
    // Creación de la instancia de SerialPort
    arduinoPort = new SerialPort({
      path: portPath,
      baudRate: 9600,
      autoOpen: true
    });
    
    // Crear el parser
    arduinoParser = new ReadlineParser({ delimiter: '\n' });
    arduinoPort.pipe(arduinoParser);

    // Evento cuando se abre la conexión
    arduinoPort.on('open', () => {
      console.log(`Conexión establecida con Arduino en ${portPath}`);
      global.arduinoConectado = true;
      arduinoReady = false; // Esperar a que el Arduino esté listo
      
      // Timeout de seguridad para marcar Arduino como listo
      setTimeout(() => {
        if (!arduinoReady) {
          arduinoReady = true;
          console.log('Arduino marcado como listo (timeout de seguridad)');
          processCommandQueue();
        }
      }, 5000); // 5 segundos de timeout
      
      // Emitir evento de conexión a todos los clientes
      if (global.io) {
        global.io.emit('arduino-status', { connected: true, ready: arduinoReady });
      }
    });

    // Evento de error
    arduinoPort.on('error', (err) => {
      console.error('Error en la conexión con Arduino:', err.message);
      global.arduinoConectado = false;
      arduinoReady = false;
      
      // Emitir evento de error a todos los clientes
      if (global.io) {
        global.io.emit('arduino-status', { connected: false, ready: false });
      }
    });

    // Evento cuando se cierra la conexión
    arduinoPort.on('close', () => {
      console.log('Conexión con Arduino cerrada');
      global.arduinoConectado = false;
      arduinoReady = false;
      
      // Limpiar cola de comandos
      commandQueue = [];
      processingCommand = false;
      
      // Emitir evento de desconexión a todos los clientes
      if (global.io) {
        global.io.emit('arduino-status', { connected: false, ready: false });
      }
    });

    // Procesar datos recibidos desde Arduino
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
          console.log('Arduino está listo para recibir comandos');
          
          // Emitir actualización de estado
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
      
      // Procesar respuestas de comandos
      if (cleanData.startsWith('ID#')) {
        const fingerprintId = parseInt(cleanData.substring(3));
        console.log(`Huella detectada con ID: ${fingerprintId}`);
        if (global.io) {
          global.io.emit('fingerprint-scan', { id: fingerprintId });
        }
        processingCommand = false;
        processCommandQueue();
      }
      
      // Respuestas de éxito
      if (cleanData.startsWith('SUCCESS:')) {
        console.log('Comando ejecutado exitosamente:', cleanData);
        processingCommand = false;
        processCommandQueue();
      }
      
      // Respuestas de error
      if (cleanData.startsWith('ERROR:') || cleanData === 'ERR') {
        console.error('Error del Arduino:', cleanData);
        processingCommand = false;
        processCommandQueue();
      }
      
      // Respuesta de conteo
      if (cleanData.startsWith('COUNT:')) {
        const countMatch = cleanData.match(/COUNT:\s*(\d+)/);
        if (countMatch) {
          const count = parseInt(countMatch[1]);
          console.log(`Arduino reporta ${count} huellas almacenadas`);
        }
        processingCommand = false;
        processCommandQueue();
      }
      
      // Otras respuestas que indican fin de comando
      if (cleanData.startsWith('DEL:') || 
          cleanData === 'RESET: OK' ||
          cleanData.includes('BD limpia') ||
          cleanData.startsWith('STATUS:')) {
        processingCommand = false;
        processCommandQueue();
      }
    });
    
  } catch (error) {
    console.error('Error al inicializar Arduino:', error.message);
  }
}

// Ruta para enviar comandos a Arduino
app.post('/api/arduino/command', (req, res) => {
    const { command } = req.body;
    
    console.log(`Recibido comando para Arduino: "${command}"`);
    
    // Verificar si el puerto está definido y abierto
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
        queueLength: commandQueue.length
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
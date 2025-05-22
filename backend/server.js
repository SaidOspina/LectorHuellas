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

// Configuración del puerto serial para Arduino
let arduinoPort;
let arduinoParser;

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
    
    // Creación de la instancia de SerialPort para versiones 10+
    arduinoPort = new SerialPort({
      path: portPath,
      baudRate: 9600,
      autoOpen: true
    });
    
    // Crear el parser
    arduinoParser = new ReadlineParser({ delimiter: '\n' });
    arduinoPort.pipe(arduinoParser);

// En server.js, después de establecer la conexión con el Arduino:
arduinoPort.on('open', () => {
  console.log(`Conexión establecida con Arduino en ${portPath}`);
  global.arduinoConectado = true;
  
  // Emitir evento de conexión a todos los clientes
  if (global.io) {
    global.io.emit('arduino-status', { connected: true });
  }
});

  arduinoPort.on('error', (err) => {
    console.error('Error en la conexión con Arduino:', err.message);
    global.arduinoConectado = false;
    
    // Emitir evento de error a todos los clientes
    if (global.io) {
      global.io.emit('arduino-status', { connected: false });
    }
  });

  arduinoPort.on('close', () => {
    console.log('Conexión con Arduino cerrada');
    global.arduinoConectado = false;
    
    // Emitir evento de desconexión a todos los clientes
    if (global.io) {
      global.io.emit('arduino-status', { connected: false });
    }
  });

    // Procesar datos recibidos desde Arduino
    arduinoParser.on('data', (data) => {
      console.log(`Datos recibidos de Arduino: ${data}`);
      
      // Procesar datos de huellas dactilares aquí
      if (data.startsWith('ID#')) {
        const fingerprintId = parseInt(data.substring(3));
        global.io.emit('fingerprint-scan', { id: fingerprintId });
      }
    });
  } catch (error) {
    console.error('Error al inicializar Arduino:', error.message);
  }
}

// Ruta para enviar comandos a Arduino
// Ruta para enviar comandos a Arduino
app.post('/api/arduino/command', (req, res) => {
    const { command } = req.body;
    
    // Agregar más logs para depuración
    console.log(`Recibido comando para Arduino: "${command}"`);
    
    // Verificar si el puerto está definido y abierto
    if (!arduinoPort || !arduinoPort.isOpen) {
        console.log('Error: Arduino no está conectado');
        global.io.emit('arduino-status', { connected: false });
        return res.status(500).json({ error: 'Arduino no está conectado' });
    }
    
    try {
        // MODIFICACIÓN: Asegurarnos de enviar el comando con formato correcto
        // Añadir nueva línea al final si no la tiene
        const formattedCommand = command.endsWith('\n') ? command : command + '\n';
        
        console.log(`Enviando comando al Arduino: "${formattedCommand.trim()}"`);
        
        arduinoPort.write(formattedCommand, (err) => {
            if (err) {
                console.error('Error al enviar comando a Arduino:', err);
                return res.status(500).json({ error: 'Error al enviar comando a Arduino' });
            }
            
            console.log('Comando enviado correctamente al Arduino');
            res.json({ success: true, message: 'Comando enviado' });
        });
    } catch (error) {
        console.error('Error al procesar comando para Arduino:', error);
        res.status(500).json({ error: error.message });
    }
});
// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});


app.get('/api/arduino/status', (req, res) => {
  // Verificar si el puerto está definido y abierto
  const isConnected = arduinoPort && arduinoPort.isOpen;
  
  res.json({ connected: isConnected });
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  initArduinoConnection();
});

// Configurar Socket.io para comunicación en tiempo real
const io = require('socket.io')(server);
global.io = io;

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Manejar cierre de servidor
process.on('SIGINT', () => {
  if (arduinoPort && arduinoPort.isOpen) {
    arduinoPort.close();
  }
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
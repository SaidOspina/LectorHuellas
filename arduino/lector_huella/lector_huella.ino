#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// Configuración de pines
#define FINGERPRINT_RX 2
#define FINGERPRINT_TX 3
#define LED_PIN 12

// Configuración de comunicación serial para el sensor
SoftwareSerial fingerSerial(FINGERPRINT_RX, FINGERPRINT_TX);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

void setup() {
  // Inicializar comunicación serial con el PC
  Serial.begin(9600);
  while (!Serial);
  
  // Configurar LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Inicializar sensor de huella
  finger.begin(57600);
  
  if (finger.verifyPassword()) {
    Serial.println("Sensor de huella encontrado!");
  } else {
    Serial.println("No se encontró el sensor de huella :(");
    while (1) { 
      digitalWrite(LED_PIN, HIGH);
      delay(500);
      digitalWrite(LED_PIN, LOW);
      delay(500);
    }
  }
  
  // Obtener parámetros del sensor
  Serial.println("Leyendo parámetros del sensor...");
  finger.getParameters();
  Serial.print("Estado: "); Serial.println(finger.status_reg, HEX);
  Serial.print("ID del sistema: "); Serial.println(finger.system_id, HEX);
  Serial.print("Capacidad: "); Serial.println(finger.capacity);
  Serial.print("Nivel de seguridad: "); Serial.println(finger.security_level);
  Serial.print("Dirección del dispositivo: "); Serial.println(finger.device_addr, HEX);
  Serial.print("Velocidad de paquete: "); Serial.println(finger.packet_len);
  
  // Configurar sensor para modo de espera
  finger.getTemplateCount();
  Serial.print("Sensor contiene "); Serial.print(finger.templateCount); Serial.println(" plantillas");
}

void loop() {
  // Esperar comandos desde el Serial
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "scan") {
      int fingerID = getFingerprintID();
      if (fingerID >= 0) {
        Serial.print("ID#");
        Serial.println(fingerID);
        blinkLED(1, 200); // Blink una vez si se reconoció la huella
      } else {
        Serial.println("Error en la lectura o huella no encontrada");
        blinkLED(3, 200); // Blink tres veces si hay error
      }
    } 
    else if (command.startsWith("enroll:")) {
      int id = command.substring(7).toInt();
      if (id > 0) {
        enrollFingerprint(id);
      } else {
        Serial.println("ID inválido");
      }
    }
    else if (command.startsWith("delete:")) {
      int id = command.substring(7).toInt();
      if (id > 0) {
        deleteFingerprint(id);
      } else {
        Serial.println("ID inválido");
      }
    }
    else if (command == "count") {
      finger.getTemplateCount();
      Serial.print("Sensor contiene "); 
      Serial.print(finger.templateCount); 
      Serial.println(" plantillas");
    }
  }
}

// Obtener ID de huella
int getFingerprintID() {
  digitalWrite(LED_PIN, HIGH);
  int p = finger.getImage();
  
  if (p != FINGERPRINT_OK) {
    digitalWrite(LED_PIN, LOW);
    return -1;
  }

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    digitalWrite(LED_PIN, LOW);
    return -1;
  }

  p = finger.fingerFastSearch();
  digitalWrite(LED_PIN, LOW);
  
  if (p != FINGERPRINT_OK) {
    return -1;
  }
  
  return finger.fingerID;
}

// Registrar nueva huella
uint8_t enrollFingerprint(uint8_t id) {
  Serial.println("Esperando huella válida para registrar...");
  
  while (true) {
    digitalWrite(LED_PIN, HIGH);
    int p = finger.getImage();
    
    if (p == FINGERPRINT_OK) {
      digitalWrite(LED_PIN, LOW);
      break;
    }
    
    switch (p) {
      case FINGERPRINT_NOFINGER:
        Serial.println(".");
        break;
      default:
        Serial.println("Error en la imagen");
        break;
    }
    delay(100);
  }
  
  // OK success!
  int p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("Error en la conversión");
    return p;
  }
  
  Serial.println("Levante el dedo");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
  }
  
  Serial.println("Vuelva a colocar el mismo dedo");
  
  p = -1;
  while (p != FINGERPRINT_OK) {
    digitalWrite(LED_PIN, HIGH);
    p = finger.getImage();
    
    if (p == FINGERPRINT_OK) {
      digitalWrite(LED_PIN, LOW);
      break;
    }
    delay(100);
  }
  
  // OK success!
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("Error en la conversión");
    return p;
  }
  
  // OK converted!
  Serial.print("Creando modelo para #");
  Serial.println(id);
  
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println("Error al crear el modelo");
    return p;
  }
  
  p = finger.storeModel(id);
  if (p != FINGERPRINT_OK) {
    Serial.println("Error al guardar el modelo");
    return p;
  }
  
  Serial.print("Huella guardada con ID #");
  Serial.println(id);
  blinkLED(2, 200); // Blink 2 veces para confirmar registro
  return true;
}

// Eliminar una huella
uint8_t deleteFingerprint(uint8_t id) {
  uint8_t p = finger.deleteModel(id);

  if (p == FINGERPRINT_OK) {
    Serial.print("ID #"); Serial.print(id); Serial.println(" eliminado!");
    blinkLED(2, 200); // Blink 2 veces para confirmar eliminación
    return true;
  } else {
    Serial.print("Error al eliminar ID #"); Serial.println(id);
    blinkLED(3, 200); // Blink 3 veces para error
    return p;
  }
}

// Función para hacer parpadear el LED
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}
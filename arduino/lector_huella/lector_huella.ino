#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// Configuración de pines
#define FINGERPRINT_RX 2
#define FINGERPRINT_TX 3
#define LED_PIN 12

// Configuración de comunicación serial para el sensor
SoftwareSerial fingerSerial(FINGERPRINT_RX, FINGERPRINT_TX);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

// Variables globales optimizadas
bool sensorOK = false;
bool ready = false;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
  
  Serial.println(F("Iniciando..."));
  initSensor();
  
  if (sensorOK) {
    Serial.println(F("Sistema listo"));
    ready = true;
    blinkLED(3, 200);
  } else {
    Serial.println(F("Sin sensor - modo prueba"));
    ready = true;
  }
  
  // Enviar mensaje final para que el servidor sepa que está listo
  Serial.println(F("READY"));
}

void initSensor() {
  // Probar baudrates comunes
  uint32_t rates[] = {57600, 9600, 19200};
  
  for (int i = 0; i < 3; i++) {
    finger.begin(rates[i]);
    delay(500);
    
    if (finger.verifyPassword()) {
      sensorOK = true;
      finger.getTemplateCount();
      Serial.print(F("Conectado: "));
      Serial.print(finger.templateCount);
      Serial.println(F(" huellas"));
      return;
    }
  }
  sensorOK = false;
}

void loop() {
  if (!ready) return;
  
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    
    if (cmd.length() == 0) return;
    
    if (cmd == "scan") {
      doScan();
    } 
    else if (cmd.startsWith("enroll:")) {
      int id = cmd.substring(7).toInt();
      doEnroll(id);
    }
    else if (cmd.startsWith("delete:")) {
      int id = cmd.substring(7).toInt();
      doDelete(id);
    }
    else if (cmd == "count") {
      doCount();
    }
    else if (cmd == "empty") {
      doEmpty();
    }
    else if (cmd == "status") {
      doStatus();
    }
    else if (cmd == "reset") {
      doReset();
    }
    else {
      Serial.println(F("ERROR: Comando invalido"));
    }
  }
}

void doScan() {
  if (!sensorOK) {
    Serial.println(F("ERROR: Sin sensor"));
    return;
  }
  
  digitalWrite(LED_PIN, HIGH);
  int id = getFingerprintID();
  digitalWrite(LED_PIN, LOW);
  
  if (id >= 0) {
    Serial.print(F("ID#"));
    Serial.println(id);
    blinkLED(1, 200);
  } else {
    Serial.println(F("ERROR: No leido"));
    blinkLED(3, 200);
  }
}

void doEnroll(int id) {
  if (!sensorOK) {
    Serial.println(F("ERROR: Sin sensor"));
    return;
  }
  
  if (id <= 0 || id > 127) {
    Serial.println(F("ERROR: ID 1-127"));
    return;
  }
  
  Serial.print(F("Registrando ID "));
  Serial.println(id);
  
  if (enrollFinger(id) == FINGERPRINT_OK) {
    Serial.print(F("SUCCESS: ID "));
    Serial.println(id);
    blinkLED(2, 300);
  } else {
    Serial.println(F("ERROR: Fallo registro"));
    blinkLED(5, 100);
  }
}

void doDelete(int id) {
  if (!sensorOK) {
    Serial.println(F("ERROR: Sin sensor"));
    return;
  }
  
  if (finger.deleteModel(id) == FINGERPRINT_OK) {
    Serial.print(F("SUCCESS: Eliminado "));
    Serial.println(id);
    blinkLED(2, 200);
  } else {
    Serial.println(F("ERROR: No eliminado"));
  }
}

void doCount() {
  if (!sensorOK) {
    Serial.println(F("COUNT: 0"));
    return;
  }
  
  finger.getTemplateCount();
  Serial.print(F("COUNT: "));
  Serial.println(finger.templateCount);
}

void doEmpty() {
  if (!sensorOK) {
    Serial.println(F("ERROR: Sin sensor"));
    return;
  }
  
  if (finger.emptyDatabase() == FINGERPRINT_OK) {
    Serial.println(F("SUCCESS: BD limpia"));
  } else {
    Serial.println(F("ERROR: No limpiado"));
  }
}

void doStatus() {
  Serial.print(F("STATUS: "));
  Serial.println(sensorOK ? F("OK") : F("SIN_SENSOR"));
}

void doReset() {
  sensorOK = false;
  ready = false;
  delay(500);
  initSensor();
  ready = true;
  Serial.println(F("RESET: OK"));
}

int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  
  if (p == FINGERPRINT_OK) {
    return finger.fingerID;
  }
  return -1;
}

uint8_t enrollFinger(uint8_t id) {
  uint8_t p = -1;
  
  Serial.println(F("Coloque dedo..."));
  
  // Primera imagen
  unsigned long start = millis();
  while (p != FINGERPRINT_OK && (millis() - start) < 10000) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      delay(200);
    } else if (p != FINGERPRINT_OK) {
      return p;
    }
  }
  
  if (p != FINGERPRINT_OK) return FINGERPRINT_TIMEOUT;

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) return p;

  Serial.println(F("Retire dedo"));
  delay(2000);
  
  while (finger.getImage() != FINGERPRINT_NOFINGER);

  Serial.println(F("Mismo dedo otra vez..."));
  
  // Segunda imagen
  p = -1;
  start = millis();
  while (p != FINGERPRINT_OK && (millis() - start) < 10000) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      delay(200);
    } else if (p != FINGERPRINT_OK) {
      return p;
    }
  }
  
  if (p != FINGERPRINT_OK) return FINGERPRINT_TIMEOUT;

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) return p;

  p = finger.createModel();
  if (p != FINGERPRINT_OK) return p;

  return finger.storeModel(id);
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}
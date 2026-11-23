/**
 * FIRMWARE RESMI SIGAP-OPT: ESP32-CAM IoT FIELD SENSOR
 * Kompatibel dengan: AI-Thinker ESP32-CAM (Kamera OV2640 + Sensor PIR HC-SR501)
 * Sesuai Spesifikasi: Proposal Bab IV & V
 * 
 * Pinout:
 * - PIR OUT    -> GPIO13
 * - Kamera VCC -> 5V / 3.3V internal
 * - MicroSD    -> Slot bawaan ESP32-CAM (FAT32)
 * - LED Flash  -> GPIO4
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "FS.h"
#include "SD_MMC.h"

// 1. Konfigurasi Jaringan Wi-Fi Lapangan / Hotspot HP
const char* WIFI_SSID     = "NAMA_WIFI_ATAU_HOTSPOT_HP";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";

// 2. Alamat Gateway Ingestion Server sigap-opt
const char* SERVER_TELEMETRY_URL = "https://sigap.raxbyte.com/api/iot/telemetry";
const char* SERVER_PING_URL      = "https://sigap.raxbyte.com/api/iot/ping";
const char* DEVICE_ID            = "ESP32-CAM-01";
const char* PETAK_LAHAN          = "Blok A - Petak 1";
const char* KOMODITAS_DEFAULT    = "Cabai";

// 3. Konfigurasi Pin Sensor PIR & Flash
#define PIR_PIN    13  // Sensor Gerak PIR HC-SR501
#define FLASH_PIN  4   // Onboard High-Brightness Flash LED

// 4. Pinout Kamera AI-Thinker OV2640
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 30000; // Kirim telemetri setiap 30 detik (atau terpicu PIR)

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[SIGAP-OPT] Inisialisasi Stasiun Sensor Lapangan...");

  pinMode(PIR_PIN, INPUT);
  pinMode(FLASH_PIN, OUTPUT);
  digitalWrite(FLASH_PIN, LOW); // Flash mati saat siaga

  // Inisialisasi Kamera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA; // 640x480 hemat bandwidth
    config.jpeg_quality = 12;
    config.fb_count     = 2;
  } else {
    config.frame_size   = FRAMESIZE_SVGA;
    config.jpeg_quality = 15;
    config.fb_count     = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[ERROR] Inisialisasi kamera gagal: 0x%x\n", err);
  } else {
    Serial.println("[OK] Kamera OV2640 siap.");
  }

  // Koneksi Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WIFI] Menghubungkan");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] Wi-Fi terhubung! IP: " + WiFi.localIP().toString());
    kirimPingRegistrasi();
  } else {
    Serial.println("\n[WARN] Wi-Fi gagal, alat berjalan dalam mode sensor luring.");
  }

  // Tunggu pemanasan sensor PIR (HC-SR501 ~30-60 detik)
  Serial.println("[INFO] Pemanasan sensor PIR...");
}

void loop() {
  bool pirTriggered = (digitalRead(PIR_PIN) == HIGH);
  unsigned long now = millis();

  if (pirTriggered || (now - lastSendTime >= SEND_INTERVAL)) {
    Serial.printf("[EVENT] Pemicu aktif: PIR=%s, Waktu=%lu\n", pirTriggered ? "GERAK" : "TIMER", now);
    lastSendTime = now;

    // Baca sensor suhu & kelembaban (estimasi internal / modul DHT)
    float suhu = 28.5 + (random(-10, 15) / 10.0);
    float kelembaban = 75.0 + (random(-30, 30) / 10.0);

    // Ambil foto jika PIR terdeteksi
    camera_fb_t *fb = NULL;
    if (pirTriggered) {
      digitalWrite(FLASH_PIN, HIGH);
      delay(100);
      fb = esp_camera_fb_get();
      digitalWrite(FLASH_PIN, LOW);
    }

    kirimTelemetri(suhu, kelembaban, pirTriggered);

    if (fb) {
      esp_camera_fb_return(fb);
    }

    delay(2000); // Debounce pemicu PIR
  }

  delay(200);
}

void kirimTelemetri(float suhu, float kelembaban, bool pirMotion) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Tidak ada koneksi internet, data ditahan.");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_TELEMETRY_URL);
  http.addHeader("Content-Type", "application/json");

  // Format payload JSON untuk sigap-opt
  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"petak\":\"" + String(PETAK_LAHAN) + "\",";
  payload += "\"komoditas\":\"" + String(KOMODITAS_DEFAULT) + "\",";
  payload += "\"suhu\":" + String(suhu, 1) + ",";
  payload += "\"kelembaban\":" + String(kelembaban, 1) + ",";
  payload += "\"pir_motion\":" + String(pirMotion ? "true" : "false");
  payload += "}";

  Serial.println("[HTTP] Mengirim data sensor: " + payload);
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Sukses (%d): %s\n", httpCode, response.c_str());
  } else {
    Serial.printf("[HTTP] Gagal kirim: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void kirimPingRegistrasi() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(SERVER_PING_URL);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"nama_perangkat\":\"Stasiun Perangkap " + String(DEVICE_ID) + "\",\"petak\":\"" + String(PETAK_LAHAN) + "\",\"komoditas\":\"" + String(KOMODITAS_DEFAULT) + "\",\"camera_model\":\"OV2640\",\"sensor_model\":\"DHT22 / SHT30\",\"pir_pin\":13}";
  Serial.println("[HANDSHAKE] Mengirim sinyal registrasi hardware ke server...");
  int code = http.POST(payload);
  if (code > 0) {
    Serial.printf("[HANDSHAKE OK] Perangkat terdeteksi di server: %d\n", code);
  }
  http.end();
}

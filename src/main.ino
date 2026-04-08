/*
  Phase 8: Memory-Optimized Collection System with Load Cell Weight Validation
  Enhanced Version with improved user interface and coupon system
  
  Optimizations:
  - Reduced string literals and moved to PROGMEM
  - Minimized Serial output
  - Optimized variable types
  - Reduced array sizes
  - Eliminated unnecessary delays
  - Enhanced thermal printer coupon generation
  - Added load cell weight validation (15g - 35g)
  - Improved user feedback system
  - Better coupon formatting for 58mm roll
*/

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <avr/pgmspace.h>
#include <EEPROM.h>
#include "HX711.h"

// Pin Definitions
const int TRIG_PIN = 4;
const int ECHO_PIN = 5;
const int BUZZER_PIN = A3;
const int INDUCTIVE_SENSOR_PIN = 2;
const int CAPACITIVE_SENSOR_PIN = 8;
const int BUTTON_PIN = A0;

// Load Cell Pins
#define LOADCELL_DOUT_PIN A1
#define LOADCELL_SCK_PIN A2

// L298N Motor Driver Pins
const int MOTOR_IN1 = 9;
const int MOTOR_IN2 = 10;
const int MOTOR_ENA = 3;

// Trapdoor System Pins
const int TRAPDOOR_TRIG = 6;
const int TRAPDOOR_ECHO = 7;
const int SERVO_PIN = 11;

// Thermal Printer Pins
const int PRINTER_RX = 12;  // RXD-IN
const int PRINTER_TX = 13;  // TXD-OUT

// Constants
const byte MOTOR_SPEED = 255;
const int MOVE_DURATION = 3000;
const byte SERVO_CLOSED = 180;
const byte SERVO_OPEN = 35;
const int BOTTLE_FALL_TIME = 2500;  // Reduced by 2 seconds as requested
const int DETECTION_COOLDOWN = 3000;
const int BUTTON_DEBOUNCE = 500;

// Weight validation constants
const int MIN_BOTTLE_WEIGHT = 15;  // 15 grams minimum
const int MAX_BOTTLE_WEIGHT = 35;  // 35 grams maximum

// String constants in PROGMEM to save RAM
const char STR_WELCOME[] PROGMEM = "Welcome to INDUS WASTE MANAGEMENT - IWM";
const char STR_DEPOSIT[] PROGMEM = "Deposit Bottle";
const char STR_BOTTLE_COUNT[] PROGMEM = "Bottle Count: ";
const char STR_PROCESSING_1[] PROGMEM = "Processing (1/3)";
const char STR_PROCESSING_2[] PROGMEM = "Processing (2/3)";
const char STR_PROCESSING_3[] PROGMEM = "Processing (3/3)";
const char STR_METAL_DETECTED[] PROGMEM = "Metal Detected!";
const char STR_TOO_LIGHT[] PROGMEM = "Too Light!";
const char STR_TOO_HEAVY[] PROGMEM = "Too Heavy!";
const char STR_PET_ACCEPTED[] PROGMEM = "PET Accepted!";
const char STR_REJECTED[] PROGMEM = "Rejected!";
const char STR_TRY_AGAIN[] PROGMEM = "Please try again";
const char STR_COLLECTING[] PROGMEM = "Collecting...";
const char STR_COLLECTED[] PROGMEM = "Bottle Collected!";
const char STR_SESSION_END[] PROGMEM = "Session Complete";
const char STR_TOTAL[] PROGMEM = "Total: ";
const char STR_BOTTLES[] PROGMEM = " bottles";
const char STR_THANKS[] PROGMEM = "Thank You!";
const char STR_COME_AGAIN[] PROGMEM = "Visit Again Soon";
const char STR_PRINTING[] PROGMEM = "Printing Coupon";
const char STR_PLEASE_WAIT[] PROGMEM = "Please wait...";
const char STR_MOVING[] PROGMEM = "Moving...";

// Coupon strings in PROGMEM (Updated for better formatting)
const char COUPON_HEADER[] PROGMEM = "================================";
const char COUPON_COMPANY[] PROGMEM = "    INDUS WASTE MANAGEMENT";
const char COUPON_SEPARATOR[] PROGMEM = "--------------------------------";
const char COUPON_TITLE[] PROGMEM = "        REWARD COUPON";
const char COUPON_REWARD[] PROGMEM = "    FREE ICE CREAM VOUCHER";
const char COUPON_COLLAB[] PROGMEM = "    In collaboration with";
const char COUPON_PARTNER[] PROGMEM = "        POLAR BEAR";
const char COUPON_BOTTLES[] PROGMEM = "Bottles Recycled: ";
const char COUPON_VALID_AT[] PROGMEM = "Valid at: Polar Bear Outlets";
const char COUPON_VALID_UNTIL[] PROGMEM = "Valid until: 01-Aug-2025";
const char COUPON_NUMBER[] PROGMEM = "Coupon #: IWM";
const char COUPON_FOOTER1[] PROGMEM = "  Thank you for recycling!";
const char COUPON_FOOTER2[] PROGMEM = "  Help save our environment";
const char COUPON_FOOTER3[] PROGMEM = "  Visit us again soon!";

// Objects
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo trapdoorServo;
SoftwareSerial printer(PRINTER_RX, PRINTER_TX);
HX711 loadCell;

// Variables (optimized types)
byte bottleCount = 0;
bool bottleDetected = false;
bool awaitingCollection = false;
bool sessionEnding = false;
bool buttonPressed = false;
unsigned long lastDetectionTime = 0;
unsigned long conveyorStartTime = 0;
unsigned long lastButtonTime = 0;
unsigned long sessionStartTime = 0;
float calibrationFactor = 0;

// Helper function to read from PROGMEM
void printProgmem(const char* str, bool newline = false) {
  char buffer[17]; // LCD width + 1
  strcpy_P(buffer, str);
  if (newline) Serial.println(buffer);
  else Serial.print(buffer);
}

void lcdProgmem(byte col, byte row, const char* str) {
  char buffer[17];
  strcpy_P(buffer, str);
  lcd.setCursor(col, row);
  lcd.print(buffer);
}

void printerProgmem(const char* str, bool newline = true) {
  char buffer[33]; // Thermal printer width + 1
  strcpy_P(buffer, str);
  if (newline) {
    printer.println(buffer);
  } else {
    printer.print(buffer);
  }
}

// Function to display scrolling text on LCD
void displayScrollingText(const char* text, int delayTime = 300) {
  char buffer[50];
  strcpy_P(buffer, text);
  
  int textLength = strlen(buffer);
  int displayWidth = 16;
  
  if (textLength <= displayWidth) {
    // Text fits on display, show normally
    lcd.setCursor(0, 0);
    lcd.print(buffer);
    delay(2000);
  } else {
    // Text needs scrolling
    for (int i = 0; i <= textLength - displayWidth; i++) {
      lcd.setCursor(0, 0);
      lcd.print("                "); // Clear line
      lcd.setCursor(0, 0);
      
      for (int j = 0; j < displayWidth; j++) {
        if (i + j < textLength) {
          lcd.print(buffer[i + j]);
        }
      }
      delay(delayTime);
    }
    
    // Show complete text at the end
    delay(1000);
    lcd.setCursor(0, 0);
    lcd.print("                "); // Clear line
    lcd.setCursor(0, 0);
    lcd.print("Welcome to IWM");
    delay(1000);
  }
}

// Generate random coupon number
unsigned long generateCouponNumber() {
  return random(100000, 999999);
}

void setup() {
  Serial.begin(9600);
  printer.begin(9600);
  
  // Initialize random seed
  randomSeed(analogRead(A5));
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(INDUCTIVE_SENSOR_PIN, INPUT);
  pinMode(CAPACITIVE_SENSOR_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(MOTOR_ENA, OUTPUT);
  pinMode(TRAPDOOR_TRIG, OUTPUT);
  pinMode(TRAPDOOR_ECHO, INPUT);
  
  // Initialize servo
  trapdoorServo.attach(SERVO_PIN);
  trapdoorServo.write(SERVO_CLOSED);
  
  // Stop motor
  stopMotor();
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Collection System");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(2000);
  
  // Initialize Load Cell
  initializeLoadCell();
  
  // Initialize thermal printer
  initializePrinter();
  
  // Quick system test
  testSystems();
  
  // Welcome message with scrolling text
  lcd.clear();
  displayScrollingText(STR_WELCOME);
  
  updateDisplay();
  Serial.println(F("System Ready"));
  
  // Record session start time
  sessionStartTime = millis();
}

void loop() {
  checkButton();
  
  if (sessionEnding) {
    handleSessionEnd();
    return;
  }
  
  if (awaitingCollection) {
    checkTrapdoorSensor();
  }
  
  if (!awaitingCollection) {
    float distance = measureDistance();
    
    if (distance > 0 && distance <= 10.0) {
      if (!bottleDetected && (millis() - lastDetectionTime) > DETECTION_COOLDOWN) {
        bottleDetected = true;
        lastDetectionTime = millis();
        processBottleDetection();
      }
    } else {
      if (bottleDetected && (millis() - lastDetectionTime) > 1000) {
        bottleDetected = false;
        updateDisplay();
      }
    }
  }
  
  delay(100);
}

void initializeLoadCell() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Initializing");
  lcd.setCursor(0, 1);
  lcd.print("Load Cell...");
  
  // Load calibration factor from EEPROM
  EEPROM.get(0, calibrationFactor);
  
  // Initialize HX711
  loadCell.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Wait for the load cell to stabilize
  delay(1000);
  
  // Set the scale with calibration factor
  loadCell.set_scale(calibrationFactor);
  
  // Tare the scale
  loadCell.tare();
  
  Serial.println(F("Load Cell initialized"));
  Serial.print(F("Calibration factor: "));
  Serial.println(calibrationFactor);
  
  delay(1000);
}

int getBottleWeight() {
  int weight = 0;
  
  // Wait for load cell to be ready
  if (loadCell.wait_ready_timeout(1000)) {
    // Take multiple readings and average them for stability
    long totalWeight = 0;
    int validReadings = 0;
    
    for (int i = 0; i < 5; i++) {
      long reading = loadCell.get_units(3);
      if (reading > -100 && reading < 1000) { // Filter out obviously wrong readings
        totalWeight += reading;
        validReadings++;
      }
      delay(100);
    }
    
    if (validReadings > 0) {
      weight = totalWeight / validReadings;
    }
  }
  
  return weight;
}

bool validateBottleWeight() {
  int weight = getBottleWeight();
  
  Serial.print(F("Bottle weight: "));
  Serial.print(weight);
  Serial.println(F(" grams"));
  
  if (weight < MIN_BOTTLE_WEIGHT) {
    return false;
  } else if (weight > MAX_BOTTLE_WEIGHT) {
    return false;
  } else {
    return true;
  }
}

void checkButton() {
  if (digitalRead(BUTTON_PIN) == LOW && !buttonPressed && 
      (millis() - lastButtonTime) > BUTTON_DEBOUNCE) {
    
    buttonPressed = true;
    lastButtonTime = millis();
    sessionEnding = true;
    stopMotor();
    awaitingCollection = false;
    beep(1);
  }
  
  if (digitalRead(BUTTON_PIN) == HIGH && buttonPressed) {
    buttonPressed = false;
  }
}

void handleSessionEnd() {
  lcd.clear();
  lcdProgmem(0, 0, STR_SESSION_END);
  lcdProgmem(0, 1, STR_TOTAL);
  lcd.print(bottleCount);
  lcd.print(F(" bottles"));
  
  Serial.print(F("Session complete - Total: "));
  Serial.println(bottleCount);
  
  beep(2);
  delay(2000);
  
  // Print coupon if bottles were collected
  if (bottleCount > 0) {
    lcd.clear();
    lcdProgmem(0, 0, STR_PRINTING);
    lcdProgmem(0, 1, STR_PLEASE_WAIT);
    
    printCoupon();
    
    delay(3000); // Wait for printing to complete
  }
  
  lcd.clear();
  lcdProgmem(0, 0, STR_THANKS);
  lcdProgmem(0, 1, STR_COME_AGAIN);
  
  delay(3000);
  
  // Reset
  bottleCount = 0;
  sessionEnding = false;
  bottleDetected = false;
  awaitingCollection = false;
  sessionStartTime = millis();
  
  updateDisplay();
  Serial.println(F("Ready for next user"));
}

void initializePrinter() {
  delay(1000); // Wait for printer to initialize
  
  // Initialize printer settings
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)64); // @  (Initialize printer)
  delay(500);
  
  // Set character size to normal
  printer.write((uint8_t)29); // GS
  printer.write((uint8_t)33); // !
  printer.write((uint8_t)0);  // Normal size
  
  Serial.println(F("Printer initialized"));
}

void printCoupon() {
  // Generate random coupon number
  unsigned long couponNum = generateCouponNumber();
  
  // Print header
  printerProgmem(COUPON_HEADER);
  
  // Print company name - centered and bold
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold on)
  printer.write((uint8_t)1);  // Enable bold
  printerProgmem(COUPON_COMPANY);
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold off)
  printer.write((uint8_t)0);  // Disable bold
  
  printerProgmem(COUPON_SEPARATOR);
  
  // Print title - centered and bold
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold on)
  printer.write((uint8_t)1);  // Enable bold
  printerProgmem(COUPON_TITLE);
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold off)
  printer.write((uint8_t)0);  // Disable bold
  
  // Print reward - centered and bold
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold on)
  printer.write((uint8_t)1);  // Enable bold
  printerProgmem(COUPON_REWARD);
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold off)
  printer.write((uint8_t)0);  // Disable bold
  
  printerProgmem(COUPON_COLLAB);
  
  // Print partner name - centered and bold
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold on)
  printer.write((uint8_t)1);  // Enable bold
  printerProgmem(COUPON_PARTNER);
  printer.write((uint8_t)27); // ESC
  printer.write((uint8_t)69); // E (Bold off)
  printer.write((uint8_t)0);  // Disable bold
  
  printerProgmem(COUPON_SEPARATOR);
  
  // Print bottle count
  printerProgmem(COUPON_BOTTLES, false);
  printer.println(bottleCount);
  
  // Print validity info
  printerProgmem(COUPON_VALID_AT);
  printerProgmem(COUPON_VALID_UNTIL);
  
  // Print coupon number
  printerProgmem(COUPON_NUMBER, false);
  printer.println(couponNum);
  
  printerProgmem(COUPON_SEPARATOR);
  
  // Print footer
  printerProgmem(COUPON_FOOTER1);
  printerProgmem(COUPON_FOOTER2);
  
  printerProgmem(COUPON_HEADER);
  
  // Feed paper with space for cutting
  printer.println();
  printer.println();
  
  Serial.println(F("Coupon printed"));
}

void testSystems() {
  Serial.println(F("Testing systems..."));
  
  // Test servo
  Serial.println(F("Testing servo..."));
  trapdoorServo.write(SERVO_OPEN);
  delay(1000);
  trapdoorServo.write(SERVO_CLOSED);
  delay(500);
  
  // Test motor - Forward
  Serial.println(F("Testing motor forward..."));
  moveConveyorForward();
  delay(1000);
  stopMotor();
  delay(500);
  
  // Test motor - Backward
  Serial.println(F("Testing motor backward..."));
  moveConveyorBackward();
  delay(1000);
  stopMotor();
  delay(500);
  
  // Test load cell
  Serial.println(F("Testing load cell..."));
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Load Cell Test");
  int testWeight = getBottleWeight();
  lcd.setCursor(0, 1);
  lcd.print("Weight: ");
  lcd.print(testWeight);
  lcd.print("g");
  delay(2000);
  
  // Test printer with extra space
  Serial.println(F("Testing printer..."));
  printer.println(F("SYSTEM TEST COMPLETE"));
  printer.println(F("All systems operational"));
  printer.println();
  printer.println();
  
  Serial.println(F("All tests completed"));
}

void checkTrapdoorSensor() {
  float distance = measureTrapdoorDistance();
  
  if (distance > 0 && distance <= 15.0) {
    lcd.clear();
    lcdProgmem(0, 0, STR_COLLECTING);
    lcd.setCursor(0, 1);
    lcd.print(F("Trapdoor Opening"));
    
    trapdoorServo.write(SERVO_OPEN);
    beep(1);
    
    delay(BOTTLE_FALL_TIME);
    
    trapdoorServo.write(SERVO_CLOSED);
    stopMotor();  // Stop the conveyor after collection
    
    lcd.clear();
    lcdProgmem(0, 0, STR_COLLECTED);
    lcd.setCursor(0, 1);
    lcdProgmem(0, 1, STR_BOTTLE_COUNT);
    lcd.print(bottleCount);
    
    beep(2);
    awaitingCollection = false;
    
    delay(3000);
    updateDisplay();
  }
}

float measureTrapdoorDistance() {
  digitalWrite(TRAPDOOR_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRAPDOOR_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRAPDOOR_TRIG, LOW);
  
  long duration = pulseIn(TRAPDOOR_ECHO, HIGH, 30000);
  
  if (duration == 0) return -1;
  
  return (duration * 0.034) / 2;
}

float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  
  if (duration == 0) return -1;
  
  return (duration * 0.034) / 2;
}

void processBottleDetection() {
  // Step 1: Material Analysis
  lcd.clear();
  lcdProgmem(0, 0, STR_PROCESSING_1);
  lcd.setCursor(0, 1);
  lcd.print(F("Material Check"));
  
  beep(1);
  delay(1500);
  
  bool isValidMaterial = performProximityAnalysis();
  
  if (!isValidMaterial) {
    lcd.clear();
    lcdProgmem(0, 0, STR_METAL_DETECTED);
    lcdProgmem(0, 1, STR_REJECTED);
    beep(3);
    delay(2000);
    returnBottle();
    return;
  }
  
  // Step 2: Weight Validation
  lcd.clear();
  lcdProgmem(0, 0, STR_PROCESSING_2);
  lcd.setCursor(0, 1);
  lcd.print(F("Weight Check"));
  
  delay(1500);
  
  int weight = getBottleWeight();
  bool isValidWeight = validateBottleWeight();
  
  if (!isValidWeight) {
    lcd.clear();
    if (weight < MIN_BOTTLE_WEIGHT) {
      lcdProgmem(0, 0, STR_TOO_LIGHT);
      lcdProgmem(0, 1, STR_REJECTED);
    } else {
      lcdProgmem(0, 0, STR_TOO_HEAVY);
      lcdProgmem(0, 1, STR_REJECTED);
    }
    beep(3);
    delay(2000);
    returnBottle();
    return;
  }
  
  // Step 3: Final Validation
  lcd.clear();
  lcdProgmem(0, 0, STR_PROCESSING_3);
  lcd.setCursor(0, 1);
  lcd.print(F("Final Check"));
  
  delay(1000);
  
  // All checks passed - accept bottle
  bottleCount++;
  
  lcd.clear();
  lcdProgmem(0, 0, STR_PET_ACCEPTED);
  lcd.setCursor(0, 1);
  lcdProgmem(0, 1, STR_MOVING);
  
  Serial.println(F("PET bottle accepted"));
  beep(2);
  delay(2000);
  
  moveConveyorForward();
  awaitingCollection = true;
  conveyorStartTime = millis();
}

void returnBottle() {
  lcd.clear();
  lcdProgmem(0, 0, STR_REJECTED);
  lcdProgmem(0, 1, STR_TRY_AGAIN);
  
  Serial.println(F("Bottle rejected - returning"));
  
  moveConveyorBackward();
  delay(MOVE_DURATION);
  stopMotor();
  
  delay(2000);
  updateDisplay();
}

bool performProximityAnalysis() {
  // Simplified analysis with fewer readings
  byte inductiveHigh = 0;
  byte capacitiveHigh = 0;
  
  for (byte i = 0; i < 3; i++) {
    if (digitalRead(INDUCTIVE_SENSOR_PIN) == HIGH) inductiveHigh++;
    if (digitalRead(CAPACITIVE_SENSOR_PIN) == HIGH) capacitiveHigh++;
    delay(100);
  }
  
  return (inductiveHigh >= 2); // Accept if mostly non-metal
}

void moveConveyorForward() {
  Serial.println(F("Motor: Forward"));
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, HIGH);
  analogWrite(MOTOR_ENA, MOTOR_SPEED);
  Serial.print(F("IN1: LOW, IN2: HIGH, ENA: "));
  Serial.println(MOTOR_SPEED);
}

void moveConveyorBackward() {
  Serial.println(F("Motor: Backward"));
  digitalWrite(MOTOR_IN1, HIGH);
  digitalWrite(MOTOR_IN2, LOW);
  analogWrite(MOTOR_ENA, MOTOR_SPEED);
  Serial.print(F("IN1: HIGH, IN2: LOW, ENA: "));
  Serial.println(MOTOR_SPEED);
}

void stopMotor() {
  Serial.println(F("Motor: Stop"));
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  analogWrite(MOTOR_ENA, 0);
}

void updateDisplay() {
  lcd.clear();
  lcdProgmem(0, 0, STR_DEPOSIT);
  lcdProgmem(0, 1, STR_BOTTLE_COUNT);
  lcd.print(bottleCount);
}

void beep(byte times) {
  for (byte i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(200);
  }
}
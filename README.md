# IWM Reverse Vending Machine (RVM)

**INDUS WASTE MANAGEMENT — Automated PET Bottle Collection System**

Firmware and documentation for a Reverse Vending Machine built as part of the 3rd Semester ISE Engineering program. Incubated through the college innovation program and awarded the JVTM Prize. Build cost: approximately Rs. 15,000.

---

## Overview

A user inserts an empty PET bottle into the intake slot. The machine validates it through three automated checks, transports it via conveyor belt into a collection bin, and at the end of the session prints a thermal reward coupon redeemable at partner outlets. The system runs on an Arduino Uno and fits inside a 600 x 600 x 600 mm enclosure on wheels.

---

## Repository Structure

```
D:.
|   BOM.md
|   IWM_RVM_Technical_Reference.pdf
|   LICENSE
|   README.md
|   structure.txt
|
+---hardware
|       IWM_RVM_Circuit_Diagram.html
|       IWM_RVM_Circuit_schematic.png
|       iwm_rvm_system_flowchart.svg
|
+---Media
|   +---showcase images
|   |       rvm1.jpeg
|   |       rvm2.jpeg
|   |       rvm3.jpeg
|   |       rvm4.jpeg
|   |       rvm5.jpeg
|   |       rvm 5.jpeg
|   |       rvm 6.jpeg
|   |
|   \---showcase mp3
|           rvm Demo cardboard.mp4
|
\---src
        main.ino
```

---

## System Pipeline

```
User inserts bottle
        |
        v
[ 1. Ultrasonic Detection ]   --  Is something within 10 cm of the intake sensor?
        | yes
        v
[ 2. Material Analysis ]      --  Inductive sensor: is it metal? If yes, REJECT
        | non-metal
        v
[ 3. Weight Validation ]      --  Load cell: is it 15g-35g? If outside range, REJECT
        | valid
        v
[ 4. Accept + Transport ]     --  Conveyor belt moves bottle forward
        |
        v
[ 5. Trapdoor Drop ]          --  Second ultrasonic triggers servo, bottle falls into bin
        |
        v
[ 6. Session End (button) ]   --  Thermal printer issues reward coupon
```

Rejection at step 2 or 3 reverses the conveyor to return the bottle, accompanied by 3 beeps and an LCD message.

---

## Hardware

| Component | Model | Role |
|---|---|---|
| Microcontroller | Arduino Uno (ATmega328P) | Central controller |
| Intake sensor | HC-SR04 Ultrasonic | Detect bottle at slot |
| Material check | Inductive + Capacitive proximity sensors | Metal vs. plastic discrimination |
| Weight validation | 50 kg Load Cell + HX711 ADC | 15g-35g range check |
| Conveyor | 12V DC Motor + L298N driver | Transport bottle |
| Trapdoor | SG90 Servo + HC-SR04 | Drop bottle into bin |
| User interface | 16x2 I2C LCD + Active Buzzer | Status display and audio feedback |
| Reward output | 58mm Serial Thermal Printer | Print reward coupon |
| Session control | Momentary push button | End session and trigger print |

For full pin-by-pin wiring tables, sensor selection rationale, power supply notes, and software architecture, refer to `IWM_RVM_Technical_Reference.pdf`.

---

## Pin Reference

| Arduino Pin | Connected To | Function |
|---|---|---|
| D2 | Inductive Sensor OUT | Metal detection |
| D3 | L298N ENA (PWM) | Motor speed |
| D4 / D5 | HC-SR04 TRIG/ECHO (intake) | Bottle detection |
| D6 / D7 | HC-SR04 TRIG/ECHO (trapdoor) | Trapdoor trigger |
| D8 | Capacitive Sensor OUT | Non-metal confirmation |
| D9 / D10 | L298N IN1 / IN2 | Motor direction |
| D11 | Servo SIG | Trapdoor angle |
| D12 / D13 | Printer RX / TX | Thermal printer serial |
| A0 | Push Button | Session end |
| A1 / A2 | HX711 DT / SCK | Load cell data |
| A3 | Buzzer | Audio feedback |
| A4 / A5 | LCD SDA / SCL | I2C display |

---

## Software

**Language:** Arduino C++ (AVR target)  
**IDE:** Arduino IDE 1.8+ or 2.x  
**Main sketch:** `src/main.ino`

### Dependencies

Install via Arduino Library Manager:

- `LiquidCrystal_I2C` — Frank de Brabander
- `HX711` — bogde
- `Servo`, `Wire`, `SoftwareSerial`, `EEPROM`, `avr/pgmspace` — built-in

### Key Firmware Decisions

**PROGMEM for strings** — The ATmega328P has only 2 KB of SRAM. All string literals (LCD messages, coupon text) are stored in Flash using `PROGMEM` and read via helper functions. Without this, the system would run out of RAM mid-operation.

**Dual ultrasonic sensors** — One sensor at the intake detects bottle insertion; a second at the end of the conveyor detects arrival and triggers the trapdoor servo. This separates detection logic cleanly without relying on software timers.

**Load cell calibration in EEPROM** — The calibration factor is written once during setup and persisted across power cycles. The system reads it on boot via `EEPROM.get(0, calibrationFactor)`.

**Multi-read averaging** — The HX711 takes 5 readings and averages them after filtering outliers in the -100g to +1000g window. This smooths vibration noise from the conveyor motor.

**3-beep / 2-beep protocol** — 3 beeps signals rejection, 2 beeps signals acceptance. Users understand the machine's decision without needing to read the LCD.

---

## Validation Logic

```
Weight range:   15g <= weight <= 35g
                (typical empty 500ml PET bottle: ~18-22g)

Material:       Inductive sensor reads LOW for 2 of 3 samples
                -> confirms non-metallic object

Both checks must pass for the bottle to be accepted.
```

---

## Coupon System

At session end (button press), the thermal printer issues a formatted 58mm coupon containing the bottle count for the session, partner brand and outlet information, a random 6-digit coupon number with IWM prefix, and a validity date. ESC/POS commands are used for bold formatting of the header and reward sections.

---

## Build Notes

- Enclosure is Coroplast (corrugated plastic sheet) with M4 screws and aluminum angle brackets
- Conveyor belt is a repurposed flat rubber belt on an MDF board platform
- Total build cost: approximately Rs. 15,000, including all sensors, motors, printer, and enclosure materials
- Two power supplies: 12V 2A adapter for the motor, 5V 2A adapter for the printer; all other components are powered from the Arduino's regulated 5V rail

---

## Results

- Incubated through the college innovation program
- Awarded the JVTM Prize
- Demonstrated live bottle acceptance, rejection, conveyor operation, and coupon printing
- Successfully processed multiple bottle sessions under demo conditions

---

## Possible Next Steps

- ESP8266 / ESP32 integration for IoT data logging (bottles collected per day, machine usage stats)
- QR code coupons with server-side validation
- Optical bottle type identification (HDPE vs. PET vs. glass)
- Single power supply with buck converter to replace dual-adapter setup
- Mobile app for session history and analytics

---

## License

MIT License. Free to use, modify, and build upon. See `LICENSE` for full terms.

---

*Team IWM*

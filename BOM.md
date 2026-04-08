# Bill of Materials — IWM Reverse Vending Machine

> All components are widely available on Amazon India, Robu.in, or local electronics markets (Bangalore: SP Road, Mumbai: Lamington Road).
> Total build cost for this prototype: **~₹15,000** including enclosure and miscellaneous hardware.

---

## Electronics

| # | Component | Spec / Model | Qty | Where to buy |
|---|-----------|-------------|-----|-------------|
| 1 | Microcontroller | Arduino Uno R3 (ATmega328P) | 1 | Amazon / Robu |
| 2 | Ultrasonic sensor | HC-SR04 | 2 | Amazon / Robu |
| 3 | Inductive proximity sensor | LJ12A3-4-Z/BX · NPN · NO · 4mm · 6–36V | 1 | Robu / Amazon |
| 4 | Capacitive proximity sensor | LJC18A3-H-Z/BX · NPN · NO · 8mm | 1 | Robu / Amazon |
| 5 | Load cell | Bar type · 50 kg rated | 1 | Amazon / Robu |
| 6 | Load cell ADC | HX711 breakout module | 1 | Amazon / Robu |
| 7 | DC motor | 12V · ~300 RPM (geared) | 1 | Local market |
| 8 | Motor driver | L298N dual H-bridge module | 1 | Amazon / Robu |
| 9 | Servo motor | SG90 or MG90S (9g micro servo) | 1 | Amazon / Robu |
| 10 | LCD display | 16×2 with I2C backpack (PCF8574 · 0x27) | 1 | Amazon / Robu |
| 11 | Thermal printer | 58mm serial thermal printer · 9600 baud | 1 | Amazon |
| 12 | Thermal paper roll | 58mm × 30m | 2–3 | Amazon |
| 13 | Active buzzer | 3–5V · self-oscillating | 1 | Amazon / Robu |
| 14 | Push button | Momentary NO · panel mount | 1 | Local market |

---

## Power Supply

| # | Component | Spec | Qty | Notes |
|---|-----------|------|-----|-------|
| 15 | DC adapter | 12V · 2A · barrel jack | 1 | Powers motor via L298N |
| 16 | DC adapter | 5V · 2A · USB or barrel | 1 | Powers thermal printer |
| 17 | USB cable | Type-B (Arduino) | 1 | Powers Arduino from laptop or 5V adapter |

---

## Conveyor Belt Assembly

| # | Component | Spec | Qty | Notes |
|---|-----------|------|-----|-------|
| 18 | MDF board | 6mm · cut to ~50×15 cm | 1 | Conveyor base platform |
| 19 | Rubber conveyor belt | Flat · ~50 cm loop | 1 | Repurposed or cut from rubber sheet |
| 20 | Roller rod | 6mm dia · aluminium or PVC | 2 | Drive roller + idler roller |
| 21 | Motor mount bracket | L-bracket or 3D printed | 1 | Mounts DC motor to MDF |

---

## Enclosure

| # | Component | Qty | Notes |
|---|-----------|-----|-------|
| 22 | Coroplast sheet (corrugated plastic) | ~4 sq ft | White · 4–6mm thick · main enclosure panels |
| 23 | Aluminium angle bracket | 2 cm × 2 cm × various lengths | ~8–10 | Internal frame corners |
| 24 | M4 screws + nuts | M4 × 10mm | ~50 | Panel assembly |
| 25 | Castor wheels | 40–50mm with lock | 4 | Base mobility |
| 26 | Hinge + latch | Small cabinet hinge + magnetic latch | 2 each | Maintenance door |
| 27 | Snap-in frame | A4 or custom poster frame | 1 | Front display panel |

---

## Wiring & Misc

| # | Component | Qty | Notes |
|---|-----------|-----|-------|
| 28 | Jumper wires | Male-to-male + male-to-female | ~40–50 | Breadboard prototyping |
| 29 | Breadboard | Full size (830 tie points) | 1 | Prototyping / power rails |
| 30 | Dupont crimp connectors | Assorted | 1 pack | For clean semi-permanent wiring |
| 31 | Heat shrink tubing | Assorted sizes | 1 pack | Wire insulation |
| 32 | Velcro / cable ties | — | 1 pack | Internal cable management |

---

## Notes

- **Inductive and capacitive sensors** need 6–36V to operate — they share the 12V adapter with the motor driver. Do NOT connect them to Arduino's 5V pin.
- **Thermal printer** draws up to 2A during printing — it must have its own dedicated 5V adapter. Running it off the Arduino 5V rail will cause resets.
- **Load cell calibration** — once assembled, you'll need to calibrate the HX711 with a known weight (a 20g coin or a 20g object off a kitchen scale works fine) and store the calibration factor in EEPROM. There's no shortcut here; every load cell + HX711 pair is slightly different.
- **Servo** — the SG90 is fine for a lightweight trapdoor. If your trapdoor panel is heavier (thick acrylic/MDF), upgrade to MG90S which has metal gears.

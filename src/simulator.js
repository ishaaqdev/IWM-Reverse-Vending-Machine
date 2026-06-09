import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══════════════════════════════════════════════════════
// GLOBAL APP STATE
// ═══════════════════════════════════════════════════════
const state = {
  bottlesCount: 0,
  credits: 0,
  activeSession: true,
  isAnimating: false,
  activeView: 'free',
  audioCtx: null
};

// ═══════════════════════════════════════════════════════
// THREE.JS CONFIG & SETUP
// ═══════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x050508, 0.02);

// Camera
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(13, 9, 14);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below ground
controls.minDistance = 5;
controls.maxDistance = 25;

// Hide Loading screen
document.getElementById('canvas-loading').classList.add('fade-out');

// ═══════════════════════════════════════════════════════
// LIGHTS
// ═══════════════════════════════════════════════════════
// Strong ambient fill light to make details visible
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

// Main directional shadow-casting light
const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight.position.set(10, 15, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

// Emissive spotlight inside the machine enclosure
const interiorSpot = new THREE.SpotLight(0x64d2ff, 5, 15, Math.PI / 3, 0.5, 1);
interiorSpot.position.set(0, 3, 0);
scene.add(interiorSpot);

// Front spot light to illuminate the front panel (LCD, buttons, slot)
const frontLight = new THREE.SpotLight(0xffffff, 6, 20, Math.PI / 4, 0.4, 1);
frontLight.position.set(0, 5, 8);
frontLight.target.position.set(0, 0, 0);
scene.add(frontLight);

// Camera-attached headlight: follows camera angle so face being viewed is always lit
const headlight = new THREE.DirectionalLight(0xffffff, 0.65);
camera.add(headlight);
scene.add(camera); // Add camera with child headlight to the scene

// ═══════════════════════════════════════════════════════
// PROCEDURAL GEOMETRY / MACHINE MODEL
// ═══════════════════════════════════════════════════════

// Floor Grid & Shadow receiver
const floorGeo = new THREE.PlaneGeometry(50, 50);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x07070a,
  roughness: 0.9,
  metalness: 0.1
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -4.5;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(50, 50, 0x1e1e2a, 0x0b0b10);
grid.position.y = -4.49;
scene.add(grid);

// Create the RVM Machine Group
const rvmGroup = new THREE.Group();
scene.add(rvmGroup);

// Materials
const metalFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2a, roughness: 0.4, metalness: 0.8 });
const sheetMetalMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.5, metalness: 0.7 });
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x64d2ff,
  transparent: true,
  opacity: 0.12,
  roughness: 0.1,
  metalness: 0.9,
  side: THREE.DoubleSide
});
const sensorMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.5, metalness: 0.6 });
const ledGreenMat = new THREE.MeshStandardMaterial({ color: 0x005500, emissive: 0x00ff00, emissiveIntensity: 0.1 });
const ledRedMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff0000, emissiveIntensity: 0.1 });
const ledYellowMat = new THREE.MeshStandardMaterial({ color: 0x555500, emissive: 0xffff00, emissiveIntensity: 0.1 });

// Main Enclosure Dimensions: Width = 6, Height = 9, Depth = 6 (scaled representation)
// Cabinet Frame
const framePoints = [
  [-3, -4.5, -3], [3, -4.5, -3], [3, -4.5, 3], [-3, -4.5, 3],
  [-3, 4.5, -3], [3, 4.5, -3], [3, 4.5, 3], [-3, 4.5, 3]
];
const frameEdges = [
  [0, 1], [1, 2], [2, 3], [3, 0], // Bottom loop
  [4, 5], [5, 6], [6, 7], [7, 4], // Top loop
  [0, 4], [1, 5], [2, 6], [3, 7]  // Vertical legs
];

frameEdges.forEach(edge => {
  const p1 = new THREE.Vector3(...framePoints[edge[0]]);
  const p2 = new THREE.Vector3(...framePoints[edge[1]]);
  const distance = p1.distanceTo(p2);
  
  const cylGeo = new THREE.CylinderGeometry(0.12, 0.12, distance, 8);
  const mesh = new THREE.Mesh(cylGeo, metalFrameMat);
  mesh.castShadow = true;
  
  // Position and orient cylinder between points
  const position = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  mesh.position.copy(position);
  
  const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
  mesh.setRotationFromQuaternion(quaternion);
  
  rvmGroup.add(mesh);
});

// Sheet Metal Panels (Back, Bottom, Left Side, Right Side, Top)
const panelsInfo = [
  { w: 6, h: 9, d: 0.1, x: 0, y: 0, z: -3, mat: sheetMetalMat }, // Back
  { w: 6, h: 0.1, d: 6, x: 0, y: -4.5, z: 0, mat: sheetMetalMat }, // Bottom
  { w: 6, h: 0.1, d: 6, x: 0, y: 4.5, z: 0, mat: sheetMetalMat } // Top
];
panelsInfo.forEach(p => {
  const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
  const mesh = new THREE.Mesh(geo, p.mat);
  mesh.position.set(p.x, p.y, p.z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  rvmGroup.add(mesh);
});

// Translucent Glass Panels (Sides)
const glassSides = [
  { w: 0.05, h: 9, d: 6, x: -3, y: 0, z: 0 }, // Left side
  { w: 0.05, h: 9, d: 6, x: 3, y: 0, z: 0 }  // Right side
];
glassSides.forEach(g => {
  const geo = new THREE.BoxGeometry(g.w, g.h, g.d);
  const mesh = new THREE.Mesh(geo, glassMat);
  mesh.position.set(g.x, g.y, g.z);
  rvmGroup.add(mesh);
});

// Front Panel (Dark metal sheet with slots and widgets)
const frontPanelGeo = new THREE.BoxGeometry(6, 9, 0.15);
const frontPanel = new THREE.Mesh(frontPanelGeo, sheetMetalMat);
frontPanel.position.set(0, 0, 3);
frontPanel.castShadow = true;
frontPanel.receiveShadow = true;
rvmGroup.add(frontPanel);

// Front Panel Widgets:
// 1. Intake Port ring
const intakeRingGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32);
const intakeRingMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4c, roughness: 0.3, metalness: 0.8 });
const intakeRing = new THREE.Mesh(intakeRingGeo, intakeRingMat);
intakeRing.rotation.x = Math.PI / 2;
intakeRing.position.set(-1.5, 2.2, 3.1);
rvmGroup.add(intakeRing);

const intakeHoleGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.32, 32);
const intakeHoleMat = new THREE.MeshBasicMaterial({ color: 0x020205 });
const intakeHole = new THREE.Mesh(intakeHoleGeo, intakeHoleMat);
intakeHole.rotation.x = Math.PI / 2;
intakeHole.position.set(-1.5, 2.2, 3.1);
rvmGroup.add(intakeHole);

// 2. LCD Display Outer Bezel and Glowing Screen
const bezelGeo = new THREE.BoxGeometry(2, 1, 0.1);
const bezel = new THREE.Mesh(bezelGeo, intakeRingMat);
bezel.position.set(1.4, 2.8, 3.1);
rvmGroup.add(bezel);

const screenGeo = new THREE.BoxGeometry(1.8, 0.8, 0.05);
const screenMat = new THREE.MeshStandardMaterial({
  color: 0x021a08,
  emissive: 0x39ff14,
  emissiveIntensity: 0.15,
  roughness: 0.1
});
const physicalScreen = new THREE.Mesh(screenGeo, screenMat);
physicalScreen.position.set(1.4, 2.8, 3.15);
rvmGroup.add(physicalScreen);

// 3. Printer Slot Bezel & Extruder slot
const printerBezelGeo = new THREE.BoxGeometry(1.8, 0.6, 0.1);
const printerBezel = new THREE.Mesh(printerBezelGeo, intakeRingMat);
printerBezel.position.set(1.4, 1.4, 3.1);
rvmGroup.add(printerBezel);

const printerSlotGeo = new THREE.BoxGeometry(1.4, 0.06, 0.06);
const printerSlotMat = new THREE.MeshBasicMaterial({ color: 0x000 });
const printerSlot = new THREE.Mesh(printerSlotGeo, printerSlotMat);
printerSlot.position.set(1.4, 1.4, 3.14);
rvmGroup.add(printerSlot);

// 3D Paper Receipt Strip (extrude-animated mesh)
const receiptPaperGeo = new THREE.PlaneGeometry(1.2, 0.01);
const receiptPaperMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const physicalReceipt = new THREE.Mesh(receiptPaperGeo, receiptPaperMat);
physicalReceipt.position.set(1.4, 1.36, 3.15);
physicalReceipt.rotation.x = -0.1; // slant forward slightly
physicalReceipt.visible = false;
rvmGroup.add(physicalReceipt);

// 4. Session Red Push Button
const buttonBaseGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
const buttonBase = new THREE.Mesh(buttonBaseGeo, intakeRingMat);
buttonBase.rotation.x = Math.PI / 2;
buttonBase.position.set(1.4, 0.3, 3.1);
rvmGroup.add(buttonBase);

const redButtonGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
const redButtonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, metalness: 0.1 });
const physicalButton = new THREE.Mesh(redButtonGeo, redButtonMat);
physicalButton.rotation.x = Math.PI / 2;
physicalButton.position.set(1.4, 0.3, 3.15);
rvmGroup.add(physicalButton);

// 5. LED Indicators (Green, Red, Yellow)
const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
const ledGreen = new THREE.Mesh(ledGeo, ledGreenMat);
ledGreen.position.set(-1.2, 0.6, 3.1);
const ledYellow = new THREE.Mesh(ledGeo, ledYellowMat);
ledYellow.position.set(-1.5, 0.6, 3.1);
const ledRed = new THREE.Mesh(ledGeo, ledRedMat);
ledRed.position.set(-1.8, 0.6, 3.1);
rvmGroup.add(ledGreen);
rvmGroup.add(ledYellow);
rvmGroup.add(ledRed);

// 6. Wheels (4 black cylinders at the base corners)
const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
const wheelPositions = [
  [-2.6, -4.7, -2.6], [2.6, -4.7, -2.6],
  [2.6, -4.7, 2.6], [-2.6, -4.7, 2.6]
];
wheelPositions.forEach(pos => {
  const wheel = new THREE.Mesh(wheelGeo, wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(...pos);
  wheel.castShadow = true;
  rvmGroup.add(wheel);
});

// ═══════════════════════════════════════════════════════
// INTERNAL MECHANICAL COMPONENTS (Visible through glass)
// ═══════════════════════════════════════════════════════

// 1. Conveyor Belt Setup
const conveyorGroup = new THREE.Group();
conveyorGroup.position.set(0, 1.2, 0); // elevated slightly
rvmGroup.add(conveyorGroup);

// Conveyor Frame
const conveyorFrameGeo = new THREE.BoxGeometry(1.6, 0.3, 5.0);
const conveyorFrameMat = new THREE.MeshStandardMaterial({ color: 0x2e2e38, roughness: 0.6 });
const conveyorFrame = new THREE.Mesh(conveyorFrameGeo, conveyorFrameMat);
conveyorFrame.castShadow = true;
conveyorFrame.receiveShadow = true;
conveyorGroup.add(conveyorFrame);

// Pulleys (rollers)
const pulleyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);
const pulleyMat = new THREE.MeshStandardMaterial({ color: 0x7c7c8c, metalness: 0.9, roughness: 0.2 });
const frontPulley = new THREE.Mesh(pulleyGeo, pulleyMat);
frontPulley.rotation.z = Math.PI / 2;
frontPulley.position.set(0, 0, 2.3);
frontPulley.castShadow = true;
conveyorGroup.add(frontPulley);

const backPulley = new THREE.Mesh(pulleyGeo, pulleyMat);
backPulley.rotation.z = Math.PI / 2;
backPulley.position.set(0, 0, -2.3);
backPulley.castShadow = true;
conveyorGroup.add(backPulley);

// Conveyor Rubber Belt Mesh
// Creating a canvas-based dynamic texture to simulate movement offset
const beltCanvas = document.createElement('canvas');
beltCanvas.width = 128;
beltCanvas.height = 128;
const beltCtx = beltCanvas.getContext('2d');
beltCtx.fillStyle = '#111';
beltCtx.fillRect(0, 0, 128, 128);
beltCtx.fillStyle = '#222';
for (let i = 0; i < 128; i += 16) {
  beltCtx.fillRect(0, i, 128, 6); // dark stripes
}
const beltTexture = new THREE.CanvasTexture(beltCanvas);
beltTexture.wrapS = THREE.RepeatWrapping;
beltTexture.wrapT = THREE.RepeatWrapping;
beltTexture.repeat.set(1, 1);

const beltMat = new THREE.MeshStandardMaterial({
  map: beltTexture,
  roughness: 0.8,
  metalness: 0.2
});
const beltGeo = new THREE.BoxGeometry(1.5, 0.05, 4.6);
const beltMesh = new THREE.Mesh(beltGeo, beltMat);
beltMesh.position.set(0, 0.16, 0);
beltMesh.receiveShadow = true;
conveyorGroup.add(beltMesh);

// 2. Active Sensor Blocks
// A. Intake Ultrasonic Eyes (HC-SR04)
const eyeFrameGeo = new THREE.BoxGeometry(0.6, 0.3, 0.1);
const eyeFrame = new THREE.Mesh(eyeFrameGeo, sensorMat);
eyeFrame.position.set(-1.5, 2.7, 2.5); // inside front panel, above slot
conveyorGroup.add(eyeFrame);

const eyeCylGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.18, 12);
const eyeCylMat = new THREE.MeshStandardMaterial({ color: 0x8888aa, metalness: 0.8 });
const leftEye = new THREE.Mesh(eyeCylGeo, eyeCylMat);
leftEye.rotation.x = Math.PI / 2;
leftEye.position.set(-1.65, 2.7, 2.6);
const rightEye = new THREE.Mesh(eyeCylGeo, eyeCylMat);
rightEye.rotation.x = Math.PI / 2;
rightEye.position.set(-1.35, 2.7, 2.6);
conveyorGroup.add(leftEye);
conveyorGroup.add(rightEye);

// Expanding soundwaves ring (Intake indicator)
const ringGeo = new THREE.RingGeometry(0.1, 0.8, 32);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0x64d2ff,
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide
});
const ultrasonicPulse = new THREE.Mesh(ringGeo, ringMat);
ultrasonicPulse.position.set(-1.5, 2.2, 3.2);
rvmGroup.add(ultrasonicPulse);

// B. Inductive Metal Sensor Proximity cylinder
const metalSensorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16);
const proximityOrangeMat = new THREE.MeshStandardMaterial({ color: 0xff9f0a, roughness: 0.3 });
const metalSensor = new THREE.Mesh(metalSensorGeo, sensorMat);
metalSensor.position.set(-0.8, 0.5, 1.8);
metalSensor.rotation.x = Math.PI / 2;
conveyorGroup.add(metalSensor);
const metalSensorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), proximityOrangeMat);
metalSensorCap.position.set(-0.8, 0.5, 2.1);
metalSensorCap.rotation.x = Math.PI / 2;
conveyorGroup.add(metalSensorCap);

// C. Load Cell Weight Scale Plate
const loadCellBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), metalFrameMat);
loadCellBase.position.set(0, -0.25, 1.5);
conveyorGroup.add(loadCellBase);

const scalePlateGeo = new THREE.BoxGeometry(1.4, 0.06, 1.4);
const scalePlate = new THREE.Mesh(scalePlateGeo, pulleyMat);
scalePlate.position.set(0, 0.2, 1.5); // beneath entry point
conveyorGroup.add(scalePlate);

// D. Second Ultrasonic sensor (Conveyor End Detection)
const exitSensor = new THREE.Mesh(eyeFrameGeo, sensorMat);
exitSensor.position.set(0, 0.6, -1.8); // pointing across the belt exit
exitSensor.rotation.y = Math.PI / 2;
conveyorGroup.add(exitSensor);

// E. Servo motor (SG90) & Trapdoor flap
const servoBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x0066cc }));
servoBox.position.set(1.0, -0.2, -2.4);
conveyorGroup.add(servoBox);

const servoArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), metalFrameMat);
servoArm.position.set(1.0, 0.0, -2.4);
conveyorGroup.add(servoArm);

// Hinge group for trapdoor flap
const trapdoorHinge = new THREE.Group();
trapdoorHinge.position.set(0.7, -0.15, -2.4); // hinge pivot
conveyorGroup.add(trapdoorHinge);

const flapGeo = new THREE.BoxGeometry(1.4, 0.05, 1.2);
const flapMesh = new THREE.Mesh(flapGeo, conveyorFrameMat);
flapMesh.position.set(-0.7, 0, 0); // offset so it pivots along edge
flapMesh.castShadow = true;
flapMesh.receiveShadow = true;
trapdoorHinge.add(flapMesh);

// F. Collection Bin underneath
const binOuterGeo = new THREE.BoxGeometry(3.6, 2.0, 3.6);
const binOuter = new THREE.Mesh(binOuterGeo, sheetMetalMat);
binOuter.position.set(0, -3.2, -1.0);
binOuter.castShadow = true;
binOuter.receiveShadow = true;
rvmGroup.add(binOuter);

const binHoleGeo = new THREE.BoxGeometry(3.3, 1.9, 3.3);
const binHole = new THREE.Mesh(binHoleGeo, intakeHoleMat);
binHole.position.set(0, -3.15, -1.0);
rvmGroup.add(binHole);

// ═══════════════════════════════════════════════════════
// WEBAUDIO BUZZER SYNTHESIZER
// ═══════════════════════════════════════════════════════
function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBuzzerBeep(type) {
  initAudio();
  if (!state.audioCtx) return;
  
  const ctx = state.audioCtx;
  const now = ctx.currentTime;
  
  if (type === 'accept') {
    // 2 short high-pitched beeps
    playSingleBeep(2500, 0.08, now);
    playSingleBeep(2500, 0.08, now + 0.15);
  } else if (type === 'reject') {
    // 3 sharp harsh beeps
    playSingleBeep(1200, 0.18, now);
    playSingleBeep(1200, 0.18, now + 0.25);
    playSingleBeep(1200, 0.18, now + 0.50);
  } else if (type === 'print') {
    // Synth printer grinding hum
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(150, now + 1.2);
    
    // add high-frequency chatter
    const modulator = ctx.createOscillator();
    modulator.frequency.value = 45;
    const modulatorGain = ctx.createGain();
    modulatorGain.gain.value = 15;
    
    modulator.connect(osc.frequency);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    
    modulator.start(now);
    osc.start(now);
    modulator.stop(now + 1.5);
    osc.stop(now + 1.5);
  }
}

function playSingleBeep(freq, duration, startTime) {
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  gainNode.gain.setValueAtTime(0.12, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// ═══════════════════════════════════════════════════════
// CAMERA TRANSITIONS (GSAP)
// ═══════════════════════════════════════════════════════
const cameraViews = {
  free: { pos: { x: 13, y: 9, z: 14 }, tar: { x: 0, y: 0, z: 0 } },
  intake: { pos: { x: -3, y: 3.5, z: 8 }, tar: { x: -1.5, y: 2.2, z: 3.0 } },
  conveyor: { pos: { x: 2, y: 4.5, z: 4 }, tar: { x: -0.5, y: 1.2, z: 0.5 } },
  printer: { pos: { x: 3.2, y: 1.8, z: 6.5 }, tar: { x: 1.4, y: 1.4, z: 3.0 } }
};

function transitionCamera(viewName) {
  if (state.activeView === viewName) return;
  state.activeView = viewName;
  
  // Update UI active buttons
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  
  const targetConfig = cameraViews[viewName];
  if (!targetConfig) return;
  
  controls.enabled = false;
  
  gsap.to(camera.position, {
    x: targetConfig.pos.x,
    y: targetConfig.pos.y,
    z: targetConfig.pos.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onUpdate: () => controls.update()
  });
  
  gsap.to(controls.target, {
    x: targetConfig.tar.x,
    y: targetConfig.tar.y,
    z: targetConfig.tar.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onComplete: () => {
      // Keep controls enabled always so user can rotate/zoom camera after transition
      controls.enabled = true;
    }
  });
}

// Attach Camera buttons
document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    transitionCamera(btn.dataset.view);
  });
});

// ═══════════════════════════════════════════════════════
// RVM UI SYSTEM LCD DISPLAY CONTROL
// ═══════════════════════════════════════════════════════
const lcdLine1 = document.getElementById('lcd-l1');
const lcdLine2 = document.getElementById('lcd-l2');

function updateLcd(l1, l2) {
  lcdLine1.textContent = l1;
  lcdLine2.textContent = l2;
}

// Emissive screen texture state changes
function setLcdGlow(level) {
  gsap.to(screenMat, {
    emissiveIntensity: level,
    duration: 0.3
  });
}

// ═══════════════════════════════════════════════════════
// ANIMATION CYCLES (Bottle Insertion, Transport & Trapdoor)
// ═══════════════════════════════════════════════════════

// Bottle factory mesh generator
function createBottleMesh(type) {
  const bottleGroup = new THREE.Group();
  
  if (type === 'pet') {
    // Green plastic empty bottle
    const bodyGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x30d158,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    bottleGroup.add(body);
    
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.32, 0.35, 16);
    const neck = new THREE.Mesh(neckGeo, bodyMat);
    neck.position.y = 0.77;
    neck.castShadow = true;
    bottleGroup.add(neck);
    
    const capGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0a84ff, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.98;
    cap.castShadow = true;
    bottleGroup.add(cap);
    
  } else if (type === 'can') {
    // Silver reflective soda can
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe5e5ea,
      metalness: 0.9,
      roughness: 0.15
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    bottleGroup.add(body);
  } else {
    // Heavy blue plastic detergent bottle (Weight Reject case)
    const bodyGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a84ff,
      roughness: 0.5,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    bottleGroup.add(body);
    
    const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.77;
    cap.castShadow = true;
    bottleGroup.add(cap);
  }
  
  // Tilt bottle horizontal to match intake/conveyor orientation
  bottleGroup.rotation.x = Math.PI / 2;
  return bottleGroup;
}

// Eject rejected bottles out of slot
function triggerRejectionSequence(bottle, errorType) {
  updateLcd('REJECTED', errorType);
  playBuzzerBeep('reject');
  
  // Flash red LED indicator
  ledRedMat.emissiveIntensity = 1.8;
  
  // Flash Proximity Sensor indicator Cap
  gsap.to(proximityOrangeMat, { emissive: 0xff0000, emissiveIntensity: 2, yoyo: true, repeat: 5, duration: 0.2 });
  
  gsap.timeline({
    onComplete: () => {
      // Return LED to normal
      ledRedMat.emissiveIntensity = 0.1;
      proximityOrangeMat.emissive.setHex(0x000000);
      
      // Reverse conveyor movement
      gsap.to(bottle.position, {
        z: 4.8, // push out of slot
        duration: 1.5,
        ease: 'power1.inOut',
        onUpdate: () => {
          // scroll belt textures backward
          beltTexture.offset.y += 0.04;
          frontPulley.rotation.x -= 0.1;
          backPulley.rotation.x -= 0.1;
        },
        onComplete: () => {
          // fade out bottle and delete
          gsap.to(bottle.scale, {
            x: 0.01, y: 0.01, z: 0.01,
            duration: 0.5,
            onComplete: () => {
              scene.remove(bottle);
              state.isAnimating = false;
              updateLcd('SYSTEM READY', 'INSERT BOTTLE');
              transitionCamera('free');
            }
          });
        }
      });
    }
  })
  .to(camera.position, { delay: 1 });
}

// Process valid bottle sequence
function triggerAcceptanceSequence(bottle) {
  state.bottlesCount++;
  state.credits += 10;
  
  // Update stats counters in DOM
  document.getElementById('sess-btl-count').textContent = state.bottlesCount;
  document.getElementById('sess-credits').textContent = state.credits;
  
  updateLcd('ACCEPTED', 'VALID PET BOTTLE');
  playBuzzerBeep('accept');
  
  // Flash Green LED Indicator
  ledGreenMat.emissiveIntensity = 1.8;
  
  gsap.timeline({
    onComplete: () => {
      ledGreenMat.emissiveIntensity = 0.1;
      
      // Conveyor forward sequence
      transitionCamera('conveyor');
      
      gsap.timeline()
        .to(bottle.position, {
          z: 1.5, // move along conveyor to sensors
          duration: 1.2,
          ease: 'power1.inOut',
          onUpdate: () => {
            beltTexture.offset.y -= 0.04;
            frontPulley.rotation.x += 0.1;
            backPulley.rotation.x += 0.1;
          }
        })
        .to(scalePlate.position, {
          y: 0.1, // load cell registers weight by shifting down slightly
          duration: 0.2,
          yoyo: true,
          repeat: 1
        })
        .to(bottle.position, {
          z: -2.3, // move to the end of the conveyor
          duration: 2.2,
          ease: 'power1.inOut',
          onUpdate: () => {
            beltTexture.offset.y -= 0.04;
            frontPulley.rotation.x += 0.1;
            backPulley.rotation.x += 0.1;
          },
          onComplete: () => {
            // Trigger trapdoor servo and drop
            gsap.timeline()
              .to(servoArm.rotation, {
                z: -Math.PI / 3, // rotate servo arm
                duration: 0.3
              })
              .to(trapdoorHinge.rotation, {
                z: -Math.PI / 2.5, // drop flap open
                duration: 0.3,
                onComplete: () => {
                  // Fall logic (gravity simulation mesh)
                  gsap.timeline({
                    onComplete: () => {
                      // Close trapdoor and reset servo
                      gsap.to(trapdoorHinge.rotation, { z: 0, duration: 0.4 });
                      gsap.to(servoArm.rotation, { z: 0, duration: 0.4 });
                      
                      // Remove bottle mesh
                      scene.remove(bottle);
                      state.isAnimating = false;
                      updateLcd('SESSION ACTIVE', `${state.bottlesCount} BOTTLES SAVED`);
                      
                      setTimeout(() => {
                        if (!state.isAnimating) {
                          updateLcd('SYSTEM READY', 'INSERT BOTTLE');
                          transitionCamera('free');
                        }
                      }, 1200);
                    }
                  })
                  .to(bottle.position, {
                    y: -3.0,
                    x: 0,
                    duration: 0.45,
                    ease: 'power1.in'
                  })
                  .to(bottle.rotation, {
                    z: Math.PI / 4,
                    duration: 0.45
                  }, 0);
                }
              }, 0);
          }
        });
    }
  })
  .to(camera.position, { delay: 0.8 });
}

// Core execution method
function insertObject(type) {
  if (state.isAnimating || !state.activeSession) return;
  state.isAnimating = true;
  
  // Transition camera to zoom in on intake
  transitionCamera('intake');
  
  // Spawn bottle mesh
  const bottle = createBottleMesh(type);
  bottle.position.set(-1.5, 2.2, 4.8); // outside intake slot
  scene.add(bottle);
  
  updateLcd('INTAKE DETECTED', 'CHECKING BOTTLE');
  setLcdGlow(1.8);
  
  // Soundwave ripple ring visualizer
  ultrasonicPulse.scale.set(0.1, 0.1, 0.1);
  ringMat.opacity = 0.8;
  gsap.timeline()
    .to(ultrasonicPulse.scale, { x: 2, y: 2, duration: 0.8, ease: 'power1.out' })
    .to(ringMat, { opacity: 0, duration: 0.4 }, 0.4);
    
  // Animate bottle slide into intake
  gsap.timeline({
    delay: 0.5,
    onComplete: () => {
      // Scanner check starts
      if (type === 'can') {
        // Reject - Metal
        triggerRejectionSequence(bottle, 'REJECTED: METAL');
      } else if (type === 'heavy') {
        // Reject - Weight limit exceeded
        triggerRejectionSequence(bottle, 'REJECTED: WEIGHT');
      } else {
        // Accept - Valid plastic bottle
        triggerAcceptanceSequence(bottle);
      }
    }
  })
  .to(bottle.position, {
    z: 3.0, // slide inside intake slot
    duration: 1.2,
    ease: 'power2.out'
  });
}

// ═══════════════════════════════════════════════════════
// END SESSION & PRINTER COUPON EMULATION
// ═══════════════════════════════════════════════════════
function endSession() {
  if (state.isAnimating || !state.activeSession) return;
  state.isAnimating = true;
  state.activeSession = false;
  
  // Push button click animation
  gsap.timeline()
    .to(physicalButton.position, { z: 3.10, duration: 0.15, yoyo: true, repeat: 1 });
  
  transitionCamera('printer');
  updateLcd('PRINTING COUPON', 'THANK YOU!');
  playBuzzerBeep('print');
  
  // Extrude physical paper receipt in 3D
  physicalReceipt.visible = true;
  physicalReceipt.scale.set(1, 0.01, 1);
  physicalReceipt.position.y = 1.36;
  
  gsap.timeline({
    onComplete: () => {
      // Launch HTML printed coupon slide up
      renderHtmlReceipt();
      
      setTimeout(() => {
        // Reset RVM Session state
        state.bottlesCount = 0;
        state.credits = 0;
        document.getElementById('sess-btl-count').textContent = 0;
        document.getElementById('sess-credits').textContent = 0;
        
        updateLcd('SYSTEM READY', 'INSERT BOTTLE');
        physicalReceipt.visible = false;
        state.activeSession = true;
        state.isAnimating = false;
        
        transitionCamera('free');
      }, 5000);
    }
  })
  .to(physicalReceipt.scale, {
    y: 120, // stretch paper downward
    duration: 1.5,
    ease: 'power1.out'
  })
  .to(physicalReceipt.position, {
    y: 0.8, // scroll paper down
    duration: 1.5,
    ease: 'power1.out'
  }, 0);
}

function renderHtmlReceipt() {
  const container = document.getElementById('receipt-paper');
  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const code = 'IWM-' + Math.floor(100000 + Math.random() * 900000);
  
  container.innerHTML = `
    <div class="receipt-header">
      INDUS WASTE MANAGEMENT
      <div style="font-size:0.55rem; font-weight:300;">Reverse Vending Machine</div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-body">
      DATE: ${dateStr}<br/>
      TIME: ${timeStr}<br/>
      SESSION ID: RVM-0428<br/>
      -------------------------<br/>
      BOTTLES RECYCLED: ${state.bottlesCount}<br/>
      REWARD POINTS   : ${state.credits}<br/>
      -------------------------<br/>
      COUPON CODE     : <strong>${code}</strong>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-footer">
      PRESENT THIS SLIP AT OUTLETS<br/>
      TO REDEEM REWARDS.<br/>
      THANK YOU FOR RECYCLING!
    </div>
  `;
  
  const receiptTray = document.getElementById('printer-hud');
  receiptTray.classList.add('visible');
  gsap.fromTo(receiptTray, 
    { transform: 'translateY(50px) scale(0.95)', opacity: 0 },
    { transform: 'none', opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
  );
  
  // Hide after display duration
  setTimeout(() => {
    gsap.to(receiptTray, {
      opacity: 0,
      transform: 'translateY(-20px) scale(0.95)',
      duration: 0.4,
      onComplete: () => {
        receiptTray.classList.remove('visible');
      }
    });
  }, 5000);
}

// Attach operational buttons
document.getElementById('btn-insert-pet').addEventListener('click', () => insertObject('pet'));
document.getElementById('btn-insert-can').addEventListener('click', () => insertObject('can'));
document.getElementById('btn-insert-heavy').addEventListener('click', () => insertObject('heavy'));
document.getElementById('btn-end-session').addEventListener('click', endSession);

// ═══════════════════════════════════════════════════════
// ANIMATE LOOP & RESPONSIVENESS
// ═══════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Rotate grid background or active models slightly to add micro-animations
  if (state.activeView === 'free') {
    rvmGroup.rotation.y = Math.sin(Date.now() / 6000) * 0.15;
  } else {
    rvmGroup.rotation.y = 0;
  }
  
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
});

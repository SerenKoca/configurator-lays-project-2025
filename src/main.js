import "./style.css";
import * as THREE from "three";
import axios from "axios";
import { GUI } from "dat.gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const API_BASE_URL = "https://api-lays-project-2025.onrender.com";

// State Management
let currentStep = 1;
const configState = {
  brandName: "",
  fontStyle: "allcaps",
  bagColor: "#FF0000",
  flavourName: "",
  spiceLevel: 5,
  selectedImage: null
};

const MAX_BRAND_LENGTH = 7;

// HTML elementen - Step 1
const brandNameInput = document.getElementById("brand-name");
const fontStyleSelect = document.getElementById("font-style");
const colorButtons = document.querySelectorAll(".color-btn");
const nextStep1Btn = document.getElementById("nextStep1");

// HTML elementen - Step 2
const flavourNameInput = document.getElementById("flavour-name");
const spiceSlider = document.getElementById("spice-level");
const spiceValue = document.getElementById("spice-value");
const prevStep2Btn = document.getElementById("prevStep2");
const nextStep2Btn = document.getElementById("nextStep2");

// HTML elementen - Step 3
const galleryItems = document.querySelectorAll(".gallery-item");
const prevStep3Btn = document.getElementById("prevStep3");
const saveBtn = document.getElementById("saveBtn");

// General
const canvas = document.getElementById("three-canvas");
const feedback = document.getElementById("feedback");

// SCENE + CAMERA
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(1, 1.5, 5);

// RENDERER + SHADOWS
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

// GROND
const groundGeo = new THREE.CircleGeometry(2, 32);
const groundMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set(1, 0, 0);
ground.receiveShadow = true;
scene.add(ground);

// LICHT
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(3, 5, 4);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 20;
scene.add(dirLight);

// MODEL
let bagMesh;
let bagPart, bottomPart, logoPart, textPart;

const loader = new GLTFLoader();
loader.load(
  "./assets/models/bag.glb",
  (gltf) => {
    bagMesh = gltf.scene;
    
    // Find specific parts
    bagMesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Identify parts by name
        if (child.name === "Plane_Bag") bagPart = child;
        if (child.name === "Plane_Bottom") bottomPart = child;
        if (child.name === "Plane_Logo") logoPart = child;
        if (child.name === "Plane_Text") {
          textPart = child;
          if (textPart.material) {
            textPart.material.side = THREE.DoubleSide;
            textPart.material.transparent = true;
            textPart.material.color = new THREE.Color(0xffffff);
            textPart.material.needsUpdate = true;
          }
        }
      }
    });
    
    bagMesh.position.set(1, 1.5, 0);
    bagMesh.scale.set(1, 1, 1);
    scene.add(bagMesh);
    
    // Apply initial color
    updateBagColor(configState.bagColor);
  },
  undefined,
  (error) => {
    console.error("Fout bij laden model:", error);
  }
);

// DAT.GUI met 3 parameters
const gui = new GUI();
const params = {
  lightIntensity: dirLight.intensity,
  lightY: dirLight.position.y,
  rotationSpeed: 0.01,
};

gui
  .add(params, "lightIntensity", 0, 3, 0.1)
  .name("Light intensity")
  .onChange((v) => (dirLight.intensity = v));

gui
  .add(params, "lightY", 0, 10, 0.1)
  .name("Light height")
  .onChange((v) => (dirLight.position.y = v));

gui
  .add(params, "rotationSpeed", 0, 0.1, 0.001)
  .name("Bag rotation");

// === HELPER FUNCTIONS ===

function showStep(step) {
  // Hide all steps
  document.querySelectorAll(".step-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".step-indicator .step").forEach(el => el.classList.remove("active"));
  
  // Show current step
  document.getElementById(`step${step}`).classList.remove("hidden");
  document.querySelector(`.step-indicator .step[data-step="${step}"]`).classList.add("active");
  currentStep = step;
}

function updateBagColor(color) {
  if (!bagPart) return;
  bagPart.material.color = new THREE.Color(color);
  // Don't tint bottom plane - keep it white so images/textures show clearly
  configState.bagColor = color;
}

function updateBrandName(name, fontStyle) {
  if (!textPart) return;
  
  // Create canvas for text texture
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 512;
  
  // Clear canvas with the bag color as background
  const bgColor = configState.bagColor || '#FF0000';
  context.fillStyle = bgColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Force white text with a dark outline for visibility
  const textColor = '#FFFFFF';
  const outlineColor = '#111111';
  
  // Prepare text and dynamically fit font size to the canvas
  let displayText = name;
  if (fontStyle === 'allcaps') {
    displayText = name.toUpperCase();
  }

  const baseFamily = fontStyle === 'classic' ? 'Georgia, serif' : '"Baloo 2", Arial';
  const baseWeight = fontStyle === 'normal' ? '400' : '700';

  // Fit font size so text width is within 90% of canvas width
  const maxSize = 320;
  const minSize = 80;
  let size = maxSize;
  const targetWidth = canvas.width * 0.9;

  while (size > minSize) {
    context.font = `${baseWeight} ${size}px ${baseFamily}`;
    const metrics = context.measureText(displayText);
    if (metrics.width <= targetWidth) break;
    size -= 8;
  }

  const finalFont = `${baseWeight} ${size}px ${baseFamily}`;
  
  context.font = finalFont;
  context.fillStyle = textColor;
  context.strokeStyle = outlineColor;
  context.lineWidth = 6;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeText(displayText, canvas.width / 2, canvas.height / 2);
  context.fillText(displayText, canvas.width / 2, canvas.height / 2);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Flip texture vertically only
  texture.repeat.y = -1;
  texture.offset.y = 1;
  
  // Apply texture to material
  if (textPart.material) {
    if (textPart.material.map) {
      textPart.material.map.dispose();
    }
    textPart.material.map = texture;
    textPart.material.needsUpdate = true;
  }
}

function updateLogoImage(imageName) {
  if (!bottomPart || !bottomPart.material) return;
  
  // Load the selected image as texture
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    `./assets/images/Lays_brand_logo.png`,
    (texture) => {
      if (bottomPart.material.map) {
        bottomPart.material.map.dispose();
      }
      
      // Flip texture vertically only
      texture.repeat.y = -1;
      texture.offset.y = 1;
      
      // Set to white and make transparent so bag color shows through transparent areas
      bottomPart.material.color = new THREE.Color(0xffffff);
      bottomPart.material.transparent = true;
      bottomPart.material.map = texture;
      bottomPart.material.needsUpdate = true;
      feedback.textContent = `Afbeelding toegepast: ${imageName}`;
    },
    undefined,
    (error) => {
      console.error('Error loading image:', error);
      feedback.textContent = `Afbeelding niet gevonden: Lays_brand_logo.png`;
    }
  );
}

// === STEP NAVIGATION ===

nextStep1Btn.addEventListener("click", () => {
  const name = brandNameInput.value.trim();

  if (name.length > MAX_BRAND_LENGTH) {
    feedback.textContent = `Merknaam mag maximaal ${MAX_BRAND_LENGTH} tekens bevatten.`;
    brandNameInput.focus();
    return;
  }

  configState.brandName = name;
  configState.fontStyle = fontStyleSelect.value;

  if (name) {
    updateBrandName(name, configState.fontStyle);
  }

  showStep(2);
  feedback.textContent = `Merknaam: ${configState.brandName || "Nog niet ingevuld"}`;
});

prevStep2Btn.addEventListener("click", () => {
  showStep(1);
});

nextStep2Btn.addEventListener("click", () => {
  configState.flavourName = flavourNameInput.value;
  configState.spiceLevel = spiceSlider.value;
  showStep(3);
  feedback.textContent = `Smaak: ${configState.flavourName || "Nog niet ingevuld"} - Pittigheid: ${configState.spiceLevel}/10`;
});

prevStep3Btn.addEventListener("click", () => {
  showStep(2);
});

// === STEP 1: COLOR SELECTION ===

colorButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    colorButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const color = btn.dataset.color;
    updateBagColor(color);
    
    // Update text background with new color
    const name = brandNameInput.value.trim();
    if (name && name.length <= MAX_BRAND_LENGTH) {
      updateBrandName(name, fontStyleSelect.value);
    }
  });
});

// Real-time brand name update
brandNameInput.addEventListener("input", () => {
  const name = brandNameInput.value.trim();
  if (name && name.length <= MAX_BRAND_LENGTH) {
    updateBrandName(name, fontStyleSelect.value);
  }
});

// Real-time font style update
fontStyleSelect.addEventListener("change", () => {
  const name = brandNameInput.value.trim();
  if (name && name.length <= MAX_BRAND_LENGTH) {
    updateBrandName(name, fontStyleSelect.value);
  }
});

// === STEP 2: SPICE LEVEL ===

spiceSlider.addEventListener("input", () => {
  const level = Number(spiceSlider.value);
  spiceValue.textContent = level;
  configState.spiceLevel = level;
  
  const t = level / 10;
  const r = 1;
  const g = 1 - 0.5 * t;
  const b = 1 - 0.5 * t;

  dirLight.color.setRGB(r, g, b);
  dirLight.intensity = 1 + 0.5 * t;
});

// === STEP 3: IMAGE GALLERY ===

galleryItems.forEach(item => {
  item.addEventListener("click", () => {
    galleryItems.forEach(i => i.classList.remove("selected"));
    item.classList.add("selected");
    configState.selectedImage = item.dataset.image;
    
    // Update the logo on the bag immediately
    updateLogoImage(configState.selectedImage);
    
    feedback.textContent = `Afbeelding geselecteerd: ${item.querySelector('p').textContent}`;
  });
});

// === BESTEL-FLOW ===
saveBtn.addEventListener("click", async () => {
  if (!bagMesh) {
    feedback.textContent = "Model wordt nog geladen, probeer zo meteen opnieuw.";
    return;
  }

  if (!configState.selectedImage) {
    feedback.textContent = "Selecteer eerst een afbeelding!";
    return;
  }

  // UI feedback: bezig
  saveBtn.disabled = true;
  const oldText = saveBtn.textContent;
  saveBtn.textContent = "Verzenden...";
  feedback.textContent = "Je configuratie wordt verzonden...";

  // Klein pulse-effect op de zak
  bagMesh.scale.set(1.1, 1.1, 1.1);

  const payload = {
    name: configState.brandName || "Custom Bag",
    fontStyle: configState.fontStyle,
    bagColor: configState.bagColor,
    flavour: configState.flavourName || "Custom Flavour",
    spiceLevel: configState.spiceLevel,
    selectedImage: configState.selectedImage
  };

  try {
    const res = await axios.post(`${API_BASE_URL}/bag`, payload);
    console.log("API response:", res.data);
    feedback.textContent = `Bestelling ontvangen! ID: ${res.data._id}`;
  } catch (err) {
    console.error(err);
    feedback.textContent = "Er ging iets mis bij het versturen.";
  } finally {
    // knop herstellen + zak terug normaliseren
    saveBtn.disabled = false;
    saveBtn.textContent = oldText;
    bagMesh.scale.set(1, 1, 1);
  }
});

// ANIMATIE
function animate() {
  requestAnimationFrame(animate);
  if (bagMesh) {
    bagMesh.rotation.y += params.rotationSpeed;
  }
  renderer.render(scene, camera);
}
animate();

// RESIZE
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

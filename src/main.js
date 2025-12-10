import "./style.css";
import * as THREE from "three";
import axios from "axios";
import { GUI } from "dat.gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const API_BASE_URL = "https://api-lays-project-2025.onrender.com";

// HTML elementen
const flavourSelect = document.getElementById("flavour");
const colorInput = document.getElementById("color");
const spiceSlider = document.getElementById("spice-level");
const saveBtn = document.getElementById("saveBtn");
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
camera.position.set(1, 1.2, 5);

// RENDERER + SHADOWS
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// GROND
const groundGeo = new THREE.PlaneGeometry(30, 30);
const groundMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
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
const initialColor = new THREE.Color(colorInput.value);

const loader = new GLTFLoader();
loader.load(
  "/assets/models/bag.glb", // zorg dat dit in public/assets/models staat
  (gltf) => {
    bagMesh = gltf.scene;
    bagMesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material && !child.material.map) {
          child.material.color = initialColor;
        }
      }
    });
    bagMesh.position.set(0, 1.5, 0);
    bagMesh.scale.set(1, 1, 1);
    scene.add(bagMesh);
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

// === CONFIGURATIEOPTIES ===

// 1) Kleur zak aanpassen
colorInput.addEventListener("input", () => {
  if (!bagMesh) return;
  const hex = colorInput.value;
  bagMesh.traverse
    ? bagMesh.traverse((child) => {
        if (child.isMesh && child.material && !child.material.map) {
          child.material.color = new THREE.Color(hex);
        }
      })
    : (bagMesh.material.color = new THREE.Color(hex));
});

// 2) Smaak → pose/rotatie + feedback
flavourSelect.addEventListener("change", () => {
  if (!bagMesh) return;
  const flavour = flavourSelect.value;

  switch (flavour) {
    case "Paprika":
      bagMesh.rotation.x = 0;
      bagMesh.position.x = 0;
      break;
    case "Naturel":
      bagMesh.rotation.x = 0.15;
      bagMesh.position.x = -0.3;
      break;
    case "Sweet Chili":
      bagMesh.rotation.x = -0.15;
      bagMesh.position.x = 0.3;
      break;
  }

  feedback.textContent = `Je hebt "${flavour}" geselecteerd.`;
});

// 3) Spice level → lichtkleur + intensiteit
spiceSlider.addEventListener("input", () => {
  const level = Number(spiceSlider.value); // 0–10
  const t = level / 10; // 0–1

  // Van warm wit naar roder licht
  const r = 1;
  const g = 1 - 0.5 * t;
  const b = 1 - 0.5 * t;

  dirLight.color.setRGB(r, g, b);
  dirLight.intensity = 1 + 0.5 * t;

  feedback.textContent = `Pittigheid: ${level}/10`;
});

// === BESTEL-FLOW ===
saveBtn.addEventListener("click", async () => {
  const flavour = flavourSelect.value;
  const color = colorInput.value;
  const spice = spiceSlider.value;

  if (!bagMesh) {
    feedback.textContent = "Model wordt nog geladen, probeer zo meteen opnieuw.";
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
    name: `Custom bag - ${flavour}`,
    flavour,
    color,
    spiceLevel: spice,
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

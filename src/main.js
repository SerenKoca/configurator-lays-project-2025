import * as THREE from 'three';
import axios from 'axios';

const API_BASE_URL = 'https://api-lays-project-2025.onrender.com'; // API

// HTML elementen
const flavourSelect = document.getElementById('flavour');
const colorInput = document.getElementById('color');
const saveBtn = document.getElementById('saveBtn');
const canvas = document.getElementById('three-canvas');

// THREE.js basics
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// "Chipszak" = gewoon een box
const geometry = new THREE.BoxGeometry(1, 2, 0.5);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const bagMesh = new THREE.Mesh(geometry, material);
scene.add(bagMesh);

// licht
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 5);
scene.add(light);

camera.position.z = 5;

// animatie
function animate() {
  requestAnimationFrame(animate);
  bagMesh.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();

// Kleur updaten
colorInput.addEventListener('input', () => {
  const hex = colorInput.value; // bv "#ff0000"
  bagMesh.material.color = new THREE.Color(hex);
});

// Config POSTen naar je API
saveBtn.addEventListener('click', async () => {
  const flavour = flavourSelect.value;
  const color = colorInput.value;

  // Opbouw zak
  const payload = {
    name: `Custom bag - ${flavour}`,
    flavour: flavour,
  };

  try {
    const res = await axios.post(`${API_BASE_URL}/bag`, payload);
    alert('Configuratie opgeslagen! ID: ' + res.data._id);
  } catch (err) {
    console.error(err);
    alert('Opslaan mislukt.');
  }
});

// resize support
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

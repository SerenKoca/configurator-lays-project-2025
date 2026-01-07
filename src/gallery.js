import axios from "axios";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getToken, isAuthenticated } from "./auth.js";

const API_BASE_URL = "https://api-lays-project-2025.onrender.com";

const loadingElement = document.getElementById("loading");
const errorElement = document.getElementById("error");
const bagsContainer = document.getElementById("bags-container");

// Track current tab and all bags
let currentTab = "all";
let allBags = [];
let myBags = [];
let currentUserId = null;

// Store voted bag IDs in localStorage per user
const VOTED_BAGS_KEY_PREFIX = "votedBags_";

function getVotedBagsKey() {
  // Create a unique key for each user
  // If no user is logged in, use a generic key (for anonymous voting)
  return currentUserId ? `${VOTED_BAGS_KEY_PREFIX}${currentUserId}` : `${VOTED_BAGS_KEY_PREFIX}anonymous`;
}

function getVotedBags() {
  const voted = localStorage.getItem(getVotedBagsKey());
  return voted ? JSON.parse(voted) : [];
}

function addVotedBag(bagId) {
  const voted = getVotedBags();
  if (!voted.includes(bagId)) {
    voted.push(bagId);
    localStorage.setItem(getVotedBagsKey(), JSON.stringify(voted));
  }
}

function hasVoted(bagId) {
  return getVotedBags().includes(bagId);
}

// Fetch all bags from API
async function fetchAllBags() {
  try {
    const response = await axios.get(`${API_BASE_URL}/bag`);
    return response.data;
  } catch (error) {
    console.error("Error fetching bags:", error);
    throw error;
  }
}

// Fetch user's own bags
async function fetchMyBags(userId) {
  if (!userId) return [];
  
  try {
    // Fetch all bags and filter by userId on client side
    const allBags = await fetchAllBags();
    const myBags = allBags.filter(bag => {
      const bagUserId = bag.userId;
      console.log("Comparing bag userId:", bagUserId, "with current userId:", userId);
      return String(bagUserId) === String(userId);
    });
    console.log("Filtered", myBags.length, "bags for user", userId);
    return myBags;
  } catch (error) {
    console.error("Error filtering my bags:", error);
    return [];
  }
}

// Vote for a bag
async function voteForBag(bagId) {
  try {
    const token = getToken();
    const response = await axios.post(
      `${API_BASE_URL}/bag/${bagId}/vote`,
      {},
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error voting for bag:", error);
    throw error;
  }
}

// Delete a bag
async function deleteBag(bagId) {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("You must be logged in to delete bags");
    }
    
    const response = await axios.delete(`${API_BASE_URL}/bag/${bagId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting bag:", error);
    throw error;
  }
}

// Get current user info
async function getCurrentUser() {
  try {
    const token = getToken();
    if (!token) return null;
    
    // Try to get user from API first (if endpoint exists)
    // Use validateStatus to avoid logging 404 as an error
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status === 200 // Only accept 200 as success
      });
      console.log("Current user:", response.data);
      return response.data;
    } catch (e) {
      // Endpoint doesn't exist or other error - use token fallback
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("User decoded from token");
        return { _id: payload.userId || payload.id, id: payload.userId || payload.id };
      } catch (decodeError) {
        console.error("Error decoding token:", decodeError);
        return null;
      }
    }
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Create spice level indicator
function createSpiceIndicator(level) {
  const chilis = "🌶️".repeat(Math.min(level, 10));
  return `<span class="spice-indicator" title="Spice level: ${level}/10">${chilis || "No spice"}</span>`;
}

// Apply brand name texture to text part
function applyBrandNameTexture(textPart, name, fontStyle, bagColor) {
  if (!textPart) return;
  
  // Create canvas for text texture
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 512;
  
  // Clear canvas with the bag color as background
  const bgColor = bagColor || '#FF0000';
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

// Apply logo texture to bottom part
function applyLogoTexture(bottomPart, imageName) {
  if (!bottomPart || !bottomPart.material) return;
  
  // Load the selected image as texture
  const textureLoader = new THREE.TextureLoader();
  
  // Use the selected image or default to Lays logo
  const imagePath = imageName ? `/assets/images/${imageName}` : '/assets/images/Lays_brand_logo.png';
  
  textureLoader.load(
    imagePath,
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
    },
    undefined,
    (error) => {
      console.error('Error loading image:', error, imagePath);
    }
  );
}

// Create 3D model for a bag
function create3DModel(bag, container) {
  const width = 280;
  const height = 280;
  
  // Create scene
  const scene = new THREE.Scene();
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.5, 4);
  
  // Create renderer
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  
  container.appendChild(canvas);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(2, 4, 3);
  dirLight.castShadow = true;
  scene.add(dirLight);
  
  // Load model
  const loader = new GLTFLoader();
  loader.load(
    "./assets/models/bag.glb",
    (gltf) => {
      const bagMesh = gltf.scene;
      let bagPart, bottomPart, textPart;
      
      bagMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.name === "Plane_Bag") {
            bagPart = child;
            // Apply bag color
            if (bagPart && bag.bagColor) {
              bagPart.material.color = new THREE.Color(bag.bagColor);
            }
          }
          if (child.name === "Plane_Bottom") {
            bottomPart = child;
          }
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
      
      bagMesh.position.set(0, 1.5, 0);
      scene.add(bagMesh);
      
      // Apply brand name text
      if (textPart && bag.name) {
        applyBrandNameTexture(textPart, bag.name, bag.fontStyle || "allcaps", bag.bagColor);
      }
      
      // Apply logo image (always apply the logo)
      if (bottomPart) {
        applyLogoTexture(bottomPart, bag.selectedImage);
      }
      
      // Animation loop
      function animate() {
        //bagMesh.rotation.y += 0.005;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }
      animate();
    },
    undefined,
    (error) => {
      console.error("Error loading model:", error);
      container.innerHTML = '<div style="width: 280px; height: 280px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 8px;">Model not available</div>';
    }
  );
}

// Render a single bag card
function renderBagCard(bag, showDelete = false) {
  const voted = hasVoted(bag._id);
  const votes = bag.votes || 0;
  const isMyBag = currentUserId && String(bag.userId) === String(currentUserId);

  const card = document.createElement("div");
  card.className = "bag-card";
  card.setAttribute("data-bag-id", bag._id);
  card.innerHTML = `
    <div class="bag-3d-preview"></div>
    <div class="bag-info">
      <h3>${bag.name || "Unnamed Bag"}</h3>
      <div class="bag-detail">
        <strong>Flavour:</strong>
        <span>${bag.flavour || "N/A"}</span>
      </div>
      <div class="bag-detail">
        <strong>Color:</strong>
        <span class="bag-color-preview" style="background-color: ${bag.bagColor || "#ccc"}"></span>
      </div>
      <div class="bag-detail">
        <strong>Spice Level:</strong>
        <span class="spice-level">${createSpiceIndicator(bag.spiceLevel)}</span>
      </div>
    </div>
    <div class="vote-section">

      <div class="action-buttons">
        ${showDelete && isMyBag ? `
          <button class="delete-btn" data-bag-id="${bag._id}">
            🗑️ Delete
          </button>
        ` : `
          <button 
            class="vote-btn ${voted ? "voted" : ""}" 
            data-bag-id="${bag._id}"
            ${voted ? "disabled" : ""}
          >
            ${voted ? "✓ Voted" : "Vote"}
          </button>
        `}
      </div>
    </div>
  `;

  // Add 3D model to the preview container
  const previewContainer = card.querySelector(".bag-3d-preview");
  create3DModel(bag, previewContainer);

  // Add vote button event listener
  const voteBtn = card.querySelector(".vote-btn");
  if (voteBtn) {
    voteBtn.addEventListener("click", async () => {
    if (hasVoted(bag._id)) return;

    voteBtn.disabled = true;
    voteBtn.textContent = "Voting...";

    try {
      await voteForBag(bag._id);
      
      // Success - mark as voted and update UI
      addVotedBag(bag._id);
      bag.votes = (bag.votes || 0) + 1;
      
      const voteCountElement = card.querySelector(".vote-count");
      if (voteCountElement) {
        voteCountElement.textContent = `❤️ ${bag.votes} ${bag.votes === 1 ? "vote" : "votes"}`;
      }
      
      voteBtn.textContent = "✓ Voted";
      voteBtn.classList.add("voted");
      voteBtn.disabled = true;
    } catch (error) {
      console.error("Vote error:", error);
      
      // Reset button state on error
      voteBtn.disabled = false;
      voteBtn.textContent = "Vote";
      voteBtn.classList.remove("voted");
    }
  });
  }

  // Add delete button event listener
  const deleteBtn = card.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this bag? This action cannot be undone.")) {
        return;
      }

      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting...";

      try {
        await deleteBag(bag._id);
        
        // Remove from both arrays
        allBags = allBags.filter(b => b._id !== bag._id);
        myBags = myBags.filter(b => b._id !== bag._id);
        
        // Remove card from UI with animation
        card.style.transition = "opacity 0.3s, transform 0.3s";
        card.style.opacity = "0";
        card.style.transform = "scale(0.8)";
        
        setTimeout(() => {
          card.remove();
          
          // Check if no bags left
          if (bagsContainer.children.length === 0) {
            renderBags([]);
          }
        }, 300);
      } catch (error) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "🗑️ Delete";
        alert("Failed to delete. " + (error.response?.data?.message || error.message));
      }
    });
  }

  return card;
}

// Render all bags
function renderBags(bags, showDelete = false) {
  bagsContainer.innerHTML = "";
  
  if (!bags || bags.length === 0) {
    bagsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: white; font-size: 1.5rem; padding: 40px;">
        ${currentTab === "my" ? "You haven't created any bags yet. Go to the configurator to create one!" : "No bags created yet. Be the first to create one!"}
      </div>
    `;
    return;
  }

  // Sort bags by votes (descending)
  const sortedBags = [...bags].sort((a, b) => (b.votes || 0) - (a.votes || 0));

  sortedBags.forEach(bag => {
    const card = renderBagCard(bag, showDelete);
    bagsContainer.appendChild(card);
  });
}

// Filter bags based on current tab
function filterBags() {
  console.log("Current tab:", currentTab);
  console.log("Current user ID:", currentUserId);
  
  if (currentTab === "all") {
    renderBags(allBags, false);
  } else if (currentTab === "my") {
    console.log("My bags:", myBags);
    renderBags(myBags, true);
  }
}

// Initialize gallery
async function initGallery() {
  try {
    loadingElement.style.display = "block";
    errorElement.style.display = "none";

    // Fetch current user and bags in parallel
    const [user, bags] = await Promise.all([
      getCurrentUser(),
      fetchAllBags()
    ]);
    
    currentUserId = user?._id || user?.id;
    console.log("Initialized with user ID:", currentUserId);
    allBags = bags;
    myBags = currentUserId ? await fetchMyBags(currentUserId) : [];
    console.log("Fetched", allBags.length, "total bags and", myBags.length, "user bags");
    
    loadingElement.style.display = "none";
    filterBags();
  } catch (error) {
    loadingElement.style.display = "none";
    errorElement.style.display = "block";
    errorElement.textContent = "Failed to load bags. Please try again later.";
    console.error("Error initializing gallery:", error);
  }
}

// Start the gallery when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initGallery();
  
  // Setup tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Update active tab
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Update current tab and render
      currentTab = btn.dataset.tab;
      filterBags();
    });
  });
});

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createScene } from './scene.js';
import { setupHands, updateHands, getHandGestures } from './hands.js';
import { AIAgent } from './ai-agent.js';

// Init
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3);

// Renderer - preserveDrawingBuffer needed for AI vision snapshots
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// VR Button
document.body.appendChild(VRButton.createButton(renderer));

// Scene Content
createScene(scene);

// Hands
setupHands(renderer, scene);

// AI Agent
const agent = new AIAgent(scene, camera, renderer);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Handling for Overlay
const overlay = document.getElementById('overlay');
const statusDiv = document.getElementById('status');

renderer.xr.addEventListener('sessionstart', () => {
    overlay.style.display = 'none';
    // Play startup sound
    const audio = new Audio('/startup.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.warn("Audio play failed", e));
});

renderer.xr.addEventListener('sessionend', () => {
    overlay.style.display = 'flex';
    statusDiv.innerHTML = "VR Session ended.<br>Click 'Enter VR' to restart.";
});

// Loop
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    
    updateHands();
    
    const handData = getHandGestures();
    agent.update(delta, handData);
    
    renderer.render(scene, camera);
});

// Check WebXR support for status update
if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
            statusDiv.textContent = "VR Supported. Press the 'ENTER VR' button below.";
        } else {
            statusDiv.innerHTML = "VR Not Supported on this device.<br>Please use a Quest or WebXR compatible headset.";
        }
    });
} else {
    statusDiv.textContent = "WebXR not available in this browser.";
}


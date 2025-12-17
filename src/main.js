import * as THREE from 'three';
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

// UI Handling
const overlay = document.getElementById('overlay');
const statusDiv = document.getElementById('status');
const uiPanel = document.getElementById('ui-panel');

// Create Custom VR Button
const vrButton = document.createElement('button');
vrButton.textContent = "ENTER VR";
vrButton.style.display = 'none';
uiPanel.appendChild(vrButton);

let currentSession = null;

async function onEnterVR() {
    if (currentSession) return;
    
    // Prevent double clicks
    vrButton.disabled = true;
    vrButton.textContent = "INITIALIZING...";

    const sessionInit = { 
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] 
    };

    try {
        const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
        renderer.xr.setSession(session);
        currentSession = session;
        session.addEventListener('end', onSessionEnd);
        
        // Hide overlay on success
        overlay.style.display = 'none';
        
        // Sound
        const audio = new Audio('/startup.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Audio play failed", e));

    } catch (e) {
        console.error("Failed to start VR session:", e);
        statusDiv.textContent = "Could not enter VR: " + e.message;
        resetVRButton();
    }
}

function onSessionEnd() {
    currentSession = null;
    overlay.style.display = 'flex';
    statusDiv.textContent = "VR Session Ended";
    resetVRButton();
}

function resetVRButton() {
    vrButton.disabled = false;
    vrButton.textContent = "ENTER VR";
}

vrButton.addEventListener('click', onEnterVR);

// Check WebXR support
if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
            vrButton.style.display = 'inline-block';
            statusDiv.textContent = "Ready for VR. Hand tracking required.";
        } else {
            statusDiv.innerHTML = "VR Not Supported on this device.<br>Please use a Meta Quest or WebXR compatible headset.";
            vrButton.style.display = 'none';
        }
    });
} else {
    statusDiv.textContent = "WebXR not available in this browser.";
}

// Loop
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    
    updateHands();
    
    const handData = getHandGestures();
    agent.update(delta, handData);
    
    renderer.render(scene, camera);
});


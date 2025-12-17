import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

let hand1, hand2;
let handModels = { left: null, right: null };

export function setupHands(renderer, scene) {
    const handModelFactory = new XRHandModelFactory();

    // Hand 0
    hand1 = renderer.xr.getHand(0);
    scene.add(hand1);
    const handModel1 = handModelFactory.createHandModel(hand1, 'mesh');
    hand1.add(handModel1);
    handModels.left = hand1;

    // Hand 1
    hand2 = renderer.xr.getHand(1);
    scene.add(hand2);
    const handModel2 = handModelFactory.createHandModel(hand2, 'mesh');
    hand2.add(handModel2);
    handModels.right = hand2;
}

export function updateHands() {
    // Internal updates if needed by the factory, usually auto-handled
}

export function getHandGestures() {
    if (!handModels.left || !handModels.right) return { summary: "Hands initializing" };

    let data = {
        left: detectGesture(handModels.left),
        right: detectGesture(handModels.right),
        summary: ""
    };

    let parts = [];
    if (data.left) parts.push(`Left hand is ${data.left}`);
    if (data.right) parts.push(`Right hand is ${data.right}`);
    
    if (parts.length === 0) {
        data.summary = "Hands not visible";
    } else {
        data.summary = parts.join(", ");
    }

    return data;
}

function detectGesture(hand) {
    // Basic check if hand is tracking
    if (!hand || !hand.visible) return null;
    
    // If the mesh is present, we can infer it's tracking
    // The hand group position is relative to the camera rig parent usually
    // In standard three.js VR, hand group position is in world space if not parented to a rig, 
    // or local to camera offset. We are adding hands to Scene directly.
    
    const pos = hand.position;
    
    // Basic heuristics
    if (pos.y > 1.6) return "raised high (waving?)";
    if (pos.y < 0.8) return "lowered";
    if (pos.z < -0.5) return "reaching out";
    
    // Check joints if we can access the underlying controller/joint data easily, 
    // but for now positional heuristics are safer across different XR implementations
    
    return "active in front";
}


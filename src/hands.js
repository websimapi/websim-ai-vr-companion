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
    if (!hand || !hand.children.length) return null;
    
    // Simple heuristic-based detection
    // Note: The mesh model might not expose joints directly in a simple array in all versions, 
    // but we can check position/rotation of the controller group.
    
    // For robust logic, we'd traverse hand.joints, but to keep it lightweight:
    // We will check simple height and rotation.

    const y = hand.position.y;
    
    if (y > 1.6) return "raised high (waving?)";
    if (y < 0.8) return "lowered";
    
    // We can assume if it's visible it's "interacting"
    return "active";
}


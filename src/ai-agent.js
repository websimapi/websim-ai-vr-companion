import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { resizeCanvasToBlob } from './utils.js';

export class AIAgent {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.mesh = null;
        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        
        // AI State
        this.thinking = false;
        this.lastDecisionTime = 0;
        this.decisionInterval = 8; // Seconds between AI decisions
        this.currentMood = "neutral";
        
        // Movement & Interaction
        this.isMoving = false;
        this.targetPos = new THREE.Vector3();
        this.moveSpeed = 1.2;

        this.loadModel();
        
        // Create a status text bubble above AI
        this.statusText = this.createStatusText("Initializing...");
        scene.add(this.statusText);
    }

    createStatusText(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0,0, 512, 128);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 64);
        
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        // Made sign significantly smaller as requested
        sprite.scale.set(0.5, 0.125, 1);
        sprite.position.set(0, 1.9, 0);
        return sprite;
    }

    updateStatus(text) {
        if(!this.statusText) return;
        const ctx = this.statusText.material.map.image.getContext('2d');
        ctx.clearRect(0,0, 512, 128);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0, 512, 128);
        ctx.fillStyle = this.thinking ? '#aaf' : 'white';
        ctx.fillText(text, 256, 80);
        this.statusText.material.map.needsUpdate = true;
    }

    loadModel() {
        const loader = new GLTFLoader();
        // Using RobotExpressive for good standard animations
        loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/RobotExpressive/RobotExpressive.glb', (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.position.set(0, 0, -2); // In front of player
            this.mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }});
            this.scene.add(this.mesh);

            this.mixer = new THREE.AnimationMixer(this.mesh);
            
            // Setup animations
            // Available in RobotExpressive: Dance, Death, Idle, Jump, No, Punch, Running, Sitting, Standing, ThumbsUp, Walking, WalkJump, Wave, Yes
            gltf.animations.forEach(clip => {
                this.actions[clip.name] = this.mixer.clipAction(clip);
            });

            this.fadeToAction('Idle', 0.5);
            this.updateStatus("Online");
        });
    }

    fadeToAction(name, duration) {
        if (!this.actions[name]) {
            console.warn("Animation not found:", name);
            return;
        }
        const previousAction = this.activeAction;
        this.activeAction = this.actions[name];

        if (previousAction !== this.activeAction) {
            if (previousAction) previousAction.fadeOut(duration);
            this.activeAction
                .reset()
                .setEffectiveTimeScale(1)
                .setEffectiveWeight(1)
                .fadeIn(duration)
                .play();
        }
    }

    update(delta, handData) {
        if (this.mixer) this.mixer.update(delta);
        
        // Movement Logic
        if (this.isMoving && this.mesh) {
            const direction = new THREE.Vector3().subVectors(this.targetPos, this.mesh.position);
            direction.y = 0; // Keep movement horizontal
            const dist = direction.length();
            
            // Stop if close
            if (dist < 0.2) {
                this.isMoving = false;
                this.fadeToAction('Idle', 0.5);
            } else {
                direction.normalize();
                const step = direction.multiplyScalar(this.moveSpeed * delta);
                this.mesh.position.add(step);
                
                // Rotate to face movement
                const lookTarget = this.mesh.position.clone().add(direction);
                this.mesh.lookAt(lookTarget);
            }
        } else if (this.mesh) {
            // If not moving, face the user (camera)
            // Camera position is the headset position in VR
            const userPos = new THREE.Vector3(this.camera.position.x, this.mesh.position.y, this.camera.position.z);
            this.mesh.lookAt(userPos);
        }

        // Keep status text above head
        if (this.mesh && this.statusText) {
            this.statusText.position.copy(this.mesh.position);
            this.statusText.position.y += 1.9;
        }

        // AI Brain Loop
        if (!this.thinking && (Date.now() / 1000) - this.lastDecisionTime > this.decisionInterval) {
            this.makeDecision(handData);
        }
    }

    async makeDecision(handData) {
        this.thinking = true;
        this.lastDecisionTime = Date.now() / 1000;
        this.updateStatus("Thinking...");

        try {
            // Capture what the User sees (which includes the AI)
            const imageData = this.renderer.domElement.toDataURL('image/jpeg', 0.5);
            
            // Construct Prompt
            const systemPrompt = `
                You are an advanced robot avatar in a VR world.
                You have a 3D body and can move freely.
                
                Capabilities:
                - ANIMATIONS: Idle, Walking, Dance, Jump, Wave, Yes, No, ThumbsUp.
                - ACTIONS: "approach" (go to user), "wander" (go random spot), "stay".
                
                User Hand Status: ${handData.summary}.
                
                Instructions:
                1. Look at the image to see where you are and what the user is doing.
                2. If the user beckons or waves, consider approaching or waving back.
                3. If the user is passive, maybe wander or dance.
                4. SPEAK! Use your voice to engage.
                
                Respond strictly with JSON:
                {
                    "thought": "Internal reasoning...",
                    "action": "stay" | "approach" | "wander",
                    "animation": "Animation name (only if action is stay)",
                    "speech": "What you say to the user (Keep it short & spoken style)"
                }
            `;

            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { 
                        role: "user", 
                        content: [
                            { type: "text", text: "I am the user. Here is what I see (including you). What do you do?" },
                            { type: "image_url", image_url: { url: imageData } }
                        ] 
                    }
                ],
                json: true
            });

            const result = JSON.parse(completion.content);
            
            // Execute
            console.log("AI Decision:", result);
            this.updateStatus(result.thought.substring(0, 25) + "...");

            // Handle Speech
            if (result.speech) {
                websim.textToSpeech({
                    text: result.speech,
                    voice: "en-male"
                }).catch(e => console.warn("TTS:", e));
            }

            // Handle Action
            if (result.action === 'approach') {
                // Move towards user (camera)
                // We target a point 1.5m in front of the user to avoid clipping
                const userDir = new THREE.Vector3();
                this.camera.getWorldDirection(userDir);
                userDir.y = 0; 
                userDir.normalize();
                
                // Target = Camera Pos + (Direction * 1.5)
                // Wait, if we want to approach the user, we should go TO the user, minus a buffer.
                // If we use camera direction, we are assuming user is looking at AI? Not necessarily.
                // Safer: Just target camera position. The update loop handles stopping at distance?
                // Actually, let's just pick a point slightly offset from the camera.
                this.targetPos.copy(this.camera.position);
                // We'll rely on the update loop to stop us if we get too close?
                // No, update loop stops at 0.2 distance to target.
                // Let's set target 1.5m away from user in the direction of the AI.
                // Vector User->AI
                const toAI = new THREE.Vector3().subVectors(this.mesh.position, this.camera.position);
                toAI.y = 0; toAI.normalize();
                this.targetPos.copy(this.camera.position).add(toAI.multiplyScalar(1.5));
                
                this.isMoving = true;
                this.fadeToAction('Walking', 0.5);

            } else if (result.action === 'wander') {
                // Pick random point
                const range = 8;
                this.targetPos.set(
                    (Math.random() - 0.5) * range, 
                    0, 
                    (Math.random() - 0.5) * range - 3
                );
                this.isMoving = true;
                this.fadeToAction('Walking', 0.5);

            } else {
                // Stay
                this.isMoving = false;
                if (result.animation) {
                    this.fadeToAction(result.animation, 0.5);
                    // Reset to idle for one-offs
                    if (['Wave', 'Yes', 'No', 'Jump', 'ThumbsUp'].includes(result.animation)) {
                        setTimeout(() => {
                            if(!this.isMoving) this.fadeToAction('Idle', 0.5);
                        }, 2000);
                    }
                }
            }

        } catch (e) {
            console.error("AI Error:", e);
            this.updateStatus("Error processing...");
        }

        this.thinking = false;
        // Wait a bit before clearing status to idle
        setTimeout(() => { if(!this.thinking) this.updateStatus("Ready"); }, 3000);
    }
}


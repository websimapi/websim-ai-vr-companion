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
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0, 512, 128);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, 256, 80);
        
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1, 0.25, 1);
        sprite.position.set(0, 2, 0);
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
            const states = ['Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing', 'Jump', 'Wave', 'Yes', 'No'];
            
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
        
        // Keep status text above head
        if (this.mesh && this.statusText) {
            this.statusText.position.x = this.mesh.position.x;
            this.statusText.position.z = this.mesh.position.z;
            this.statusText.position.y = this.mesh.position.y + 2.2;
        }

        // AI Brain Loop
        const now = this.scene.getObjectByName("clock") ? 0 : Date.now() / 1000; // Use system time
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
                You are a robot avatar in a VR world.
                You control a 3D body. 
                You are shown an image of what the user sees (which includes YOU).
                
                You have these animations available: Idle, Walking, Dance, Jump, Wave, Yes, No.
                
                The user's hand status: ${handData.summary}.
                
                Decide on your reaction.
                Respond strictly with JSON:
                {
                    "thought": "Internal reasoning...",
                    "animation": "One of the available animations",
                    "speech": "What you want to say to the user (keep it short)"
                }
            `;

            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { 
                        role: "user", 
                        content: [
                            { type: "text", text: "Here is the current situation." },
                            { type: "image_url", image_url: { url: imageData } }
                        ] 
                    }
                ],
                json: true
            });

            const result = JSON.parse(completion.content);
            
            // Execute
            console.log("AI Decision:", result);
            this.updateStatus(result.thought.substring(0, 20) + "...");
            
            if (result.animation) {
                // If walking, move the mesh a bit (simulation)
                if (result.animation === 'Walking') {
                    // Simple random walk logic could go here, for now just play anim
                }
                this.fadeToAction(result.animation, 0.5);
                
                // Return to idle after action unless it's a loop state
                if (['Wave', 'Yes', 'No', 'Jump'].includes(result.animation)) {
                    setTimeout(() => this.fadeToAction('Idle', 0.5), 2000);
                }
            }

            if (result.speech) {
                await websim.textToSpeech({
                    text: result.speech,
                    voice: "en-male" // Robot voice
                });
            }

        } catch (e) {
            console.error("AI Error:", e);
            this.updateStatus("Error processing...");
        }

        this.thinking = false;
        // Wait a bit before clearing status to idle
        setTimeout(() => { if(!this.thinking) this.updateStatus("Ready"); }, 2000);
    }
}

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
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0, 512, 128);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, 256, 80);
        
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1, 0.25, 1);
        sprite.position.set(0, 2, 0);
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
        
        // Keep status text above head
        if (this.mesh && this.statusText) {
            this.statusText.position.x = this.mesh.position.x;
            this.statusText.position.z = this.mesh.position.z;
            this.statusText.position.y = this.mesh.position.y + 2.2;
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
                You are a robot avatar in a VR world.
                You control a 3D body. 
                You are shown an image of what the user sees (which includes YOU).
                
                You have these animations available: Idle, Walking, Dance, Jump, Wave, Yes, No, ThumbsUp.
                
                The user's hand status: ${handData.summary}.
                
                Decide on your reaction.
                Respond strictly with JSON:
                {
                    "thought": "Internal reasoning...",
                    "animation": "One of the available animations",
                    "speech": "What you want to say to the user (keep it short)"
                }
            `;

            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { 
                        role: "user", 
                        content: [
                            { type: "text", text: "Here is the current situation. I am the user looking at you." },
                            { type: "image_url", image_url: { url: imageData } }
                        ] 
                    }
                ],
                json: true
            });

            const result = JSON.parse(completion.content);
            
            // Execute
            console.log("AI Decision:", result);
            this.updateStatus(result.thought.substring(0, 20) + "...");
            
            if (result.animation) {
                this.fadeToAction(result.animation, 0.5);
                
                // Return to idle after action unless it's a loop state
                if (['Wave', 'Yes', 'No', 'Jump', 'ThumbsUp'].includes(result.animation)) {
                    setTimeout(() => this.fadeToAction('Idle', 0.5), 2000);
                }
            }

            if (result.speech) {
                await websim.textToSpeech({
                    text: result.speech,
                    voice: "en-male" // Robot voice
                });
            }

        } catch (e) {
            console.error("AI Error:", e);
            this.updateStatus("Error processing...");
        }

        this.thinking = false;
        // Wait a bit before clearing status to idle
        setTimeout(() => { if(!this.thinking) this.updateStatus("Ready"); }, 2000);
    }
}


import * as THREE from 'three';

export function createScene(scene) {
    // Hemisphere Light (Ambient)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Directional Light (Sun/Shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(3, 10, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = -2;
    dirLight.shadow.camera.left = -2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.mapSize.width = 1024; // Lower res for Quest performance
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a, 
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Helper
    const grid = new THREE.GridHelper(50, 50, 0x888888, 0x222222);
    scene.add(grid);

    // Mirror (Optional, represents a reflective surface)
    const mirrorGeo = new THREE.PlaneGeometry(2, 3);
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.1, metalness: 0.9 });
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.position.set(0, 1.5, -4);
    mirror.receiveShadow = true;
    scene.add(mirror);
}

import * as THREE from 'three';

export function createScene(scene) {
    // Hemisphere Light (Ambient)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Directional Light (Sun/Shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(3, 10, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = -2;
    dirLight.shadow.camera.left = -2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.mapSize.width = 1024; // Lower res for Quest performance
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a, 
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Helper
    const grid = new THREE.GridHelper(50, 50, 0x888888, 0x222222);
    scene.add(grid);

    // Mirror (Optional, represents a reflective surface)
    const mirrorGeo = new THREE.PlaneGeometry(2, 3);
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.1, metalness: 0.9 });
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.position.set(0, 1.5, -4);
    mirror.receiveShadow = true;
    scene.add(mirror);
}


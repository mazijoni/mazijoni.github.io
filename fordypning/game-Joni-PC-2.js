// No import statements needed when using <script> tags in HTML

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableRotate = true;
controls.mouseButtons = { RIGHT: THREE.MOUSE.PAN, LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY };

const loader = new THREE.GLTFLoader();

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

scene.fog = new THREE.Fog(0x4578B0FF, 10, 250); // (color, near, far)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const hexRadius = 2;
scene.background = new THREE.Color(0x4578B0FF);

const TILE_GRASS = 'grass';
const TILE_GRASS_DARK = 'dark_grass';
const TILE_GRASS_TALL = 'tall_grass';
const TILE_STONE = 'stone';
const TILE_STONE_TALL = 'tall_stone';

const models = []; //array
const modelPaths = [
    ['assets/tiles_grass.glb', TILE_GRASS],
    ['assets/tiles_grass_dark.glb', TILE_GRASS],
    ['assets/tiles_grass_tall.glb', TILE_GRASS_TALL],
    ['assets/tiles_stone.glb', TILE_STONE],
    ['assets/tiles_stone_tall.glb', TILE_STONE_TALL]
];

let isDay = true; // Start with day
const DAY_LENGTH = 100000; // Length of day in milliseconds
const NIGHT_LENGTH = 100000; // Length of night in milliseconds

function interpolateColor(color1, color2, factor) {
    const r = color1.r + (color2.r - color1.r) * factor;
    const g = color1.g + (color2.g - color1.g) * factor;
    const b = color1.b + (color2.b - color1.b) * factor;
    return new THREE.Color(r, g, b);
}

function transitionDayNight(startColor, endColor, duration, onComplete) {
    const startTime = Date.now();

    function animateTransition() {
        const elapsedTime = Date.now() - startTime;
        const factor = Math.min(elapsedTime / duration, 1); // Clamp factor to [0, 1]

        const interpolatedColor = interpolateColor(startColor, endColor, factor);
        ambientLight.color.copy(interpolatedColor);
        scene.fog.color.copy(interpolatedColor);
        scene.background.copy(interpolatedColor);

        if (factor < 1) {
            requestAnimationFrame(animateTransition);
        } else if (onComplete) {
            onComplete();
        }
    }

    animateTransition();
}

const switchToDay = () => {
    isDay = true;
    transitionDayNight(
        new THREE.Color(0x000000), // Night color
        new THREE.Color(0x4578B0FF), // Original day color
        2000, // Transition duration in milliseconds
        () => {
            ambientLight.color.set(0xffffff); // Reset ambient light color to white

            // Remove all enemies from the scene
            enemies.forEach((enemy) => {
                scene.remove(enemy);
            });
            enemies = []; // Clear the enemies array
        }
    );
    return DAY_LENGTH;
};

const ENEMY_MODEL_PATH = 'assets/enemy.glb';
let enemyModel = null;
let enemies = []; // Array to store spawned enemies

// Load the enemy model
loader.load(ENEMY_MODEL_PATH, (gltf) => {
    enemyModel = gltf.scene;
    enemyModel.scale.set(1, 1, 1); // Adjust scale as needed
}, undefined, (error) => {
    console.error('Error loading enemy model:', error);
});

// Function to spawn an enemy at a random position
function spawnEnemy() {
    if (!enemyModel) return; // Ensure the model is loaded

    const enemyInstance = enemyModel.clone();

    // Generate a random position within the map boundaries
    const x = (Math.random() - 0.5) * 100; // Adjust range as needed
    const z = (Math.random() - 0.5) * 100; // Adjust range as needed

    // Ensure the enemy is not too close to the center (base)
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    if (distanceFromCenter < 10) { // Minimum distance from the base
        return spawnEnemy(); // Retry spawning
    }

    enemyInstance.position.set(x, 0, z); // Set position
    enemyInstance.userData.health = 25; // Set initial health to 50
    enemyInstance.userData.lastAttackTime = 0; // Initialize last attack time

    // Add a red glow effect to the enemy
    const redGlow = new THREE.PointLight(0xff0000, 5, 10); // Red light, intensity 1, range 10
    redGlow.position.set(0, 2, 0); // Position the light slightly above the enemy
    enemyInstance.add(redGlow); // Attach the light to the enemy

    scene.add(enemyInstance);
    enemies.push(enemyInstance); // Add to the enemies array
}

// Update the `switchToNight` function to spawn enemies
const switchToNight = () => {
    isDay = false;
    transitionDayNight(
        new THREE.Color(0x4578B0FF), // Day color
        new THREE.Color(0x000000), // Night color
        2000, // Transition duration in milliseconds
        () => {
            // Spawn enemies
            const numberOfEnemies = Math.floor(Math.random() * 5) + 1; // Spawn 1-5 enemies
            for (let i = 0; i < numberOfEnemies; i++) {
                spawnEnemy();
            }
        }
    );
    return NIGHT_LENGTH;
};

const toggleDayNight = () => {
    let time = 0;
    if (isDay) {
        time = switchToNight();
    } else {
        time = switchToDay();
    }
    setTimeout(toggleDayNight, time); // Switch back to day after night length
}
setTimeout(toggleDayNight, DAY_LENGTH); // Switch to night after day length

let loadedModels = 0;
const tileData = []; // Store tile positions and types

// Load models
modelPaths.forEach(([path, modelType], index) => {
    loader.load(path, (gltf) => {
        models[index] = gltf.scene;
        models[index].scale.set(1, 1, 1);
        models[index].userData.modelType = modelType;
        loadedModels++;
        if (loadedModels === modelPaths.length) {
            generateHexGrid(45, 55); //grid size
        }
    }, undefined, (error) => {
        console.error(`\Error loading model at ${path}:`, error);
    });
});

const RESOURCE_TREE = 'wood';
const RESOURCE_ROCK = 'stone';
const RESOURCE_DIAMOND = 'diamond';

const objectPaths = [
    ['assets/tree_1.glb', RESOURCE_TREE],
    ['assets/tree_2.glb', RESOURCE_TREE],
    ['assets/rock.glb', RESOURCE_ROCK],
    ['assets/diamand.glb', RESOURCE_DIAMOND]
];

const objectModels = [];
let objectModelsLoaded = 0;

// Load object models
const loadObject = ([path, resourceType], index) => {
    loader.load(path, (gltf) => {
        objectModels[index] = gltf.scene;
        objectModels[index].scale.set(2, 2, 2);
        objectModels[index].userData.resourceType = resourceType;
        objectModelsLoaded++;
        if (objectModelsLoaded === objectPaths.length) {
            placeObjectsOnGrid();
        }
    }, undefined, (error) => {
        console.error('Error loading object at ${path}:', error);
    });
}

objectPaths.forEach(loadObject);

function createHexInstance(model, x, y, z, type) {
    let hexInstance = model.clone();
    hexInstance.position.set(x, y, z);
    hexInstance.scale.set(2, 2, 2);

    scene.add(hexInstance);

    // Determine height based on type
    let heightOffset = (type === "tall") ? 2 : 0; // Taller tiles are higher

    tileData.push({ x, y, z, type, heightOffset }); // Store height
}

function generateHexGrid(rows, cols) {
    let halfCols = Math.floor(cols / 2);
    let halfRows = Math.floor(rows / 2);
    let mapRadius = Math.min(halfCols, halfRows) * hexRadius * 1.5; // Define circular boundary

    for (let row = -halfRows; row <= halfRows; row++) {
        for (let col = -halfCols; col <= halfCols; col++) {
            let x = col * hexRadius * 1.5;
            let z = row * Math.sqrt(3) * hexRadius;

            // Offset odd columns to maintain hex pattern
            if (col % 2 !== 0) z += Math.sqrt(3) / 2 * hexRadius;

            let distanceFromCenter = Math.sqrt(x * x + z * z);

            // Add some randomness to the boundary (imperfections)
            let edgeNoise = Math.random() * (hexRadius * 6) - hexRadius * 1.5; // Small random offset
            let adjustedRadius = mapRadius + edgeNoise; // Slightly change the boundary

            // Only place tiles within the circular area
            if (distanceFromCenter <= adjustedRadius) {
                let noiseValue = Math.random();
                let selectedModel, type;

                if (noiseValue < 0.3) {
                    selectedModel = models[0]; // Grass
                    type = "grass";
                } else if (noiseValue < 0.8) {
                    selectedModel = models[1]; // Dark Grass
                    type = "grass";
                } else if (noiseValue < 0.9) {
                    selectedModel = models[3]; // Stone
                    type = "stone";
                } else {
                    selectedModel = models[Math.floor(Math.random() * models.length)];
                    type = (selectedModel === models[2] || selectedModel === models[4]) ? "tall" : "normal";
                }

                createHexInstance(selectedModel.clone(), x, 0, z, type);
            }
        }
    }


    // Position the camera higher and slightly forward
    camera.position.set(0, 10, 10); // Raise it higher and push forward
    camera.lookAt(0, 0, 0); // Make it look at the center

    // Slightly tilt the camera downward
    camera.rotation.x = -Math.PI / 4; // Adjust tilt (45 degrees downward)

    // Lock rotation for a slightly angled top-down view
    controls.enableRotate = true;
    controls.enablePan = true;

    // --- ADD WATER PLANE HERE ---
    addWaterPlane();
}

// Add this function anywhere in your file (e.g., after generateHexGrid)
function addWaterPlane() {
    const waterGeometry = new THREE.PlaneGeometry(600, 600, 1, 1); // Increased size to cover more area
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x3a9ad9,
        transparent: true,
        opacity: 0.5,
        shininess: 100,
        side: THREE.DoubleSide
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2; // Make it horizontal
    water.position.y = -0.1; // Slightly below ground level
    water.receiveShadow = false;
    water.name = "WaterPlane";
    scene.add(water);
}


function placeObjectsOnGrid() {
    tileData.forEach(({ x, y, z, type }) => {
        let objectModel;

        // Check tile type and spawn objects accordingly
        if (type === "grass" && Math.random() < 0.2) { // 20% chance of spawning tree
            objectModel = objectModels[Math.floor(Math.random() * 2)].clone(); // trees 1 or 2
        } else if (type === "stone" && Math.random() < 0.3) { // 30% chance of spawning rock
            objectModel = objectModels[2].clone(); // Rock|
        } else if (type === "stone" && Math.random() < 0.1) { // 10% chance of spawning diamond
            objectModel = objectModels[3].clone(); // Diamond
        }

        if (objectModel) {
            objectModel.rotation.y = Math.random() * Math.PI; // Random rotation to Y-axis
            objectModel.position.set(x, y, z); // Position
            scene.add(objectModel);
        }
    });
}

const hoverModelPath = 'assets/tiles_grid.glb';
let hoverModel = null;
let currentHoveredTile = null;

// Load the hover model
loader.load(hoverModelPath, (gltf) => {
    hoverModel = gltf.scene;
    hoverModel.scale.set(2, 2, 2);
    hoverModel.visible = false; // Initially hidden
    scene.add(hoverModel);
}, undefined, (error) => {
    console.error('Error loading hover model:', error);
});

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// Detect mouse movement
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (!hoverModel) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let tile = intersects[0].object;

        // Traverse up to find the parent tile (avoid selecting child objects)
        while (tile.parent && tile.parent !== scene) {
            tile = tile.parent;
        }

        // Only update position if it's a new tile
        if (tile !== currentHoveredTile) {
            currentHoveredTile = tile;
            hoverModel.position.set(tile.position.x, tile.position.y + 0.1, tile.position.z); // Align with tile
            hoverModel.visible = true;
        }
    } else {
        currentHoveredTile = null;
        hoverModel.visible = false;
    }
});

camera.position.set(5, 10, 10);
camera.lookAt(5, 0, 5);

// Direction the camera is moving
const cameraDirection = new THREE.Vector3(0, 0, -1); // Forward direction

function checkCollision() {
    // Forward ray (checks for objects in front of the camera)
    raycaster.ray.origin.copy(camera.position);
    raycaster.ray.direction.copy(cameraDirection);
    const forwardIntersects = raycaster.intersectObjects(scene.children, true);

    if (forwardIntersects.length > 0) {
        const distanceToObject = forwardIntersects[0].distance;
        if (distanceToObject < 2) { // Adjust '2' for how close the camera can get
            camera.position.set(camera.position.x, camera.position.y, camera.position.z - (distanceToObject - 2));
        }
    }

    // Prevent camera from moving upwards (blocked by models above)
    const upwardDirection = new THREE.Vector3(0, 1, 0); // Ray pointing upwards
    raycaster.ray.origin.copy(camera.position);
    raycaster.ray.direction.copy(upwardDirection);
    const upwardIntersects = raycaster.intersectObjects(scene.children, true);

    if (upwardIntersects.length > 0) {
        const distanceToTop = upwardIntersects[0].distance;
        if (distanceToTop < 2) { // Prevent the camera from going up if it hits something above
            camera.position.set(camera.position.x, camera.position.y - (distanceToTop - 2), camera.position.z);
        }
    }

    // Allow downward movement, but only prevent camera from going below y = 0
    if (camera.position.y < 0) {
        camera.position.y = 0; // Keep camera above ground level (if desired)
    }
}

// Add event listener for clicks
window.addEventListener('mousedown', (event) => {
    if (event.button == 0) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true).filter(obj => !obj.object.userData.nonInteractable);

        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            // Traverse up to find the highest-level parent if the object is part of a model
            while (!clickedObject.userData.resourceType && clickedObject.parent) {
                clickedObject = clickedObject.parent;
            }
    
            if (!!clickedObject.userData.resourceType) {               
                // Handle resource collection logic
                if (clickedObject.userData.resourceType === RESOURCE_TREE) {
                    const woodAmount = Math.floor(Math.random() * 10) + 1; // Random amount of wood between 1 and 10
                    console.log(`You collected ${woodAmount} wood!`);
                    inventory[RESOURCE_TREE] = inventory[RESOURCE_TREE] + woodAmount;
                    scene.remove(clickedObject); // Remove the tree from the scene
                } else if (clickedObject.userData.resourceType === RESOURCE_ROCK) {
                    const stoneAmount = Math.floor(Math.random() * 10) + 1; // Random amount of stone between 1 and 10
                    console.log(`You collected ${stoneAmount} stone!`);
                    inventory[RESOURCE_ROCK] = inventory[RESOURCE_ROCK] + stoneAmount;
                    scene.remove(clickedObject); // Remove the rock from the scene
                } else if (clickedObject.userData.resourceType === RESOURCE_DIAMOND) {
                    const diamondAmount = Math.floor(Math.random() * 5) + 1; // Random amount of diamond between 1 and 5
                    console.log(`You collected ${diamondAmount} diamond!`);
                    inventory[RESOURCE_DIAMOND] = inventory[RESOURCE_DIAMOND] + diamondAmount;
                    scene.remove(clickedObject); // Remove the diamond from the scene
                }
                updateInventoryDisplay();              
            }

            // Remove the castle placement logic
            // Previously, this section placed a castle on grass tiles.
        }
    }
});

const inventory = {
    [RESOURCE_TREE]: 50,
    [RESOURCE_ROCK]: 50,
    [RESOURCE_DIAMOND]: 0
};

//update resource display
function updateInventoryDisplay() {
    const resourceDisplay = document.getElementById('inventory-display');
    resourceDisplay.textContent = `Wood: ${inventory[RESOURCE_TREE]} | Stone: ${inventory[RESOURCE_ROCK]} | Diamond: ${inventory[RESOURCE_DIAMOND]}`;
}

function onWindowResize() {
    // Update the size of the renderer
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update the aspect ratio and camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix(); // Important to update the projection matrix
}

// Listen for window resize events
window.addEventListener('resize', onWindowResize);

const buildings = []; // Array to store all buildings in the scene

// Function to find the nearest building to an enemy
function findNearestBuilding(enemy) {
    let nearestBuilding = null;
    let shortestDistance = Infinity;

    buildings.forEach((building) => {
        const distance = enemy.position.distanceTo(building.position);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestBuilding = building;
        }
    });

    return nearestBuilding;
}

// Function to move the enemy toward the nearest building
function moveEnemyTowardBuilding(enemy) {
    const targetBuilding = findNearestBuilding(enemy);

    if (targetBuilding) {
        const direction = new THREE.Vector3()
            .subVectors(targetBuilding.position, enemy.position)
            .normalize();

        // Calculate the distance to the building
        const distanceToBuilding = enemy.position.distanceTo(targetBuilding.position);

        // Stop moving if the enemy is close enough to the building
        if (distanceToBuilding > 1) { // Adjust this value for the desired stopping distance
            enemy.position.addScaledVector(direction, 0.05); // Adjust speed as needed
        } else {
            // Enemy is close enough to attack the building
            attackBuilding(targetBuilding, enemy);
        }
    }
}

// Function to handle the attack logic
function attackBuilding(building, enemy) {
    const currentTime = Date.now();

    // Check if enough time has passed since the last attack
    if (currentTime - enemy.userData.lastAttackTime < 2000) {
        return; // Skip attack if less than 2 seconds have passed
    }

    console.log("Enemy is attacking a building!");

    // Update the last attack time
    enemy.userData.lastAttackTime = currentTime;

    // Reduce building health
    building.userData.health -= 10; // Reduce health by 10 per attack
    console.log(`Building health: ${building.userData.health}`);

    if (building.userData.health <= 0) {
        // Find and remove the associated light
        const associatedLight = building.userData.warmLight;
        if (associatedLight) {
            scene.remove(associatedLight);
        }

        // Remove the building from the scene
        scene.remove(building);
        const index = buildings.indexOf(building);
        if (index > -1) {
            buildings.splice(index, 1); // Remove the building from the array
        }

        // Only show end game if all castles are destroyed
        const castlesLeft = buildings.filter(b => b.userData.type === "castle");
        if (castlesLeft.length === 0) {
            showEndGameScreen();
        }
    }

    // Optionally, reduce enemy health during the attack
    enemy.userData.health -= 5; // Reduce enemy health by 5 per attack
    console.log(`Enemy health: ${enemy.userData.health}`);
    if (enemy.userData.health <= 0) {
        scene.remove(enemy);
        const enemyIndex = enemies.indexOf(enemy);
        if (enemyIndex > -1) {
            enemies.splice(enemyIndex, 1); // Remove the enemy from the array
        }
    }
}

// Update the animate function to include enemy movement
function animate() {
    requestAnimationFrame(animate);

    controls.update(); // Update the camera movement

    checkCollision(); // Check for collision with objects

    // Move enemies toward buildings
    enemies.forEach((enemy) => {
        moveEnemyTowardBuilding(enemy);
    });

    // Animate water if present
    if (scene.userData.water) {
        scene.userData.water.material.uniforms['time'].value += 1.0 / 60.0;
    }

    renderer.render(scene, camera);
}

animate();

let selectedBuilding = null; // Track the currently selected building
let buildingRotation = 0;    // Track rotation in radians

// Listen for Q/E key to rotate the building before placement
window.addEventListener('keydown', (event) => {
    if (!selectedBuilding) return;
    if (event.key.toLowerCase() === 'q') {
        buildingRotation -= Math.PI / 3; // Rotate left 90 degrees
    } else if (event.key.toLowerCase() === 'e') {
        buildingRotation += Math.PI / 3; // Rotate right 90 degrees
    }
});

// Helper popup for night interaction
function showNightInteractionPopup() {
    let popup = document.getElementById('night-interaction-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'night-interaction-popup';
        popup.style.position = 'fixed';
        popup.style.top = '20px';
        popup.style.left = '50%';
        popup.style.transform = 'translateX(-50%)';
        popup.style.background = 'rgba(30,30,30,0.95)';
        popup.style.color = '#fff';
        popup.style.padding = '16px 32px';
        popup.style.borderRadius = '8px';
        popup.style.fontSize = '1.2em';
        popup.style.zIndex = 10000;
        popup.style.transition = 'opacity 0.5s';
        popup.style.opacity = '0';
        popup.textContent = "Can't interact at night";
        document.body.appendChild(popup);
    }
    popup.style.opacity = '1';
    popup.style.display = 'block';
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => { popup.style.display = 'none'; }, 500);
    }, 2000);
}

// Update the click logic to place the selected building
window.addEventListener('mousedown', (event) => {
    if (!isDay) {
        showNightInteractionPopup();
        return;
    }
    if (event.button === 0 && selectedBuilding) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true).filter(obj => !obj.object.userData.nonInteractable);

        if (intersects.length > 0) {
            let clickedModel = intersects[0].object;
            while (clickedModel.name !== "Scene" && clickedModel.parent) {
                clickedModel = clickedModel.parent;
            }

            // Check if the tile is already occupied
            if (clickedModel.userData.isOccupied) {
                console.log("This tile is already occupied!");
                return;
            }

            // Check if the player can afford the selected building
            if (!canAfford(selectedBuilding.cost)) {
                showNotEnoughResourcesPopup(); // Show popup if not enough resources
                return; // Exit if the player doesn't have enough resources
            }

            // Place the selected building
            const modelPath = `assets/${selectedBuilding.type}.glb`;
            loader.load(modelPath, (gltf) => {
                // Use the root scene or its first child if needed
                let buildingModel = gltf.scene;
                // If the model is a group with children, you may want to use buildingModel = gltf.scene.children[0];
                buildingModel.scale.set(2, 2, 2);
                buildingModel.position.set(
                    clickedModel.position.x,
                    clickedModel.position.y + 0.1,
                    clickedModel.position.z
                );
                buildingModel.rotation.y = buildingRotation; // Apply rotation

                // Assign type and health for all building types (always assign!)
                buildingModel.userData.type = selectedBuilding.type;
                if (selectedBuilding.type === "castle") {
                    buildingModel.userData.health = 100;
                } else if (selectedBuilding.type === "wall") {
                    buildingModel.userData.health = 50;
                } else if (selectedBuilding.type === "tower") {
                    buildingModel.userData.health = 75;
                } else {
                    buildingModel.userData.health = 50; // Default health for unknown types
                }

                scene.add(buildingModel);
                buildings.push(buildingModel);

                // Deduct the cost from the player's inventory
                deductCost(selectedBuilding.cost);

                // Mark the tile as occupied
                clickedModel.userData.isOccupied = true;

                console.log(`${selectedBuilding.type} placed successfully! Health: ${buildingModel.userData.health}`);
                updateInventoryDisplay(); // Update the inventory display after placing

                // Reset rotation after placement
                buildingRotation = 0;
            }, undefined, (error) => {
                console.error(`Error loading ${selectedBuilding.type} model:`, error);
            });
        }
    }
});

// Listen for hotbar button clicks
document.getElementById('hotbar').addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent the click from reaching the Three.js canvas
    if (event.target.tagName === 'BUTTON') {
        const buildingType = event.target.id.replace('build-', '');

        // Check if the button is already selected
        if (selectedBuilding && selectedBuilding.type === buildingType) {
            // Deselect the building
            selectedBuilding = null;
            buildingRotation = 0; // Reset rotation when deselecting
            console.log('Deselected building');
        } else {
            // Select the building
            selectedBuilding = {
                type: buildingType,
                cost: parseCost(event.target.dataset.cost)
            };
            buildingRotation = 0; // Reset rotation when selecting new building
            console.log(`Selected building: ${selectedBuilding.type}`, selectedBuilding.cost);
        }
    }
});

// Parse the cost string into an object
function parseCost(costString) {
    const cost = {};
    costString.split(',').forEach((item) => {
        const [resource, amount] = item.split(':');
        cost[resource] = parseInt(amount, 10);
    });
    return cost;
}

// Check if the player can afford the building
function canAfford(cost) {
    for (const resource in cost) {
        if (!inventory[resource] || inventory[resource] < cost[resource]) {
            console.log(`Not enough ${resource}. Required: ${cost[resource]}, Available: ${inventory[resource] || 0}`);
            return false;
        }
    }
    return true;
}

// Deduct the cost from the player's inventory
function deductCost(cost) {
    for (const resource in cost) {
        inventory[resource] -= cost[resource];
    }
    updateInventoryDisplay(); // Update the inventory UI
}

window.addEventListener('mousedown', (event) => {
    event.stopPropagation();
    if (event.button === 0) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        const filteredIntersects = intersects.filter(obj => !obj.object.userData.nonInteractable);

        if (filteredIntersects.length > 0) {
            const clickedObject = filteredIntersects[0].object;
            console.log('Clicked object:', clickedObject);
            return;
        }
    }
});

function returnToMenuButton (){
    console.log('Return to menu button clicked');
    window.location.href = 'index.html'; // Replace with the correct path to your menu page
}

function showEndGameScreen() {
    const overlay = document.getElementById('endgame-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function showNotEnoughResourcesPopup() {
    const popup = document.getElementById('not-enough-resources-popup');
    if (popup) {
        popup.classList.add('show');
        setTimeout(() => {
            popup.classList.remove('show');
        }, 3000); // 3 seconds to match the animation
    }
}
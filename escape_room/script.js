import { addCollisionBox, enableCollisionBoxToggle } from './collision.js'; // <-- Add this at the very top

// Initialize the Babylon.js engine and create a scene
const canvas = document.getElementById("renderCanvas");
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const engine = new BABYLON.Engine(canvas, true);

// Create a basic scene
const createScene = function () {
    const scene = new BABYLON.Scene(engine);

    // Enable collisions in the scene
    scene.collisionsEnabled = true;

    // Enable gravity in the scene
    scene.gravity = new BABYLON.Vector3(0, -0.2, 0);

    // Create a player (capsule shape)
    const player = BABYLON.MeshBuilder.CreateCapsule("player", { 
        height: 1.5, 
        radius: 0.4, 
        capSubdivisions: 8, 
        tessellation: 16 
    }, scene);
    player.position.y = 0.75;

    // Enable collisions for the player and set ellipsoid
    player.checkCollisions = true;
    player.ellipsoid = new BABYLON.Vector3(0.4, 0.75, 0.4); // radius, height/2, radius

    // Create a camera for third-person view and attach it to the player
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        Math.PI / 2,
        Math.PI / 4,
        6,
        player.position,
        scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 15;

    camera.inputs.removeByType("ArcRotateCameraPointersInput");
    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    camera.inputs.addMouseWheel();

    // Enable collisions for the camera (optional)
    camera.checkCollisions = true;

    scene.registerBeforeRender(() => {
        camera.target = player.position;
    });

    // Create a light
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Add a ground with texture
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
    ground.position.y = 0;
    ground.checkCollisions = true;

    // Apply texture to the ground
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseTexture = new BABYLON.Texture(
        "assets/textures/planks.png",
        scene,
        true, // disable mipmaps!
        false,
        BABYLON.Texture.NEAREST_SAMPLINGMODE
    );
    groundMaterial.diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    groundMaterial.diffuseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    groundMaterial.diffuseTexture.uScale = 8;
    groundMaterial.diffuseTexture.vScale = 8;
    ground.material = groundMaterial;

    // Add a cube
    const cube = BABYLON.MeshBuilder.CreateBox("cube", { size: 1 }, scene);
    cube.position = new BABYLON.Vector3(2, 0.5, 2); // Place it above ground
    cube.checkCollisions = true;

    // Add texture to the cube
    const cubeMaterial = new BABYLON.StandardMaterial("cubeMat", scene);
    cubeMaterial.diffuseTexture = new BABYLON.Texture("assets/textures/box.jpg", scene);
    cube.material = cubeMaterial;

    // Add a GLB model next to the cube
    BABYLON.SceneLoader.ImportMesh(
        null, // import all meshes
        "assets/", // path to the model (adjust if needed)
        "map.glb", // filename (replace with your actual GLB file name)
        scene,
        function (meshes) {
            // Position the imported model next to the cube
            meshes.forEach(mesh => {
                mesh.position = new BABYLON.Vector3(0, .5, 0); // Adjust as needed
                mesh.scaling = new BABYLON.Vector3(1.7, 1.7, 1.7); // Adjust scale if needed
                mesh.rotation = new BABYLON.Vector3(0, Math.PI / -4, 0); // Rotate 45 degrees around Y axis
                mesh.checkCollisions = false;
            });
        }
    );

    // Handle player movement and jumping
    const inputMap = {};
    let isJumping = false;
    let verticalVelocity = 0;
    const gravity = -0.01; // Smoother gravity for jump
    const jumpStrength = 0.20; // Higher jump

    window.addEventListener("keydown", function (evt) {
        inputMap[evt.key.toLowerCase()] = true;
    });
    window.addEventListener("keyup", function (evt) {
        inputMap[evt.key.toLowerCase()] = false;
    });

    // Create a ball to show the facing direction
    const directionBall = BABYLON.MeshBuilder.CreateSphere("directionBall", { diameter: 0.2 }, scene);
    directionBall.position = player.position.add(new BABYLON.Vector3(0, 0, 1));
    directionBall.material = new BABYLON.StandardMaterial("ballMat", scene);
    directionBall.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red

    let wasSpacePressed = false; // Add this above your onBeforeRenderObservable

    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000; // seconds

        let moved = false;
        let moveX = 0;
        let moveZ = 0;

        if (inputMap["w"]) {
            moveZ -= 1;
            moved = true;
        }
        if (inputMap["s"]) {
            moveZ += 1;
            moved = true;
        }
        if (inputMap["d"]) {
            moveX -= 1;
            moved = true;
        }
        if (inputMap["a"]) {
            moveX += 1;
            moved = true;
        }

        // Normalize movement for diagonal
        let length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 0) {
            moveX /= length;
            moveZ /= length;
        }

        const speed = 0.08 * (deltaTime * 60); // scale to ~60fps baseline

        // Jumping logic (spacebar)
        const spacePressed = !!inputMap[" "];
        if (spacePressed && !wasSpacePressed && !isJumping && Math.abs(verticalVelocity) < 0.001) {
            verticalVelocity = jumpStrength; // do NOT scale by deltaTime
            isJumping = true;
        }
        wasSpacePressed = spacePressed;

        // Apply gravity
        verticalVelocity += gravity * (deltaTime * 60);

        // Save previous Y to check if landed
        const prevY = player.position.y;

        // Move with collisions (handles standing on boxes, ground, etc)
        const moveVector = new BABYLON.Vector3(moveX * speed, verticalVelocity, moveZ * speed);
        player.moveWithCollisions(moveVector);

        // If player didn't move vertically, they're on something solid
        if (Math.abs(player.position.y - prevY) < 0.001 && verticalVelocity < 0) {
            verticalVelocity = 0;
            isJumping = false;
        }

        // Smooth rotation towards movement direction
        if (moved && (moveX !== 0 || moveZ !== 0)) {
            const targetY = Math.atan2(moveX, moveZ);
            let currentY = player.rotation.y;
            let delta = targetY - currentY;
            // Keep shortest path
            delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
            player.rotation.y += delta * 0.08 * (deltaTime * 60);
        }

        // Move the direction ball to the front of the player
        const forward = new BABYLON.Vector3(
            Math.sin(player.rotation.y),
            0,
            Math.cos(player.rotation.y)
        );
        directionBall.position = player.position.add(forward.scale(1));
        directionBall.position.y = player.position.y; // Keep at same height as player

        // Item pickup logic
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const dist = BABYLON.Vector3.Distance(player.position, item.position);
            if (dist < 1) {
                // Optionally, show a UI hint to press "E"
                if (inputMap["e"]) {
                    // Add to first empty inventory slot
                    const emptySlot = inventory.findIndex(slot => slot === null);
                    if (emptySlot !== -1) {
                        inventory[emptySlot] = item.itemName;
                        updateInventoryUI();
                        item.dispose();
                        items.splice(i, 1);
                    } else {
                        // Optionally, show "Inventory Full" message
                    }
                }
            }
        }
    });

    // Inventory logic
const inventory = [null, null, null, null, null];
let selectedSlot = 0;

// Update inventory UI
function updateInventoryUI() {
    const slots = document.querySelectorAll('.invSlot');
    slots.forEach((slot, i) => {
        slot.style.borderColor = (i === selectedSlot) ? 'yellow' : '#fff';
        slot.textContent = inventory[i] ? inventory[i] : (i + 1);
        slot.style.color = inventory[i] ? '#fff' : '#4d4d4d'; // White if item, gray if number
    });
}
updateInventoryUI();

// Listen for 1-5 key to select inventory slot
window.addEventListener("keydown", function (evt) {
    if (evt.key >= "1" && evt.key <= "5") {
        selectedSlot = parseInt(evt.key) - 1;
        updateInventoryUI();
    }
});

// Add items to pick up
const items = [];
function createItem(name, position) {
    const item = BABYLON.MeshBuilder.CreateBox(name, { size: 0.3 }, scene);
    item.position = position.clone();
    item.material = new BABYLON.StandardMaterial(name + "Mat", scene);
    item.material.diffuseColor = new BABYLON.Color3(1, 1, 0); // Yellow
    item.itemName = name; // Store name for inventory
    items.push(item);
}
createItem("Key", new BABYLON.Vector3(3, 0.9, 3));
createItem("Gun", new BABYLON.Vector3(-2, 0.9, 1));

    scene.onBeforeRenderObservable.add(() => {
        // ...existing movement code...

        // Item pickup logic
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const dist = BABYLON.Vector3.Distance(player.position, item.position);
            if (dist < 1) {
                // Optionally, show a UI hint to press "E"
                if (inputMap["e"]) {
                    // Add to first empty inventory slot
                    const emptySlot = inventory.findIndex(slot => slot === null);
                    if (emptySlot !== -1) {
                        inventory[emptySlot] = item.itemName;
                        updateInventoryUI();
                        item.dispose();
                        items.splice(i, 1);
                    } else {
                        // Optionally, show "Inventory Full" message
                    }
                }
            }
        }
    });

    // Allow clicking on items to pick them up if close enough
    canvas.addEventListener("pointerdown", function(evt) {
        const pickResult = scene.pick(scene.pointerX, scene.pointerY);
        if (pickResult.hit && pickResult.pickedMesh) {
            const mesh = pickResult.pickedMesh;
            // Check if this mesh is in the items array
            const itemIndex = items.indexOf(mesh);
            if (itemIndex !== -1) {
                // Check distance to player
                const dist = BABYLON.Vector3.Distance(player.position, mesh.position);
                if (dist < 1) {
                    // Add to first empty inventory slot
                    const emptySlot = inventory.findIndex(slot => slot === null);
                    if (emptySlot !== -1) {
                        inventory[emptySlot] = mesh.itemName;
                        updateInventoryUI();
                        mesh.dispose();
                        items.splice(itemIndex, 1);
                    } else {
                        // Optionally, show "Inventory Full" message
                    }
                }
            }
        }
    });

    // 1. Create a key model for the hand (after player is created)
    const handKey = BABYLON.MeshBuilder.CreateBox("handKey", { size: 0.2 }, scene);
    handKey.material = new BABYLON.StandardMaterial("handKeyMat", scene);
    handKey.material.diffuseColor = new BABYLON.Color3(1, 1, 0); // Yellow
    handKey.isVisible = false;

    // 2. Update handKey position and visibility every frame
    scene.onBeforeRenderObservable.add(() => {
        // Check if selected inventory slot contains "Key"
        if (inventory[selectedSlot] === "Key") {
            handKey.isVisible = true;
            // Position the key in front of the player (as if in hand)
            handKey.position = player.position.add(new BABYLON.Vector3(
                Math.sin(player.rotation.y) * 0.5 + Math.cos(player.rotation.y) * 0.3,
                0.7, // hand height
                Math.cos(player.rotation.y) * 0.5 - Math.sin(player.rotation.y) * 0.3
            ));
            handKey.rotation.y = player.rotation.y;
        } else {
            handKey.isVisible = false;
        }
    });

    // Add a door (simple tall box)
    const door = BABYLON.MeshBuilder.CreateBox("door", { width: 1, height: 1.6, depth: 0.15, faceUV: [] }, scene);
    door.position = new BABYLON.Vector3(-1.6, 0.7, -3.2); // Adjust position as needed
    door.checkCollisions = true;

    // Set the pivot to the left edge (for swinging)
    door.setPivotPoint(new BABYLON.Vector3(-0.5, 0, 0)); // -0.5 is half the width to the left

    // Create materials
    const doorFrontMat = new BABYLON.StandardMaterial("doorFrontMat", scene);
    doorFrontMat.diffuseTexture = new BABYLON.Texture("assets/textures/door_apartment_01.png", scene);
    doorFrontMat.diffuseTexture.uAng = Math.PI;
    doorFrontMat.diffuseTexture.uScale = -1;
    doorFrontMat.diffuseTexture.vScale = 1;

    const doorSideMat = new BABYLON.StandardMaterial("doorSideMat", scene);
    doorSideMat.diffuseTexture = new BABYLON.Texture("assets/textures/door_apartment_02.png", scene);

    // Create MultiMaterial and assign to mesh
    const multiMat = new BABYLON.MultiMaterial("doorMultiMat", scene);
    multiMat.subMaterials.push(doorFrontMat); // 0: front
    multiMat.subMaterials.push(doorFrontMat); // 1: back
    multiMat.subMaterials.push(doorSideMat);  // 2: right
    multiMat.subMaterials.push(doorSideMat);  // 3: left
    multiMat.subMaterials.push(doorSideMat);  // 4: top
    multiMat.subMaterials.push(doorSideMat);  // 5: bottom
    door.material = multiMat;

    // Assign subMeshes for each face
    door.subMeshes = [];
    const verticesCount = door.getTotalVertices();
    door.subMeshes.push(new BABYLON.SubMesh(0, 0, verticesCount, 0, 6, door));  // front
    door.subMeshes.push(new BABYLON.SubMesh(1, 0, verticesCount, 6, 6, door));  // back
    door.subMeshes.push(new BABYLON.SubMesh(2, 0, verticesCount, 12, 6, door)); // right
    door.subMeshes.push(new BABYLON.SubMesh(3, 0, verticesCount, 18, 6, door)); // left
    door.subMeshes.push(new BABYLON.SubMesh(4, 0, verticesCount, 24, 6, door)); // top
    door.subMeshes.push(new BABYLON.SubMesh(5, 0, verticesCount, 30, 6, door)); // bottom

    // Door open/close logic
    let doorIsUnlocked = false;
    let doorIsOpen = false;
    const doorClosedRotation = 0;
    const doorOpenRotation = -Math.PI / 2; // 90 degrees open

    window.addEventListener("keydown", function(evt) {
        if (evt.key.toLowerCase() === "e") {
            const dist = BABYLON.Vector3.Distance(player.position, door.position);
            if (dist < 2) {
                if (!doorIsUnlocked) {
                    // Unlock if holding key
                    if (inventory[selectedSlot] === "Key") {
                        doorIsUnlocked = true;
                        // Remove key from inventory when used
                        inventory[selectedSlot] = null;
                        updateInventoryUI();
                        // Optionally: show a message "Door unlocked!"
                    } else {
                        // Optionally: show a message "You need a key!"
                    }
                } else {
                    // Toggle open/close
                    doorIsOpen = !doorIsOpen;
                    door.checkCollisions = !doorIsOpen;
                    BABYLON.Animation.CreateAndStartAnimation(
                        "toggleDoor", door, "rotation.y", 60, 20,
                        door.rotation.y,
                        doorIsOpen ? doorOpenRotation : doorClosedRotation,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                }
            }
        }
    });

    // --- AI ENEMY ---
    // Create the AI enemy mesh
    const aiEnemy = BABYLON.MeshBuilder.CreateCapsule("aiEnemy", { height: 1.5, radius: 0.4 }, scene);
    aiEnemy.position = new BABYLON.Vector3(-6, 0.75, -6);
    aiEnemy.material = new BABYLON.StandardMaterial("aiMat", scene);
    aiEnemy.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
    aiEnemy.checkCollisions = true;
    aiEnemy.ellipsoid = new BABYLON.Vector3(0.4, 0.75, 0.4);

    // AI parameters
    const aiViewDistance = 6; // How far the AI can see
    const aiViewAngle = Math.PI / 3; // 60 degrees field of view
    const aiSpeed = 0.045; // Chasing speed

    // FOV visualization mesh (hidden by default)
    const fovMaterial = new BABYLON.StandardMaterial("fovMat", scene);
    fovMaterial.alpha = 0.25;
    fovMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
    const fovMesh = BABYLON.MeshBuilder.CreateDisc("aiFOV", {
        radius: aiViewDistance,
        tessellation: 60,
        arc: aiViewAngle / (2 * Math.PI)
    }, scene);
    fovMesh.material = fovMaterial;
    fovMesh.isPickable = false;
    fovMesh.isVisible = false;
    fovMesh.rotation.x = Math.PI / 2;
    fovMesh.rotation.y = Math.PI / 2; // Rotate FOV display by 90 degrees

    // Show/hide FOV on X press
    let fovVisible = false;
    window.addEventListener("keydown", function(evt) {
        if (evt.key.toLowerCase() === "x") {
            fovVisible = !fovVisible;
            fovMesh.isVisible = fovVisible;
        }
    });

    // --- AI roaming state ---
    let aiRoamTarget = null;
    let aiRoamCooldown = 0;

    scene.onBeforeRenderObservable.add(() => {
        // Update FOV mesh position and rotation
        fovMesh.position = aiEnemy.position.clone();
        fovMesh.position.y += 0.01; // Slightly above ground
        fovMesh.rotation.y = aiEnemy.rotation.y + Math.PI / -4; // <-- Add 90 degree offset

        // Vector from AI to player
        const toPlayer = player.position.subtract(aiEnemy.position);
        const distance = toPlayer.length();

        // AI's forward direction (assume facing along Z+ by default)
        const aiForward = new BABYLON.Vector3(
            Math.sin(aiEnemy.rotation.y),
            0,
            Math.cos(aiEnemy.rotation.y)
        );

        // Angle between AI's forward and direction to player
        const angleToPlayer = BABYLON.Vector3.GetAngleBetweenVectors(
            aiForward,
            toPlayer.normalize(),
            BABYLON.Vector3.Up()
        );

        let canSeePlayer = false;

        // If player is within view distance and in front of AI
        if (distance < aiViewDistance && Math.abs(angleToPlayer) < aiViewAngle / 2) {
            // Raycast to check for obstacles between AI and player
            const ray = new BABYLON.Ray(
                aiEnemy.position.add(new BABYLON.Vector3(0, 0.75, 0)), // eye height
                toPlayer.normalize(),
                distance
            );
            const hit = scene.pickWithRay(ray, (mesh) => {
                // Ignore the AI and the player themselves
                return mesh !== aiEnemy && mesh !== player && mesh.isPickable !== false;
            });

            // Only chase if direct line of sight (no obstacle in the way)
            if (!hit.hit || (hit.pickedMesh === player)) {
                canSeePlayer = true;
                // Rotate AI smoothly towards player
                const targetY = Math.atan2(toPlayer.x, toPlayer.z);
                let delta = targetY - aiEnemy.rotation.y;
                delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
                aiEnemy.rotation.y += delta * 0.08;

                // Move towards player
                const moveVec = new BABYLON.Vector3(
                    Math.sin(aiEnemy.rotation.y) * aiSpeed,
                    0,
                    Math.cos(aiEnemy.rotation.y) * aiSpeed
                );
                aiEnemy.moveWithCollisions(moveVec);

                // Optional: If close enough, "catch" the player
                if (distance < 1.2) {
                    // You can trigger a game over or respawn here
                    // alert("Caught by the AI!");
                }
            }
        }

        // --- Roaming logic if can't see player ---
        if (!canSeePlayer) {
            // If no roam target or reached it or cooldown expired, pick a new one
            if (
                !aiRoamTarget ||
                BABYLON.Vector3.Distance(aiEnemy.position, aiRoamTarget) < 0.5 ||
                aiRoamCooldown <= 0
            ) {
                // Pick a random point within a radius (e.g., 8 units) from the center
                const roamRadius = 8;
                let angle = Math.random() * Math.PI * 2;
                let dist = 2 + Math.random() * (roamRadius - 2);
                aiRoamTarget = new BABYLON.Vector3(
                    Math.cos(angle) * dist,
                    0.75,
                    Math.sin(angle) * dist
                );
                aiRoamCooldown = 120 + Math.random() * 120; // frames until next roam (2-4s)
            } else {
                aiRoamCooldown--;
            }

            // Move toward roam target
            const toTarget = aiRoamTarget.subtract(aiEnemy.position);
            const targetY = Math.atan2(toTarget.x, toTarget.z);
            let delta = targetY - aiEnemy.rotation.y;
            delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
            aiEnemy.rotation.y += delta * 0.04; // slower turn when roaming

            // Only move if not very close
            if (toTarget.length() > 0.3) {
                const moveVec = new BABYLON.Vector3(
                    Math.sin(aiEnemy.rotation.y) * aiSpeed * 0.6, // slower speed when roaming
                    0,
                    Math.cos(aiEnemy.rotation.y) * aiSpeed * 0.6
                );
                aiEnemy.moveWithCollisions(moveVec);
            }
        }
    });
//-------------------------------------------------------------------------------
    // Add collision boxes after scene is created
    addCollisionBox(scene, new BABYLON.Vector3(1.5, 0, -3.5), new BABYLON.Vector3(5, 5, 1));
    addCollisionBox(scene, new BABYLON.Vector3(-3.2, 0, -3.5), new BABYLON.Vector3(2, 5, 1));
    addCollisionBox(scene, new BABYLON.Vector3(-1.6, 2.1, -3.5), new BABYLON.Vector3(2, 1, 1));
    enableCollisionBoxToggle();
//-------------------------------------------------------------------------------
    return { scene, player, aiEnemy };
};

// Create the scene and player
const { scene, player, aiEnemy } = createScene();

// Render loop
engine.runRenderLoop(() => {
    scene.render();
});

// Resize the engine and canvas on window resize
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine.resize();
});

// Multiplayer variables
const remotePlayers = {}; // Key: peerId, Value: mesh

// Add this at the top, after engine and scene are created:
const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

// Helper to create a name tag above a mesh
function addNameTag(mesh, name) {
    // Dynamically set width based on name length (min 100px, max 400px)
    let baseWidth = 100;
    let extra = Math.max(0, name.length - 10) * 12; // 12px per extra char after 10
    let width = Math.min(baseWidth + extra, 400);

    const rect = new BABYLON.GUI.Rectangle();
    rect.background = "rgba(0,0,0,0.5)";
    rect.height = "30px";
    rect.alpha = 0.8;
    rect.width = width + "px";
    rect.cornerRadius = 10;
    rect.thickness = 0;
    rect.zIndex = 100;
    advancedTexture.addControl(rect);

    const label = new BABYLON.GUI.TextBlock();
    label.text = name;
    label.color = "white";
    label.fontSize = 18;
    label.textWrapping = true;
    label.resizeToFit = true;
    label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    rect.addControl(label);

    rect.linkWithMesh(mesh);
    rect.linkOffsetY = -90; // Adjust as needed for above head

    // Store for later removal if needed
    mesh.nameTag = rect;
}

// Get nickname from localStorage or fallback
const nickname = localStorage.getItem("nickname") || "Host";

// When creating the local player:
addNameTag(player, nickname);

// When creating a remote player:
function createRemotePlayer(scene, peerId, remoteNickname) {
    const mesh = BABYLON.MeshBuilder.CreateCapsule("remotePlayer_" + peerId, {
        height: 1.5,
        radius: 0.4,
        capSubdivisions: 8,
        tessellation: 16
    }, scene);
    mesh.position.y = 0.75;
    mesh.material = new BABYLON.StandardMaterial("remoteMat_" + peerId, scene);
    mesh.checkCollisions = true;
    mesh.ellipsoid = new BABYLON.Vector3(0.4, 0.75, 0.4);

    // Add name tag
    // Show the host's nickname if peerId is "host"
    if (peerId === "host") {
        addNameTag(mesh, `${nickname} 👑`);
    } else {
        addNameTag(mesh, remoteNickname || peerId);
    }

    return mesh;
}

// Get server code from URL
function getServerCode() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("server")) return params.get("server");
    if (params.has("join")) return params.get("join");
    return null;
}
const serverCode = getServerCode();

// Host/server logic
if (window.location.search.startsWith("?server=")) {
    const peer = new Peer(serverCode);
    const connections = {}; // Key: peerId, Value: conn

    peer.on('open', (id) => {
        console.log("PeerJS ID:", id);
    });

    peer.on('connection', (conn) => {
        console.log("Client connected:", conn.peer);
        connections[conn.peer] = conn;

        // Store nickname for this peer
        let remoteNickname = "Player";
        conn.on("data", (data) => {
            // If first message contains nickname, store it
            if (data.nickname) {
                remoteNickname = data.nickname;
                // CREATE remote player mesh for this client if it doesn't exist
                if (!remotePlayers[conn.peer]) {
                    remotePlayers[conn.peer] = createRemotePlayer(scene, conn.peer, remoteNickname);
                }
                // Update name tag if already created
                if (remotePlayers[conn.peer].nameTag) {
                    remotePlayers[conn.peer].nameTag.children[0].text = remoteNickname;
                }
                // Move updateRoomInfoUI() here, after mesh and nameTag are ready
                setTimeout(updateRoomInfoUI, 100);
                return;
            }
            // Update this remote player's mesh
            const mesh = remotePlayers[conn.peer];
            if (mesh && data.position) {
                mesh.position.x = data.position.x;
                mesh.position.y = data.position.y;
                mesh.position.z = data.position.z;
            }
            if (mesh && data.rotationY !== undefined) {
                mesh.rotation.y = data.rotationY;
            }
            // Broadcast this client's data to all other clients
            for (const pid in connections) {
                if (pid !== conn.peer) {
                    connections[pid].send({
                        peerId: conn.peer,
                        position: data.position,
                        rotationY: data.rotationY
                    });
                }
            }
            // Optionally, send host's position to this client
            conn.send({
                peerId: "host",
                position: {
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z
                },
                rotationY: player.rotation.y
            });
        });

        conn.on('close', () => {
            setTimeout(updateRoomInfoUI, 100);
            // Remove mesh when client disconnects
            if (remotePlayers[conn.peer]) {
                if (remotePlayers[conn.peer].nameTag) {
                    remotePlayers[conn.peer].nameTag.dispose();
                }
                remotePlayers[conn.peer].dispose();
                delete remotePlayers[conn.peer];
            }
            delete connections[conn.peer];

            // Notify all other clients to remove this player
            for (const pid in connections) {
                if (connections[pid] && connections[pid].open) {
                    connections[pid].send({
                        peerId: conn.peer,
                        remove: true
                    });
                }
            }
        });
    });

    // Send host's position to all clients every frame
    scene.onBeforeRenderObservable.add(() => {
        for (const pid in connections) {
            if (connections[pid] && connections[pid].open) {
                connections[pid].send({
                    peerId: "host",
                    position: {
                        x: player.position.x,
                        y: player.position.y,
                        z: player.position.z
                    },
                    rotationY: player.rotation.y,
                    nickname: nickname + " 👑",
                    // --- Add this for enemy sync ---
                    aiEnemy: {
                        position: {
                            x: aiEnemy.position.x,
                            y: aiEnemy.position.y,
                            z: aiEnemy.position.z
                        },
                        rotationY: aiEnemy.rotation.y
                    }
                });
            }
        }
    });

} else if (window.location.search.startsWith("?join=")) {
    const peer = new Peer();
    let connections = {}; // Key: peerId, Value: conn

    peer.on('open', (id) => {
        console.log("PeerJS ID:", id);

        // Connect to host using code
        const serverConn = peer.connect(serverCode);
        connections[serverCode] = serverConn;

        // Send nickname to host when connection opens
        serverConn.on('open', () => {
            serverConn.send({ nickname });
        });

        // When creating remote player mesh for the host
        if (!remotePlayers["host"]) {
            remotePlayers["host"] = createRemotePlayer(scene, "host", `${nickname} 👑`);
        }

        serverConn.on("data", (data) => {
            // If data is about another peer, create/update their mesh
            if (data.peerId && data.peerId !== peer.id) {
                if (data.remove) {
                    // Remove mesh if player left
                    if (remotePlayers[data.peerId]) {
                        remotePlayers[data.peerId].dispose();
                        delete remotePlayers[data.peerId];
                    }
                    setTimeout(updateRoomInfoUI, 100);
                    return;
                }
                if (!remotePlayers[data.peerId]) {
                    remotePlayers[data.peerId] = createRemotePlayer(
                        scene,
                        data.peerId,
                        data.nickname || data.peerId
                    );
                }
                const mesh = remotePlayers[data.peerId];
                if (data.position) {
                    mesh.position.x = data.position.x;
                    mesh.position.y = data.position.y;
                    mesh.position.z = data.position.z;
                }
                if (data.rotationY !== undefined) {
                    mesh.rotation.y = data.rotationY;
                }
                // Update name tag if nickname changes
                if (mesh.nameTag && data.nickname) {
                    mesh.nameTag.children[0].text = data.nickname;
                }
                // Move updateRoomInfoUI() here, after mesh and nameTag are ready
                setTimeout(updateRoomInfoUI, 100);
            }
            if (data.aiEnemy) {
                aiEnemy.position.x = data.aiEnemy.position.x;
                aiEnemy.position.y = data.aiEnemy.position.y;
                aiEnemy.position.z = data.aiEnemy.position.z;
                aiEnemy.rotation.y = data.aiEnemy.rotationY;
            }
        });
    });

    // Send this client's position to host every frame
    scene.onBeforeRenderObservable.add(() => {
        const serverConn = connections[serverCode];
        if (serverConn && serverConn.open) {
            serverConn.send({
                position: {
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z
                },
                rotationY: player.rotation.y
            });
        }
    });

    // Notify server on tab close
    window.addEventListener("beforeunload", () => {
        if (connections[serverCode]) {
            connections[serverCode].close();
        }
        if (peer) {
            peer.destroy();
        }
    });
}

// --- Room info UI update ---
function updateRoomInfoUI() {
    const code = getServerCode();
    document.getElementById("roomCodeLabel").textContent = code ? `Room: ${code}` : "Room: ...";
    const playerList = document.getElementById("playerList");
    let names = [];

    // Always add local player (host or client)
    if (window.location.search.startsWith("?server=")) {
        names.push(nickname + " 👑");
    } else {
        // On client, try to find the host in remotePlayers
        for (const id in remotePlayers) {
            if (id === "host" && remotePlayers[id] && remotePlayers[id].nameTag) {
                const label = remotePlayers[id].nameTag.children[0];
                if (label && label.text) {
                    names.push(label.text);
                }
            }
        }
        names.push(nickname); // Add self
    }

    // Add all remote players (skip host if already added)
    for (const id in remotePlayers) {
        if (remotePlayers[id] && remotePlayers[id].nameTag) {
            const label = remotePlayers[id].nameTag.children[0];
            if (label && label.text) {
                // Avoid duplicate host
                if (!(window.location.search.startsWith("?server=") && label.text === nickname + " 👑")) {
                    // Avoid duplicate self
                    if (label.text !== nickname) {
                        names.push(label.text);
                    }
                }
            } else {
                names.push(id);
            }
        }
    }

    // Remove duplicates and show
    playerList.innerHTML = "";
    [...new Set(names)].forEach(name => {
        const li = document.createElement("li");
        // Add crown if host
        if (name.endsWith("👑")) {
            li.textContent = name;
        } else {
            li.textContent = name;
        }
        playerList.appendChild(li);
    });
}

// Call once at start
updateRoomInfoUI();

// Call after any player joins/leaves or nickname changes
// For host:
if (window.location.search.startsWith("?server=")) {
    // ...existing code...
    peer.on('connection', (conn) => {
        // ...existing code...
        conn.on("data", (data) => {
            // ...existing code...
            if (data.nickname) {
                // ...existing code...
                setTimeout(updateRoomInfoUI, 100); // update after nickname set
                return;
            }
            // ...existing code...
        });
        conn.on('close', () => {
            setTimeout(updateRoomInfoUI, 100);
            // ...existing code...
        });
    });
    // ...existing code...
    scene.onBeforeRenderObservable.add(() => {
        updateRoomInfoUI();
        // ...existing code...
    });
} else if (window.location.search.startsWith("?join=")) {
    // ...existing code...
    peer.on('open', (id) => {
        // ...existing code...
        serverConn.on("data", (data) => {
            // ...existing code...
            setTimeout(updateRoomInfoUI, 100);
        });
    });
    scene.onBeforeRenderObservable.add(() => {
        updateRoomInfoUI();
        // ...existing code...
    });
}
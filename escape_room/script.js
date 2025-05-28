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
    groundMaterial.diffuseTexture = new BABYLON.Texture("assets/textures/texture_01.png", scene);
    ground.material = groundMaterial;

    // Add a cube
    const cube = BABYLON.MeshBuilder.CreateBox("cube", { size: 1 }, scene);
    cube.position = new BABYLON.Vector3(2, 0.5, 2); // Place it above ground
    cube.checkCollisions = true;

    // Add a GLB model next to the cube
    BABYLON.SceneLoader.ImportMesh(
        null, // import all meshes
        "assets/", // path to the model (adjust if needed)
        "test.glb", // filename (replace with your actual GLB file name)
        scene,
        function (meshes) {
            // Position the imported model next to the cube
            meshes.forEach(mesh => {
                mesh.position = new BABYLON.Vector3(-5, 0, 5); // Adjust as needed
                mesh.scaling = new BABYLON.Vector3(.5, .5, .5); // Adjust scale if needed
                mesh.checkCollisions = true;
            });
        }
    );

    // Handle player movement and jumping
    const inputMap = {};
    let isJumping = false;
    let verticalVelocity = 0;
    const gravity = -0.01; // Smoother gravity for jump
    const jumpStrength = 0.15; // Higher jump

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

    scene.onBeforeRenderObservable.add(() => {
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

        const speed = 0.08;

        // Jumping logic (spacebar)
        // Only allow jump if on ground (verticalVelocity == 0)
        if (inputMap[" "] && !isJumping && Math.abs(verticalVelocity) < 0.001) {
            verticalVelocity = jumpStrength;
            isJumping = true;
        }

        // Apply gravity
        verticalVelocity += gravity;

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
            player.rotation.y += delta * 0.08;
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
createItem("item1", new BABYLON.Vector3(3, 0.9, 3));
createItem("item2", new BABYLON.Vector3(-2, 0.9, 1));

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

    return { scene, player };
};

// Create the scene and player
const { scene, player } = createScene();

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
    const rect = new BABYLON.GUI.Rectangle();
    rect.background = "rgba(0,0,0,0.5)";
    rect.height = "30px";
    rect.alpha = 0.8;
    rect.width = "100px";
    rect.cornerRadius = 10;
    rect.thickness = 0;
    rect.zIndex = 100;
    advancedTexture.addControl(rect);

    const label = new BABYLON.GUI.TextBlock();
    label.text = name;
    label.color = "white";
    label.fontSize = 18;
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
        addNameTag(mesh, `${nickname} (Host)`);
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
                    nickname: nickname + " (Host)" // <-- send host's nickname
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
            remotePlayers["host"] = createRemotePlayer(scene, "host", `${nickname} (Host)`);
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
// Helper to easily add collision boxes
export const collisionBoxes = []; // Store all boxes for toggling

export function addCollisionBox(scene, position, scaling, isVisible = false) {
    const box = BABYLON.MeshBuilder.CreateBox("collisionBox", { size: 1 }, scene);
    box.position = position.clone();
    box.scaling = scaling.clone();
    box.checkCollisions = true;
    box.isVisible = isVisible; // Set true to see the box

    // Set green wireframe material
    const wireMat = new BABYLON.StandardMaterial("wireMat", scene);
    wireMat.wireframe = true;
    wireMat.emissiveColor = new BABYLON.Color3(0, 1, 0); // Green
    wireMat.diffuseColor = new BABYLON.Color3(0, 1, 0);  // Ensure wire is green
    wireMat.specularColor = new BABYLON.Color3(0, 1, 0); // Ensure highlights are green
    box.material = wireMat;

    collisionBoxes.push(box);
    return box;
}

// Toggle visibility of all collision boxes when X is pressed
export function enableCollisionBoxToggle() {
    window.addEventListener("keydown", function (evt) {
        if (evt.key.toLowerCase() === "x") {
            collisionBoxes.forEach(box => {
                box.isVisible = !box.isVisible;
            });
        }
    });
}
export let isMetaKeyPressed = false;

window.addEventListener("keydown", (event) => {
    if (event.key === "Meta") {
        console.log('   metaKey pressed')
        isMetaKeyPressed = true;
    }
});

window.addEventListener("keyup", (event) => {

    if (event.key === "Meta") {
        console.log('   metaKey released')
        isMetaKeyPressed = false;
    }
});

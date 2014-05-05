//// [genericNewInterface.js]
function createInstance(ctor) {
    return new ctor(42);
}

function createInstance2(ctor) {
    return new ctor(1024);
}

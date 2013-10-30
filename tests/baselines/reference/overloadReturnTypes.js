var Accessor = (function () {
    function Accessor() {
    }
    return Accessor;
})();

function attr(nameOrMap, value) {
    if (nameOrMap && typeof nameOrMap === "object") {
        // handle map case
        return new Accessor;
    } else {
        // handle string case
        return "s";
    }
}

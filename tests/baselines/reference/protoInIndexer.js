var X = (function () {
    function X() {
        this['__proto__'] = null; // used to cause ICE
    }
    return X;
})();

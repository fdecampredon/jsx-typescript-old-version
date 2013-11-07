var None = (function () {
    function None() {
    }
    None.prototype.get = function () {
        throw null;
    };

    None.prototype.flatten = function () {
        return new None();
    };
    return None;
})();

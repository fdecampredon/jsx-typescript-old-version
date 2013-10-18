var Foo = (function () {
    function Foo() {
    }
    Object.defineProperty(Foo.prototype, "bar", {
        get: function () {
            return this._bar;
        },
        // should not be an error to order them this way
        set: function (thing) {
            this._bar = thing;
        },
        enumerable: true,
        configurable: true
    });
    return Foo;
})();

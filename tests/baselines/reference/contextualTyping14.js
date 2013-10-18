var foo = (function () {
    function foo() {
        this.bar = function (a) {
            return a;
        };
    }
    return foo;
})();

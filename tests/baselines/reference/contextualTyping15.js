var foo = (function () {
    function foo() {
        this.bar = function () {
            return 1;
        };
    }
    return foo;
})();

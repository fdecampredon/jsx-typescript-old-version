define(["require", "exports"], function(require, exports) {
    function foo(fn) {
        exports.foo(fn); // Invocation is necessary to repro (!)
    }
    exports.foo = foo;
});

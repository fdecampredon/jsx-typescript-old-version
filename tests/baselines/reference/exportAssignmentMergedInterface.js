//// [foo_0.js]
define(["require", "exports"], function(require, exports) {
    
});
//// [foo_1.js]
define(["require", "exports"], function(require, exports) {
    var x;
    x("test");
    x(42);
    var y = x.b;
    if (!!x.c) {
    }
    var z = { x: 1, y: 2 };
    z = x.d;
});

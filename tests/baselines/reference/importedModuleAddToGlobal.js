// Binding for an import statement in a typeref position is being added to the global scope
// Shouldn't compile b.B is not defined in C
var A;
(function (A) {
    var b = B;
    var c = C;
})(A || (A = {}));

var B;
(function (B) {
    var B = (function () {
        function B() {
        }
        return B;
    })();
    B.B = B;
})(B || (B = {}));

var C;
(function (C) {
    function hello() {
        return null;
    }
})(C || (C = {}));

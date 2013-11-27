// object types are identical structurally
var A = (function () {
    function A() {
    }
    return A;
})();

var B = (function () {
    function B() {
    }
    return B;
})();

var C = (function () {
    function C() {
    }
    return C;
})();

var a;
var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));
var b = { foo: 0 /* A */ };

function foo5(x) {
}

function foo5b(x) {
}

function foo6(x) {
}

function foo7(x) {
}

function foo8(x) {
}

function foo9(x) {
}

function foo10(x) {
}

function foo11(x) {
}

function foo12(x) {
}

function foo13(x) {
}

function foo14(x) {
}

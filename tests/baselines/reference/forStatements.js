var C = (function () {
    function C() {
    }
    return C;
})();

var D = (function () {
    function D() {
    }
    return D;
})();

function F(x) {
    return 42;
}

var M;
(function (M) {
    var A = (function () {
        function A() {
        }
        return A;
    })();
    M.A = A;

    function F2(x) {
        return x.toString();
    }
    M.F2 = F2;
})(M || (M = {}));

for (var aNumber = 9.9; ;) {
}
for (var aString = 'this is a string'; ;) {
}
for (var aDate = new Date(12); ;) {
}
for (var anObject = new Object(); ;) {
}

for (var anAny = null; ;) {
}
for (var aSecondAny = undefined; ;) {
}
for (var aVoid = undefined; ;) {
}

for (var anInterface = new C(); ;) {
}
for (var aClass = new C(); ;) {
}
for (var aGenericClass = new D(); ;) {
}
for (var anObjectLiteral = { id: 12 }; ;) {
}
for (var anOtherObjectLiteral = new C(); ;) {
}

for (var aFunction = F; ;) {
}
for (var anOtherFunction = F; ;) {
}
for (var aLambda = function (x) {
    return 2;
}; ;) {
}

for (var aModule = M; ;) {
}
for (var aClassInModule = new M.A(); ;) {
}
for (var aFunctionInModule = function (x) {
    return 'this is a string';
}; ;) {
}

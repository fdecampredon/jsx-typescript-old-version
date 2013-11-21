// ArrowFormalParameters => AssignmentExpression is equivalent to ArrowFormalParameters => { return AssignmentExpression; }
var a = function (p) {
    return p.length;
};
var a = function (p) {
    return p.length;
};

// Identifier => Block is equivalent to(Identifier) => Block
var b = function (j) {
    return 0;
};
var b = function (j) {
    return 0;
};

// Identifier => AssignmentExpression is equivalent to(Identifier) => AssignmentExpression
var c;
var d = function (n) {
    return c = n;
};
var d = function (n) {
    return c = n;
};
var d;

// Arrow function used in class member initializer
// Arrow function used in class member function
var MyClass = (function () {
    function MyClass() {
        var _this = this;
        this.m = function (n) {
            return n + 1;
        };
        this.p = function (n) {
            return n && _this;
        };
    }
    MyClass.prototype.fn = function () {
        var _this = this;
        var m = function (n) {
            return n + 1;
        };
        var p = function (n) {
            return n && _this;
        };
    };
    return MyClass;
})();

// Arrow function used in arrow function
var arrrr = function () {
    return function (m) {
        return function () {
            return function (n) {
                return m + n;
            };
        };
    };
};
var e = arrrr()(3)()(4);
var e;

// Arrow function used in arrow function used in function
function someFn() {
    var arr = function (n) {
        return function (p) {
            return p * n;
        };
    };
    arr(3)(4).toExponential();
}

// Arrow function used in function
function someOtherFn() {
    var arr = function (n) {
        return '' + n;
    };
    arr(4).charAt(0);
}

// Arrow function used in nested function in function
function outerFn() {
    function innerFn() {
        var arrowFn = function () {
        };
        var p = arrowFn();
        var p;
    }
}

// Arrow function used in nested function in arrow function
var f = function (n) {
    function fn(x) {
        return function () {
            return n + x;
        };
    }
    return fn(4);
};
var g = f('')();
var g;

// Arrow function used in nested function in arrow function in nested function
function someOuterFn() {
    var arr = function (n) {
        function innerFn() {
            return function () {
                return n.length;
            };
        }
        return innerFn;
    };
    return arr;
}
var h = someOuterFn()('')()();
h.toExponential();

// Arrow function used in try/catch/finally in function
function tryCatchFn() {
    var _this = this;
    try  {
        var x = function () {
            return _this;
        };
    } catch (e) {
        var t = function () {
            return e + _this;
        };
    } finally {
        var m = function () {
            return _this + '';
        };
    }
}

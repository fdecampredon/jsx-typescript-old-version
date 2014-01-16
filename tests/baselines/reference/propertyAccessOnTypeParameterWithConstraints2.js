// generic types should behave as if they have properties of their constraint type
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var A = (function () {
    function A() {
    }
    A.prototype.foo = function () {
        return '';
    };
    return A;
})();

var B = (function (_super) {
    __extends(B, _super);
    function B() {
        _super.apply(this, arguments);
    }
    B.prototype.bar = function () {
        return '';
    };
    return B;
})(A);

var C = (function () {
    function C() {
    }
    C.prototype.f = function () {
        var x;

        // BUG 823818
        var a = x['foo']();
        return a + x.foo();
    };

    C.prototype.g = function (x) {
        // BUG 823818
        var a = x['foo']();
        return a + x.foo();
    };
    return C;
})();

//class C<U extends T, T extends A> {
//    f() {
//        var x: U;
//        // BUG 823818
//        var a = x['foo'](); // should be string
//        return a + x.foo();
//    }
//    g(x: U) {
//        // BUG 823818
//        var a = x['foo'](); // should be string
//        return a + x.foo();
//    }
//}
var r1 = (new C()).f();
var r1b = (new C()).g(new B());

//interface I<U extends T, T extends A> {
//    foo: U;
//}
var i;
var r2 = i.foo.foo();
var r2b = i.foo['foo']();

var a;

//var a: {
//    <U extends T, T extends A>(): U;
//    <U extends T, T extends A>(x: U): U;
//    <U extends T, T extends A>(x: U, y: T): U;
//}
var r3 = a().foo();
var r3b = a()['foo']();

// parameter supplied for type argument inference to succeed
var aB = new B();
var r3c = a(aB, aB).foo();
var r3d = a(aB, aB)['foo']();

var b = {
    foo: function (x, y) {
        // BUG 823818
        var a = x['foo']();
        return a + x.foo();
    }
};

//var b = {
//    foo: <U extends T, T extends A>(x: U, y: T) => {
//        // BUG 823818
//        var a = x['foo'](); // should be string
//        return a + x.foo();
//    }
//}
var r4 = b.foo(aB, aB); // no inferences for T so constraint isn't satisfied, error

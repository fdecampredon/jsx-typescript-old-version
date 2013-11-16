//// [declFileGenericType.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
(function (C) {
    var A = (function () {
        function A() {
        }
        return A;
    })();
    C.A = A;
    var B = (function () {
        function B() {
        }
        return B;
    })();
    C.B = B;

    function F(x) {
        return null;
    }
    C.F = F;
    function F2(x) {
        return null;
    }
    C.F2 = F2;
    function F3(x) {
        return null;
    }
    C.F3 = F3;
    function F4(x) {
        return null;
    }
    C.F4 = F4;

    function F5() {
        return null;
    }
    C.F5 = F5;

    function F6(x) {
        return null;
    }
    C.F6 = F6;

    var D = (function () {
        function D(val) {
            this.val = val;
        }
        return D;
    })();
    C.D = D;
})(exports.C || (exports.C = {}));
var C = exports.C;

exports.a;

exports.b = C.F;
exports.c = C.F2;
exports.d = C.F3;
exports.e = C.F4;

exports.x = (new C.D(new C.A())).val;

function f() {
}
exports.f = f;

exports.g = C.F5();

var h = (function (_super) {
    __extends(h, _super);
    function h() {
        _super.apply(this, arguments);
    }
    return h;
})(C.A);
exports.h = h;

exports.j = C.F6;


////[declFileGenericType.d.ts]
export declare module C {
    class A<T> {
    }
    class B {
    }
    function F<T>(x: T): A<B>;
    function F2<T>(x: T): A<B>;
    function F3<T>(x: T): A<B>[];
    function F4<T extends A<B>>(x: T): A<B>[];
    function F5<T>(): T;
    function F6<T extends A<B>>(x: T): T;
    class D<T> {
        public val: T;
        constructor(val: T);
    }
}
export declare var a: C.A<C.B>;
export declare var b: typeof C.F;
export declare var c: typeof C.F2;
export declare var d: typeof C.F3;
export declare var e: typeof C.F4;
export declare var x: C.A<C.B>;
export declare function f<T extends C.A<C.B>>(): void;
export declare var g: C.A<C.B>;
export declare class h extends C.A<C.B> {
}
export interface i extends C.A<C.B> {
}
export declare var j: typeof C.F6;

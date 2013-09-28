//// [withImportDecl_0.js]
define(["require", "exports"], function(require, exports) {
    var A = (function () {
        function A() {
        }
        return A;
    })();
    exports.A = A;
});
//// [withImportDecl_1.js]
define(["require", "exports", "withImportDecl_0"], function(require, exports, m3) {
    ///<reference path='withImportDecl_0.ts'/>
    var simpleVar;

    var anotherVar;
    var varWithSimpleType;
    var varWithArrayType;

    var varWithInitialValue = 30;

    var withComplicatedValue = { x: 30, y: 70, desc: "position" };

    var arrayVar = ['a', 'b'];

    function simpleFunction() {
        return {
            x: "Hello",
            y: "word",
            n: 2
        };
    }

    var m1;
    (function (m1) {
        function foo() {
            return "Hello";
        }
        m1.foo = foo;
    })(m1 || (m1 = {}));

    var b = new m3.A();
    b.foo;
});


////[withImportDecl_0.d.ts]
export declare class A {
    public foo: string;
}
////[withImportDecl_1.d.ts]
/// <reference path="withImportDecl_0.d.ts" />

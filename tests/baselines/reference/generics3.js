//// [generics3.js]
var C = (function () {
    function C() {
    }
    return C;
})();

var a;
var b;

a = b; // Ok - should be identical


////[generics3.d.ts]
declare class C<T> {
    private x;
}
interface X {
    f(): string;
}
interface Y {
    f(): string;
}
declare var a: C<X>;
declare var b: C<Y>;

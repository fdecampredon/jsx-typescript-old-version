// Valid uses of type parameters  as the type argument for other generics
function foo(x, y) {
    foo(y, y);
    return new C();
}

var C = (function () {
    function C() {
    }
    return C;
})();
//function foo<T, U extends T>(x: T, y: U) {
//    foo<U, U>(y, y);
//    return new C<U, T>();
//}
//class C<T extends U, U> {
//    x: T;
//}
//interface I<T, U extends T> {
//    x: C<U, T>;
//}

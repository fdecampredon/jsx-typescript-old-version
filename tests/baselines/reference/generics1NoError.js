//// [generics1NoError.js]
var v1;
var v2;
var v4; // Ok


////[generics1NoError.d.ts]
interface A {
    a: string;
}
interface B extends A {
    b: string;
}
interface C extends B {
    c: string;
}
interface G<T, U extends B> {
    x: T;
    y: U;
}
declare var v1: G<A, C>;
declare var v2: G<{
    a: string;
}, C>;
declare var v4: G<G<A, B>, C>;

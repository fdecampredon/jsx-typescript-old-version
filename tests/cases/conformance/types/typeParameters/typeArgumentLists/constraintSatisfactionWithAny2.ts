// any satisfies any constraint, no errors expected

declare function foo<Z, T extends <U>(x: U) => Z>(y: T): Z;
var a: any;

foo(a);
foo<any, any>(a);
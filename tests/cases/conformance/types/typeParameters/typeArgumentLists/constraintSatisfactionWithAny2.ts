// any satisfies any constraint, errors expected for type parameter cannot be referenced in the constraints of the same list

declare function foo<Z, T extends <U>(x: U) => Z>(y: T): Z;
var a: any;

foo(a);
foo<any, any>(a);
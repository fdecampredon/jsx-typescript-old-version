// Base property is optional and derived type has no property of that name

interface Base { foo: string; }
interface Derived extends Base { bar: string; }

// S is a subtype of a type T, and T is a supertype of S, if one of the following is true, where S’ denotes the apparent type (section 3.8.1) of S:
//   - S’ and T are object types and, for each member M in T, one of the following is true:
//      - M is an optional property and S’ contains no property of the same name as M.

interface T {
    Foo?: Base;
}

interface S extends T {
    Foo2: Derived // ok
}

interface T2 {
    1?: Base; 
}

interface S2 extends T2 {
    2: Derived; // ok
}

interface T3 {
    '1'?: Base;
}

interface S3 extends T3 {
    '1.0': Derived; // ok
}

// object literal case
var a: { Foo?: Base; }
var b: { Foo2: Derived; }
var r = true ? a : b; // ok
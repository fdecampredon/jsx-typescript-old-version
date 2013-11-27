// Derived member is optional but base member is not, should be an error

interface Base { foo: string; }
interface Derived extends Base { bar: string; }

// S is a subtype of a type T, and T is a supertype of S, if one of the following is true, where S’ denotes the apparent type (section 3.8.1) of S:
//   - S’ and T are object types and, for each member M in T, one of the following is true:
//      -   M is a property and S’ contains a property N where
//          M and N have the same name,
//          the type of N is a subtype of that of M,
//          M and N are both public or both private, and
//          if M is a required property, N is also a required property.

interface T {
    Foo: Base;
}

interface S extends T {
    Foo?: Derived // error
}

interface T2 {
    1: Base; 
}

interface S2 extends T2 {
    1?: Derived; // error
}

interface T3 {
    '1': Base;
}

interface S3 extends T3 {
    '1'?: Derived; // error
}

// object literal case
var a: { Foo: Base; }
var b: { Foo?: Derived; }
var r = true ? a : b; // error
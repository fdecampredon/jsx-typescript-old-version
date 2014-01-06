// checking subtype relations for function types as it relates to contextual signature instantiation

class Base { foo: string; }
class Derived extends Base { bar: string; }
class Derived2 extends Derived { baz: string; }
class OtherDerived extends Base { bing: string; }

var a: (x: number) => number[];
var a2: (x: number) => string[];
var a3: (x: number) => void;
var a4: (x: string, y: number) => string;
var a5: (x: (arg: string) => number) => string;
var a6: (x: (arg: Base) => Derived) => Base;
var a7: (x: (arg: Base) => Derived) => (r: Base) => Derived;
var a8: (x: (arg: Base) => Derived, y: (arg2: Base) => Derived) => (r: Base) => Derived;
var a9: (x: (arg: Base) => Derived, y: (arg2: Base) => Derived) => (r: Base) => Derived;
var a10: (...x: Derived[]) => Derived;
var a11: (x: { foo: string }, y: { foo: string; bar: string }) => Base;
var a12: (x: Array<Base>, y: Array<Derived2>) => Array<Derived>;
var a13: (x: Array<Base>, y: Array<Derived>) => Array<Derived>;
var a14: (x: { a: string; b: number }) => Object;
var a15: {
    (x: number): number[];
    (x: string): string[];
}
var a16: {
    <T extends Derived>(x: T): number[];
    <U extends Base>(x: U): number[];
}
var a17: {
    (x: (a: number) => number): number[];
    (x: (a: string) => string): string[];
};
var a18: {
    (x: {
        (a: number): number;
        (a: string): string;
    }): any[];
    (x: {
        (a: boolean): boolean;
        (a: Date): Date;
    }): any[];
}

var b: <T>(x: T) => T[]; 
a = b; // ok, instantiation of N is a subtype of M, T is number
b = a; // error
var b2: <T>(x: T) => string[]; 
a2 = b2; // ok 
b2 = a2; // error
var b3: <T>(x: T) => T; 
a3 = b3; // ok since Base returns void
b3 = a3; // ok
var b4: <T, U>(x: T, y: U) => T; 
a4 = b4; // ok, instantiation of N is a subtype of M, T is string, U is number
b4 = a4; // error
var b5: <T, U>(x: (arg: T) => U) => T; 
a5 = b5; // ok, U is in a parameter position so inferences can be made
b5 = a5; // error
var b6: <T extends Base, U extends Derived>(x: (arg: T) => U) => T; 
a6 = b6; // ok, same as a5 but with object type hierarchy
b6 = a6; // error
var b7: <T extends Base, U extends Derived>(x: (arg: T) => U) => (r: T) => U; 
a7 = b7; // ok
b7 = a7; // error
var b8: <T extends Base, U extends Derived>(x: (arg: T) => U, y: (arg2: T) => U) => (r: T) => U;
a8 = b8; // ok
b8 = a8; // error
var b9: <T extends Base, U extends Derived>(x: (arg: T) => U, y: (arg2: { foo: string; bing: number }) => U) => (r: T) => U; 
a9 = b9; // ok, same as a8 with compatible object literal
b9 = a9; // error
var b10: <T extends Derived>(...x: T[]) => T; 
a10 = b10; // ok
b10 = a10; // error
var b11: <T extends Base>(x: T, y: T) => T; 
a11 = b11; // ok
b11 = a11; // error
var b12: <T extends Array<Base>>(x: Array<Base>, y: T) => Array<Derived>; 
a12 = b12; // ok
b12 = a12; // error
var b13: <T extends Array<Derived>>(x: Array<Base>, y: T) => T; 
a13 = b13; // ok, T = Array<Derived>, satisfies constraint, contextual signature instantiation succeeds
b13 = a13; // error
var b14: <T>(x: { a: T; b: T }) => T; 
a14 = b14; // ok, best common type yields T = {} but that's satisfactory for this signature
b14 = a14; // error
var b15: <T>(x: T) => T[]; 
a15 = b15; // ok
b15 = a15; // error
var b16: <T extends Base>(x: T) => number[];
a16 = b16; // ok
b16 = a16; // ok
var b17: <T>(x: (a: T) => T) => T[]; // ok
a17 = b17; // ok
b17 = a17; // error
var b18: <T>(x: (a: T) => T) => T[]; 
a18 = b18; // ok, no inferences for T but assignable to any
b18 = a18; // error

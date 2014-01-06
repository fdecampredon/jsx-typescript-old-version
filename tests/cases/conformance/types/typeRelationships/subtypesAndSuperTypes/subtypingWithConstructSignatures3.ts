// checking subtype relations for function types as it relates to contextual signature instantiation
// error cases

module Errors {
    class Base { foo: string; }
    class Derived extends Base { bar: string; }
    class Derived2 extends Derived { baz: string; }
    class OtherDerived extends Base { bing: string; }

    module WithNonGenericSignaturesInBaseType {
        // base type with non-generic call signatures
        interface A {
            a2: new (x: number) => string[];
            a7: new (x: (arg: Base) => Derived) => (r: Base) => Derived2;
            a8: new (x: (arg: Base) => Derived, y: (arg2: Base) => Derived) => (r: Base) => Derived;
            a10: new (...x: Base[]) => Base;
            a11: new (x: { foo: string }, y: { foo: string; bar: string }) => Base;
            a12: new (x: Array<Base>, y: Array<Derived2>) => Array<Derived>;
            a14: {
                new (x: number): number[];
                new (x: string): string[];
            };
            a15: new (x: { a: string; b: number }) => number;
            a16: {
                // type of parameter is overload set which means we can't do inference based on this type
                new (x: {
                    new (a: number): number;
                    new (a?: number): number;
                }): number[];
                new (x: {
                    new (a: boolean): boolean;
                    new (a?: boolean): boolean;
                }): boolean[];
            };
        }

        interface I extends A {
            a2: new <T, U>(x: T) => U[]; // error, contextual signature instantiation doesn't relate return types so U is {}, not a subtype of string[]
        }

        interface I2<T, U> extends A {
            a2: new (x: T) => U[]; // error, no contextual signature instantiation since I2.a2 is not generic
        }

        interface I3 extends A {
            // error, no inferences for V so it doesn't satisfy its constraints and contextual signature instantiation fails
            a7: new <T extends Base, U extends Derived, V extends Derived2>(x: (arg: T) => U) => (r: T) => V;
        }

        interface I4 extends A {
            a8: new <T extends Base, U extends Derived>(x: (arg: T) => U, y: (arg2: { foo: number; }) => U) => (r: T) => U; // error, type mismatch
        }

        interface I4B extends A {
            a10: new <T extends Derived>(...x: T[]) => T; // error, more specific type in derived parameter type
        }

        interface I4C extends A {
            a11: new <T extends Derived>(x: T, y: T) => T; // error
        }

        interface I4E extends A {
            a12: new <T extends Array<Derived2>>(x: Array<Base>, y: Array<Base>) => T; // error, no inferences for T, fails constraint satisfaction, fails contextual signature instantiation
        }

        interface I6 extends A {
            a15: new <T>(x: { a: T; b: T }) => T; // error, T is {} which isn't an acceptable return type
        }

        interface I7 extends A {
            a15: new <T extends Base>(x: { a: T; b: T }) => number; // error, T is {} which doesn't satisfy constraint check
        }

        interface I8 extends A {
            // error, cannot make inferences for T because multiple signatures to infer from, {} not compatible with base signature
            a16: new <T>(x: new (a: T) => T) => T[];
        }
    }

    module WithGenericSignaturesInBaseType {
        // base type has generic call signature
        interface B {
            a2: new <T>(x: T) => T[];
        }

        interface I6 extends B {
            a2: new <T>(x: T) => string[]; // error
        }

        // base type has generic call signature
        interface C {
            a2: new <T>(x: T) => string[];
        }

        interface I7 extends C {
            a2: new <T>(x: T) => T[]; // error
        }

        // base type has a generic call signature with overloads
        interface D {
            a14: {
                new <T extends Derived>(x: T): number[];
                new <U extends Base>(x: U): number[];
            };
        }

        interface I8 extends D {
            a14: new <T extends Base>(x: T) => number[];
        }
    }
}
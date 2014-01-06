// checking subtype relations for function types as it relates to contextual signature instantiation
// error cases

module Errors {
    class Base { foo: string; }
    class Derived extends Base { bar: string; }
    class Derived2 extends Derived { baz: string; }
    class OtherDerived extends Base { bing: string; }

    module WithNonGenericSignaturesInBaseType {
        // target type with non-generic call signatures
        var a2: new (x: number) => string[];
        var a7: new (x: (arg: Base) => Derived) => (r: Base) => Derived2;
        var a8: new (x: (arg: Base) => Derived, y: (arg2: Base) => Derived) => (r: Base) => Derived;
        var a10: new (...x: Base[]) => Base;
        var a11: new (x: { foo: string }, y: { foo: string; bar: string }) => Base;
        var a12: new (x: Array<Base>, y: Array<Derived2>) => Array<Derived>;
        var a14: {
                new (x: number): number[];
                new (x: string): string[];
            };
        var a15: new (x: { a: string; b: number }) => number;
        var a16: {
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
        var a17: {
                new (x: {
                    new <T extends Derived>(a: T): T;
                    new <T extends Base>(a: T): T;
                }): any[];
                new (x: {
                    new <T extends Derived2>(a: T): T;
                    new <T extends Base>(a: T): T;
                }): any[];
            };

        var b2: new <T, U>(x: T) => U[]; 
        a2 = b2; // error, contextual signature instantiation doesn't relate return types so U is {}, not a subtype of string[]
        b2 = a2; // error

        var b7: new <T extends Base, U extends Derived, V extends Derived2>(x: (arg: T) => U) => (r: T) => V;
        a7 = b7; // error, no inferences for V so it doesn't satisfy its constraints and contextual signature instantiation fails
        b7 = a7; // error

        var b8: new <T extends Base, U extends Derived>(x: (arg: T) => U, y: (arg2: { foo: number; }) => U) => (r: T) => U; 
        a8 = b8; // error, type mismatch
        b8 = a8; // error

        
        var b10: new <T extends Derived>(...x: T[]) => T; 
        a10 = b10; // error, more specific type in derived parameter type
        b10 = a10; // error

        var b11: new <T extends Derived>(x: T, y: T) => T; 
        a11 = b11; // error
        b11 = a11; // error

        var b12: new <T extends Array<Derived2>>(x: Array<Base>, y: Array<Base>) => T; 
        a12 = b12; // error, no inferences for T, fails constraint satisfaction, fails contextual signature instantiation
        b12 = a12; // error

        var b15: new <T>(x: { a: T; b: T }) => T; 
        a15 = b15; // error, T is {} which isn't an acceptable return type
        b15 = a15; // error

        var b15a: new <T extends Base>(x: { a: T; b: T }) => number; 
        a15 = b15a; // error, T is {} which doesn't satisfy constraint check
        b15a = a15; // error

        var b16: new <T>(x: (a: T) => T) => T[];
        a16 = b16; // error, cannot make inferences for T because multiple signatures to infer from, {} not compatible with base signature
        b16 = a16; // error

        var b17: new <T>(x: (a: T) => T) => any[];
        a17 = b17; // error
        b17 = a17;
    }

    module WithGenericSignaturesInBaseType {
        // target type has generic call signature
        var a2: new <T>(x: T) => T[];
        var b2: new <T>(x: T) => string[];
        a2 = b2; // error
        b2 = a2; // error

        // target type has generic call signature
        var a3: new <T>(x: T) => string[];
        var b3: new <T>(x: T) => T[]; 
        a3 = b3; // error
        b3 = a3; // error
    }
}
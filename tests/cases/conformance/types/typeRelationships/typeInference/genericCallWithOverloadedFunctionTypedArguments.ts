// Function typed arguments with multiple signatures must be passed an implementation that matches all of them
// No inferences are made to or from such types

module NonGenericParameter {
    var a: {
        (x: boolean): boolean;
        (x: string): string;
    }

    function foo4(cb: typeof a) {
        return cb;
    }

    var r = foo4(a);
    var r2 = foo4(<T>(x: T) => x);
    var r4 = foo4(x => x);    
}

module GenericParameter {
    function foo5<T>(cb: { (x: T): string; (x: number): T }) {
        return cb;
    }

    var r5 = foo5(x => x); // {} => string (+1 overload)
    var a: { <T>(x: T): string; <T>(x: number): T; }
    var r7 = foo5(a); // {} => string (+1 overload)

    function foo6<T>(cb: { (x: T): string; (x: T, y?: T): string }) {
        return cb;
    }

    var r8 = foo6(x => x); // {} => string (+1 overload)
    var r9 = foo6(<T>(x: T) => ''); // {} => string (+1 overload)
    var r11 = foo6(<T>(x: T, y?: T) => ''); // {} => string (+1 overload)

    function foo7<T>(x:T, cb: { (x: T): string; (x: T, y?: T): string }) {
        return cb;
    }

    var r12 = foo7(1, (x) => x); // number => string (+1 overload)
    var r13 = foo7(1, <T>(x: T) => ''); // number => string (+1 overload)
    var a: { <T>(x: T): string; <T>(x: number): T; }
    var r14 = foo7(1, a); // number => string (+1 overload)
}
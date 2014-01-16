// two interfaces with the same root module should merge

// root module now multiple module declarations
// BUG 856468
module M2 {
    export interface A {
        foo: string;
    }

    var a: A;
    var r1 = a.foo;
    // BUG 856491
    var r2 = a.bar;
}

module M2 {
    export interface A {
        bar: number;
    }

    export interface A {
        baz: boolean;
    }

    var a: A;
    var r1 = a.foo;
    var r2 = a.bar;
    // BUG 856491
    var r3 = a.baz; // any, should be boolean
}

// same as above but with an additional level of nesting and third module declaration
module M2 {
    export module M3 {
        export interface A {
            foo: string;
        }

        var a: A;
        var r1 = a.foo;
        // BUG 856468
        var r2 = a.bar;
    }
}

module M2 {
    export module M3 {
        export interface A {
            bar: number;
        }

        var a: A;

        var r1 = a.foo
        // BUG 856468
        var r2 = a.bar;
        // BUG 856468
        var r3 = a.baz;
    }
}

module M2 {
    export module M3 {
        export interface A {
            baz: boolean;
        }

        var a: A;
        // BUG 856468
        var r1 = a.foo
        // BUG 856468
        var r2 = a.bar;
        var r3 = a.baz;
    }
}
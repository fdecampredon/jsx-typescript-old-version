// enum is only a subtype of number, no types are subtypes of enum, all of these except the first are errors

enum E { A }

interface I0 {
    [x: string]: E;
    foo: E; // identical and subtype, ok
}


interface I {
    [x: string]: E;
    foo: any;
}


interface I2 {
    [x: string]: E;
    foo: number;
}


interface I3 {
    [x: string]: E;
    foo: string;
}


interface I4 {
    [x: string]: E;
    foo: boolean;
}


interface I5 {
    [x: string]: E;
    foo: Date;
}


interface I6 {
    [x: string]: E;
    foo: RegExp;
}


interface I7 {
    [x: string]: E;
    foo: { bar: number };
}


interface I8 {
    [x: string]: E;
    foo: number[];
}


interface I9 {
    [x: string]: E;
    foo: I8;
}

class A { foo: number; }
interface I10 {
    [x: string]: E;
    foo: A;
}

class A2<T> { foo: T; }
interface I11 {
    [x: string]: E;
    foo: A2<number>;
}


interface I12 {
    [x: string]: E;
    foo: (x) => number;
}


interface I13 {
    [x: string]: E;
    foo: <T>(x:T) => T;
}


enum E2 { A }
interface I14 {
    [x: string]: E;
    foo: E2;
}


function f() { }
module f {
    export var bar = 1;
}
interface I15 {
    [x: string]: E;
    foo: typeof f;
}


class c { baz: string }
module c {
    export var bar = 1;
}
interface I16 {
    [x: string]: E;
    foo: typeof c;
}


interface I17<T> {
    [x: string]: E;
    foo: T;
}


interface I18<T, U extends T> {
    [x: string]: E;
    foo: U;
}


interface I19 {
    [x: string]: E;
    foo: Object;
}


interface I20 {
    [x: string]: E;
    foo: {};
}
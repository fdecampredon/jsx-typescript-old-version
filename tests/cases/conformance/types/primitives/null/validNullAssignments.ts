var a: number = null;
var b: boolean = null;
var c: string = null;
var d: void = null;

var e: typeof undefined = null;
// BUG 791098
e = null; // should work

enum E { A }
// BUG 767030
e = null;
E.A = null;

class C { foo: string }
var f: C;
f = null;
C = null;

interface I { foo: string }
var g: I;
g = null;
I = null;

module M { export var x = 1; }
// BUG 767030
M = null;

var h: { f(): void } = null;

function i<T>(a: T) {
    a = null;
}
i = null; // should be an error
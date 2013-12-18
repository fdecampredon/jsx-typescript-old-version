// generic type argument inference where inference leads to two candidates that are both supertypes of all candidates
// we choose the first candidate so the result is dependent on the order of the arguments provided
function foo(x, y) {
    var r;
    return r;
}

var a;
var b;

var r = foo(a, b);
var r2 = foo(b, a);

var x;
var y;

var r3 = foo(a, x);
var r4 = foo(x, a);

var r5 = foo(a, y);
var r5 = foo(y, a);

var r6 = foo(x, y);
var r6 = foo(y, x);

var s1;
var s2;

var r7 = foo(s1, s2);
var r8 = foo(s2, s1); // (x: string) => string;

interface I {
    toString(): number;
}

var i: I;
var o: Object;
o = i; // ok
i = o; // error

class C {
    toString(): number { return 1; }
}
var c: C;
o = c; // ok
c = o; // error

var a = {
    toString: () => { }
}
o = a; // ok
a = o; // ok
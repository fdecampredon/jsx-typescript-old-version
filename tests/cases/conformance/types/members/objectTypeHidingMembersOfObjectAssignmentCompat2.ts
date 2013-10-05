interface I {
    toString(): number;
}

var i: I;
var o: Object;
o = i;
i = o;

class C {
    toString(): number { return 1; }
}
var c: C;
o = c;
c = o;

var a = {
    toString: () => { }
}
o = a;
a = o;
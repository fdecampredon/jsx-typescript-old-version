interface I {
    toString(): void;
}

var i: I;
var o: Object;
o = i;
i = o;

class C {
    toString(): void { }
}
var c: C;
o = c;
c = o;

var a = {
    toString: () => { }
}
o = a;
a = o;
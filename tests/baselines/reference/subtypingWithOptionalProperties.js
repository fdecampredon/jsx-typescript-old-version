// subtyping is not transitive due to optional properties but the subtyping algorithm assumes it is for the 99% case
// returns { s?: number; }
function f(a) {
    var b = a;
    return b;
}

var r = f({ s: new Object() });
r.s && r.s.toFixed(); // would blow up at runtime

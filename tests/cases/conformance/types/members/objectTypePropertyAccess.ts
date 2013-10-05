class C {
    foo: string;
}

var c: C;
var r1: string = c.toString();
var r2: string = c['toString']();

interface I {
    bar: string;
}
var i: I;
var r3: string = i.toString();
var r4: string = i['toString']();

var a = {
    foo: ''
}

var r5: string = a.toString();
var r6: string = a['toString']();
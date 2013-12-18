// No inference is made from function typed arguments which have multiple call signatures
var a;

function foo4(cb) {
    var u;
    return u;
}

var r = foo4(a);

var b;

var r2 = foo4(b); // {}, if b was used for inference then U would have some other type

var a = { toString: 5 };
var b: {} = a;  // ok
// BUG 805477
var c: Object = a;  // should be error

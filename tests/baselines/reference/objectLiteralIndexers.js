var a;
var b;
var c;

var o1 = { x: a, 0: b };
o1 = { x: b, 0: c }; // both indexers are any
o1 = { x: c, 0: b }; // string indexer is any, number indexer is B

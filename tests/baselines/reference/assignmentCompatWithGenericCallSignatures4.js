// some complex cases of assignment compat of generic signatures that stress contextual signature instantiation

var x;
var y;

x = y; // ok

// BUG 780917
y = x; // should be error

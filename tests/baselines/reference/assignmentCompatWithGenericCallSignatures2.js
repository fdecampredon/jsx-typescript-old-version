// some complex cases of assignment compat of generic signatures that stress contextual signature instantiation

var a;
var b;

a = b; // ok, S is inferred to be {} (BCT of T and T[]). T and T[] are both assignable to {}.
b = a; // error, T is inferred to be S. S is assignable to S (first parameter) but neither S nor S[] is assignable to the other.

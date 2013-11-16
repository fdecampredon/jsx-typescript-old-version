// array type cannot use typeof, all of these are errors

var x = 1;
var xs: typeof x[];
var xs2: typeof Array;
var xs3: typeof Array<number>;
var xs4: typeof Array<typeof x>;
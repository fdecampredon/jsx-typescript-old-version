var func;

func(function (s) {
    return ({});
}); // Error for no applicable overload (object type is missing a and b)
func(function (s) {
    return ({ a: blah, b: 3 });
}); // Only error inside the function, but not outside (since it would be applicable if not for the provisional error)
func(function (s) {
    return ({ a: blah });
}); // Two errors here, one for blah not being defined, and one for the overload since it would not be applicable anyway

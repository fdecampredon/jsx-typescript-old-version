// Should succeed.  The array is contextually typed with { id: number }[] type and ends up having
// the type { } [].  { id: number }[] is assignable to {}[], so this is ok.
[{ foo: "s" }];

// Should succeed without contextual typing, as the {} element causes the type of the array to be {}[]
[{ foo: "s" }, {}];

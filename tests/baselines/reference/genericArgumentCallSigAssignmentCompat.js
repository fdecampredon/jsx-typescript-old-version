// No error, Call signatures of types '<T>(value: T) => T' and 'Underscore.Iterator<{}, boolean>' are compatible when instantiated with any.
// Ideally, we would not have a generic signature here, because it should be instantiated with {} during inferential typing
_.all([true, 1, null, 'yes'], _.identity);

// Ok, because fixing makes us infer boolean for T
_.all([true], _.identity);

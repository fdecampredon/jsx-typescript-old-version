// Normally it is an error to have multiple overloads with identical signatures in a single type declaration.
// Here the multiple overloads come from multiple merged declarations and we also report errors.

interface I {
    (x: number): string;
}

interface I {
    (x: number): string;
}

interface I2<T> {
    (x: number): string;
}

interface I2<T> {
    (x: number): string;
}
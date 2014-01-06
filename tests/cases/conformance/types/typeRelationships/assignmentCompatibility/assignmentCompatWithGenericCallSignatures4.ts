// some complex cases of assignment compat of generic signatures that stress contextual signature instantiation

interface I2<T> {
    p: T
}

var x: <T extends I2<T>>(z: T) => void
var y: <T extends I2<I2<T>>>(z: T) => void

x = y // ok
// BUG 780917
y = x // should be error

interface A<T> {
    x: T;
}

interface A<T, U> { // error
    y: T;
}

module M {
    interface A<T> {
        x: T;
    }

    interface A<T, U> { // error
        y: T;
    }
}

module M2 {
    interface A<T> {
        x: T;
    }
}

module M2 {
    // BUG 857614
    interface A<T, U> { // should be error
        y: T;
    }
}
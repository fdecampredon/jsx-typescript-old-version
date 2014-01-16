// type parameter names are relevant when choosing whether to merge interface declarations

interface B<T, U> {
    x: U;
}

interface B<U, T> { // error
    y: V;
}

module M {
    interface B<T, U> {
        x: U;
    }

    interface B<U, T> { // error
        y: T;
    }
}

module M2 {
    interface B<T, U> {
        x: U;
    }
}

module M2 {
    // BUG 857614
    interface B<U, T> { // should be error
        y: T;
    }
}


// type parameter names are relevant when choosing whether to merge interface declarations

interface A<T> {
    x: T;
}

interface A<U> { // error
    y: U;
}

interface B<T,U> {
    x: U;
}

interface B<T,V> { // error
    y: V;
}

module M {
    interface A<T> {
        x: T;
    }

    interface A<U> { // error
        y: U;
    }

    interface B<T, U> {
        x: U;
    }

    interface B<T, V> { // error
        y: V;
    }
}

module M2 {
    interface B<T, U> {
        x: U;
    }
}

module M2 {
    // BUG 857614
    interface B<T, V> { // should be error
        y: V;
    }
}


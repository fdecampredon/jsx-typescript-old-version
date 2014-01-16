interface A {
    x: string; // error
}

interface A {
    x: string; // error
}

module M {
    interface A<T> {
        x: T;
    }

    interface A<T> {
        x: T;  // error
    }
}

module M2 {
    interface A<T> {
        x: T;
    }   
}

module M2 {
    // BUG 857614
    interface A<T> {
        x: T;  // should be error
    }
}
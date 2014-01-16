interface A {
    x: string; // error
}

interface A {
    x: number;
}

module M {
    interface A<T> {
        x: T;
    }

    interface A<T> {
        x: number;  // error
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
        x: number;  // should be error
    }
}
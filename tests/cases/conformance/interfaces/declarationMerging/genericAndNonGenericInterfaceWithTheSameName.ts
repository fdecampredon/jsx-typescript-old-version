// generic and non-generic interfaces with the same name do not merge

interface A {
    foo: string;
}

interface A<T> { // error
    bar: T;
}

module M {
    interface A<T> { 
        bar: T;
    }

    interface A { // error
        foo: string;
    }
}

module M2 {
    interface A {
        foo: string;
    }
}

module M2 {
    // BUG 857614
    interface A<T> { // should be error
        bar: T;
    }
}
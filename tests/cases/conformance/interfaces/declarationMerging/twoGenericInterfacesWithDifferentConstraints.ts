interface A<T extends Date> {
    x: T;
}

interface A<T extends Number> { // error
    y: T;
}

module M {
    interface B<T extends A<Date>> {
        x: T;
    }

    interface B<T extends A<any>> { // error
        y: T;
    }
}

module M2 {
    interface A<T extends Date> {
        x: T;
    }
}

module M2 {
    // BUG 856468
    interface A<T extends Number> { // should be error
        y: T;
    }
}
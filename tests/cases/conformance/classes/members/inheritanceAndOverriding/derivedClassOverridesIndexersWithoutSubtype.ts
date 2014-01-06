class Base {
    [x: string]: Object;
}

// error
class Derived extends Base {
    [x: string]: any;
}

class Base2 {
    [x: number]: Object;
}

// error
class Derived2 extends Base2 {
    [x: number]: any;
}
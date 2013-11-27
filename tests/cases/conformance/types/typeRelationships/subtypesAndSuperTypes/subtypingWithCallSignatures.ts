interface Base { // T
    // M's
    a: (x: number) => void;
    a2: (x: number, y: number) => void;
    a3: <T>(x: T) => void;
}

// S's
interface I extends Base {
    // N's
    a: (x: number) => number; // ok because base returns void
    a2: (x: number, y: number) => boolean; // ok because base returns void
    a3: <T>(x: T) => string; // ok because base returns void
}

interface Base2 { // T
    // M's
    a: (x: number) => number;
    a2: <T>(x: T) => T;
}

// S's
interface I2 extends Base2 {
    // N's
    a: (x: number) => string; // error because base returns non-void;
}

// S's
interface I3 extends Base2 {
    // N's
    a2: <T>(x: T) => string; // error because base returns non-void;
}


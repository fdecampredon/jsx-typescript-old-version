// call signatures in derived types must have the same or fewer optional parameters as the base type

interface Base { 
    a: (...args: number[]) => number;
    a2: (x: number, ...z: number[]) => number;
    a3: (x: number, y?: string, ...z: number[]) => number;
    a4: (x?: number, y?: string, ...z: number[]) => number;
}

interface I1 extends Base {
    a: () => number; // ok, same number of required params
}

interface I1B extends Base {
    a: (...args: number[]) => number; // ok, same number of required params
}

interface I1C extends Base {
    a: (...args: string[]) => number; // error, type mismatch
}

interface I2 extends Base {
    a: (x?: number) => number; // ok, same number of required params
}

interface I2B extends Base {
    a: (x?: number, y?: number, z?: number) => number; // ok, same number of required params
}

interface I3 extends Base {
    a: (x: number) => number; // error, too many required params
}

interface I3B extends Base {
    a: (x?: string) => number; // error, incompatible type
}



interface I4 extends Base {
    a2: () => number; // ok, fewer required params
}

interface I4B extends Base {
    a2: (...args: number[]) => number; // ok, fewer required params
}

interface I5 extends Base {
    a2: (x?: number) => number; // ok, fewer required params
}

interface I6 extends Base {
    a2: (x: number) => number; // ok, same number of required params
}

interface I6B extends Base {
    a2: (x: number, ...args: number[]) => number; // ok, same number of required params
}

// BUG 833401
interface I6C extends Base {
    a2: (x: number, ...args: string[]) => number; // should be type mismatch error
}

interface I6D extends Base {
    a2: (x: number, y: number) => number; // error, too many required params
}

interface I6E extends Base {
    a2: (x: number, y?: number) => number; // ok, same number of required params
}



interface I7 extends Base {
    a3: () => number; // ok, fewer required params
}

interface I8 extends Base {
    a3: (x?: number) => number; // ok, fewer required params
}

interface I9 extends Base {
    a3: (x: number) => number; // ok, same number of required params
}

interface I10 extends Base {
    a3: (x: number, y: string) => number;  // error, too many required params
}

// BUG 833440
interface I10B extends Base {
    a3: (x: number, y?: number, z?: number) => number;  // should be error
}

// BUG 833440
interface I10C extends Base {
    a3: (x: number, ...z: number[]) => number;  // should be error
}

// BUG 833401
interface I10D extends Base {
    a3: (x: string, y?: string, z?: string) => number;  // should be error, incompatible types
}


interface I11 extends Base {
    a4: () => number; // ok, fewer required params
}

interface I12 extends Base {
    a4: (x?: number, y?: number) => number; // error, type mismatch
}

interface I13 extends Base {
    a4: (x: number) => number; // error, too many required params
}

interface I14 extends Base {
    a4: (x: number, y?: number) => number;  // error, too many required params
}

interface I15 extends Base {
    a4: (x?: number, y?: string) => number;  // ok, same number of required params with matching types
}

interface I16 extends Base {
    a4: (x: number, ...args: string[]) => number;  // error, too many required params
}
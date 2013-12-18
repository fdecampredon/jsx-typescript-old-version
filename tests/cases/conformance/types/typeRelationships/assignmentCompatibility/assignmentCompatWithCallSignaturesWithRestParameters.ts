// call signatures in derived types must have the same or fewer optional parameters as the target for assignment

interface Base { 
    a: (...args: number[]) => number;
    a2: (x: number, ...z: number[]) => number;
    a3: (x: number, y?: string, ...z: number[]) => number;
    a4: (x?: number, y?: string, ...z: number[]) => number;
}

var a: (...args: number[]) => number; // ok, same number of required params
    a = () => 1; // ok, same number of required params
    a = (...args: number[]) => 1; // ok, same number of required params
    a = (...args: string[]) => 1; // error, type mismatch
    a = (x?: number) => 1; // ok, same number of required params
    a = (x?: number, y?: number, z?: number) => 1; // ok, same number of required params
    a = (x: number) => 1; // error, too many required params
    a = (x?: string) => 1; // error, incompatible type


var a2: (x: number, ...z: number[]) => number;
    a2 = () => 1; // ok, fewer required params
    a2 = (...args: number[]) => 1; // ok, fewer required params
    a2 = (x?: number) => 1; // ok, fewer required params
    a2 = (x: number) => 1; // ok, same number of required params
    a2 = (x: number, ...args: number[]) => 1; // ok, same number of required params
    // BUG 833401
    a2 = (x: number, ...args: string[]) => 1; // should be type mismatch error
    a2 = (x: number, y: number) => 1; // error, too many required params
    a2 = (x: number, y?: number) => 1; // ok, same number of required params

var a3: (x: number, y?: string, ...z: number[]) => number;
    a3 = () => 1; // ok, fewer required params
    a3 = (x?: number) => 1; // ok, fewer required params
    a3 = (x: number) => 1; // ok, same number of required params
    a3 = (x: number, y: string) => 1;  // error, too many required params
    // BUG 833440
    a3 = (x: number, y?: number, z?: number) => 1;  // should be error
    // BUG 833440
    a3 = (x: number, ...z: number[]) => 1;  // should be error
    a3 = (x: string, y?: string, z?: string) => 1;  // error

var a4: (x?: number, y?: string, ...z: number[]) => number;
    a4 = () => 1; // ok, fewer required params
    a4 = (x?: number, y?: number) => 1; // error, type mismatch
    a4 = (x: number) => 1; // error, too many required params
    a4 = (x: number, y?: number) => 1;  // error, too many required params
    a4 = (x?: number, y?: string) => 1;  // ok, same number of required params with matching types
    a4 = (x: number, ...args: string[]) => 1;  // error, too many required params

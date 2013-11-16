interface A {
    f(p: string): { [p: string]: string; };
    f(p: "spec"): { [p: string]: any; } // Should be error
}
interface B {
    f(p: string): { [p: number]: string; };
    f(p: "spec"): { [p: string]: any; } // Should be error
}
interface C {
    f(p: string): { [p: number]: string; };
    f(p: "spec"): { [p: number]: any; } // Should be error
}
interface D {
    f(p: string): { [p: string]: string; };
    f(p: "spec"): { [p: number]: any; } // Should be error
}
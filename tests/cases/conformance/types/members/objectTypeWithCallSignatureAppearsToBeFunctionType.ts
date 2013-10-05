interface I {
    (): void;
}

var i: I;
var r2: void = i();
var r2b: (x: any, y?: any) => any = i.apply;

var b: {
    (): void;
}

var r4: void = b();
var rb4: (x: any, y?: any) => any = b.apply;
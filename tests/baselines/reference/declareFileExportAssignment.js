//// [declareFileExportAssignment.js]
var m2;

module.exports = m2;


////[declareFileExportAssignment.d.ts]
declare module m2 {
    interface connectModule {
        (res: any, req: any, next: any): void;
    }
    interface connectExport {
        use: (mod: connectModule) => connectExport;
        listen: (port: number) => void;
    }
}
declare var m2: {
    test1: m2.connectModule;
    test2(): m2.connectModule;
    (): m2.connectExport;
};
export = m2;

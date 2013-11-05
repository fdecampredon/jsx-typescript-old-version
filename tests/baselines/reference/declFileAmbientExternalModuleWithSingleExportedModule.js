//// [declFileAmbientExternalModuleWithSingleExportedModule_0.js]
//// [declFileAmbientExternalModuleWithSingleExportedModule_1.js]
exports.x;


////[declFileAmbientExternalModuleWithSingleExportedModule_0.d.ts]
declare module "SubModule" {
    module m {
        module m3 {
            interface c {
            }
        }
    }
}
////[declFileAmbientExternalModuleWithSingleExportedModule_1.d.ts]
/// <reference path="declFileAmbientExternalModuleWithSingleExportedModule_0.d.ts" />
import SubModule = require('SubModule');
export declare var x: SubModule.m.m3.c;

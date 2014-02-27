//// [moduleOuterQualification.js]


////[moduleOuterQualification.d.ts]
declare module outer {
    interface Beta {
    }
    module inner {
        interface Beta extends outer.Beta {
        }
    }
}

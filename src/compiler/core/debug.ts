///<reference path='references.ts' />

module TypeScript {
    export class Debug {
        public static assert(expression: any, message?: string): void {
            if (!expression) {
                throw new Error("Debug Failure. False expression: " + (message ? message : ""));
            }
        }

        public static fail(message?: string): void {
            Debug.assert(false, message);
        }
    }
}
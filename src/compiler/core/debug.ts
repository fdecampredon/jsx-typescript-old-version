///<reference path='references.ts' />

module TypeScript {
    export enum AssertionLevel {
        None = 0,
        Normal = 1,
        Aggressive = 2,
        VeryAggressive = 3,
    }

    export class Debug {
        private static currentAssertionLevel = AssertionLevel.None;
        public static shouldAssert(level: AssertionLevel): boolean {
            return this.currentAssertionLevel >= level;
        }

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
module TypeScript {
    export interface IRuleDescription {
        code: string;
        name: string;
        severity: string;
        // TODO: add other properties\criteria that might be used in filtering
    }

    export interface IRuleDiagnostics {
        defaultCulture: string;
        resourceFiles: IIndexable<string>
    }

    export interface IRulesGroup {
        implementationFile: string;
        rules: IRuleDescription[]
        messages: IRuleDiagnostics;
    }
}
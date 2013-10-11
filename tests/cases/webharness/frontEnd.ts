///<reference path='..\..\..\src\compiler\typescript.ts'/>
///<reference path='..\..\..\src\compiler\Syntax\Parser.ts'/>
///<reference path='..\..\..\src\services\pullLanguageService.ts'/>
///<reference path='.\quotedLib.ts'/>
///<reference path='.\quotedCompiler.ts'/>

class StringTextWriter implements ITextWriter {
    public buff = "";

    Write(s: string) {
        this.buff += s;
    }

    WriteLine(s: string) {
        this.buff += s + "\n";
    }

    Close() { }
}

class DiagnosticsLogger implements TypeScript.ILogger {

    public information(): boolean { return false; }
    public debug(): boolean { return false; }
    public warning(): boolean { return false; }
    public error(): boolean { return false; }
    public fatal(): boolean { return false; }
    public log(s: string): void {
        console.log(s);
    }
}

var libraryFileName = "lib.d.ts";
var compilerFileName = "compiler.ts";

class BatchCompiler implements Services.ILanguageServiceHost {
    public compiler: TypeScript.TypeScriptCompiler;
    private simpleText = TypeScript.SimpleText.fromString(compilerString);
    private libScriptSnapshot = TypeScript.ScriptSnapshot.fromString(libString);
    private compilerScriptSnapshot = TypeScript.ScriptSnapshot.fromString(compilerString);

    public compile() {
        var settings = new TypeScript.CompilationSettings();
        settings.generateDeclarationFiles = true;
        settings.outFileOption = "Output.ts";

        this.compiler = new TypeScript.TypeScriptCompiler(new DiagnosticsLogger(),
            TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings));

        this.compiler.addFile("lib.d.ts", this.libScriptSnapshot, ByteOrderMark.None, 0, false, []);
        this.compiler.addFile("compiler.ts", this.compilerScriptSnapshot, ByteOrderMark.None, 0, false, []);
    }

    public information(): boolean {
        return true;
    }

    public debug(): boolean {
        return true;
    }

    public warning(): boolean {
        return true;
    }

    public error(): boolean {
        return true;
    }

    public fatal(): boolean {
        return true;
    }

    public log(s: string): void {

    }

    public getCompilationSettings(): TypeScript.CompilationSettings {
        return new TypeScript.CompilationSettings();
    }

    public getScriptFileNames(): string[] {
        return [libraryFileName, compilerFileName];
    }

    public getScriptVersion(fileName: string): number {
        return 1;
    }

    public getScriptIsOpen(fileName: string): boolean {
        return fileName !== libraryFileName;
    }

    public getScriptByteOrderMark(fileName: string): ByteOrderMark {
        return ByteOrderMark.None;
    }

    public getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
        switch (fileName) {
            case libraryFileName: return this.libScriptSnapshot;
            case compilerFileName: return this.compilerScriptSnapshot;
        }

        throw new Error("Invalid file name");
    }

    public getDiagnosticsObject(): Services.ILanguageServicesDiagnostics {
        return null;
    }

    public getLocalizedDiagnosticMessages(): any {
        return null;
    }

    public createLanguageService() {
        return new Services.LanguageService(this);
    }

    public newParse(): TypeScript.SyntaxTree {
        return TypeScript.Parser.parse(compilerFileName, this.simpleText, false,
            TypeScript.getParseOptions(TypeScript.ImmutableCompilationSettings.defaultSettings()));
    }

    public newIncrementalParse(tree: TypeScript.SyntaxTree): TypeScript.SyntaxTree {
        var width = 100;
        var span = new TypeScript.TextSpan(TypeScript.IntegerUtilities.integerDivide(compilerString.length - width, 2), width);
        var range = new TypeScript.TextChangeRange(span, width);
        return TypeScript.Parser.incrementalParse(tree, range, this.simpleText);
    }

    public resolveRelativePath(path: string, directory: string): string { throw new Error(); }
    public fileExists(path: string): boolean { throw new Error(); }
    public directoryExists(path: string): boolean { throw new Error(); }
    public getParentDirectory(path: string): string { throw new Error(); }
}

function compile() {
    var batch = new BatchCompiler();
    batch.compile();
}

// for (var i = 0; i < 2; i++) {
//    var tree = batch.newParse();
//    TypeScript.SyntaxTreeToAstVisitor.visit(tree.sourceUnit(), "", 0);
// }
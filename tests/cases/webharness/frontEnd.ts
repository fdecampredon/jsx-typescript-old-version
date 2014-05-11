///<reference path='..\..\..\src\compiler\typescript.ts'/>
///<reference path='..\..\..\src\compiler\syntax\parser.ts'/>
///<reference path='..\..\..\src\services\pullLanguageService.ts'/>
///<reference path='.\quotedLib.ts'/>
///<reference path='.\quotedCompiler.ts'/>

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

var libDTSFileName = "lib.d.ts";
var libDTSSource = TypeScript.SimpleText.fromString(libString);

var compilerSourcesFileName = "compiler.ts";
var compilerSources = TypeScript.SimpleText.fromString(compilerString);

class BatchCompiler {
    public compiler: TypeScript.TypeScriptCompiler;

    public compile() {
        var settings = new TypeScript.CompilationSettings();
        settings.generateDeclarationFiles = true;
        settings.outFileOption = "Output.ts";

        this.compiler = new TypeScript.TypeScriptCompiler(new DiagnosticsLogger(),
            TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings));

        this.compiler.addFile(libDTSFileName, TypeScript.ScriptSnapshot.fromString(libString), TypeScript.ByteOrderMark.None, 0, false, []);
        this.compiler.addFile(compilerSourcesFileName, TypeScript.ScriptSnapshot.fromString(compilerString), TypeScript.ByteOrderMark.None, 0, false, []);

        this.compiler.getSyntacticDiagnostics("lib.d.ts");
        this.compiler.getSyntacticDiagnostics("compiler.ts");
        this.compiler.getSemanticDiagnostics("compiler.ts");
    }

    public parseCompilerSources(): TypeScript.SyntaxTree {
        return TypeScript.Parser.parse(compilerSourcesFileName, compilerSources, /*isDeclaration:*/ false,
            TypeScript.ImmutableCompilationSettings.defaultSettings().codeGenTarget());
    }

    public parseLibDTSSource(): TypeScript.SyntaxTree {
        return TypeScript.Parser.parse(libDTSFileName, libDTSSource, /*isDeclaration:*/ true,
            TypeScript.ImmutableCompilationSettings.defaultSettings().codeGenTarget());
    }

    public incrementalParseLibDTSSource(tree: TypeScript.SyntaxTree): TypeScript.SyntaxTree {
        var width = 1;
        var span = new TypeScript.TextSpan(TypeScript.IntegerUtilities.integerDivide(libString.length - width, 2), width);
        var range = new TypeScript.TextChangeRange(span, width);
        return TypeScript.Parser.incrementalParse(tree, range, libDTSSource);
    }
}

function compile() {
    var batch = new BatchCompiler();
    batch.compile();
}

// for (var i = 0; i < 2; i++) {
//    var tree = batch.newParse();
//    TypeScript.SyntaxTreeToAstVisitor.visit(tree.sourceUnit(), "", 0);
// }
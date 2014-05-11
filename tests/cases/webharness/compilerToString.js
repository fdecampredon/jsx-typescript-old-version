var _fs = require('fs');
var _sys = require('sys');

var fileList = String(_fs.readFileSync("fileList.txt"));
var files = fileList.split("\r\n");

// var wholeCompilerString = _fs.readFileSync("wholecompiler.ts");
var wholeLibString = _fs.readFileSync("../../../bin/lib.d.ts");

function quoteString(str) {
    str = String(str);
    var outputText = '"';
    var last = "";

    for (var i = 0; i < str.length; i++) {
        var char = str.charAt(i);

        // if (last == "\\" && (char == "\"" || char == "'")) {
        // 	last = char;
        // 	continue;
        // }
        // Prefix quotation mark with a backslash,
        if (char == "\"") {
            outputText += "\\\"";
        }
            // Prefix apostrophe with a backslash,
        else if (char == "'") {
            outputText += "\\'";
        }
            // right quote
        else if (char == "'") {
            outputText += "\\'";
        }
            // rigth quote
        else if (char == "\"") {
            outputText += "\\\"";
        }
            // convert newline to a literal.
        else if (char == "\n") {
            outputText += "\\n";
        }
        else if (char == "\r") {
            continue;
        }
        else if (char == "\\") {
            outputText += "\\\\";
        }
        else {
            outputText += char;
        }

        last = char;
    }

    return outputText + '"';
}

var quotedCompilerString = "var compilerFiles = [";

for (var i = 0; i < files.length; i++) {
    var fileName = files[i];
    if (!fileName || fileName.length === 0) {
        continue;
    }

    if (i) {
        quotedCompilerString += ",";
    }

    quotedCompilerString += "\r\n" + quoteString(_fs.readFileSync(fileName));
}


quotedCompilerString += "\r\n];";

//quoteString(wholeCompilerString, "compilerString");

_fs.writeFileSync("quotedCompiler.ts", quotedCompilerString);
_fs.writeFileSync("quotedLib.ts", "var libString = " + quoteString(wholeLibString) + ";");
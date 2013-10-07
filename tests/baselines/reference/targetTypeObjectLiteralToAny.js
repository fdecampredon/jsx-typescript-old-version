function suggest() {
    var TypeScriptKeywords;
    var result;

    TypeScriptKeywords.forEach(function (keyword) {
        result.push({ text: keyword, type: "keyword" }); // this should not cause a crash - push should be typed to any
    });
}

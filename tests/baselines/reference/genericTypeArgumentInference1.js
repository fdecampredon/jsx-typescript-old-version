var r = _.all([true, 1, null, 'yes'], _.identity);
var r2 = _.all([true], _.identity);
var r3 = _.all([], _.identity);
var r4 = _.all([true], _.identity);

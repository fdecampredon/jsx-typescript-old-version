exports.x = 1;

var Query;
(function (Query) {
    function fromDoWhile(doWhile) {
        return null;
    }
    Query.fromDoWhile = fromDoWhile;

    function fromOrderBy() {
        return fromDoWhile(function (test) {
            return true;
        });
    }
})(Query || (Query = {}));

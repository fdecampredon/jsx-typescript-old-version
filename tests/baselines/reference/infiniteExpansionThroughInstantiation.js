// instantiating a derived type can cause an infinitely expanding type reference to be generated


var list;
var ownerList;

// BUG 843510
list = ownerList; // should be error

function other(x) {
    var list;
    var ownerList;

    // BUG 843510
    list = ownerList; // should be error
}

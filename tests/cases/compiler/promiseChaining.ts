class Chain<T> {
    constructor(public value: T) { }
    then<S>(cb: (x: T) => S): Chain<S> {
        var result = cb(this.value);
        // should get a fresh type parameter which each then call
        var z = this.then(x => result)/*S*/.then(x => "abc")/*string*/.then(x => x.length)/*number*/; // No error
        return new Chain(result);
    }
}

// same example but with constraints on each type parameter
class Chain2<T extends { length: number }> {
    constructor(public value: T) { }
    then<S extends Function>(cb: (x: T) => S): Chain2<S> {
        var result = cb(this.value);
        // should get a fresh type parameter which each then call
        var z = this.then(x => result)/*S*/.then(x => "abc")/*Function*/.then(x => x.length)/*number*/; // Should error on "abc" because it is not a Function
        return new Chain2(result);
    }
}

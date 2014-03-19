class Chain<T> {
    constructor(public value: T) { }
    then<S extends T>(cb: (x: T) => S): Chain<S> {
        var t: T;
        var s: S;
        // Ok to go down the chain, but error to climb up the chain
        (new Chain(t)).then(tt => s).then(ss => t);

        // But error to try to climb up the chain
        (new Chain(s)).then(ss => t);

        // Staying at T or S should be fine
        (new Chain(t)).then(tt => t).then(tt => t).then(tt => t);
        (new Chain(s)).then(ss => s).then(ss => s).then(ss => s);

        return null;
    }
}
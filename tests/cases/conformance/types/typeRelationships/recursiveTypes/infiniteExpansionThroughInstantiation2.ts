// instantiating a derived type can cause an infinitely expanding type reference to be generated
// which could be used in an assignment check for constraint satisfaction

interface AA<T extends AA<T>> // now an error due to referencing type parameter in constraint
{
    x: T
}

interface BB extends AA<AA<BB>> // error, was originally intended to work but then we added the restriction that causes the error in AA
{
}
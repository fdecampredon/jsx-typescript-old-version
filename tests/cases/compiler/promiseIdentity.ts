interface IPromise<T> {
    then<U>(callback: (x: T) => IPromise<U>): IPromise<U>;
}
interface Promise<T> {
    then<U>(callback: (x: T) => Promise<U>): Promise<U>;
}
var x: IPromise<string>;
var x: Promise<string>;
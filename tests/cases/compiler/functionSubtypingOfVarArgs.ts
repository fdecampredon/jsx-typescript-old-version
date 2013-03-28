class EventBase {
    private _listeners = [];

    add(listener: (...args: any[]) => void): void {
        this._listeners.push(listener);
    }
}

class StringEvent extends EventBase { // should work
    add(listener: (items: string) => void ) {
        super.add(listener);
    }
}

//// [genericClassPropertyInheritanceSpecialization.ts]
interface KnockoutObservableBase<T> {
    peek(): T;
    (): T;
    (value: T): void;
}

interface KnockoutObservable<T> extends KnockoutObservableBase<T> {
    equalityComparer(a: T, b: T): boolean;
    valueHasMutated(): void;
    valueWillMutate(): void;
}

interface KnockoutObservableArray<T> extends KnockoutObservable<T[]> {
    indexOf(searchElement: T, fromIndex?: number): number;
    slice(start: number, end?: number): T[];
    splice(start: number, deleteCount?: number, ...items: T[]): T[];
    pop(): T;
    push(...items: T[]): void;
    shift(): T;
    unshift(...items: T[]): number;
    reverse(): T[];
    sort(compareFunction?: (a: T, b: T) => number): void;
    replace(oldItem: T, newItem: T): void;
    remove(item: T): T[];
    removeAll(items?: T[]): T[];
    destroy(item: T): void;
    destroyAll(items?: T[]): void;
}

interface KnockoutObservableArrayStatic {
    fn: KnockoutObservableArray<any>;

    <T>(value?: T[]): KnockoutObservableArray<T>;
}

declare module ko {
    export var observableArray: KnockoutObservableArrayStatic;
}

module Portal.Controls.Validators {

    export class Validator<TValue> {
        private _subscription;
        public message: KnockoutObservable<string>;
        public validationState: KnockoutObservable<number>;
        public validate: KnockoutObservable<TValue>;
        constructor(message?: string) { }
        public destroy(): void { }
        public _validate(value: TValue): number {return 0 }
    }
}

module PortalFx.ViewModels.Controls.Validators {

    export class Validator<TValue> extends Portal.Controls.Validators.Validator<TValue> {

        constructor(message?: string) {
            super(message);
        }
    }

}

interface Contract<TValue> {

    validators: KnockoutObservableArray<PortalFx.ViewModels.Controls.Validators.Validator<TValue>>;
}


class ViewModel<TValue> implements Contract<TValue> {

    public validators: KnockoutObservableArray<PortalFx.ViewModels.Controls.Validators.Validator<TValue>> = ko.observableArray<PortalFx.ViewModels.Controls.Validators.Validator<TValue>>();
}



//// [genericClassPropertyInheritanceSpecialization.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Portal;
(function (Portal) {
    (function (Controls) {
        (function (Validators) {
            var Validator = (function () {
                function Validator(message) {
                }
                Validator.prototype.destroy = function () {
                };
                Validator.prototype._validate = function (value) {
                    return 0;
                };
                return Validator;
            })();
            Validators.Validator = Validator;
        })(Controls.Validators || (Controls.Validators = {}));
        var Validators = Controls.Validators;
    })(Portal.Controls || (Portal.Controls = {}));
    var Controls = Portal.Controls;
})(Portal || (Portal = {}));

var PortalFx;
(function (PortalFx) {
    (function (ViewModels) {
        (function (Controls) {
            (function (Validators) {
                var Validator = (function (_super) {
                    __extends(Validator, _super);
                    function Validator(message) {
                        _super.call(this, message);
                    }
                    return Validator;
                })(Portal.Controls.Validators.Validator);
                Validators.Validator = Validator;
            })(Controls.Validators || (Controls.Validators = {}));
            var Validators = Controls.Validators;
        })(ViewModels.Controls || (ViewModels.Controls = {}));
        var Controls = ViewModels.Controls;
    })(PortalFx.ViewModels || (PortalFx.ViewModels = {}));
    var ViewModels = PortalFx.ViewModels;
})(PortalFx || (PortalFx = {}));

var ViewModel = (function () {
    function ViewModel() {
        this.validators = ko.observableArray();
    }
    return ViewModel;
})();

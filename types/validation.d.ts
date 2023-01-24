declare module 'mongoose' {

  type SchemaValidator<T> = RegExp | [RegExp, string] | Function | [Function, string] | ValidateOpts<T> | ValidateOpts<T>[];

  interface ValidatorProps<T> {
    path: string;
    value: T;
  }

  interface ValidatorMessageFn<T> {
    (props: ValidatorProps<T>): string;
  }

  interface ValidateFn<T, M = Model<unknown>> {
    (this: M, value: T, props?: ValidatorProps<T> & Record<string, any>): boolean;
  }

  interface LegacyAsyncValidateFn<T, M = Model<unknown>> {
    (this: M, value: T, done: (result: boolean) => void): void;
  }

  interface AsyncValidateFn<T, M = Model<unknown>> {
    (this: M, value: T, props?: ValidatorProps<T> & Record<string, any>): Promise<boolean>;
  }

  interface ValidateOpts<T, M = Model<unknown>> {
    msg?: string;
    message?: string | ValidatorMessageFn<T>;
    type?: string;
    validator: ValidateFn<T, M> | LegacyAsyncValidateFn<T, M> | AsyncValidateFn<T, M>;
    propsParameter?: boolean;
  }
}

declare module 'mongoose' {
  type CallbackWithoutResultAndOptionalError = (error?: NativeError | null) => void;
}

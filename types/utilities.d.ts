
declare module 'mongoose' {

  /**
   * @summary Checks if two types are identical.
   * @param {T} T The first type to be compared with {@link U}.
   * @param {U} U The seconde type to be compared with {@link T}.
   * @param {N} N A type to be returned if {@link T} &  {@link U} are not identical.
   * @returns the value of {@link Y} OR {@link N} Generics depending on the condition result.
   */
  type IfEquals<T, U, Y = true, N = false> =
        (<G>() => G extends T ? 1 : 0) extends
        (<G>() => G extends U ? 1 : 0) ? Y : N;

  /**
   * @summary A utility to merge properties from B into A without overriding the common properties with B.
   * @param {A} A The first interface to be merged with {@link B}.
   * @param {B} B The seconde interface to be merged with {@link A}.
   * @returns An interface that have all properties of {@link A} and the uncommon properties from {@link B}
   */
  type PopulateAFromB<A, B> = A & Omit<B, keyof A>;
  type x = PopulateAFromB<{
    name: string;
  }, LeanDocumentBaseType>;

}


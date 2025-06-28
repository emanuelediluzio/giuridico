declare module 'pdf-text-extract' {
  function extract(
    file: Buffer | string,
    options: unknown,
    callback: (err: Error | null, pages: string[]) => void
  ): void;
  function extract(
    file: Buffer | string,
    callback: (err: Error | null, pages: string[]) => void
  ): void;
  export default extract;
} 
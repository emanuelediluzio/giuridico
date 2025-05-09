declare module 'pdf-text-extract' {
  function extract(
    file: Buffer | string,
    options: any,
    callback: (err: any, pages: string[]) => void
  ): void;
  function extract(
    file: Buffer | string,
    callback: (err: any, pages: string[]) => void
  ): void;
  export default extract;
} 
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'puter' {
    export namespace ai {
        function chat(messages: any[] | string, options?: { model?: string }): Promise<any>;
    }
}

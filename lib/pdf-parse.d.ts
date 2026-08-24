declare module "pdf-parse" {
  export class PDFParse {
    constructor(options: { data: Uint8Array | Buffer; verbosity?: number });
    getText(): Promise<{ text: string }>;
    getInfo(): Promise<Record<string, unknown>>;
    destroy(): Promise<void>;
  }
}

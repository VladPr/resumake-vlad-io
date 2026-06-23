declare module 'swiftlatex' {
  export interface CompileResult {
    pdf: Uint8Array
    status: number
    log: string
  }

  class LaTeXEngine {
    loadEngine(): Promise<void>
    isReady(): boolean
    makeMemFSFolder(folder: string): Promise<void>
    writeMemFSFile(
      filename: string,
      content: string | Uint8Array
    ): Promise<void>
    setEngineMainFile(filename: string): Promise<void>
    setTexliveEndpoint(url: string): Promise<void>
    compileLaTeX(): Promise<CompileResult>
    compilePDF(): Promise<CompileResult>
    flushCache(): void
    closeWorker(): void
  }

  export class PdfTeXEngine extends LaTeXEngine {}
  export class XeTeXEngine extends LaTeXEngine {}
  export class DvipdfmxEngine extends LaTeXEngine {}
}

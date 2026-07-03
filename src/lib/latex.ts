import { PdfTeXEngine, XeTeXEngine, DvipdfmxEngine } from 'swiftlatex'
import { LaTeXOpts } from '../types'

const pdftex = new PdfTeXEngine()
const xetex = new XeTeXEngine()
const dvipdfmx = new DvipdfmxEngine()
let engineLoaded = false

// SwiftLaTeX streams its format file and LaTeX packages on demand from a
// TeXLive endpoint. The upstream public server (texlive2.swiftlatex.com) is
// offline, so point at a locally hosted TeXLive on-demand server instead.
// Override with NEXT_PUBLIC_TEXLIVE_ENDPOINT if hosting it elsewhere.
const TEXLIVE_ENDPOINT =
  process.env.NEXT_PUBLIC_TEXLIVE_ENDPOINT || 'http://localhost:8088'

// The SwiftLaTeX engines are singletons and can only compile one document at a
// time; a second call while one is in flight throws "Engine is still spinning
// or not ready yet!". Serialize every compile through a promise chain so
// callers (e.g. rendering all templates on MAKE) can fire in a loop safely.
let compileQueue: Promise<unknown> = Promise.resolve()

export default function latex(
  texDoc: string,
  opts: LaTeXOpts
): Promise<string> {
  const run = () => compile(texDoc, opts)
  const result = compileQueue.then(run, run)
  // Keep the chain alive regardless of whether this compile resolved or threw.
  compileQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

async function compile(texDoc: string, opts: LaTeXOpts) {
  if (!engineLoaded) {
    await Promise.all([
      pdftex.loadEngine(),
      xetex.loadEngine(),
      dvipdfmx.loadEngine()
    ])
    engineLoaded = true

    await Promise.all([
      pdftex.setTexliveEndpoint(`${TEXLIVE_ENDPOINT}/pdftex/`),
      xetex.setTexliveEndpoint(`${TEXLIVE_ENDPOINT}/xetex/`),
      dvipdfmx.setTexliveEndpoint(`${TEXLIVE_ENDPOINT}/xetex/`)
    ])

    await pdftex.makeMemFSFolder('fonts/')
    await xetex.makeMemFSFolder('fonts/')
    await dvipdfmx.makeMemFSFolder('fonts/')
  }

  const fonts = await resolveAssets(opts.fonts || [])
  const inputs = await resolveAssets(opts.inputs || [])

  switch (opts.cmd) {
    case 'pdflatex': {
      for (const [name, content] of fonts) {
        await pdftex.writeMemFSFile(`fonts/${name}`, content)
      }

      for (const [name, content] of inputs) {
        await pdftex.writeMemFSFile(name, content)
      }

      await pdftex.writeMemFSFile('main.tex', texDoc)
      await pdftex.setEngineMainFile('main.tex')
      const { pdf } = await pdftex.compileLaTeX()

      return URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    }
    case 'xelatex': {
      for (const engine of [xetex, dvipdfmx]) {
        for (const [name, content] of fonts) {
          await engine.writeMemFSFile(`fonts/${name}`, content)
        }
      }

      for (const [name, content] of inputs) {
        await xetex.writeMemFSFile(name, content)
      }

      await xetex.writeMemFSFile('main.tex', texDoc)
      await xetex.setEngineMainFile('main.tex')
      const res = await xetex.compileLaTeX()

      await dvipdfmx.writeMemFSFile('main.xdv', res.pdf)
      await dvipdfmx.setEngineMainFile('main.xdv')
      const { pdf } = await dvipdfmx.compilePDF()

      return URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    }
  }
}

async function resolveAssets(urls: string[]) {
  const assets = await Promise.all(
    urls.map((url) =>
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => new Uint8Array(buffer))
    )
  )
  const basenames = urls.map(basename)
  return zip(basenames, assets)
}

function basename(url: string): string {
  return url.split('/').pop() ?? url
}

function zip<T, U>(a: T[], b: U[]): [T, U][] {
  return a.map((k, i) => [k, b[i]])
}

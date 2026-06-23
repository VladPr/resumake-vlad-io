# Running the live PDF preview locally

Resumake (this `v2` branch) compiles LaTeX **in the browser** with
[SwiftLaTeX](https://www.swiftlatex.com/) (WebAssembly). The engine does not
ship the LaTeX packages or its format file — it streams them on demand from a
TeXLive "on-demand" server. Upstream this was `texlive2.swiftlatex.com`, **which
is now offline**, so the preview shows a blank page out of the box.

`src/lib/latex.ts` points the engine at a **locally hosted** TeXLive server
instead (default `http://localhost:8088`, override with
`NEXT_PUBLIC_TEXLIVE_ENDPOINT`). These are the steps to run it.

## 1. Run the TeXLive on-demand server (podman)

The server is [`TeXlyre/texlive-ondemand-server`](https://github.com/TeXlyre/texlive-ondemand-server)
with two local changes (see `texlive-server/` in the workspace):

- `Dockerfile.local` — builds natively on **ubuntu:20.04** (its TeXLive matches
  the bundled `swiftlatex*.fmt` format files; newer Ubuntu renames
  `l3backend-pdfmode.def` and breaks them) and compiles the `pykpathsea`
  bindings from source so it runs on Apple Silicon without emulation.
- `app.py` patch:
  - **Filesystem fallback** — the engine sometimes requests `.def`/`.sty`
    files under a kpathsea *format code* whose search path doesn't include
    them (e.g. during PDF backend init it asks for `l3backend-pdfmode.def`
    under font formats). `find_file` then misses even though the file exists,
    so we fall back to locating it anywhere in the texmf tree.
  - **Return `404` (not `301`) for misses** — browsers cache `301 Moved
    Permanently` forever, which permanently poisons failed lookups.

```bash
# from the texlive-ondemand-server checkout
podman build -f Dockerfile.local -t texlive-ondemand:local .
podman run -d --name texlive -p 8088:5000 texlive-ondemand:local
```

> **Port matters.** Use a Chrome-safe port. Chrome blocks `:5060`/`:6000`
> (ERR_UNSAFE_PORT) and macOS AirPlay Receiver occupies `:5000`. `:8088` is fine.

Verify it's up:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8088/pdftex/0/swiftlatexpdftex.fmt   # 200
```

## 2. Run the app

```bash
npm install
npm run dev   # http://localhost:3000
```

Open <http://localhost:3000/generator>, fill in a field, and press **MAKE** —
the resume renders in the preview pane.

## Troubleshooting

- **Blank preview, console shows `can't find the format file`** — the TeXLive
  server isn't reachable at the configured endpoint. Check the container is up
  and the port is Chrome-safe.
- **Stale failures after fixing the server** — the browser cached old
  responses. Use a fresh port or clear the site's cache.

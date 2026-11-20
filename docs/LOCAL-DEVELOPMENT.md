# Local Development

This guide covers a reproducible frontend baseline and, separately, the local backend needed for a working chat. Run commands from the repository root unless noted.

## Supported toolchain

- **Node.js 22.x** and npm 6 or newer. `package.json` declares Node `>=18.13.0 <=22.x.x`; use Node 22 to match the frontend CI and Docker build. Node 23+ is outside the declared range.
- **Python 3.11 or 3.12** for the backend, as declared by `pyproject.toml` and `uv.lock`.
- **uv** for the locked Python environment; Docker/WSL is recommended for backend development on Windows because native backend dependencies and the supplied Windows starter have limitations.

Do not update either lockfile just to install dependencies.

## Frontend: install, check, and build

```sh
npm ci --force
npm run check
npm run build
```

`--force` is intentional: the repository's CI and Docker frontend install use npm's force option for the existing dependency tree. `npm ci` still uses `package-lock.json` and must not rewrite it. The build runs `scripts/prepare-pyodide.js` to prepare Pyodide assets and requires network access for uncached Pyodide/PyPI files. In constrained networks, configure npm and the Node process with the approved proxy settings before installing/building.

For Windows PowerShell, skip installing unused ONNX Runtime CUDA binaries and set the build heap to match the CI/Docker memory expectations:

```powershell
$env:ONNXRUNTIME_NODE_INSTALL_CUDA = 'skip'
$env:NODE_OPTIONS = '--max-old-space-size=8192'
npm ci --force
npm run check
npm run build
```

The expected static frontend output is `build/`. To inspect that output locally:

```sh
npm run preview
```

Vite preview serves the **built frontend only**. It does not start Open WebUI's Python API, database, authentication, model connections, or websocket services; API-backed chat features therefore need a separate running backend.

## Run the frontend with a backend

For frontend development, start the backend separately on port 8080 (the default proxy target in `vite.config.ts`), then start Vite in another terminal:

```sh
# Terminal 1: from the repository root, after setting up the Python environment
uv run open-webui serve --host 127.0.0.1 --port 8080

# Terminal 2: from the repository root
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). To use a different backend address, set `WEBUI_BACKEND_URL` before starting Vite. Keep generated secrets and local environment files out of version control.

## Python environment (backend)

Install the Python version already selected by your platform or let uv provision Python 3.12, then sync from the committed lockfile:

```sh
uv sync --python 3.12 --group dev
uv run open-webui serve --host 127.0.0.1 --port 8080
```

Python dependencies include native and ML packages, so installation can take time and may require platform-specific system libraries. For Windows, use the project's WSL/Docker workflow if native installation is unsupported or fails. Do not invoke Uvicorn directly as the normal startup path; `open-webui serve` handles application startup and secret-key initialization.

## Baseline checklist for a change or PR

Record the actual versions and results in the PR; do not claim a check passed if it was skipped or failed.

| Check                          | Command                                                      | Expected evidence                                               |
| ------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Runtime                        | `node --version`, `npm --version`, `uv run python --version` | Node 22.x; supported Python 3.11/3.12 for backend               |
| Clean frontend install         | `npm ci --force`                                             | Completes without changing `package-lock.json`                  |
| Svelte / TypeScript validation | `npm run check`                                              | Exit code 0                                                     |
| Production frontend            | `npm run build`                                              | Exit code 0 and generated `build/` output                       |
| Static preview                 | `npm run preview`                                            | Built frontend responds; verify backend availability separately |

For this static-adapter build, preview is not a substitute for a live backend. Include any environment-specific failure, such as unavailable network downloads, unsupported runtime versions, or missing native dependencies, rather than presenting it as a passing baseline.

### Baseline Performance Metrics

- **Build Time:** ~128 seconds
- **Chunk Size Warnings:** Several chunks > 500 kB (e.g., `Chat.js`, `Messages.js`)
- **Action Item:** Future performance optimizations should target these large chunks using dynamic imports or `manualChunks`.

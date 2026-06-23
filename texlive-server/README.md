# Local TeXLive on-demand server

These two files are the local modifications to
[`TeXlyre/texlive-ondemand-server`](https://github.com/TeXlyre/texlive-ondemand-server)
that make resumake's in-browser preview work. See `../LOCAL_PREVIEW.md` for the
full story.

Usage:

```bash
git clone https://github.com/TeXlyre/texlive-ondemand-server.git
cd texlive-ondemand-server
# copy these two files in (Dockerfile.local is new; app.py overrides upstream)
cp /path/to/resumake/texlive-server/Dockerfile.local .
cp /path/to/resumake/texlive-server/app.py .
podman build -f Dockerfile.local -t texlive-ondemand:local .
podman run -d --name texlive -p 8088:5000 texlive-ondemand:local
```

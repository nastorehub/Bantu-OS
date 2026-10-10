# upstream/

Herald OS builds on [NasTech Agent](https://github.com/nastechresearch/nastech-agent) without forking
it. Two different things come from upstream:

- **The runtime** (Python: `nastech serve`, tools, memory, sessions) is the user's own NasTech
  install, normally `~/.nastech/nastech-agent`, updated with `nastech update`. Nothing in this repo
  replaces it.
- **The TypeScript gateway client** (`apps/shared/src` upstream) is compiled into the shell from a
  pinned snapshot, so the wire contract only changes when we choose.

`UPSTREAM.lock` pins that snapshot to one commit. `npm run sync-upstream` (also run by
`npm run bootstrap`) downloads it into `upstream/nastech-agent/`, which is gitignored.

To move to a newer upstream: edit `sha=` in `UPSTREAM.lock`, run `npm run sync-upstream`, then
`npm run typecheck`. Type errors show exactly where the contract changed.

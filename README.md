# InterTask — Decentralized P2P Task Board

> Built on [Trac Intercom](https://github.com/Trac-Systems/intercom) · Vibe Competition Entry

**InterTask** is a fully decentralized, serverless collaborative task manager running on the Trac Network. No backend, no database, no authority — just peers, contracts, and fast sidechannel messaging.

---

## Features

- 📋 **Create, assign, complete, and cancel tasks** — all stored in a Trac smart contract
- ⚡ **Live updates** via the Intercom sidechannel (sub-second latency)
- 💬 **Built-in sidechannel chat** between peers
- 🖥️ **Dual mode** — terminal CLI *or* native desktop GUI (App3)
- 🔐 **Trustless auth** — only creators/assignees can complete tasks; only creators/admins can cancel
- 🌐 **HTTP API** support for web3 integration

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/intertask.git
cd intertask
npm install -g pear
npm install
pear run . store1
```

→ Full setup guide in **[SKILL.md](./SKILL.md)**

---

## Desktop GUI

Switch to GUI mode by editing `package.json`:
```json
"main": "index.html",
"pear": { "type": "desktop" }
```
Then: `pear run -d . store1`

---

## Screenshots

> *See `/screenshots/` for proof-of-function screenshots.*

---

## Trac Address

```
trac1rjlv33e75cfv3mq35y53txgprnkme7dxaqufjt6ehg7xt6e7hz4sknuc0t
```

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Pear / Holepunch |
| P2P Network | Trac Network |
| Sidechannel | Trac Intercom |
| State | Trac Smart Contract |
| Language | JavaScript (ESM) |

---

## License

MIT — fork it, ship it, earn TNK. 🚀

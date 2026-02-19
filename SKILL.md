# InterTask — SKILL.md

> Agent-oriented setup guide for InterTask, a decentralized P2P task board built on [Trac Intercom](https://github.com/Trac-Systems/intercom).

---

## What is InterTask?

InterTask is a trustless, serverless collaborative task manager running on the Trac Network.

- **Smart contract** stores all task state deterministically across every peer node
- **Sidechannel** (Intercom) delivers real-time updates with sub-second latency
- **No database, no server, no central authority** — peers own their data
- Supports both a **terminal (CLI) mode** and a **desktop (App3) GUI mode**

---

## Prerequisites

- Node.js ≥ 20
- Pear Runtime: `npm install -g pear`
- Git

---

## Quick Start (Terminal mode)

```bash
git clone https://github.com/YOUR_USERNAME/intertask.git
cd intertask
npm install
pear run . store1
```

On first run you will be prompted to:
1. Choose option **1) Deploy Bootstrap** to become the network admin
2. **Back up your seed phrase** (shown once — write it down)
3. Copy the **Peer Writer key** — this is your contract address

Then:
1. Open `index.js` in a text editor
2. Replace `REPLACE_WITH_YOUR_BOOTSTRAP_WRITER_KEY` with your copied writer key
3. Run `/exit`, then `pear run . store1` again
4. Run `/add_admin --address YOUR_PEER_ADDRESS` to grant yourself admin rights

Your bootstrap node must stay running for others to join.

---

## Switching to Desktop (App3) GUI mode

Edit `package.json`:
```json
"main": "index.html",
"pear": { "type": "desktop" }
```

Then run:
```bash
pear run -d . store1
```

The UI will open as a native app window.

---

## Enabling others to join

In the bootstrap terminal:
```
/set_auto_add_writers --enabled 1
```

Other users can now clone the repo (with your bootstrap address in `index.js`) and join the network with `pear run . store1`.

---

## CLI Command Reference

| Command | Description |
|---|---|
| `/add_task --title "..." --desc "..." --assignee <addr>` | Create a task |
| `/complete_task --id task_000001` | Mark a task complete |
| `/cancel_task --id task_000001` | Cancel a task |
| `/list_tasks` | Show all tasks |
| `/list_tasks --status open` | Filter by status (open/completed/cancelled) |
| `/list_tasks --assignee <addr>` | Tasks assigned to a peer |
| `/chat --message "..."` | Broadcast a sidechannel message |
| `/add_admin --address <addr>` | Grant admin rights |
| `/add_indexer --key <key>` | Add indexer node for resilience |
| `/set_auto_add_writers --enabled 1` | Enable open join |
| `/help` | Show help |
| `/exit` | Quit |

---

## Contract State Layout

```
task_seq                   → integer (auto-increment counter)
task:<id>                  → Task object
tasks:all                  → Set of all task IDs
tasks:open                 → Set of open task IDs
tasks:completed            → Set of completed task IDs
tasks:cancelled            → Set of cancelled task IDs
tasks:assignee:<address>   → Set of task IDs assigned to peer
```

### Task object schema

```json
{
  "id": "task_000001",
  "title": "Build the InterTask app",
  "desc": "Optional description",
  "assignee": "<peer_address_or_null>",
  "creator": "<peer_address>",
  "status": "open | completed | cancelled",
  "created_at": 1708300000000,
  "updated_at": 1708300000000
}
```

---

## Transaction Methods

| Method | Params | Auth |
|---|---|---|
| `add_task` | `title`, `desc?`, `assignee?` | Any peer |
| `complete_task` | `id` | Creator or assignee |
| `cancel_task` | `id` | Creator or admin |

## View Methods

| Method | Params | Returns |
|---|---|---|
| `list_tasks` | `status?`, `assignee?` | `{ tasks[], count }` |
| `get_task` | `id` | `{ task }` |
| `stats` | — | `{ total, open, completed, cancelled }` |

---

## HTTP API (when `api_tx_exposed: true`)

Once running, external services can submit transactions and queries over HTTP to the local peer API. See `trac-peer/src/api.js` for the full API reference.

---

## Production Deployment

For resilience, add 2–4 indexer nodes on separate machines:

1. Clone and configure with same `BOOTSTRAP_ADDRESS` on a fresh machine
2. Run `pear run . indexer1`
3. Copy the displayed **Peer Writer key**
4. On the bootstrap: `/add_indexer --key <IndexerWriterKey>`

---

## Trac Address for Rewards

```
trac1rjlv33e75cfv3mq35y53txgprnkme7dxaqufjt6ehg7xt6e7hz4sknuc0t
```

*(Replace with your actual Trac wallet address to claim competition rewards)*

---

## License

MIT

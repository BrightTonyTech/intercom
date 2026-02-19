/**
 * InterTask — Decentralized P2P Task Board on Trac Intercom
 *
 * A collaborative, trustless task manager where:
 * - Tasks live in a smart contract on the Trac Network
 * - Real-time updates flow over the Intercom sidechannel
 * - No central server, no database, no authority
 *
 * Usage: pear run . store1
 */

import Pear from 'pear'
import { createPeer } from 'trac-peer'
import b4a from 'b4a'
import readline from 'readline'

// ─── Bootstrap config (replace writer key after first run) ───────────────────
const BOOTSTRAP_ADDRESS = 'REPLACE_WITH_YOUR_BOOTSTRAP_WRITER_KEY'
const CHANNEL = 'intertask-v1-mainnet-0000000' // exactly 32 chars

// ─── MSB (value layer) config — set to null for sidechannel-only ─────────────
const MSB_ADDRESS = null

// ─── Peer options ─────────────────────────────────────────────────────────────
const peer_opts = {
  store: Pear.config.args[0] ?? 'store1',
  bootstrap_address: BOOTSTRAP_ADDRESS,
  channel: CHANNEL,
  msb_address: MSB_ADDRESS,
  // Expose HTTP APIs so external wallets/UIs can connect
  api_tx_exposed: true,
  api_msg_exposed: true
}

// ─── Boot ────────────────────────────────────────────────────────────────────
const peer = await createPeer(peer_opts, await import('./contract/protocol.js'))

console.log('\n╔══════════════════════════════════════╗')
console.log('║        InterTask — Trac Network      ║')
console.log('║  Decentralized P2P Task Board        ║')
console.log('╚══════════════════════════════════════╝\n')
console.log('Peer address :', peer.address)
console.log('Channel      :', CHANNEL)
console.log('')

// ─── CLI helper ──────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'intertask> ' })

function printHelp () {
  console.log(`
Commands:
  /add_task --title "..." --desc "..." --assignee <address>   Create a new task
  /complete_task --id <taskId>                                Mark a task complete
  /cancel_task --id <taskId>                                  Cancel a task
  /list_tasks                                                 Show all tasks
  /list_tasks --status open|completed|cancelled               Filter tasks by status
  /list_tasks --assignee <address>                            Tasks assigned to peer
  /chat --message "..."                                       Broadcast a chat message
  /add_admin --address <peerAddress>                          Grant admin rights
  /add_indexer --key <writerKey>                              Add indexer node
  /set_auto_add_writers --enabled 1|0                         Toggle open join
  /help                                                       Show this help
  /exit                                                       Quit
`)
}

// Listen for incoming sidechannel messages (live feed)
peer.on('message', ({ from, data }) => {
  try {
    const msg = JSON.parse(data)
    if (msg.type === 'task_update') {
      console.log(`\n[Live] Task #${msg.id} → ${msg.status} (by ${from.slice(0, 12)}...)`)
      rl.prompt(true)
    } else if (msg.type === 'chat') {
      console.log(`\n[Chat] ${from.slice(0, 12)}...: ${msg.text}`)
      rl.prompt(true)
    }
  } catch (_) { /* ignore non-JSON */ }
})

printHelp()
rl.prompt()

rl.on('line', async (line) => {
  const input = line.trim()
  if (!input) { rl.prompt(); return }

  // ── Built-in system commands forwarded to trac-peer ──────────────────────
  if (
    input.startsWith('/add_admin') ||
    input.startsWith('/add_indexer') ||
    input.startsWith('/set_auto_add_writers')
  ) {
    await peer.command(input)
    rl.prompt()
    return
  }

  if (input === '/exit') {
    console.log('Goodbye.')
    process.exit(0)
  }

  if (input === '/help') {
    printHelp()
    rl.prompt()
    return
  }

  // ── App commands ──────────────────────────────────────────────────────────
  if (input.startsWith('/add_task')) {
    const title = parseArg(input, '--title')
    const desc = parseArg(input, '--desc') ?? ''
    const assignee = parseArg(input, '--assignee') ?? null
    if (!title) { console.log('Error: --title is required'); rl.prompt(); return }
    try {
      const res = await peer.transaction({ method: 'add_task', params: { title, desc, assignee } })
      console.log('Task created:', res)
    } catch (e) { console.error('Error:', e.message) }
    rl.prompt()
    return
  }

  if (input.startsWith('/complete_task')) {
    const id = parseArg(input, '--id')
    if (!id) { console.log('Error: --id is required'); rl.prompt(); return }
    try {
      const res = await peer.transaction({ method: 'complete_task', params: { id } })
      console.log('Task completed:', res)
    } catch (e) { console.error('Error:', e.message) }
    rl.prompt()
    return
  }

  if (input.startsWith('/cancel_task')) {
    const id = parseArg(input, '--id')
    if (!id) { console.log('Error: --id is required'); rl.prompt(); return }
    try {
      const res = await peer.transaction({ method: 'cancel_task', params: { id } })
      console.log('Task cancelled:', res)
    } catch (e) { console.error('Error:', e.message) }
    rl.prompt()
    return
  }

  if (input.startsWith('/list_tasks')) {
    const status = parseArg(input, '--status')
    const assignee = parseArg(input, '--assignee')
    try {
      const res = await peer.view({ method: 'list_tasks', params: { status, assignee } })
      const tasks = res?.tasks ?? []
      if (tasks.length === 0) {
        console.log('No tasks found.')
      } else {
        console.log('\nID        STATUS       ASSIGNEE              TITLE')
        console.log('─'.repeat(72))
        for (const t of tasks) {
          const aid = t.assignee ? t.assignee.slice(0, 16) + '...' : 'unassigned      '
          console.log(`${t.id.slice(0, 8)}  ${t.status.padEnd(12)} ${aid}  ${t.title}`)
        }
        console.log('')
      }
    } catch (e) { console.error('Error:', e.message) }
    rl.prompt()
    return
  }

  if (input.startsWith('/chat')) {
    const text = parseArg(input, '--message')
    if (!text) { console.log('Error: --message is required'); rl.prompt(); return }
    try {
      await peer.send(JSON.stringify({ type: 'chat', text }))
      console.log('[Sent]')
    } catch (e) { console.error('Error:', e.message) }
    rl.prompt()
    return
  }

  console.log(`Unknown command: ${input}. Type /help for usage.`)
  rl.prompt()
})

// ─── Argument parser ──────────────────────────────────────────────────────────
function parseArg (input, flag) {
  // Handles --flag "value with spaces" and --flag value
  const quoted = new RegExp(`${flag}\\s+"([^"]+)"`)
  const plain = new RegExp(`${flag}\\s+(\\S+)`)
  const qm = input.match(quoted)
  if (qm) return qm[1]
  const pm = input.match(plain)
  if (pm) return pm[1]
  return null
}

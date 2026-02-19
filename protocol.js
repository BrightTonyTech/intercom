/**
 * InterTask — Contract Protocol
 *
 * Defines the API surface exposed to peers:
 *   - Transactions  → state-mutating calls (add_task, complete_task, cancel_task)
 *   - Views         → read-only queries    (list_tasks, get_task)
 *
 * All transactions are signed by the calling peer and executed deterministically
 * across every node in the network; the contract state converges automatically.
 */

export default {

  // ─── Transaction handlers (write) ─────────────────────────────────────────

  transactions: {

    /**
     * add_task — create a new task on the board
     *
     * Params:
     *   title    {string}  required, max 140 chars
     *   desc     {string}  optional, max 1000 chars
     *   assignee {string}  optional peer address
     *
     * Emits sidechannel broadcast so all connected peers see the live update.
     */
    async add_task ({ state, peer, signer, params, broadcast }) {
      const { title, desc = '', assignee = null } = params

      if (!title || typeof title !== 'string') throw new Error('title is required')
      if (title.length > 140) throw new Error('title exceeds 140 characters')
      if (desc.length > 1000) throw new Error('desc exceeds 1000 characters')

      const id = await state.increment('task_seq')
      const taskId = `task_${String(id).padStart(6, '0')}`

      const task = {
        id: taskId,
        title: title.trim(),
        desc: desc.trim(),
        assignee,
        creator: signer,
        status: 'open',
        created_at: Date.now(),
        updated_at: Date.now()
      }

      await state.set(`task:${taskId}`, task)
      await state.sadd('tasks:all', taskId)
      await state.sadd('tasks:open', taskId)

      if (assignee) {
        await state.sadd(`tasks:assignee:${assignee}`, taskId)
      }

      // Sidechannel: notify all peers live
      await broadcast(JSON.stringify({ type: 'task_update', id: taskId, status: 'open' }))

      return { success: true, id: taskId, task }
    },

    /**
     * complete_task — mark a task as done
     *
     * Only the task creator or the assignee may complete a task.
     */
    async complete_task ({ state, peer, signer, params, broadcast }) {
      const { id } = params
      if (!id) throw new Error('id is required')

      const task = await state.get(`task:${id}`)
      if (!task) throw new Error(`Task ${id} not found`)
      if (task.status !== 'open') throw new Error(`Task ${id} is not open (status: ${task.status})`)

      const isAuthorized = task.creator === signer || task.assignee === signer
      if (!isAuthorized) throw new Error('Only the creator or assignee may complete this task')

      task.status = 'completed'
      task.updated_at = Date.now()
      task.completed_by = signer

      await state.set(`task:${id}`, task)
      await state.srem('tasks:open', id)
      await state.sadd('tasks:completed', id)

      await broadcast(JSON.stringify({ type: 'task_update', id, status: 'completed' }))

      return { success: true, id, task }
    },

    /**
     * cancel_task — cancel an open task
     *
     * Only the task creator or an admin may cancel.
     */
    async cancel_task ({ state, peer, signer, params, broadcast }) {
      const { id } = params
      if (!id) throw new Error('id is required')

      const task = await state.get(`task:${id}`)
      if (!task) throw new Error(`Task ${id} not found`)
      if (task.status !== 'open') throw new Error(`Task ${id} is not open`)

      const isAdmin = await peer.isAdmin(signer)
      if (task.creator !== signer && !isAdmin) {
        throw new Error('Only the creator or an admin may cancel this task')
      }

      task.status = 'cancelled'
      task.updated_at = Date.now()
      task.cancelled_by = signer

      await state.set(`task:${id}`, task)
      await state.srem('tasks:open', id)
      await state.sadd('tasks:cancelled', id)

      await broadcast(JSON.stringify({ type: 'task_update', id, status: 'cancelled' }))

      return { success: true, id, task }
    }
  },

  // ─── View handlers (read-only) ─────────────────────────────────────────────

  views: {

    /**
     * list_tasks — return tasks, optionally filtered
     *
     * Params:
     *   status   {string}  'open' | 'completed' | 'cancelled' | undefined (all)
     *   assignee {string}  peer address filter
     */
    async list_tasks ({ state, params }) {
      const { status, assignee } = params ?? {}

      let ids
      if (assignee) {
        ids = await state.smembers(`tasks:assignee:${assignee}`) ?? []
      } else if (status) {
        ids = await state.smembers(`tasks:${status}`) ?? []
      } else {
        ids = await state.smembers('tasks:all') ?? []
      }

      const tasks = []
      for (const id of ids) {
        const t = await state.get(`task:${id}`)
        if (t) {
          // Apply status filter when using assignee lookup
          if (!status || t.status === status) {
            tasks.push(t)
          }
        }
      }

      tasks.sort((a, b) => b.created_at - a.created_at)
      return { tasks, count: tasks.length }
    },

    /**
     * get_task — fetch a single task by id
     */
    async get_task ({ state, params }) {
      const { id } = params ?? {}
      if (!id) throw new Error('id is required')
      const task = await state.get(`task:${id}`)
      if (!task) throw new Error(`Task ${id} not found`)
      return { task }
    },

    /**
     * stats — board-level summary
     */
    async stats ({ state }) {
      const all = await state.smembers('tasks:all') ?? []
      const open = await state.smembers('tasks:open') ?? []
      const completed = await state.smembers('tasks:completed') ?? []
      const cancelled = await state.smembers('tasks:cancelled') ?? []
      return {
        total: all.length,
        open: open.length,
        completed: completed.length,
        cancelled: cancelled.length
      }
    }
  }
}

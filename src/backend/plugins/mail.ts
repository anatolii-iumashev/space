import { Elysia, t } from 'elysia'
import { mailService } from '../services/mail'
import { authenticate } from './auth'

export const mailPlugin = new Elysia({ prefix: '/mail' })

  .onBeforeHandle(async ({ jwt, headers, set }) => {
    const userId = await authenticate(jwt, headers)
    if (!userId) { set.status = 401; return { ok: false, error: 'Unauthorized' } }
  })

  // List folders
  .get('/folders', async () => {
    try {
      const folders = await mailService.listFolders()
      return { ok: true, data: folders }
    } catch (e) {
      return { ok: false, error: 'Failed to list folders: ' + (e as Error).message }
    }
  })

  // List messages in folder
  .get('/:folder', async ({ params, query }) => {
    try {
      const messages = await mailService.listMessages(params.folder, {
        page: query.page || 1,
        pageSize: query.pageSize || 25,
      })
      return { ok: true, data: messages }
    } catch (e) {
      return { ok: false, error: 'Failed to list messages: ' + (e as Error).message }
    }
  }, {
    params: t.Object({ folder: t.String() }),
    query: t.Object({
      page: t.Optional(t.Integer({ default: 1 })),
      pageSize: t.Optional(t.Integer({ default: 25 })),
    }),
  })

  // Get single message (with body)
  .get('/:folder/:uid', async ({ params }) => {
    try {
      const message = await mailService.getMessage(params.folder, Number(params.uid))
      return { ok: true, data: message }
    } catch (e) {
      return { ok: false, error: 'Failed to fetch message: ' + (e as Error).message }
    }
  })

  // Send email
  .post('/send', async ({ body }) => {
    try {
      await mailService.send(body)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: 'Failed to send: ' + (e as Error).message }
    }
  }, {
    body: t.Object({
      to: t.Array(t.String({ format: 'email' })),
      subject: t.String(),
      body: t.String(),
      html: t.Optional(t.String()),
      attachments: t.Optional(t.Array(t.Object({
        filename: t.String(),
        content: t.String(), // base64
      }))),
    }),
  })

  // Mark as read/unread
  .post('/:folder/:uid/read', async ({ params, body }) => {
    try {
      await mailService.markRead(params.folder, Number(params.uid), body.read)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: 'Failed to update flags' }
    }
  }, {
    body: t.Object({
      read: t.Boolean(),
    }),
  })

  // Move message to another folder
  .post('/:folder/:uid/move', async ({ params, body }) => {
    try {
      await mailService.moveMessage(params.folder, Number(params.uid), body.to)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: 'Failed to move message' }
    }
  }, {
    body: t.Object({
      to: t.String(),
    }),
  })

  // Delete message (move to Trash)
  .delete('/:folder/:uid', async ({ params }) => {
    try {
      await mailService.deleteMessage(params.folder, Number(params.uid))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: 'Failed to delete message' }
    }
  })

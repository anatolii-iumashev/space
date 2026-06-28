import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'
import type { MailFolder, MailMessage } from '../../shared/types'

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.IMAP_USER,
    pass: process.env.IMAP_PASS,
  },
})

function createClient() {
  return new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT) || 993,
    secure: true,
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASS!,
    },
    logger: false as any,
  })
}

export const mailService = {
  async listFolders(): Promise<MailFolder[]> {
    const client = createClient()
    await client.connect()

    try {
      const folders: MailFolder[] = []
      for await (const folder of client.list()) {
        const status = await client.status(folder.path, ['MESSAGES', 'UNSEEN'])
        folders.push({
          id: folder.path,
          name: folder.name || folder.path,
          path: folder.path,
          count: status.messages || 0,
          unread: status.unseen || 0,
        })
      }
      return folders
    } finally {
      await client.logout()
    }
  },

  async listMessages(folder: string, opts: { page: number; pageSize: number }) {
    const client = createClient()
    await client.connect()

    try {
      const lock = await client.getMailboxLock(folder)
      const messages: Partial<MailMessage>[] = []

      try {
        const cursor = client.fetch(
          opts.pageSize * (opts.page - 1) + 1 + ':*',
          { envelope: true, flags: true, uid: true },
          { uid: true },
        )

        for await (const message of cursor) {
          messages.push({
            id: `${folder}:${message.uid}`,
            uid: message.uid,
            folder,
            from: message.envelope.from[0]?.address || '',
            to: message.envelope.to.map(a => a.address).filter(Boolean),
            subject: message.envelope.subject || '(no subject)',
            date: message.envelope.date?.toISOString() || new Date().toISOString(),
            flags: [...message.flags],
            hasAttachments: message.envelope.attachments?.length > 0,
          })
        }
      } finally {
        lock.release()
      }

      return messages
    } finally {
      await client.logout()
    }
  },

  async getMessage(folder: string, uid: number): Promise<MailMessage> {
    const client = createClient()
    await client.connect()

    try {
      const lock = await client.getMailboxLock(folder)
      let message: any

      try {
        const cursor = client.fetch(`${uid}`, {
          envelope: true,
          flags: true,
          uid: true,
          source: true,
        }, { uid: true })

        for await (const msg of cursor) {
          message = msg
        }
      } finally {
        lock.release()
      }

      return {
        id: `${folder}:${uid}`,
        uid: message.uid,
        folder,
        from: message.envelope.from[0]?.address || '',
        to: message.envelope.to.map(a => a.address).filter(Boolean),
        subject: message.envelope.subject || '(no subject)',
        bodyText: '', // TODO: parse source
        bodyHtml: '', // TODO: parse source
        date: message.envelope.date?.toISOString() || new Date().toISOString(),
        flags: [...message.flags],
        hasAttachments: message.envelope.attachments?.length > 0,
        userId: '',
      }
    } finally {
      await client.logout()
    }
  },

  async send(data: {
    to: string[]
    subject: string
    body: string
    html?: string
    attachments?: { filename: string; content: string }[]
  }) {
    await transport.sendMail({
      from: process.env.IMAP_USER,
      to: data.to.join(', '),
      subject: data.subject,
      text: data.body,
      html: data.html,
      attachments: data.attachments?.map(a => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
      })),
    })
  },

  async markRead(folder: string, uid: number, read: boolean) {
    const client = createClient()
    await client.connect()
    try {
      const lock = await client.getMailboxLock(folder)
      try {
        await client.messageFlagsAdd({ uid, uidSet: true }, read ? ['\\Seen'] : [], { uid: true })
        if (!read) {
          await client.messageFlagsRemove({ uid, uidSet: true }, ['\\Seen'], { uid: true })
        }
      } finally {
        lock.release()
      }
    } finally {
      await client.logout()
    }
  },

  async moveMessage(from: string, uid: number, to: string) {
    const client = createClient()
    await client.connect()
    try {
      const lock = await client.getMailboxLock(from)
      try {
        await client.messageMove({ uid, uidSet: true }, to, { uid: true })
      } finally {
        lock.release()
      }
    } finally {
      await client.logout()
    }
  },

  async deleteMessage(folder: string, uid: number) {
    const client = createClient()
    await client.connect()
    try {
      const lock = await client.getMailboxLock(folder)
      try {
        await client.messageDelete({ uid, uidSet: true }, { uid: true })
      } finally {
        lock.release()
      }
    } finally {
      await client.logout()
    }
  },

  async search(query: string) {
    const client = createClient()
    await client.connect()
    try {
      const lock = await client.getMailboxLock('INBOX')
      try {
        const results: any[] = []
        for await (const message of client.search({ text: query }, { uid: true, envelope: true })) {
          results.push({
            type: 'mail',
            id: `INBOX:${message.uid}`,
            title: message.envelope.subject || '(no subject)',
            snippet: `from ${message.envelope.from[0]?.address || 'unknown'}`,
            date: message.envelope.date?.toISOString() || new Date().toISOString(),
          })
        }
        return results
      } finally {
        lock.release()
      }
    } finally {
      await client.logout()
    }
  },
}

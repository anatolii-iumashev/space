import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Pencil, Paperclip, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Label } from './ui/label'
import { cn } from '../lib/utils'

export function MailView() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [activeFolder, setActiveFolder] = useState('INBOX')
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' })

  const { data: folders = [] } = useQuery({
    queryKey: ['mail-folders'],
    queryFn: async () => {
      const res = await api.mail.folders()
      return res.data
    },
  })

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['mail-messages', activeFolder],
    queryFn: async () => {
      const res = await api.mail.messages(activeFolder)
      return res.data
    },
  })

  const sendMutation = useMutation({
    mutationFn: (data: typeof compose) =>
      api.mail.send({ to: data.to.split(',').map(s => s.trim()), subject: data.subject, body: data.body }),
    onSuccess: () => {
      setShowCompose(false)
      setCompose({ to: '', subject: '', body: '' })
      qc.invalidateQueries({ queryKey: ['mail-messages'] })
    },
  })

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('mail.title')}</h1>
        <Button size="sm" onClick={() => setShowCompose(true)}>
          <Pencil className="h-4 w-4" />
          {t('mail.compose')}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {(error as Error).message} — {t('mail.imapError')}
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Folders sidebar */}
        <div className="w-44 shrink-0">
          <div className="rounded-lg border bg-card overflow-hidden">
            {folders.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">{t('mail.configureImap')}</p>
            ) : (
              folders.map((folder: any) => (
                <button
                  key={folder.path}
                  onClick={() => { setActiveFolder(folder.path); setSelectedMessage(null) }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors flex justify-between items-center',
                    activeFolder === folder.path
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  <span className="truncate">{folder.name}</span>
                  {folder.unread > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px]">{folder.unread}</Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message list */}
        <div className="w-72 shrink-0 rounded-lg border bg-card overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            {isLoading ? (
              <p className="p-4 text-sm text-center text-muted-foreground">{t('common.loading')}</p>
            ) : messages.length === 0 ? (
              <p className="p-4 text-sm text-center text-muted-foreground">{t('mail.noMessages')}</p>
            ) : (
              messages.map((msg: any) => {
                const unread = !msg.flags?.includes('\\Seen')
                return (
                  <div key={msg.id}>
                    <button
                      onClick={() => setSelectedMessage(msg)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors',
                        selectedMessage?.id === msg.id ? 'bg-accent' : 'hover:bg-accent/50'
                      )}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={cn('text-sm truncate', unread ? 'font-bold' : 'text-muted-foreground')}>
                          {msg.from}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(msg.date).toLocaleDateString(i18n.language)}
                        </span>
                      </div>
                      <p className={cn('text-sm truncate mt-0.5', unread ? 'font-medium' : 'text-muted-foreground')}>
                        {msg.subject}
                      </p>
                      {msg.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground mt-1" />}
                    </button>
                    <Separator />
                  </div>
                )
              })
            )}
          </ScrollArea>
        </div>

        {/* Message detail */}
        <div className="flex-1 rounded-lg border bg-card overflow-auto">
          {selectedMessage ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">{selectedMessage.subject}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <span>{t('mail.from')}: {selectedMessage.from}</span>
                <span>{t('mail.to')}: {selectedMessage.to?.join(', ')}</span>
                <span>{new Date(selectedMessage.date).toLocaleString(i18n.language)}</span>
              </div>
              <Separator className="mb-4" />
              <p className="text-sm text-muted-foreground">{t('mail.loadFullMessage')}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('mail.selectMessage')}
            </div>
          )}
        </div>
      </div>

      {/* Compose dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('mail.newMessage')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); sendMutation.mutate(compose) }}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="to">{t('mail.toPlaceholder')}</Label>
              <Input
                id="to"
                type="email"
                value={compose.to}
                onChange={e => setCompose({ ...compose, to: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">{t('mail.subjectPlaceholder')}</Label>
              <Input
                id="subject"
                value={compose.subject}
                onChange={e => setCompose({ ...compose, subject: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">{t('mail.messagePlaceholder')}</Label>
              <Textarea
                id="body"
                rows={6}
                value={compose.body}
                onChange={e => setCompose({ ...compose, body: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCompose(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={sendMutation.isPending}>
                <Send className="h-4 w-4" />
                {t('mail.send')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

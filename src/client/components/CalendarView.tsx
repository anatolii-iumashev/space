import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { Plus, RefreshCw, Trash2, ArrowUpDown, CalendarDays } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

type CalEvent = {
  id: string
  title: string
  description?: string
  start: string
  end: string
  allDay: boolean
}

const columnHelper = createColumnHelper<CalEvent>()

export function CalendarView() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'start', desc: false }])
  const [form, setForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
  })

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await api.calendar.list()
      return res.data as CalEvent[]
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => api.calendar.sync(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.calendar.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      setShowForm(false)
      setForm({ title: '', description: '', start: '', end: '', allDay: false })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.calendar.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })

  function formatDate(s: string, allDay: boolean) {
    if (!s) return '—'
    const d = new Date(s)
    return allDay
      ? d.toLocaleDateString(i18n.language)
      : d.toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' })
  }

  const columns = [
    columnHelper.accessor('title', {
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting()}>
          {t('calendar.colTitle')}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{getValue()}</span>
          {row.original.allDay && (
            <Badge variant="secondary" className="text-xs font-normal">{t('calendar.allDay')}</Badge>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('start', {
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting()}>
          {t('calendar.start')}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue, row }) => (
        <span className="text-muted-foreground">{formatDate(getValue(), row.original.allDay)}</span>
      ),
    }),
    columnHelper.accessor('end', {
      header: t('calendar.end'),
      cell: ({ getValue, row }) => (
        <span className="text-muted-foreground">{formatDate(getValue(), row.original.allDay)}</span>
      ),
    }),
    columnHelper.accessor('description', {
      header: t('calendar.description'),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground truncate max-w-xs block">{getValue() || '—'}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(t('calendar.deleteConfirm'))) deleteMutation.mutate(row.original.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: events,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('calendar.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {t('calendar.syncCalDAV')}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {t('calendar.newEvent')}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {t('calendar.noEvents')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="group">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('calendar.newEvent')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="title">{t('calendar.titlePlaceholder')}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">{t('calendar.descriptionPlaceholder')}</Label>
              <Textarea
                id="desc"
                rows={2}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">{t('calendar.start')}</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={form.start}
                  onChange={e => setForm({ ...form, start: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">{t('calendar.end')}</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={form.end}
                  onChange={e => setForm({ ...form, end: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allDay"
                checked={form.allDay}
                onCheckedChange={checked => setForm({ ...form, allDay: !!checked })}
              />
              <Label htmlFor="allDay">{t('calendar.allDay')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Search, File, CalendarDays, Mail } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

type SearchResult = {
  id: string
  type: 'file' | 'event' | 'mail'
  title: string
  preview?: string
}

const columnHelper = createColumnHelper<SearchResult>()

const typeIcon: Record<string, React.ElementType> = {
  file: File,
  event: CalendarDays,
  mail: Mail,
}

export function SearchView() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['search', submittedQuery],
    queryFn: async () => {
      if (!submittedQuery) return []
      const res = await api.search.query(submittedQuery)
      return res.data as SearchResult[]
    },
    enabled: !!submittedQuery,
  })

  const columns = [
    columnHelper.accessor('type', {
      header: t('search.typeLabel'),
      cell: ({ getValue }) => {
        const type = getValue()
        const Icon = typeIcon[type] ?? File
        const labelMap: Record<string, string> = {
          file: t('search.fileLabel'),
          event: t('search.eventLabel'),
          mail: t('search.mailLabel'),
        }
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs capitalize">{labelMap[type] ?? type}</Badge>
          </div>
        )
      },
    }),
    columnHelper.accessor('title', {
      header: t('search.titleLabel'),
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    }),
    columnHelper.accessor('preview', {
      header: t('search.previewLabel'),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-sm truncate max-w-md block">{getValue() || '—'}</span>
      ),
    }),
  ]

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) setSubmittedQuery(query.trim())
  }

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('search.title')}</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder={t('search.placeholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="text-base h-10"
          autoFocus
        />
        <Button type="submit" disabled={isFetching || !query.trim()}>
          <Search className="h-4 w-4" />
          {isFetching ? t('search.searching') : t('search.button')}
        </Button>
      </form>

      {submittedQuery && (
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
              {isFetching ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    {t('search.searching')}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    {t('search.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
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
      )}
    </div>
  )
}

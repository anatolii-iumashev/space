import { useState, useRef } from 'react'
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
import { Folder, File, Upload, FolderPlus, Trash2, Download, ChevronRight, Home, ArrowUpDown } from 'lucide-react'
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

type FileItem = {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: string
}

const columnHelper = createColumnHelper<FileItem>()

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function FilesView() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const fileInput = useRef<HTMLInputElement>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: async () => {
      const res = await api.files.list(currentPath)
      return res.data as FileItem[]
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      for (const file of files) {
        await api.files.upload(file, currentPath)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => api.files.createFolder(name, currentPath),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      setShowNewFolder(false)
      setFolderName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.files.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })

  function navigateTo(folderId: string, name: string) {
    setBreadcrumbs(prev => [...prev, { id: folderId, name }])
    setCurrentPath(folderId)
  }

  function navigateToCrumb(index: number) {
    if (index < 0) {
      setBreadcrumbs([])
      setCurrentPath(undefined)
    } else {
      const crumb = breadcrumbs[index]
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
      setCurrentPath(crumb.id)
    }
  }

  async function handleDownload(item: FileItem) {
    const res = await api.files.getUrl(item.id)
    window.open(res.data.url, '_blank')
  }

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting()}>
          {t('files.colName')}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original
        const isFolder = item.mimeType === 'inode/directory'
        return (
          <button
            className="flex items-center gap-2 text-left hover:text-primary transition-colors"
            onClick={() => isFolder ? navigateTo(item.id, item.name) : handleDownload(item)}
          >
            {isFolder
              ? <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
              : <File className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="font-medium">{item.name}</span>
          </button>
        )
      },
    }),
    columnHelper.accessor('size', {
      header: t('files.colSize'),
      cell: ({ getValue }) => <span className="text-muted-foreground">{formatSize(getValue())}</span>,
    }),
    columnHelper.accessor('mimeType', {
      header: t('files.colType'),
      cell: ({ getValue }) => {
        const isFolder = getValue() === 'inode/directory'
        return (
          <Badge variant="secondary" className="text-xs font-normal">
            {isFolder ? t('files.folderType') : getValue().split('/')[1] || getValue()}
          </Badge>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original
        const isFolder = item.mimeType === 'inode/directory'
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isFolder && (
              <Button variant="ghost" size="icon" onClick={() => handleDownload(item)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(t('files.deleteConfirm'))) deleteMutation.mutate(item.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('files.title')}</h1>
        <div className="flex gap-2">
          <input ref={fileInput} type="file" multiple className="hidden" onChange={e => {
            if (e.target.files?.length) uploadMutation.mutate(e.target.files)
            e.target.value = ''
          }} />
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(!showNewFolder)}>
            <FolderPlus className="h-4 w-4" />
            {t('files.newFolder')}
          </Button>
          <Button size="sm" onClick={() => fileInput.current?.click()} disabled={uploadMutation.isPending}>
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? t('common.loading') : t('files.upload')}
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-1 text-sm">
        <button
          onClick={() => navigateToCrumb(-1)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          {t('files.myDrive')}
        </button>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => navigateToCrumb(i)}
              className={i === breadcrumbs.length - 1
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground transition-colors'}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {showNewFolder && (
        <form
          onSubmit={e => { e.preventDefault(); createFolderMutation.mutate(folderName) }}
          className="flex gap-2"
        >
          <Input
            placeholder={t('files.folderNamePlaceholder')}
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            className="max-w-xs"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={!folderName.trim() || createFolderMutation.isPending}>
            {t('common.create')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewFolder(false)}>
            {t('common.cancel')}
          </Button>
        </form>
      )}

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
                  {t('files.emptyFolder')}
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
    </div>
  )
}


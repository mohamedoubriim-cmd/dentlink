import { useCallback, useState } from 'react'
import { Upload, X, FileImage, Box, File, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface PendingFile {
  file: File
  preview?: string
  id: string
}

interface FileUploadProps {
  files: PendingFile[]
  onChange: (files: PendingFile[]) => void
  uploading?: boolean
  uploadProgress?: Record<string, number>
}

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/octet-stream': ['.stl', '.ply', '.obj', '.3oxz'],
  'model/stl': ['.stl'],
}

const ACCEPT_STRING = '.jpg,.jpeg,.png,.webp,.stl,.ply,.obj,.3oxz,.dcm'
const MAX_SIZE_MB = 50

function fileIcon(type: string, name: string) {
  if (type.startsWith('image/')) return <FileImage size={18} className="text-blue-500" />
  const ext = name.split('.').pop()?.toLowerCase()
  if (['stl', 'ply', 'obj', '3oxz'].includes(ext ?? '')) return <Box size={18} className="text-purple-500" />
  return <File size={18} className="text-slate-400" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUpload({ files, onChange, uploading, uploadProgress = {} }: FileUploadProps) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const valid: PendingFile[] = []
    for (const file of Array.from(incoming)) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue
      const id = `${Date.now()}-${Math.random()}`
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      valid.push({ file, preview, id })
    }
    onChange([...files, ...valid])
  }, [files, onChange])

  const remove = (id: string) => {
    const f = files.find((f) => f.id === id)
    if (f?.preview) URL.revokeObjectURL(f.preview)
    onChange(files.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
          dragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-slate-300 hover:border-primary-300 hover:bg-slate-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
      >
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
          <Upload size={20} className="text-primary-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Glisser les fichiers ici ou <span className="text-primary-600">parcourir</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Photos (JPG, PNG) · Scans 3D (STL, PLY, OBJ) · Max {MAX_SIZE_MB} MB
          </p>
        </div>
        <input
          type="file"
          multiple
          accept={ACCEPT_STRING}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          disabled={uploading}
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((pf) => {
            const progress = uploadProgress[pf.id]
            const done = progress === 100
            return (
              <li key={pf.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                {pf.preview ? (
                  <img src={pf.preview} className="w-9 h-9 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-slate-200 flex items-center justify-center shrink-0">
                    {fileIcon(pf.file.type, pf.file.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{pf.file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(pf.file.size)}</p>
                  {progress !== undefined && progress < 100 && (
                    <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {done ? (
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(pf.id)}
                    disabled={uploading}
                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

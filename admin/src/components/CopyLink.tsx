'use client'

import { useState } from 'react'

/** Una dirección del sitio con botones para copiarla o abrirla. */
export default function CopyLink({ url, canCopy }: { url: string; canCopy: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <code className="text-dim min-w-0 flex-1 basis-40 truncate text-sm">{url}</code>
      {canCopy && (
        <>
          <button
            type="button"
            className="btn !py-1.5 text-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(url).catch(() => {})
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            }}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn !py-1.5 text-sm">
            Abrir
          </a>
        </>
      )}
    </div>
  )
}

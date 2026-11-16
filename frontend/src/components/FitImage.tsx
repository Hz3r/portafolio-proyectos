type Props = {
  src: string
  alt: string
  loading?: 'lazy' | 'eager'
  /** Clases del contenedor. */
  className?: string
  /** Clases de la imagen principal (por ejemplo, la de hover). */
  imgClassName?: string
}

/**
 * Muestra la imagen entera dentro de su marco. Lo que no llena el marco se rellena con la misma
 * imagen, difuminada, para que no quede un hueco vacío ni se corte el texto de la imagen.
 */
export default function FitImage({ src, alt, loading = 'lazy', className = '', imgClassName = '' }: Props) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-bg ${className}`}>
      <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl" />
      <img src={src} alt={alt} loading={loading} decoding="async" className={`relative h-full w-full object-contain ${imgClassName}`} />
    </div>
  )
}

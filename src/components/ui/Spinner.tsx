export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className={`animate-spin rounded-full border-2 border-primary-600 border-t-transparent ${sizes[size]}`} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
    </div>
  )
}

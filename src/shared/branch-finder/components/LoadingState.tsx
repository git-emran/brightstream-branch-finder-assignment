export function LoadingState(props: { label: string }) {
  return (
    <div className="bs-loading" role="status" aria-live="polite">
      <div className="bs-loading__spinner" aria-hidden="true" />
      <div className="bs-loading__label">{props.label}</div>
    </div>
  )
}


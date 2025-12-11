type Props = {
  searchParams: Promise<{ session_id?: string }>
}

export default async function CheckoutCanceledPage({ searchParams }: Props) {
  const params = await searchParams
  const sessionId = params?.session_id

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="rounded-lg border bg-card px-6 py-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Checkout canceled</h1>
        <p className="mt-2 text-muted-foreground">
          Your subscription checkout was canceled. No charges were made.
        </p>
        {sessionId ? (
          <p className="mt-4 text-sm text-muted-foreground">Session: {sessionId}</p>
        ) : null}
      </div>
    </div>
  )
}

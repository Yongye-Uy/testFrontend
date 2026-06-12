export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl2 bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
      {message}
    </div>
  );
}

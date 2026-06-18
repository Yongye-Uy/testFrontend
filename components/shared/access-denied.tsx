import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
        <LockOutlinedIcon style={{ fontSize: 32 }} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-navy-900">Access Denied</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        {message ?? "You don't have permission to view this page. Contact your administrator if you think this is a mistake."}
      </p>
    </div>
  );
}

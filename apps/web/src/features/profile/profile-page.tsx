"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Read-only account profile. Editing, phone numbers, and photo upload are out of scope."
      />
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 text-lg font-bold text-cream-50">
            {user.full_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-navy-900">
              {user.full_name}
            </h2>
            <p className="text-sm text-ink-600">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={user.status} />
              {user.roles.map((role) => (
                <StatusBadge
                  key={role}
                  value={role}
                  label={role.replace("_", " ")}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

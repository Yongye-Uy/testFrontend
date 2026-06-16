"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";

function normalizeRoleValue(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "_");
}

function normalizeStatusValue(value: string) {
  return value.trim().toLowerCase();
}

export function AssignLecturerModal({
  classId,
  currentLecturerId,
  open,
  onClose,
  onDone,
  onError,
}: {
  classId: string;
  currentLecturerId: string | null;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(currentLecturerId ?? "");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const lecturers = useAsync(async () => {
    const direct = await api.users.listByRole("lecturer", "active");
    if (direct.users.length > 0) return direct;

    const fallback = await api.users.list(
      new URLSearchParams([
        ["limit", "500"],
        ["offset", "0"],
      ]),
    );

    return {
      ...fallback,
      users: fallback.users.filter((user) => {
        const roles = new Set(
          [user.role, ...user.roles]
            .map((role) => normalizeRoleValue(String(role)))
            .filter(Boolean),
        );
        return (
          roles.has("lecturer") &&
          normalizeStatusValue(String(user.status)) === "active"
        );
      }),
    };
  }, [open ? "open" : "closed"]);

  useEffect(() => {
    if (!open) return;
    setSelectedId(currentLecturerId ?? "");
    setQuery("");
    setLocalError("");
  }, [currentLecturerId, open]);

  const visibleLecturers = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (lecturers.data?.users ?? []).filter((lecturer) => {
      if (!value) return true;
      return [lecturer.full_name, lecturer.email].some((item) =>
        item.toLowerCase().includes(value),
      );
    });
  }, [lecturers.data?.users, query]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setLocalError("");

    try {
      if (!selectedId) throw new Error("Select a lecturer first.");
      await api.classes.assignLecturer(classId, selectedId);
      await onDone();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Assign lecturer failed";
      setLocalError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign lecturer"
      description="Select an active lecturer from the system instead of typing a raw user ID."
      eyebrow="Director - Lecturer Assignment"
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Search lecturer">
          <input
            className={inputClass}
            placeholder="Search by name or email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        {lecturers.loading && <LoadingState label="Loading lecturers" />}
        {lecturers.error && <ErrorState message={lecturers.error} />}

        {!lecturers.loading && !lecturers.error && (
          <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-ink-100 bg-white p-3">
            {visibleLecturers.length === 0 ? (
              <EmptyState
                title="No lecturers found"
                description="We could not find any active lecturer accounts from the current user-service response for this search."
              />
            ) : (
              visibleLecturers.map((lecturer) => (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                    selectedId === lecturer.id
                      ? "border-navy-300 bg-navy-50"
                      : "border-ink-100 bg-cream-50 hover:border-ink-200"
                  }`}
                  key={lecturer.id}
                >
                  <input
                    checked={selectedId === lecturer.id}
                    className="mt-1"
                    name="lecturer_id"
                    onChange={() => setSelectedId(lecturer.id)}
                    type="radio"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900">
                      {lecturer.full_name}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {lecturer.email}
                    </p>
                  </div>
                  <StatusBadge value={lecturer.status} />
                </label>
              ))
            )}
          </div>
        )}

        {localError && <ErrorState message={localError} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            leftIcon={<SchoolOutlinedIcon fontSize="small" />}
          >
            Assign lecturer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

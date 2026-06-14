"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import type { Batch } from "@/types/course";
import type { InviteUserEntry, InviteUserResult, User } from "@/types/user";

type InviteRole = "director" | "lecturer" | "student";
type Step = 1 | 2 | 3 | 4;

type DraftRow = {
  id: string;
  rowNumber: number;
  full_name: string;
  email: string;
};

type ValidationIssue = {
  id: string;
  rowNumber: number;
  full_name: string;
  email: string;
  issue: string;
};

type ValidRow = DraftRow & InviteUserEntry;

function findDraftRow(rows: DraftRow[], id: string) {
  return rows.find((row) => row.id === id);
}

export function BulkInviteWizardModal({
  open,
  onClose,
  onInvited,
  batches,
  existingUsers,
  title = "Invite users from CSV",
  description = "Upload a CSV, validate the rows, preview the invite list, and then send pending invitations.",
  eyebrow = "Onboarding - Bulk Import",
  defaultRole = "lecturer",
  fixedBatchId,
  allowedRoles = ["lecturer", "student"],
}: {
  open: boolean;
  onClose: () => void;
  onInvited: (results: InviteUserResult[]) => Promise<void>;
  batches: Batch[];
  existingUsers: Pick<User, "email">[];
  title?: string;
  description?: string;
  eyebrow?: string;
  defaultRole?: InviteRole;
  fixedBatchId?: string;
  allowedRoles?: InviteRole[];
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedRole, setSelectedRole] = useState<InviteRole>(defaultRole);
  const [selectedBatchId, setSelectedBatchId] = useState(fixedBatchId ?? "");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InviteUserResult[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const existingEmails = useMemo(
    () =>
      new Set(
        existingUsers
          .map((user) => user.email.trim().toLowerCase())
          .filter(Boolean),
      ),
    [existingUsers],
  );

  const validation = useMemo(
    () => validateRows(rows, selectedRole, selectedBatchId, existingEmails),
    [existingEmails, rows, selectedBatchId, selectedRole],
  );

  function resetState() {
    setSelectedRole(defaultRole);
    setSelectedBatchId(fixedBatchId ?? "");
    setUploadedFileName("");
    setRows([]);
    setDraftRows([]);
    setStep(1);
    setError("");
    setLoading(false);
    setResults([]);
    setHasUnsavedChanges(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeModal() {
    resetState();
    onClose();
  }

  async function loadFile(file: File) {
    const text = await file.text();
    const parsedRows = parseCsv(text);
    setUploadedFileName(file.name);
    setRows(parsedRows);
    setDraftRows(parsedRows);
    setError("");
    setHasUnsavedChanges(false);
    setStep(2);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV parse failed");
      setRows([]);
      setDraftRows([]);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void loadFile(file).catch((err) => {
      setError(err instanceof Error ? err.message : "CSV parse failed");
      setRows([]);
      setDraftRows([]);
    });
  }

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setDraftRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setHasUnsavedChanges(true);
  }

  function removeRow(id: string) {
    setDraftRows((current) => current.filter((row) => row.id !== id));
    setHasUnsavedChanges(true);
  }

  function saveChanges() {
    setRows(draftRows);
    setHasUnsavedChanges(false);
    setError("");
  }

  function discardUnsavedChanges() {
    setDraftRows(rows);
    setHasUnsavedChanges(false);
    setError("");
  }

  function downloadTemplate() {
    const blob = new Blob(["full_name,email\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedRole}-invite-template.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function sendInvites(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (hasUnsavedChanges)
        throw new Error("Save your edits before sending invitations.");
      if (validation.validRows.length === 0)
        throw new Error("No valid rows are ready to invite.");
      const response = await api.users.bulkInvite(
        validation.validRows.map((row) => ({
          email: row.email,
          full_name: row.full_name,
          role: row.role,
          batch_id: row.batch_id,
        })),
      );
      setResults(response.results);
      setStep(4);
      await onInvited(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk invite failed");
    } finally {
      setLoading(false);
    }
  }

  const batchName =
    batches.find((batch) => batch.id === selectedBatchId)?.name ??
    "No batch selected";
  const roleLockedToStudent = Boolean(fixedBatchId);

  return (
    <Modal
      open={open}
      onClose={closeModal}
      eyebrow={eyebrow}
      title={title}
      description={description}
      size="lg"
    >
      <form className="space-y-5" onSubmit={sendInvites}>
        <StepHeader currentStep={step} />

        {step === 1 && (
          <div className="space-y-4">
            <div
              className={`grid gap-4 ${selectedRole === "student" ? "md:grid-cols-2" : ""}`}
            >
              <Field label="Role for imported users">
                <select
                  className={inputClass}
                  disabled={roleLockedToStudent}
                  value={selectedRole}
                  onChange={(event) => {
                    const nextRole = event.target.value as InviteRole;
                    setSelectedRole(nextRole);
                    if (nextRole !== "student") setSelectedBatchId("");
                    setRows([]);
                    setDraftRows([]);
                    setUploadedFileName("");
                    setHasUnsavedChanges(false);
                  }}
                >
                  {allowedRoles.map((role) => (
                    <option key={role} value={role}>
                      {prettyRoleValue(role)}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedRole === "student" && (
                <Field label="Assign to batch">
                  <select
                    className={inputClass}
                    disabled={Boolean(fixedBatchId)}
                    required
                    value={selectedBatchId}
                    onChange={(event) => {
                      setSelectedBatchId(event.target.value);
                      setRows([]);
                      setDraftRows([]);
                      setUploadedFileName("");
                      setHasUnsavedChanges(false);
                    }}
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <div className="rounded-xl border border-ink-200 bg-cream-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-navy-900">CSV template</p>
                  <p className="mt-1 text-sm text-ink-500">
                    Required columns: full_name, email
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadTemplate}
                >
                  Download template
                </Button>
              </div>
            </div>

            <label
              className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-cream-50 px-6 py-8 text-center transition hover:border-navy-300 hover:bg-cream-100"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-navy-800 ring-1 ring-ink-200">
                ^
              </div>
              <p className="mt-5 text-[1rem] font-semibold text-navy-900">
                Drop your CSV here
              </p>
              <p className="mt-2 text-sm text-ink-500">
                or click to browse - max 1,000 rows - 5MB
              </p>
              {uploadedFileName && (
                <p className="mt-4 rounded-full bg-white px-3 py-1 text-xs font-medium text-navy-800 ring-1 ring-ink-200">
                  {uploadedFileName}
                </p>
              )}
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card padding="md">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    File validated
                  </p>
                  <p className="text-sm text-ink-500">
                    {uploadedFileName || "uploaded.csv"} - {rows.length} row
                    {rows.length === 1 ? "" : "s"} scanned
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    discardUnsavedChanges();
                    setStep(1);
                  }}
                >
                  Re-upload
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MetricCard
                  tone="success"
                  label="Valid rows"
                  value={String(validation.validRows.length)}
                  helper="Ready to invite"
                />
                <MetricCard
                  tone="danger"
                  label="Errors"
                  value={String(validation.invalidRows.length)}
                  helper="Fix before invite"
                />
                <MetricCard
                  tone="neutral"
                  label="Total scanned"
                  value={String(rows.length)}
                  helper="From your CSV"
                />
              </div>
            </Card>

            {hasUnsavedChanges && (
              <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-ink-700">
                You have unsaved edits. Click <strong>Save changes</strong>{" "}
                before continuing to preview.
              </div>
            )}

            {validation.invalidRows.length === 0 ? (
              <Card padding="md">
                <p className="font-semibold text-navy-900">
                  No validation errors
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  All rows are valid
                  {selectedRole === "student"
                    ? ` and will be attached to ${batchName}.`
                    : "."}
                </p>
              </Card>
            ) : (
              <Card padding="md">
                <p className="font-semibold text-navy-900">Errors to fix</p>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-rose-200">
                  <table className="min-w-full bg-white text-left">
                    <thead className="bg-rose-50">
                      <tr className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Issue</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.invalidRows.map((row) => {
                        const draftRow = findDraftRow(draftRows, row.id) ?? row;
                        return (
                          <tr className="border-t border-rose-100" key={row.id}>
                            <td className="px-4 py-3 text-sm text-ink-500">
                              {row.rowNumber}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                className={inputClass}
                                value={draftRow.full_name}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    full_name: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                className={inputClass}
                                value={draftRow.email}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    email: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-rose-700">
                              {row.issue}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => removeRow(row.id)}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Card padding="md">
              <p className="font-semibold text-navy-900">Preview & confirm</p>
              <p className="mt-1 text-sm text-ink-500">
                {validation.validRows.length} account
                {validation.validRows.length === 1 ? "" : "s"} will receive
                pending invitations.
              </p>
            </Card>

            {hasUnsavedChanges && (
              <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-ink-700">
                Save your edits first so the preview list reflects the final
                invite data.
              </div>
            )}

            {validation.validRows.length === 0 ? (
              <EmptyState
                title="No valid rows to preview"
                description="Go back to validation and fix or remove invalid entries first."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-ink-100">
                <table className="min-w-full bg-white text-left">
                  <thead className="bg-cream-100">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      {selectedRole === "student" && (
                        <th className="px-4 py-3">Batch</th>
                      )}
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.validRows.map((row) => {
                      const draftRow = findDraftRow(draftRows, row.id) ?? row;
                      return (
                        <tr className="border-t border-ink-100" key={row.id}>
                          <td className="px-4 py-3">
                            <input
                              className={inputClass}
                              value={draftRow.full_name}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  full_name: event.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className={inputClass}
                              value={draftRow.email}
                              onChange={(event) =>
                                updateRow(row.id, { email: event.target.value })
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              value={row.role}
                              label={prettyRoleValue(row.role)}
                            />
                          </td>
                          {selectedRole === "student" && (
                            <td className="px-4 py-3 text-sm text-ink-600">
                              {batchName}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <StatusBadge
                              value="pending"
                              label="Ready to invite"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeRow(row.id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <Card className="py-16 text-center" padding="lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
              OK
            </div>
            <h3 className="mt-5 font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
              Invitations sent!
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-600">
              {results.filter((item) => item.success).length} new account
              {results.filter((item) => item.success).length === 1
                ? ""
                : "s"}{" "}
              have been marked pending and passed into the current backend
              invitation flow.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button type="button" variant="outline" onClick={closeModal}>
                Close
              </Button>
            </div>
          </Card>
        )}

        {error && <ErrorState message={error} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          {step > 1 && step < 4 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                discardUnsavedChanges();
                setStep((current) => Math.max(1, current - 1) as Step);
              }}
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              type="button"
              onClick={() => {
                if (selectedRole === "student" && !selectedBatchId) {
                  setError("Select a batch before importing student rows.");
                  return;
                }
                if (rows.length === 0) {
                  setError("Upload a CSV file first.");
                  return;
                }
                setStep(2);
                setError("");
              }}
            >
              Continue
            </Button>
          )}
          {step === 2 && (
            <>
              {hasUnsavedChanges && (
                <Button type="button" variant="gold" onClick={saveChanges}>
                  Save changes
                </Button>
              )}
              <Button
                type="button"
                disabled={
                  hasUnsavedChanges || validation.validRows.length === 0
                }
                onClick={() => {
                  if (hasUnsavedChanges) {
                    setError("Save your edits before continuing.");
                    return;
                  }
                  if (validation.validRows.length === 0) {
                    setError("Fix at least one valid row before continuing.");
                    return;
                  }
                  setStep(3);
                  setError("");
                }}
              >
                Continue with {validation.validRows.length} valid row
                {validation.validRows.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              {hasUnsavedChanges && (
                <Button type="button" variant="gold" onClick={saveChanges}>
                  Save changes
                </Button>
              )}
              <Button loading={loading} disabled={hasUnsavedChanges}>
                Send {validation.validRows.length} invitation
                {validation.validRows.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

function StepHeader({ currentStep }: { currentStep: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 1, label: "Upload CSV" },
    { id: 2, label: "Validate" },
    { id: 3, label: "Preview" },
    { id: 4, label: "Send invitations" },
  ];

  return (
    <div className="grid gap-3 rounded-2xl border border-ink-100 bg-white p-4 md:grid-cols-4">
      {steps.map((step, index) => {
        const completed = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <div className="flex items-center gap-3" key={step.id}>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                completed
                  ? "bg-emerald-600 text-white"
                  : active
                    ? "bg-navy-800 text-white ring-4 ring-navy-100"
                    : "bg-cream-100 text-ink-500"
              }`}
            >
              {completed ? "OK" : step.id}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
                Step {step.id}
              </p>
              <p className="font-semibold text-navy-900">{step.label}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden h-px flex-1 bg-emerald-400 md:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  tone,
  label,
  value,
  helper,
}: {
  tone: "success" | "danger" | "neutral";
  label: string;
  value: string;
  helper: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50"
        : "border-ink-100 bg-cream-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-[1.4rem] font-semibold leading-8 text-navy-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-ink-500">{helper}</p>
    </div>
  );
}

function parseCsv(raw: string): DraftRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) throw new Error("CSV file is empty.");

  const header = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const fullNameIndex = header.indexOf("full_name");
  const emailIndex = header.indexOf("email");

  if (fullNameIndex === -1 || emailIndex === -1) {
    throw new Error("CSV header must include full_name,email");
  }

  return lines.slice(1).map((line, index) => {
    const cols = line.split(",").map((item) => item.trim());
    return {
      id: `${index + 2}-${cols[emailIndex] ?? ""}`,
      rowNumber: index + 2,
      full_name: cols[fullNameIndex] ?? "",
      email: cols[emailIndex] ?? "",
    };
  });
}

function validateRows(
  rows: DraftRow[],
  role: InviteRole,
  batchId: string,
  existingEmails: Set<string>,
): { validRows: ValidRow[]; invalidRows: ValidationIssue[] } {
  const duplicateCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.email.trim().toLowerCase();
    if (key) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const validRows: ValidRow[] = [];
  const invalidRows: ValidationIssue[] = [];

  rows.forEach((row) => {
    const name = row.full_name.trim();
    const email = row.email.trim().toLowerCase();
    let issue = "";

    if (!name) issue = "Missing full name";
    else if (!email) issue = "Missing email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      issue = "Invalid email format";
    else if (duplicateCounts[email] > 1)
      issue = "Duplicate email inside this CSV";
    else if (existingEmails.has(email)) issue = "Email already exists";
    else if (role === "student" && !batchId)
      issue = "Student rows must be attached to a batch";

    if (issue) {
      invalidRows.push({
        id: row.id,
        rowNumber: row.rowNumber,
        full_name: row.full_name,
        email: row.email,
        issue,
      });
      return;
    }

    validRows.push({
      ...row,
      email,
      full_name: name,
      role,
      batch_id: role === "student" ? batchId : undefined,
    });
  });

  return { validRows, invalidRows };
}

function prettyRoleValue(value: string) {
  return value.replaceAll("_", " ");
}

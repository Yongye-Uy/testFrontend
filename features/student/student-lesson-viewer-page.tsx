"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useAsync } from "@/features/shared/use-async";
import { api } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import type { LessonItem } from "@/types/course";
import { useAuth } from "@/hooks/use-auth";
import { AngkorMotif } from "@/components/branding/AngkorMotif";

function OutlineItem({
  item,
  classId,
  active,
}: {
  item: LessonItem;
  classId: string;
  active: boolean;
}) {
  const ps = item.progress_status;

  return (
    <Link
      href={
        item.is_unlocked
          ? item.item_type === "assessment"
            ? routes.quiz(classId, item.id)
            : routes.lessonViewer(classId, item.id)
          : "#"
      }
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition ${
        active
          ? "bg-navy-50 text-navy-900"
          : item.is_unlocked
            ? "text-ink-700 hover:bg-cream-100"
            : "cursor-default opacity-40"
      }`}
    >
      {!item.is_unlocked ? (
        <LockOutlinedIcon style={{ fontSize: 14 }} className="shrink-0 text-ink-400" />
      ) : ps === "completed" ? (
        <CheckCircleRoundedIcon style={{ fontSize: 14 }} className="shrink-0 text-emerald-500" />
      ) : (
        <RadioButtonUncheckedRoundedIcon style={{ fontSize: 14 }} className="shrink-0 text-ink-300" />
      )}
      <span className="text-[12px] leading-4 line-clamp-2">{item.title}</span>
    </Link>
  );
}

export function StudentLessonViewerPage({
  classId,
  lessonItemId,
}: {
  classId: string;
  lessonItemId: string;
}) {
  const { user } = useAuth();

  const classData = useAsync(() => api.classes.get(classId), [classId]);
  const lessonsData = useAsync(
    () => api.lessons.listForStudentClass(classId).then((r) => r.lessons),
    [classId],
  );

  const allItems = useMemo(
    () => lessonsData.data?.flatMap((l) => l.items) ?? [],
    [lessonsData.data],
  );

  const currentItem = allItems.find((i) => i.id === lessonItemId);
  const currentIndex = allItems.indexOf(currentItem!);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem =
    currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  // Mark as completed on mount
  useEffect(() => {
    if (!currentItem?.is_unlocked || !user?.id) return;
    api.classes
      .progress(classId, lessonItemId, "completed")
      .catch(() => null);
  }, [classId, lessonItemId, user?.id, currentItem?.is_unlocked]);

  const cls = classData.data;
  const title = currentItem?.title ?? "Lesson";
  const materialType = currentItem?.material_type ?? "";
  const viewUrl = currentItem?.view_url;
  const linkUrl = currentItem?.link_url;

  const blockMenu = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="flex h-full gap-0">
      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Breadcrumb bar */}
        <div className="border-b border-ink-200 bg-white px-6 py-3">
          <nav className="flex items-center gap-1.5 text-[12px] text-ink-500">
            <Link href={routes.myClasses} className="hover:text-navy-700">
              My Classes
            </Link>
            <span>/</span>
            {cls?.course_code && (
              <>
                <Link
                  href={routes.classDetail(classId)}
                  className="hover:text-navy-700"
                >
                  {cls.course_code}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-navy-800 font-medium">{title}</span>
          </nav>
        </div>

        {/* Viewer header */}
        <div className="px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
            {cls?.course_code}
          </p>
          <h1 className="mt-1 font-serif-display text-[1.35rem] font-semibold text-navy-900">
            {title}
          </h1>
          {currentItem?.material_type && (
            <span className="mt-1 inline-flex rounded-md bg-ink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600 ring-1 ring-ink-200">
              {materialType}
            </span>
          )}
        </div>

        {/* File viewer */}
        <div className="mx-6 overflow-hidden rounded-xl border border-ink-200 shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center gap-3 bg-navy-900 px-4 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gold-500/20 text-gold-400">
              <PictureAsPdfOutlinedIcon style={{ fontSize: 16 }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-cream-100">
                {title}
              </div>
              {cls?.course_code && (
                <div className="text-[11px] text-cream-300/70">
                  {cls.course_code}
                </div>
              )}
            </div>
          </div>

          {/* Download disabled notice */}
          <div className="flex items-center gap-2 border-b border-gold-200 bg-gold-50 px-4 py-2 text-xs text-gold-900">
            <LockOutlinedIcon
              style={{ fontSize: 14 }}
              className="shrink-0 text-gold-600"
            />
            <strong>Downloads disabled</strong>&nbsp;· This material is for
            in-platform viewing only. Right-click and printing are restricted.
          </div>

          {/* Content */}
          {viewUrl ? (
            <iframe
              src={viewUrl}
              title={title}
              className="h-[70vh] w-full border-0"
              onContextMenu={blockMenu}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : linkUrl ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <LinkOutlinedIcon
                style={{ fontSize: 40 }}
                className="text-ink-300"
              />
              <p className="text-sm text-ink-600">
                This material is an external link.
              </p>
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-navy-800"
              >
                Open link
              </a>
            </div>
          ) : (
            <div
              className="relative min-h-[60vh] bg-cream-50 px-10 py-12"
              onContextMenu={blockMenu}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="flex -rotate-[25deg] flex-col items-center gap-2 opacity-[0.05]">
                  <AngkorMotif size={120} className="text-navy-900" />
                  <span className="font-serif-display text-5xl font-bold tracking-widest text-navy-900">
                    PIU · LMS
                  </span>
                </div>
              </div>
              <div className="relative mx-auto max-w-2xl">
                <p className="text-sm text-ink-500">
                  {currentItem?.description || "No preview available for this material."}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-ink-200 bg-cream-100 px-4 py-2 text-[11px] text-ink-500">
            <span>Viewing only</span>
            <span>© Paragon International University, Phnom Penh</span>
          </div>
        </div>

        {/* Prev / Next navigation */}
        <div className="mx-6 mt-5 mb-8 flex items-center justify-between gap-4">
          {prevItem && prevItem.is_unlocked ? (
            <Link
              href={
                prevItem.item_type === "assessment"
                  ? routes.quiz(classId, prevItem.id)
                  : routes.lessonViewer(classId, prevItem.id)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 shadow-sm transition hover:bg-cream-100"
            >
              <ArrowBackRoundedIcon style={{ fontSize: 16 }} />
              Previous lesson
            </Link>
          ) : (
            <div />
          )}

          {nextItem && nextItem.is_unlocked ? (
            <Link
              href={
                nextItem.item_type === "assessment"
                  ? routes.quiz(classId, nextItem.id)
                  : routes.lessonViewer(classId, nextItem.id)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-navy-800"
            >
              Next lesson
              <ArrowForwardRoundedIcon style={{ fontSize: 16 }} />
            </Link>
          ) : (
            <Link
              href={routes.classDetail(classId)}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-navy-800"
            >
              Back to class
            </Link>
          )}
        </div>
      </div>

      {/* Right outline rail */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-ink-200 bg-white py-4 xl:block">
        <div className="px-4 pb-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-400">
            Class outline
          </p>
          <p className="mt-0.5 font-semibold text-navy-900 text-[13px]">
            {cls?.course_title ?? ""}
          </p>
        </div>

        <div className="space-y-1 px-2">
          {lessonsData.data?.map((lesson) =>
            lesson.items.map((item) => (
              <OutlineItem
                key={item.id}
                item={item}
                classId={classId}
                active={item.id === lessonItemId}
              />
            )),
          )}
        </div>
      </aside>
    </div>
  );
}

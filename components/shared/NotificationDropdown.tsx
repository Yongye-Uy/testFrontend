"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import GradeOutlinedIcon from "@mui/icons-material/GradeOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "lesson" | "grade" | "announcement" | "deadline";
}

const iconByType: Record<Notification["type"], React.ReactNode> = {
  lesson: <MenuBookOutlinedIcon style={{ fontSize: 18 }} />,
  grade: <GradeOutlinedIcon style={{ fontSize: 18 }} />,
  announcement: <CampaignOutlinedIcon style={{ fontSize: 18 }} />,
  deadline: <ScheduleOutlinedIcon style={{ fontSize: 18 }} />,
};

interface NotificationDropdownProps {
  /** Caller controls the list. Defaults to empty. */
  initialNotifications?: Notification[];
}

export function NotificationDropdown({
  initialNotifications = [],
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(initialNotifications);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 rounded-lg hover:bg-cream-200 text-ink-700 flex items-center justify-center transition"
        aria-label="Notifications"
      >
        <NotificationsNoneIcon style={{ fontSize: 20 }} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-gold-500 text-[10px] font-bold text-navy-900 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-xl2 shadow-pop ring-1 ring-ink-200 z-40 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
              <h4 className="font-semibold text-navy-900 text-sm">
                Notifications
              </h4>
              {items.length > 0 && (
                <button
                  onClick={() =>
                    setItems(items.map((i) => ({ ...i, read: true })))
                  }
                  className="text-xs text-navy-600 hover:text-navy-800 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-xs text-ink-500">
                  You&apos;re all caught up.
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 border-b border-ink-100 hover:bg-cream-100 cursor-pointer transition ${!n.read ? "bg-gold-50/40" : ""}`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                      {iconByType[n.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-navy-900 truncate">
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-gold-500 mt-1.5 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-ink-600 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-ink-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

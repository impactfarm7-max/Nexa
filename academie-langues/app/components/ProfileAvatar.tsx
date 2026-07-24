"use client";

import type { CSSProperties, ReactNode } from "react";

const STAFF_ROLES = ["admin", "center_manager", "trainer", "staff", "campus_manager"];

type ProfileAvatarProps = {
  url?: string | null;
  name?: string;
  role?: string | null;
  size?: string;
  rounded?: string;
  className?: string;
  fallback?: ReactNode;
  fallbackClassName?: string;
  fallbackStyle?: CSSProperties;
};

export default function ProfileAvatar({
  url,
  name = "?",
  role,
  size = "w-8 h-8",
  rounded = "rounded-full",
  className = "",
  fallback,
  fallbackClassName = "",
  fallbackStyle,
}: ProfileAvatarProps) {
  const isStaff = !!role && STAFF_ROLES.includes(role);
  const initial = (name || "?").charAt(0).toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${size} ${rounded} object-cover shrink-0 ${className}`}
      />
    );
  }

  if (fallback) {
    return (
      <div
        className={`${size} ${rounded} flex items-center justify-center shrink-0 ${fallbackClassName} ${className}`}
        style={fallbackStyle}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={`${size} ${rounded} flex items-center justify-center font-display font-black shrink-0 text-sm ${
        isStaff
          ? "bg-slate-900 text-orange-400 border-2 border-slate-800"
          : "bg-gradient-to-br from-orange-400 to-orange-500 text-white border-2 border-orange-200"
      } ${fallbackClassName} ${className}`}
      style={fallbackStyle}
    >
      {initial}
    </div>
  );
}

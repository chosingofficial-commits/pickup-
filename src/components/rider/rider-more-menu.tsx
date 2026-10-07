"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, UserRound, Megaphone, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

/**
 * Mobile-only: Profile, My ads, and Log out don't fit in the compact top bar
 * next to the always-visible Online/Offline toggle, so they move here behind
 * a single icon button. Desktop keeps all of these as plain links/buttons in
 * the top nav — see rider/(dashboard)/layout.tsx.
 */
export function RiderMoreMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-control text-brand-dark hover:bg-brand-bg"
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-control border border-border-brand bg-white shadow-lifted">
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-brand-dark hover:bg-brand-bg">
              <UserRound className="h-4 w-4" aria-hidden />
              Profile
            </Link>
            <Link href="/rider/ads" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-brand-dark hover:bg-brand-bg">
              <Megaphone className="h-4 w-4" aria-hidden />
              My ads
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" aria-hidden />
                Log out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

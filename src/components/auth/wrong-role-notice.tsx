import { Logo } from "@/components/brand/logo";
import { logoutAction } from "@/lib/actions/auth";

/**
 * Shown instead of this dashboard's own content when a real, logged-in
 * session exists on this subdomain but belongs to the wrong role (e.g. a
 * customer or vendor account's session cookie, set directly on
 * rider.pickupn.com via its generic login form, visiting rider.pickupn.com/).
 * Previously this redirected to the main domain's homepage — technically
 * "worked" but silently bounced the visitor to a different site with no
 * explanation, which from rider.pickupn.com/ specifically looked
 * indistinguishable from "the link is just broken". Logging out here stays
 * on this exact subdomain (logoutAction's redirect("/") is relative), so it
 * lands back on this subdomain's own login page, not the main domain.
 */
export function WrongRoleNotice({ section }: { section: "Rider" | "Vendor" | "Admin" }) {
  const noun = section.toLowerCase();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-bg px-4 text-center">
      <Logo />
      <h1 className="font-heading text-xl font-bold text-brand-dark">This isn&apos;t a {noun} account</h1>
      <p className="max-w-sm text-sm text-gray-600">You&apos;re logged in, but this account doesn&apos;t have {noun} access here. Log out to switch to a different account.</p>
      <form action={logoutAction}>
        <button type="submit" className="rounded-control bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          Log out / switch account
        </button>
      </form>
    </div>
  );
}

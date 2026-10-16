import { headers } from "next/headers";
import { LoginForm } from "@/components/auth/login-form";
import { sectionFromHost, isSubdomainRoutingEnabled } from "@/lib/subdomains";
import { publicEnv } from "@/lib/env/public";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const host = (await headers()).get("host");
  // Deliberately reads process.env directly, same as src/proxy.ts — see
  // isSubdomainRoutingEnabled's doc comment (src/lib/subdomains.ts) for the
  // full on/off/auto-detect logic.
  const subdomainRoutingEnabled = isSubdomainRoutingEnabled(host, process.env.NEXT_PUBLIC_APP_URL, process.env.ENABLE_SUBDOMAIN_ROUTING);
  const section = subdomainRoutingEnabled ? sectionFromHost(host, publicEnv.appUrl) : null;
  return <LoginForm next={next} section={section ?? undefined} />;
}

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/ui/container";

export function HeroSection({
  areaLabel,
  title,
  subtitle,
  cta,
  imageUrl,
}: {
  areaLabel: string | null;
  title: string;
  subtitle: string;
  cta: string;
  imageUrl?: string | null;
}) {
  return (
    <section className="bg-gradient-to-b from-brand-bg to-white">
      <Container className="grid gap-8 py-10 sm:py-14 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          {areaLabel && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-dark shadow-soft">
              <Truck className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
              Now delivering in {areaLabel}
            </span>
          )}
          <h1 className="font-heading text-3xl font-extrabold leading-tight text-brand-dark sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-lg text-base text-gray-600 sm:text-lg">{subtitle}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-control bg-brand-primary px-6 py-3.5 font-semibold text-white shadow-soft transition-colors hover:bg-brand-primary-hover"
            >
              {cta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 rounded-control border border-border-brand bg-white px-6 py-3.5 font-semibold text-brand-dark hover:bg-brand-bg"
            >
              Order food
            </Link>
          </div>
          <dl className="mt-8 grid grid-cols-3 gap-4 text-xs text-gray-600 sm:text-sm">
            <div className="flex flex-col items-start gap-1">
              <Clock className="h-5 w-5 text-brand-primary" aria-hidden />
              <dt className="font-semibold text-brand-dark">Fast delivery</dt>
              <dd>15–40 min in Khagrachari Sadar</dd>
            </div>
            <div className="flex flex-col items-start gap-1">
              <ShieldCheck className="h-5 w-5 text-brand-primary" aria-hidden />
              <dt className="font-semibold text-brand-dark">Verified vendors</dt>
              <dd>Local shops & restaurants</dd>
            </div>
            <div className="flex flex-col items-start gap-1">
              <Truck className="h-5 w-5 text-brand-primary" aria-hidden />
              <dt className="font-semibold text-brand-dark">Live tracking</dt>
              <dd>Know exactly when it arrives</dd>
            </div>
          </dl>
        </div>

        <div className="relative hidden aspect-square items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-brand-accent/40 to-brand-bg lg:flex">
          {imageUrl ? (
            <Image src={imageUrl} alt="Pick Up" fill sizes="50vw" className="object-cover" priority />
          ) : (
            <span className="text-[10rem] leading-none" aria-hidden>
              🛵
            </span>
          )}
        </div>
      </Container>
    </section>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Section({
  className,
  title,
  subtitle,
  action,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("py-8 sm:py-10", className)} {...props}>
      <Container>
        {(title || action) && (
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              {title ? (
                <h2 className="font-heading text-xl font-bold text-brand-dark sm:text-2xl">{title}</h2>
              ) : null}
              {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
            </div>
            {action}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

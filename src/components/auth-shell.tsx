import { Link } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.35),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(15,23,42,0.9),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.08]" style={{
            backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          <div className="relative z-10">
            <Link to="/login" className="inline-flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-display text-xl font-bold tracking-tight">
                Fit<span className="text-blue-300">Saathi</span>
              </span>
            </Link>
          </div>

          <div className="relative z-10 max-w-md space-y-6">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
              1 month free. Then pay only for your members.
            </h2>
            <p className="text-[15px] leading-relaxed text-slate-300">
              Each gym gets its own workspace. Members pay you for memberships.
              You pay GymmerzHub a simple platform fee based on active member count after trial.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { v: "30 days", l: "Free trial" },
                { v: "Per member", l: "Fair pricing" },
                { v: "Isolated", l: "Multi-tenant" },
              ].map((item) => (
                <div key={item.v} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
                  <div className="text-sm font-semibold text-white">{item.v}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{item.l}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-slate-500">
            © {new Date().getFullYear()} GymmerzHub · Gym management for India
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-[440px]">
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">
                Fit<span className="text-primary">Saathi</span>
              </span>
            </div>

            <div className="mb-8 space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {children}

            {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}

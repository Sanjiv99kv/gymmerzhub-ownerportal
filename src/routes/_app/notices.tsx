import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Plus, Pin } from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notices } from "@/lib/data";

export const Route = createFileRoute("/_app/notices")({
  head: () => ({ meta: [{ title: "Notices — GymmerzHub" }] }),
  component: NoticesPage,
});

const tagColor: Record<string, string> = {
  Holiday: "border-warning/40 bg-warning/10 text-warning",
  Update: "border-lime/40 bg-lime/10 text-lime",
  Challenge: "border-primary/40 bg-primary/10 text-primary",
  Offer: "border-success/40 bg-success/10 text-success",
};

function NoticesPage() {
  return (
    <div>
      <PageHeader badge="Announcements" title="Notices" description="Broadcast announcements to all members."
        action={<Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="mr-1 h-4 w-4" /> Create notice</Button>} />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        {notices.map((n, i) => (
          <Card key={n.title} className="group relative overflow-hidden border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <Badge variant="outline" className={tagColor[n.tag]}>{n.tag}</Badge>
                </div>
              </div>
              {i === 0 && <Pin className="h-4 w-4 text-primary" />}
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold">{n.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Posted {n.date}</span>
              <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-primary hover:text-primary">Edit</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

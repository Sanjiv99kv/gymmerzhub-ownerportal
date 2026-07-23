import { createFileRoute } from "@tanstack/react-router";
import { Star, Users, Plus } from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trainers } from "@/lib/data";

export const Route = createFileRoute("/_app/trainers")({
  head: () => ({ meta: [{ title: "Trainers — GymmerzHub" }] }),
  component: TrainersPage,
});

function TrainersPage() {
  return (
    <div>
      <PageHeader badge="Team" title="Trainers" description="Manage your coaching staff and their assignments."
        action={<Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="mr-1 h-4 w-4" /> Add trainer</Button>} />
      <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
        {trainers.map((t) => (
          <Card key={t.name} className="group relative overflow-hidden border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-primary opacity-0 blur-3xl transition-opacity group-hover:opacity-30" />
            <div className="relative flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-border"><AvatarImage src={t.photo} /><AvatarFallback>{t.name[0]}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.spec}</div>
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Members</div>
                <div className="font-display text-xl font-bold">{t.members}</div>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Star className="h-3.5 w-3.5 text-warning" /> Rating</div>
                <div className="font-display text-xl font-bold">{t.rating}</div>
              </div>
            </div>
            <div className="relative mt-4 flex gap-2">
              <Badge variant="outline" className="border-lime/40 bg-lime/10 text-lime">Available</Badge>
              <Badge variant="outline" className="border-border">Mon–Sat</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

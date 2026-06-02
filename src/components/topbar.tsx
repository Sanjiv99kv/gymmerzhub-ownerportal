import { Bell, Plus, Search, UserPlus, BadgePlus, Receipt, Megaphone, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger className="h-8 w-8 text-muted-foreground" />

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search members, payments, plans…"
          className="h-10 border-border bg-card pl-9 focus-visible:ring-primary"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="hidden bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 md:inline-flex">
              <Plus className="mr-1 h-4 w-4" /> Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><UserPlus className="mr-2 h-4 w-4" /> Add Member</DropdownMenuItem>
            <DropdownMenuItem><BadgePlus className="mr-2 h-4 w-4" /> Create Membership</DropdownMenuItem>
            <DropdownMenuItem><Receipt className="mr-2 h-4 w-4" /> Record Payment</DropdownMenuItem>
            <DropdownMenuItem><Megaphone className="mr-2 h-4 w-4" /> Create Notice</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-glow" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border bg-card px-1.5 py-1 transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarImage src="https://i.pravatar.cc/80?img=68" />
                <AvatarFallback>RS</AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <div className="text-xs font-semibold">Rajesh S.</div>
                <div className="text-[10px] text-muted-foreground">Owner</div>
              </div>
              <ChevronDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function PageHeader({
  title, description, action, badge,
}: { title: string; description?: string; action?: React.ReactNode; badge?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background/40 px-6 py-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5 animate-fade-up">
        {badge && (
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            {badge}
          </Badge>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

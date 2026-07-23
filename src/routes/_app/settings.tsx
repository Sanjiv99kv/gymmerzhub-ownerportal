import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — GymmerzHub" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <PageHeader badge="Settings" title="Workspace Settings" description="Configure your gym, geo-fencing, notifications, and security." />
      <div className="p-6">
        <Tabs defaultValue="general" className="space-y-5">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="border-border bg-card shadow-card">
              <CardHeader><CardTitle className="font-display">Gym Information</CardTitle><CardDescription>Public details shown to members.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Gym Name" defaultValue="GymmerzHub Andheri" />
                <Field label="Owner" defaultValue="Rajesh Sharma" />
                <Field label="Phone" defaultValue="+91 98200 11122" />
                <Field label="Email" defaultValue="hello@gymmerzhub.in" />
                <Field label="Address" defaultValue="2nd Floor, Link Road, Andheri West, Mumbai" className="md:col-span-2" />
                <div className="md:col-span-2 flex justify-end"><Button className="bg-gradient-primary text-primary-foreground shadow-glow">Save changes</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="border-border bg-card shadow-card">
              <CardHeader><CardTitle className="font-display">Geo-fencing</CardTitle><CardDescription>Members can only check in within this radius.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Field label="Latitude" defaultValue="19.1364" />
                <Field label="Longitude" defaultValue="72.8296" />
                <Field label="Radius (meters)" defaultValue="50" />
                <div className="md:col-span-3 flex justify-end"><Button className="bg-gradient-primary text-primary-foreground shadow-glow">Save</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border bg-card shadow-card">
              <CardHeader><CardTitle className="font-display">Channels</CardTitle><CardDescription>How members receive updates.</CardDescription></CardHeader>
              <CardContent className="space-y-1">
                <Toggle label="WhatsApp" desc="Renewal reminders and notices via WhatsApp." defaultChecked />
                <Separator />
                <Toggle label="Email" desc="Receipts and monthly statements." defaultChecked />
                <Separator />
                <Toggle label="Push Notifications" desc="In-app alerts on the GymmerzHub member app." />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border bg-card shadow-card">
              <CardHeader><CardTitle className="font-display">Password & Access</CardTitle><CardDescription>Update credentials and role permissions.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Current password" type="password" />
                <Field label="New password" type="password" />
                <Field label="Confirm new password" type="password" className="md:col-span-2" />
                <Separator className="md:col-span-2" />
                <Toggle label="Two-factor authentication" desc="Require OTP for staff sign-in." defaultChecked />
                <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Manage Operator, Trainer, and custom roles under{" "}
                  <a href="/roles" className="font-medium text-primary hover:underline">Roles &amp; Permissions</a>.
                </div>
                <div className="md:col-span-2 flex justify-end"><Button className="bg-gradient-primary text-primary-foreground shadow-glow">Update</Button></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ label, className = "", ...props }: any) {
  return (
    <div className={className + " space-y-1.5"}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input className="border-border bg-background" {...props} />
    </div>
  );
}

function Toggle({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

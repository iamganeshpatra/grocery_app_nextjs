"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addManager, removeManager } from "@/actions/managers.actions";

type Manager = {
  id: string; // ShopManager.id
  user: { id: string; name: string; email: string };
};

export function ManagersPanel({
  shopId,
  initialManagers,
}: {
  shopId: string;
  initialManagers: Manager[];
}) {
  const [managers, setManagers] = useState(initialManagers);
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();

  function handleAdd() {
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }

    setTempPassword(null);

    startAddTransition(async () => {
      const result = await addManager(shopId, email.trim());

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Manager added");
      setEmail("");

      if (result.tempPassword) {
        setTempPassword(result.tempPassword);
      }

      // Refresh manager list — easiest way without router.refresh() losing dialog state
      
    });
  }

  function handleRemove(managerId: string, managerName: string) {
    if (
      !confirm(
        `Remove ${managerName} as manager? Their account will not be deleted.`,
      )
    )
      return;

    startRemoveTransition(async () => {
      const result = await removeManager(shopId, managerId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setManagers((prev) => prev.filter((m) => m.id !== managerId));
      toast.success(`${managerName} removed from this shop`);
    });
  }

  return (
    <div className="space-y-6">
      {/* Add Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Manager by Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="manager@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button onClick={handleAdd} disabled={isAdding}>
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </div>

          {/* Show temp password if a new account was created */}
          {tempPassword && (
            <div className="border border-amber-300 bg-amber-50 rounded-md p-3 space-y-1">
              <p className="text-sm font-semibold text-amber-800">
                New manager account created
              </p>
              <p className="text-sm text-amber-700">
                Share this temporary password with them. It will only be shown
                once:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-white border rounded px-2 py-1 text-sm font-mono">
                  {tempPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    toast.success("Copied!");
                    window.location.reload();
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                The manager must change this password when they first log in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Managers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Current Managers ({managers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No managers added yet. Add a manager by email above.
            </p>
          ) : (
            <div className="space-y-2">
              {managers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Manager</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRemoving}
                      onClick={() => handleRemove(m.id, m.user.name)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

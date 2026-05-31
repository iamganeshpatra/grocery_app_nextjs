"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deactivateUser, reactivateUser } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLES = ["", "SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER", "CUSTOMER"];

export function UsersTable({
  initialUsers,
  query,
  role,
}: {
  initialUsers: User[];
  query: string;
  role: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [isPending, startTransition] = useTransition();

  function applyFilters(nextRole = role, nextQuery = search) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextRole) params.set("role", nextRole);
    router.push(`/admin/users?${params.toString()}`);
  }

  function toggleActive(u: User) {
    const action = u.isActive ? deactivateUser : reactivateUser;
    const verb = u.isActive ? "Deactivate" : "Reactivate";
    if (!confirm(`${verb} ${u.name}?`)) return;

    startTransition(async () => {
      const result = await action(u.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${u.name} ${u.isActive ? "deactivated" : "reactivated"}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
          className="flex gap-2 flex-1 min-w-[260px]"
        >
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <select
          value={role}
          onChange={(e) => applyFilters(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r || "All roles"}
            </option>
          ))}
        </select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              initialUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{u.role}</Badge>
                  </td>
                  <td className="p-3">
                    {u.isActive ? (
                      <Badge className="bg-green-600 text-white">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Deactivated</Badge>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {u.role !== "SUPER_ADMIN" && (
                      <Button
                        size="sm"
                        variant={u.isActive ? "outline" : "default"}
                        disabled={isPending}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

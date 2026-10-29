"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus, Search, ShieldCheck, KeyRound, Trash2, Power, UserCog, Eye, EyeOff,
} from "lucide-react";
import { usersApi, type RoleRecord } from "@/lib/api";
import type { AdminUser } from "@/types";
import { fetchCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

const EMPTY_CREATE: CreateForm = { name: "", email: "", password: "", role: "admin" };

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"users" | "roles">("users");

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = me?.permissions?.includes("users.manage") ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([usersApi.list(), usersApi.roles()]);
      setUsers(usersRes.data ?? []);
      setRoles(rolesRes.data ?? []);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchCurrentUser().then(setMe);
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(createForm.email.trim())) {
      return setFormError("Enter a valid email address");
    }
    if (createForm.password.length < 10 || !/[A-Za-z]/.test(createForm.password) || !/\d/.test(createForm.password)) {
      return setFormError("Password must be at least 10 characters and include letters and numbers");
    }
    setSaving(true);
    try {
      await usersApi.create({
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
      });
      toast.show("User created", "success");
      setCreating(false);
      setCreateForm(EMPTY_CREATE);
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the user");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (user: AdminUser, role: string) => {
    setBusyId(user.id);
    try {
      await usersApi.update(user.id, { role });
      toast.show("Role updated", "success");
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not change the role", "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      await usersApi.update(user.id, { isActive: !user.isActive });
      toast.show(user.isActive ? "User deactivated" : "User activated", "success");
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not update the user", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast.show("Password must be at least 10 characters and include letters and numbers", "error");
      return;
    }
    setResetting(true);
    try {
      await usersApi.update(passwordTarget.id, { password: newPassword });
      toast.show("Password reset. Existing sessions were revoked.", "success");
      setPasswordTarget(null);
      setNewPassword("");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not reset the password", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersApi.delete(deleteTarget.id);
      toast.show("User deleted", "success");
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not delete the user", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q);
  });

  const roleOptions = roles.map((r) => ({ value: r.key, label: r.name }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#09090b] tracking-tight">Admin Users</h1>
          <p className="text-[12px] text-[#71717a] mt-0.5">
            Manage access, roles and credentials for the admin console.
          </p>
        </div>
        {canManage && (
          <Button icon={<Plus size={15} />} onClick={() => { setFormError(""); setCreating(true); }}>
            Add User
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {[{ id: "users" as const, label: "Users" }, { id: "roles" as const, label: "Roles & Permissions" }].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all",
                tab === t.id ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "users" && (
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="h-8 w-full pl-9 pr-3 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239] focus:border-transparent"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={30} /></div>
      ) : tab === "users" ? (
        <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e8ed] bg-gray-50">
                {["User", "Role", "Status", "Last sign-in", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8ed]">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[#6e6e73]">No users found</td></tr>
              ) : filtered.map((user) => {
                const isSelf = user.id === me?.id;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9b1239]/10 text-[12px] font-bold text-[#9b1239]">
                          {user.name?.[0]?.toUpperCase() ?? "A"}
                        </div>
                        <div>
                          <p className="font-medium text-[#1d1d1f]">
                            {user.name} {isSelf && <span className="text-[10px] font-normal text-[#a1a1aa]">(you)</span>}
                          </p>
                          <p className="text-[11px] text-[#6e6e73]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && !isSelf ? (
                        <select
                          value={user.role}
                          disabled={busyId === user.id}
                          onChange={(e) => changeRole(user, e.target.value)}
                          className="h-8 rounded-lg border border-[#e4e4e7] bg-white px-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#9b1239] disabled:opacity-50"
                        >
                          {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-[12px] text-[#3f3f46]">{user.roleName ?? user.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "green" : "red"} dot>
                        {user.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#71717a]">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <button
                            onClick={() => { setPasswordTarget(user); setNewPassword(""); }}
                            title="Reset password"
                            className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-gray-100 hover:text-[#1d1d1f]"
                          >
                            <KeyRound size={14} />
                          </button>
                        )}
                        {canManage && !isSelf && (
                          <button
                            onClick={() => toggleActive(user)}
                            disabled={busyId === user.id}
                            title={user.isActive ? "Deactivate" : "Activate"}
                            className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-gray-100 hover:text-[#1d1d1f] disabled:opacity-40"
                          >
                            <Power size={14} />
                          </button>
                        )}
                        {canManage && !isSelf && (
                          <button
                            onClick={() => setDeleteTarget(user)}
                            title="Delete user"
                            className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-red-50 hover:text-[#dc2626]"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.key} className="bg-white rounded-xl border border-[#e8e8ed] p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#9b1239]" />
                <p className="text-[13px] font-semibold text-[#09090b]">{role.name}</p>
                <span className="ml-auto text-[10px] font-mono text-[#a1a1aa]">{role.key}</span>
              </div>
              <p className="text-[12px] text-[#71717a] mt-1">{role.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {role.permissions.map((p) => (
                  <span key={p} className="rounded bg-[#f4f4f5] px-1.5 py-0.5 font-mono text-[10px] text-[#52525b]">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create user */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Add admin user">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input label="Full name *" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Email *" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} required />
          <div className="relative">
            <Input
              label="Temporary password *"
              type={showPassword ? "text" : "password"}
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              helperText="At least 10 characters, including letters and numbers"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-[30px] text-[#a1a1aa] hover:text-[#3f3f46]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <Select
            label="Role *"
            value={createForm.role}
            onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            options={roleOptions}
          />
          {formError && <p className="text-[12px] text-[#b91c1c]">{formError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" loading={saving} icon={<UserCog size={14} />}>Create user</Button>
          </div>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal open={Boolean(passwordTarget)} onClose={() => setPasswordTarget(null)} title="Reset password">
        <div className="space-y-3">
          <p className="text-[13px] text-[#71717a]">
            Set a new password for <span className="font-medium text-[#1d1d1f]">{passwordTarget?.email}</span>.
            All of their existing sessions will be revoked.
          </p>
          <Input
            label="New password *"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="At least 10 characters, including letters and numbers"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPasswordTarget(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} loading={resetting}>Reset password</Button>
          </div>
        </div>
      </Modal>

      {/* Delete user */}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete user">
        <p className="text-[13px] text-[#71717a] mb-6">
          Delete <span className="font-medium text-[#1d1d1f]">{deleteTarget?.name}</span> ({deleteTarget?.email})?
          This permanently removes their access. Consider deactivating instead.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete user</Button>
        </div>
      </Modal>
    </div>
  );
}

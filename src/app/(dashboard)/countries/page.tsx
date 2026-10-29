"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { countriesApi } from "@/lib/api";
import type { Country } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const defaultNew: Partial<Country> = {
  code: "",
  name: "",
  flag: "",
  active: true,
};

export default function CountriesPage() {
  const toast = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Country>>(defaultNew);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await countriesApi.list();
      setCountries(res.data ?? []);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load countries", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof Country, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = (country: Country) => {
    setForm(country);
    setEditingId(country.id);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setForm(defaultNew);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.code?.trim() || !form.name?.trim()) {
      toast.show("Code and Name are required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await countriesApi.update(editingId, form);
        toast.show("Country updated", "success");
      } else {
        await countriesApi.create(form);
        toast.show("Country created", "success");
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (country: Country) => {
    try {
      await countriesApi.update(country.id, { active: !country.active });
      toast.show(`${country.name} ${!country.active ? "activated" : "deactivated"}`, "success");
      load();
    } catch {
      toast.show("Update failed", "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus size={15} />} onClick={() => { cancelEdit(); setShowForm(true); }}>
          Add Country
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#7f0f2e] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">
            {editingId ? "Edit Country" : "Add Country"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label="Code"
              value={form.code ?? ""}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="IN"
              maxLength={4}
            />
            <Input
              label="Name"
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="India"
            />
            <Input
              label="Flag Emoji"
              value={form.flag ?? ""}
              onChange={(e) => set("flag", e.target.value)}
              placeholder="🇮🇳"
            />
            <div className="flex items-end gap-2">
              <Button loading={saving} onClick={handleSave} icon={<Check size={15} />}>
                Save
              </Button>
              <Button variant="ghost" onClick={cancelEdit} icon={<X size={15} />}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              {["Flag", "Code", "Name", "Cities", "Venues", "Active", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {countries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[#6e6e73]">No countries added</td>
              </tr>
            ) : (
              countries.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xl">{c.flag}</td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-[#6e6e73]">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-[#1d1d1f]">{c.name}</td>
                  <td className="px-4 py-3 text-[#6e6e73]">{c.cityCount ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6e6e73]">{c.venueCount ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      role="switch"
                      aria-checked={c.active}
                      className={`relative w-10 h-5 rounded-full transition-colors ${c.active ? "bg-[#16a34a]" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${c.active ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6e6e73] hover:text-[#1d1d1f]">
                      <Pencil size={15} />
                    </button>
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

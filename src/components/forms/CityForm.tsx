"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { City } from "@/types";
import { citiesApi } from "@/lib/api";
import { slugify, COUNTRIES } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";

interface Props {
  city?: City;
}

const defaultCity: Partial<City> = {
  name: "",
  slug: "",
  country: "",
  countryCode: "",
  tagline: "",
  description: "",
  image: "",
  imageAlt: "",
  venueCountLabel: "",
  popularTypes: [],
  status: "draft",
};

export default function CityForm({ city }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(city?.id);

  const [form, setForm] = useState<Partial<City>>(city ?? defaultCity);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const set = (key: keyof City, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNameChange = (name: string) => {
    set("name", name);
    if (!isEdit) set("slug", slugify(name));
  };

  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find((c) => c.code === code);
    if (country) {
      set("countryCode", code);
      set("country", country.name);
    }
  };

  const addTag = () => {
    const val = tagInput.trim();
    if (!val) return;
    const current = form.popularTypes ?? [];
    if (!current.includes(val)) set("popularTypes", [...current, val]);
    setTagInput("");
  };

  const removeTag = (t: string) =>
    set(
      "popularTypes",
      (form.popularTypes ?? []).filter((x) => x !== t)
    );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = "Name is required";
    if (!form.slug?.trim()) e.slug = "Slug is required";
    if (!form.countryCode) e.countryCode = "Country is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit && city?.id) {
        await citiesApi.update(city.id, form);
        toast.show("City updated", "success");
      } else {
        await citiesApi.create(form);
        toast.show("City created", "success");
      }
      router.push("/cities");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to save city", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">
          City Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="City Name"
            value={form.name ?? ""}
            onChange={(e) => handleNameChange(e.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Slug"
            value={form.slug ?? ""}
            onChange={(e) => set("slug", e.target.value)}
            error={errors.slug}
            required
          />
        </div>
        <Select
          label="Country"
          value={form.countryCode ?? ""}
          onChange={(e) => handleCountryChange(e.target.value)}
          error={errors.countryCode}
          required
          options={COUNTRIES.map((c) => ({
            value: c.code,
            label: `${c.flag} ${c.name}`,
          }))}
          placeholder="Select country"
        />
        <Input
          label="Tagline"
          value={form.tagline ?? ""}
          onChange={(e) => set("tagline", e.target.value)}
          placeholder="e.g. City of palaces"
        />
        <Textarea
          label="Description"
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
        />
      </section>

      <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">
          Image
        </h2>
        <Input
          label="Image URL"
          value={form.image ?? ""}
          onChange={(e) => set("image", e.target.value)}
          placeholder="https://example.com/city.jpg"
        />
        <Input
          label="Image Alt Text"
          value={form.imageAlt ?? ""}
          onChange={(e) => set("imageAlt", e.target.value)}
        />
      </section>

      <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">
          Additional
        </h2>
        <Input
          label="Venue Count Label"
          value={form.venueCountLabel ?? ""}
          onChange={(e) => set("venueCountLabel", e.target.value)}
          placeholder="e.g. 40+ venues"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#1d1d1f]">
            Popular Types
          </label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Type and press Enter"
              className="flex-1 h-9 px-3 rounded-lg border border-[#e8e8ed] text-sm focus:outline-none focus:ring-2 focus:ring-[#7f0f2e] focus:border-transparent"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTag}>Add</Button>
          </div>
          {(form.popularTypes ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(form.popularTypes ?? []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-sm">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="text-[#6e6e73] hover:text-[#dc2626]">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#1d1d1f]">Status</span>
          {(["draft", "published"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("status", s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.status === s
                  ? s === "published"
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "bg-yellow-50 border-yellow-300 text-yellow-700"
                  : "bg-white border-[#e8e8ed] text-[#6e6e73]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="flex gap-3 pb-6">
        <Button type="submit" loading={saving} size="lg">
          {isEdit ? "Update City" : "Create City"}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/cities")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

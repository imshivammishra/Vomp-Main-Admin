"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { citiesApi, geoApi } from "@/lib/api";
import type { City, Country } from "@/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function CitiesPage() {
  const toast = useToast();
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await citiesApi.list();
      setCities(res.data ?? []);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load cities", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    geoApi
      .countries()
      .then((res) => setCountries(res.data ?? []))
      .catch(() => { /* flags simply fall back to blank */ });
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await citiesApi.delete(id);
      toast.show("City deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/cities/new">
          <Button icon={<Plus size={15} />}>New City</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              {["Name", "Country", "Tagline", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {cities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#6e6e73]">No cities found</td>
              </tr>
            ) : (
              cities.map((city) => {
                const flag = countries.find((c) => c.code === city.countryCode)?.flag ?? "";
                return (
                  <tr key={city.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1d1d1f]">{city.name}</p>
                      <p className="text-xs text-[#6e6e73]">{city.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73]">{flag} {city.country}</td>
                    <td className="px-4 py-3 text-[#6e6e73] max-w-xs truncate">{city.tagline}</td>
                    <td className="px-4 py-3">
                      <Badge variant={city.status === "published" ? "green" : "yellow"}>
                        {city.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/cities/${city.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6e6e73] hover:text-[#1d1d1f]">
                            <Pencil size={15} />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(city.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#6e6e73] hover:text-[#dc2626]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete City">
        <p className="text-sm text-[#6e6e73] mb-6">Are you sure you want to delete this city?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

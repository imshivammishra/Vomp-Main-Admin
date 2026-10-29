"use client";

import React, { useEffect, useState } from "react";
import { use } from "react";
import { citiesApi } from "@/lib/api";
import type { City } from "@/types";
import CityForm from "@/components/forms/CityForm";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";

export default function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [city, setCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    citiesApi.get(id)
      .then(setCity)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load city"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-[#dc2626]">{error}</p>
      <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
  if (!city) return null;
  return <CityForm city={city} />;
}

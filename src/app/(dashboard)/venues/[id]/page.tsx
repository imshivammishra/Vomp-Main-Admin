"use client";

import React, { useEffect, useState } from "react";
import { use } from "react";
import { venuesApi } from "@/lib/api";
import type { Venue } from "@/types";
import VenueForm from "@/components/forms/VenueForm";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";

export default function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    venuesApi
      .get(id)
      .then(setVenue)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load venue")
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-[#dc2626]">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );

  if (!venue) return null;

  return <VenueForm venue={venue} />;
}

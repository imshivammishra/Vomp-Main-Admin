"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, X } from "lucide-react";
import type { Country, MediaFile, State, Venue, VenueStatus } from "@/types";
import { citiesApi, geoApi, venuesApi } from "@/lib/api";
import { slugify, EVENT_TYPES, VENUE_TYPES } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import ImageUpload from "@/components/ui/ImageUpload";

interface Props {
  venue?: Venue;
}

const SETTINGS = ["Indoor", "Outdoor", "Indoor + Outdoor"] as const;

const STATUSES: { value: VenueStatus; label: string }[] = [
  { value: "draft", label: "Draft — not visible" },
  { value: "pending", label: "Pending review" },
  { value: "published", label: "Published — live" },
  { value: "unpublished", label: "Unpublished" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const VERIFICATION: { value: NonNullable<Venue["verificationStatus"]>; label: string }[] = [
  { value: "unverified", label: "Unverified" },
  { value: "pending", label: "Verification pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Verification rejected" },
];

const PRICING_UNITS = [
  { value: "per_event", label: "Per event" },
  { value: "per_day", label: "Per day" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_person", label: "Per person" },
];

const defaultVenue: Partial<Venue> = {
  name: "",
  slug: "",
  country: "",
  countryCode: "",
  city: "",
  citySlug: "",
  area: "",
  address: "",
  postalCode: "",
  timezone: "Asia/Kolkata",
  type: "",
  setting: "Indoor",
  capacityMin: 50,
  capacityMax: 500,
  priceHint: "",
  startingPrice: null,
  currency: "INR",
  pricingUnit: "per_event",
  image: "",
  imageAlt: "",
  gallery: [],
  shortDescription: "",
  fullDescription: "",
  amenities: [],
  eventTypes: [],
  features: [],
  verificationStatus: "unverified",
  robots: "index,follow",
  featured: false,
  status: "draft",
};

function numOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function numOrNull(value: string): number | null {
  const n = numOrUndefined(value);
  return n === undefined ? null : n;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">{title}</h2>
        {description && <p className="text-[12px] text-[#a1a1aa] mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[#e8e8ed]">
      <span className="text-[13px] text-[#3f3f46]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full shrink-0 transition-colors ${checked ? "bg-[#9b1239]" : "bg-gray-200"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

export default function VenueForm({ venue }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(venue?.id);

  const [form, setForm] = useState<Partial<Venue>>({ ...defaultVenue, ...venue });
  const [slugManual, setSlugManual] = useState(Boolean(venue?.slug));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(Boolean(venue?.fullDescription));

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<Array<{ name: string; stateCode: string }>>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // ── Reference geography (real ISO data from PostgreSQL, not a hardcoded list) ─
  useEffect(() => {
    let cancelled = false;
    geoApi
      .countries()
      .then((res) => {
        if (cancelled) return;
        const list = res.data ?? [];
        setCountries(list);
        // Back-fill countryId for legacy venues that only stored a code.
        setForm((prev) => {
          if (prev.countryId || !prev.countryCode) return prev;
          const match = list.find((c) => c.code === prev.countryCode);
          return match ? { ...prev, countryId: Number(match.id) } : prev;
        });
      })
      .catch(() => {
        if (!cancelled) toast.show("Could not load the country list", "error");
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!form.countryCode) {
      setStates([]);
      return;
    }
    let cancelled = false;
    setLoadingStates(true);
    geoApi
      .states(form.countryCode)
      .then((res) => {
        if (!cancelled) setStates(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.countryCode]);

  const selectedState = useMemo(
    () => states.find((s) => String(s.id) === String(form.stateId ?? "")),
    [states, form.stateId]
  );

  useEffect(() => {
    if (!form.countryCode) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    geoApi
      .cities(form.countryCode, selectedState?.code)
      .then((res) => {
        if (!cancelled) setCities(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.countryCode, selectedState?.code]);

  // Link the free-text city to a curated city record so the public city pages
  // and filters stay consistent. Never blocks saving when no match exists.
  useEffect(() => {
    const name = form.city?.trim();
    const countryCode = form.countryCode;
    if (!name || !countryCode || form.cityId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      citiesApi
        .list({ country: countryCode, search: name })
        .then((res) => {
          if (cancelled) return;
          const match = (res.data ?? []).find(
            (c) => c.name.toLowerCase() === name.toLowerCase()
          );
          if (match) {
            setForm((prev) =>
              prev.city === name
                ? { ...prev, cityId: Number(match.id), citySlug: match.slug }
                : prev
            );
          }
        })
        .catch(() => {
          /* Optional link — ignore lookup failures. */
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.city, form.countryCode, form.cityId]);

  const set = (key: keyof Venue, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNameChange = (name: string) => {
    set("name", name);
    if (!slugManual) set("slug", slugify(name));
  };

  const handleCountryChange = (code: string) => {
    const country = countries.find((c) => c.code === code);
    setForm((prev) => ({
      ...prev,
      countryCode: code,
      country: country?.name ?? "",
      countryId: country ? Number(country.id) : undefined,
      currency: country?.currency || prev.currency || "INR",
      stateId: null,
      city: "",
      citySlug: "",
      cityId: null,
    }));
  };

  const handleStateChange = (value: string) => {
    const state = states.find((s) => s.id === value);
    setForm((prev) => ({
      ...prev,
      stateId: state ? Number(state.id) : null,
      city: "",
      citySlug: "",
      cityId: null,
    }));
  };

  const handleCityChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      city: name,
      citySlug: slugify(name),
      cityId: null,
    }));
  };

  const toggleEventType = (et: string) => {
    const current = form.eventTypes ?? [];
    set(
      "eventTypes",
      current.includes(et) ? current.filter((e) => e !== et) : [...current, et]
    );
  };

  const addTag = (kind: "amenities" | "features", value: string) => {
    const val = value.trim();
    if (!val) return;
    const current = form[kind] ?? [];
    if (!current.includes(val)) set(kind, [...current, val]);
    if (kind === "amenities") setAmenityInput("");
    else setFeatureInput("");
  };

  const removeTag = (kind: "amenities" | "features", value: string) =>
    set(kind, (form[kind] ?? []).filter((item) => item !== value));

  const handleCoverUploaded = (media: MediaFile) => {
    setForm((prev) => ({
      ...prev,
      image: media.url,
      imageAlt: prev.imageAlt || media.originalName || prev.name || "",
    }));
  };

  const handleGalleryUploaded = (media: MediaFile) => {
    setForm((prev) => ({
      ...prev,
      gallery: [...(prev.gallery ?? []), media.url],
    }));
  };

  const removeGalleryImage = (url: string) =>
    set("gallery", (form.gallery ?? []).filter((item) => item !== url));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = "Name is required";
    if (!form.slug?.trim()) e.slug = "Slug is required";
    if (!form.countryCode) e.countryCode = "Country is required";
    if (!form.city?.trim()) e.city = "City is required";
    if (!form.type) e.type = "Venue type is required";
    if (!form.image?.trim()) e.image = "Cover image is required";
    if (!form.shortDescription?.trim()) e.shortDescription = "Short description is required";
    if (
      form.capacityMin != null &&
      form.capacityMax != null &&
      form.capacityMax > 0 &&
      form.capacityMin > form.capacityMax
    ) {
      e.capacityMax = "Maximum capacity must be at least the minimum";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.show("Please fix the highlighted fields", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Strip UI-only values and send explicit nulls for optional numbers.
    const payload: Partial<Venue> = {
      ...form,
      slug: form.slug?.trim() || slugify(form.name ?? ""),
      countryId: form.countryId,
      stateId: form.stateId ?? null,
      cityId: form.cityId ?? null,
      citySlug: form.citySlug?.trim() || slugify(form.city ?? ""),
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      startingPrice: form.startingPrice ?? null,
      securityDeposit: form.securityDeposit ?? null,
      minBookingHours: form.minBookingHours ?? null,
      indoorCapacity: form.indoorCapacity ?? null,
      outdoorCapacity: form.outdoorCapacity ?? null,
      roomsCount: form.roomsCount ?? null,
      gallery: form.gallery ?? [],
      amenities: form.amenities ?? [],
      eventTypes: form.eventTypes ?? [],
      features: form.features ?? [],
      bookingLeadDays: form.bookingLeadDays ?? 0,
      taxesPct: form.taxesPct ?? 0,
    };

    setSaving(true);
    try {
      if (isEdit && venue?.id) {
        await venuesApi.update(venue.id, payload);
        toast.show(
          payload.status === "published"
            ? "Venue updated and published"
            : "Venue updated",
          "success"
        );
      } else {
        await venuesApi.create(payload);
        toast.show(
          payload.status === "published"
            ? "Venue created and published"
            : "Venue saved as draft",
          "success"
        );
      }
      router.push("/venues");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to save venue", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* ── Basic information ── */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Venue Name"
            value={form.name ?? ""}
            onChange={(e) => handleNameChange(e.target.value)}
            error={errors.name}
            required
            placeholder="e.g. The Grand Palace"
          />
          <Input
            label="Slug"
            value={form.slug ?? ""}
            onChange={(e) => {
              set("slug", slugify(e.target.value));
              setSlugManual(true);
            }}
            error={errors.slug}
            required
            placeholder="the-grand-palace"
            helperText="Used in the public URL"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Country"
            value={form.countryCode ?? ""}
            onChange={(e) => handleCountryChange(e.target.value)}
            error={errors.countryCode}
            required
            options={countries.map((c) => ({
              value: c.code,
              label: `${c.flag ? `${c.flag} ` : ""}${c.name}`,
            }))}
            placeholder={loadingCountries ? "Loading countries…" : "Select country"}
            disabled={loadingCountries}
          />
          <Select
            label="State / Region"
            value={form.stateId != null ? String(form.stateId) : ""}
            onChange={(e) => handleStateChange(e.target.value)}
            options={states.map((s) => ({ value: s.id, label: s.name }))}
            placeholder={
              !form.countryCode
                ? "Select a country first"
                : loadingStates
                  ? "Loading states…"
                  : states.length === 0
                    ? "No states in the dataset"
                    : "Select state (optional)"
            }
            disabled={!form.countryCode || loadingStates}
            helperText="Optional, from the ISO subdivision dataset"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#3f3f46] mb-1.5">
              City <span className="text-[#b91c1c]">*</span>
            </label>
            <input
              list="venue-city-options"
              value={form.city ?? ""}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={!form.countryCode}
              placeholder={
                !form.countryCode
                  ? "Select a country first"
                  : loadingCities
                    ? "Loading cities…"
                    : "Type or choose a city"
              }
              className={[
                "h-9 w-full rounded-lg border bg-white px-3 text-[13px] text-[#09090b] placeholder:text-[#a1a1aa] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#9b1239] focus:border-transparent disabled:opacity-50 disabled:bg-[#f4f4f5]",
                errors.city ? "border-[#b91c1c] focus:ring-[#b91c1c]" : "border-[#e4e4e7]",
              ].join(" ")}
            />
            <datalist id="venue-city-options">
              {cities.map((c) => (
                <option key={`${c.name}-${c.stateCode}`} value={c.name} />
              ))}
            </datalist>
            {errors.city ? (
              <p className="text-[12px] text-[#b91c1c] mt-1">{errors.city}</p>
            ) : (
              <p className="text-[12px] text-[#71717a] mt-1">
                {form.cityId
                  ? "Linked to a curated city page"
                  : "Free text — a matching curated city is linked automatically"}
              </p>
            )}
          </div>
          <Input
            label="Area / Locality"
            value={form.area ?? ""}
            onChange={(e) => set("area", e.target.value)}
            placeholder="e.g. Banjara Hills"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Street Address"
            value={form.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Building, street"
          />
          <Input
            label="Postal Code"
            value={form.postalCode ?? ""}
            onChange={(e) => set("postalCode", e.target.value)}
            placeholder="500034"
          />
          <Input
            label="Timezone"
            value={form.timezone ?? ""}
            onChange={(e) => set("timezone", e.target.value)}
            placeholder="Asia/Kolkata"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Latitude"
            type="number"
            step="any"
            value={form.latitude ?? ""}
            onChange={(e) => set("latitude", numOrNull(e.target.value))}
            placeholder="17.3850"
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            value={form.longitude ?? ""}
            onChange={(e) => set("longitude", numOrNull(e.target.value))}
            placeholder="78.4867"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Venue Type"
            value={form.type ?? ""}
            onChange={(e) => set("type", e.target.value)}
            error={errors.type}
            required
            options={VENUE_TYPES.map((t) => ({ value: t, label: t }))}
            placeholder="Select type"
          />
          <Select
            label="Setting"
            value={form.setting ?? "Indoor"}
            onChange={(e) => set("setting", e.target.value as Venue["setting"])}
            options={SETTINGS.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </Section>

      {/* ── Capacity ── */}
      <Section
        title="Capacity & Spaces"
        description="Leave a capacity blank when it does not apply."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Input
            label="Min Capacity"
            type="number"
            min={0}
            value={form.capacityMin ?? ""}
            onChange={(e) => set("capacityMin", numOrUndefined(e.target.value) ?? 0)}
            placeholder="50"
          />
          <Input
            label="Max Capacity"
            type="number"
            min={0}
            value={form.capacityMax ?? ""}
            onChange={(e) => set("capacityMax", numOrUndefined(e.target.value) ?? 0)}
            error={errors.capacityMax}
            placeholder="500"
          />
          <Input
            label="Rooms"
            type="number"
            min={0}
            value={form.roomsCount ?? ""}
            onChange={(e) => set("roomsCount", numOrNull(e.target.value))}
            placeholder="12"
          />
          <Input
            label="Indoor Capacity"
            type="number"
            min={0}
            value={form.indoorCapacity ?? ""}
            onChange={(e) => set("indoorCapacity", numOrNull(e.target.value))}
            placeholder="300"
          />
          <Input
            label="Outdoor Capacity"
            type="number"
            min={0}
            value={form.outdoorCapacity ?? ""}
            onChange={(e) => set("outdoorCapacity", numOrNull(e.target.value))}
            placeholder="200"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Toggle label="Parking" checked={Boolean(form.parking)} onChange={(v) => set("parking", v)} />
          <Toggle label="Accessible" checked={Boolean(form.accessible)} onChange={(v) => set("accessible", v)} />
          <Toggle label="Catering" checked={Boolean(form.catering)} onChange={(v) => set("catering", v)} />
          <Toggle label="Accommodation" checked={Boolean(form.accommodation)} onChange={(v) => set("accommodation", v)} />
          <Toggle label="Decoration" checked={Boolean(form.decoration)} onChange={(v) => set("decoration", v)} />
        </div>
      </Section>

      {/* ── Pricing & booking rules ── */}
      <Section title="Pricing & Booking Rules">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Starting Price"
            type="number"
            min={0}
            value={form.startingPrice ?? ""}
            onChange={(e) => set("startingPrice", numOrNull(e.target.value))}
            placeholder="150000"
          />
          <Input
            label="Currency"
            value={form.currency ?? ""}
            onChange={(e) => set("currency", e.target.value.toUpperCase().slice(0, 3))}
            maxLength={3}
            placeholder="INR"
          />
          <Select
            label="Pricing Unit"
            value={form.pricingUnit ?? "per_event"}
            onChange={(e) => set("pricingUnit", e.target.value)}
            options={PRICING_UNITS}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input
            label="Tax %"
            type="number"
            min={0}
            step="0.01"
            value={form.taxesPct ?? ""}
            onChange={(e) => set("taxesPct", numOrUndefined(e.target.value) ?? 0)}
            placeholder="18"
          />
          <Input
            label="Security Deposit"
            type="number"
            min={0}
            value={form.securityDeposit ?? ""}
            onChange={(e) => set("securityDeposit", numOrNull(e.target.value))}
            placeholder="50000"
          />
          <Input
            label="Min Booking (hours)"
            type="number"
            min={0}
            value={form.minBookingHours ?? ""}
            onChange={(e) => set("minBookingHours", numOrNull(e.target.value))}
            placeholder="6"
          />
          <Input
            label="Lead Time (days)"
            type="number"
            min={0}
            value={form.bookingLeadDays ?? ""}
            onChange={(e) => set("bookingLeadDays", numOrUndefined(e.target.value) ?? 0)}
            placeholder="7"
          />
        </div>
        <Input
          label="Price Hint (public)"
          value={form.priceHint ?? ""}
          onChange={(e) => set("priceHint", e.target.value)}
          placeholder="e.g. ₹2L–₹5L per event"
        />
        <Textarea
          label="Cancellation Policy"
          value={form.cancellationPolicy ?? ""}
          onChange={(e) => set("cancellationPolicy", e.target.value)}
          rows={3}
          placeholder="Explain the cancellation terms shown to customers…"
        />
        <Textarea
          label="Venue Rules"
          value={form.rules ?? ""}
          onChange={(e) => set("rules", e.target.value)}
          rows={3}
          placeholder="Noise limits, closing time, outside vendors…"
        />
      </Section>

      {/* ── Media ── */}
      <Section title="Media" description="Images are converted to WebP and resized automatically.">
        <ImageUpload
          label="Cover Image *"
          value={form.image}
          kind="image"
          folder="venues"
          onUploaded={handleCoverUploaded}
          onClear={() => set("image", "")}
          helperText="JPEG, PNG, WebP, AVIF or GIF — up to 15 MB"
        />
        {errors.image && <p className="text-[12px] text-[#b91c1c]">{errors.image}</p>}
        <Input
          label="Image Alt Text"
          value={form.imageAlt ?? ""}
          onChange={(e) => set("imageAlt", e.target.value)}
          placeholder="Describe the image for accessibility"
        />

        <div className="pt-2">
          <p className="text-[13px] font-medium text-[#3f3f46] mb-1.5">Gallery</p>
          {(form.gallery ?? []).length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {(form.gallery ?? []).map((url) => (
                <div key={url} className="relative group rounded-lg overflow-hidden border border-[#e8e8ed] bg-[#f4f4f5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(url)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image from gallery"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <ImageUpload
            label=""
            value=""
            kind="image"
            folder="venues/gallery"
            onUploaded={handleGalleryUploaded}
            helperText="Add another image to the gallery"
          />
        </div>
      </Section>

      {/* ── Description ── */}
      <Section title="Description">
        <Textarea
          label="Short Description"
          value={form.shortDescription ?? ""}
          onChange={(e) => set("shortDescription", e.target.value)}
          error={errors.shortDescription}
          required
          rows={4}
          helperText="Shown on cards and search results"
          placeholder="Write a compelling summary for this venue…"
        />
        {showFullDescription ? (
          <Textarea
            label="Full Description"
            value={form.fullDescription ?? ""}
            onChange={(e) => set("fullDescription", e.target.value)}
            rows={10}
            placeholder="The complete venue story, spaces, history…"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowFullDescription(true)}
            className="text-[12px] font-medium text-[#9b1239] hover:underline"
          >
            + Add a full description
          </button>
        )}
      </Section>

      {/* ── Event types ── */}
      <Section title="Event Types">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EVENT_TYPES.map((et) => {
            const checked = (form.eventTypes ?? []).includes(et);
            return (
              <label
                key={et}
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors",
                  checked
                    ? "border-[#7f0f2e] bg-red-50 text-[#7f0f2e] font-medium"
                    : "border-[#e8e8ed] text-[#1d1d1f] hover:border-[#7f0f2e]",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  className="accent-[#7f0f2e]"
                  checked={checked}
                  onChange={() => toggleEventType(et)}
                />
                {et}
              </label>
            );
          })}
        </div>
      </Section>

      {/* ── Amenities & features ── */}
      <Section title="Amenities & Features">
        <div>
          <label className="block text-[13px] font-medium text-[#3f3f46] mb-1.5">Amenities</label>
          <div className="flex gap-2">
            <input
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("amenities", amenityInput);
                }
              }}
              placeholder="Type an amenity and press Enter"
              className="flex-1 h-9 px-3 rounded-lg border border-[#e8e8ed] text-sm focus:outline-none focus:ring-2 focus:ring-[#7f0f2e] focus:border-transparent"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => addTag("amenities", amenityInput)}>
              Add
            </Button>
          </div>
          {(form.amenities ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.amenities ?? []).map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-sm text-[#1d1d1f]">
                  {a}
                  <button type="button" onClick={() => removeTag("amenities", a)} className="text-[#6e6e73] hover:text-[#dc2626]">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#3f3f46] mb-1.5">Features</label>
          <div className="flex gap-2">
            <input
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("features", featureInput);
                }
              }}
              placeholder="e.g. Sea view, valet parking"
              className="flex-1 h-9 px-3 rounded-lg border border-[#e8e8ed] text-sm focus:outline-none focus:ring-2 focus:ring-[#7f0f2e] focus:border-transparent"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => addTag("features", featureInput)}>
              Add
            </Button>
          </div>
          {(form.features ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.features ?? []).map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-sm text-[#1d1d1f]">
                  {f}
                  <button type="button" onClick={() => removeTag("features", f)} className="text-[#6e6e73] hover:text-[#dc2626]">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── SEO ── */}
      <Section title="SEO & Social" description="Optional — sensible defaults are generated from the venue name.">
        <Input
          label="SEO Title"
          value={form.seoTitle ?? ""}
          onChange={(e) => set("seoTitle", e.target.value)}
          helperText="Recommended: 50–60 characters"
        />
        <Textarea
          label="SEO Description"
          value={form.seoDescription ?? ""}
          onChange={(e) => set("seoDescription", e.target.value)}
          rows={3}
          helperText="Recommended: 150–160 characters"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Canonical URL"
            value={form.canonicalUrl ?? ""}
            onChange={(e) => set("canonicalUrl", e.target.value)}
            placeholder="https://venueonmyplate.com/venues/…"
          />
          <Input
            label="Robots"
            value={form.robots ?? ""}
            onChange={(e) => set("robots", e.target.value)}
            placeholder="index,follow"
          />
        </div>
        <Input
          label="Open Graph Image URL"
          value={form.ogImage ?? ""}
          onChange={(e) => set("ogImage", e.target.value)}
          placeholder="Falls back to the cover image"
        />
      </Section>

      {/* ── Publishing ── */}
      <Section title="Publishing & Internal">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Status"
            value={form.status ?? "draft"}
            onChange={(e) => set("status", e.target.value as VenueStatus)}
            options={STATUSES}
          />
          <Select
            label="Verification"
            value={form.verificationStatus ?? "unverified"}
            onChange={(e) => set("verificationStatus", e.target.value)}
            options={VERIFICATION}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Rank"
            type="number"
            min={0}
            value={form.rank ?? ""}
            onChange={(e) => set("rank", numOrUndefined(e.target.value) ?? 0)}
            helperText="Higher ranks appear first in featured lists"
          />
          <div className="flex items-end">
            <Toggle label="Featured venue" checked={Boolean(form.featured)} onChange={(v) => set("featured", v)} />
          </div>
        </div>
        <Textarea
          label="Internal Notes"
          value={form.internalNotes ?? ""}
          onChange={(e) => set("internalNotes", e.target.value)}
          rows={3}
          helperText="Never shown on the public website"
        />
        {isEdit && (
          <p className="text-[11px] text-[#a1a1aa]">
            Created {venue?.createdAt ? new Date(venue.createdAt).toLocaleString() : "—"}
            {venue?.updatedAt ? ` · Last updated ${new Date(venue.updatedAt).toLocaleString()}` : ""}
          </p>
        )}
      </Section>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pb-6">
        <Button type="submit" loading={saving} size="lg">
          {isEdit ? "Update Venue" : "Create Venue"}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/venues")}>
          Cancel
        </Button>
        {form.featured && (
          <span className="inline-flex items-center gap-1 text-[12px] text-[#b45309]">
            <Star size={13} className="fill-[#f59e0b] text-[#f59e0b]" /> Featured
          </span>
        )}
        {saving && (
          <span className="flex items-center gap-1.5 text-[12px] text-[#71717a]">
            <Loader2 size={13} className="animate-spin" /> Saving…
          </span>
        )}
      </div>
    </form>
  );
}

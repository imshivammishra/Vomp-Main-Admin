"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  LayoutTemplate, Plus, Pencil, Trash2, Eye, EyeOff, HelpCircle, Megaphone,
  Save, Navigation as NavIcon,
} from "lucide-react";
import {
  contentApi, type HomepageSection, type NavigationItem, type FaqItem,
  type AnnouncementItem,
} from "@/lib/api";
import type { AdminUser } from "@/types";
import { fetchCurrentUser } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

type Tab = "homepage" | "navigation" | "faqs" | "announcements";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "homepage", label: "Homepage", icon: <LayoutTemplate size={13} /> },
  { id: "navigation", label: "Navigation", icon: <NavIcon size={13} /> },
  { id: "faqs", label: "FAQs", icon: <HelpCircle size={13} /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone size={13} /> },
];

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function ContentPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("homepage");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);

  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [nav, setNav] = useState<NavigationItem[]>([]);
  const [navLocation, setNavLocation] = useState<"header" | "footer">("header");
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  const canEdit = user?.permissions?.includes("content.edit") ?? false;

  // Homepage section editing
  const [sectionEdit, setSectionEdit] = useState<HomepageSection | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionSubtitle, setSectionSubtitle] = useState("");
  const [sectionBackground, setSectionBackground] = useState("");
  const [sectionSort, setSectionSort] = useState("0");
  const [sectionVisible, setSectionVisible] = useState(true);
  const [sectionJson, setSectionJson] = useState("{}");
  const [sectionSaving, setSectionSaving] = useState(false);

  // Navigation editing
  const [navModal, setNavModal] = useState<"create" | "edit" | null>(null);
  const [navEditId, setNavEditId] = useState<string | null>(null);
  const [navLabel, setNavLabel] = useState("");
  const [navUrl, setNavUrl] = useState("");
  const [navSort, setNavSort] = useState("0");
  const [navVisible, setNavVisible] = useState(true);
  const [navSaving, setNavSaving] = useState(false);

  // FAQ editing
  const [faqModal, setFaqModal] = useState<"create" | "edit" | null>(null);
  const [faqEditId, setFaqEditId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqSort, setFaqSort] = useState("0");
  const [faqVisible, setFaqVisible] = useState(true);
  const [faqSaving, setFaqSaving] = useState(false);

  // Announcement editing
  const [annModal, setAnnModal] = useState<"create" | "edit" | null>(null);
  const [annEditId, setAnnEditId] = useState<string | null>(null);
  const [annMessage, setAnnMessage] = useState("");
  const [annLinkUrl, setAnnLinkUrl] = useState("");
  const [annLinkLabel, setAnnLinkLabel] = useState("");
  const [annStarts, setAnnStarts] = useState("");
  const [annEnds, setAnnEnds] = useState("");
  const [annVisible, setAnnVisible] = useState(true);
  const [annSaving, setAnnSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [home, navRes, faqRes, annRes] = await Promise.all([
        contentApi.homepage(),
        contentApi.navigation(navLocation),
        contentApi.faqs(),
        contentApi.announcements(),
      ]);
      setSections(home.data ?? []);
      setNav(navRes.data ?? []);
      setFaqs(faqRes.data ?? []);
      setAnnouncements(annRes.data ?? []);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load content", "error");
    } finally {
      setLoading(false);
    }
  }, [navLocation, toast]);

  useEffect(() => { void fetchCurrentUser().then(setUser); }, []);
  useEffect(() => { void load(); }, [load]);

  // ── Homepage ───────────────────────────────────────────────────────────────
  const openSection = (section: HomepageSection) => {
    setSectionEdit(section);
    setSectionTitle(section.title);
    setSectionSubtitle(section.subtitle);
    setSectionBackground(section.background);
    setSectionSort(String(section.sortOrder));
    setSectionVisible(section.visible);
    setSectionJson(JSON.stringify(section.content ?? {}, null, 2));
  };

  const saveSection = async () => {
    if (!sectionEdit) return;
    let content: Record<string, unknown>;
    try {
      content = JSON.parse(sectionJson || "{}");
      if (!content || Array.isArray(content) || typeof content !== "object") {
        throw new Error("Content must be a JSON object");
      }
    } catch (err) {
      toast.show(err instanceof Error ? `Invalid JSON: ${err.message}` : "Invalid JSON", "error");
      return;
    }
    setSectionSaving(true);
    try {
      const updated = await contentApi.updateSection(sectionEdit.key, {
        title: sectionTitle,
        subtitle: sectionSubtitle,
        background: sectionBackground,
        sortOrder: Number(sectionSort) || 0,
        visible: sectionVisible,
        content,
      });
      setSections((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
      setSectionEdit(null);
      toast.show("Homepage section updated", "success");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not save the section", "error");
    } finally {
      setSectionSaving(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const openNavCreate = () => {
    setNavModal("create");
    setNavEditId(null);
    setNavLabel("");
    setNavUrl("/");
    setNavSort(String((nav.at(-1)?.sortOrder ?? 0) + 1));
    setNavVisible(true);
  };

  const openNavEdit = (item: NavigationItem) => {
    setNavModal("edit");
    setNavEditId(item.id);
    setNavLabel(item.label);
    setNavUrl(item.url);
    setNavSort(String(item.sortOrder));
    setNavVisible(item.visible);
  };

  const saveNav = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navLabel.trim() || !navUrl.trim()) {
      toast.show("Label and URL are required", "error");
      return;
    }
    setNavSaving(true);
    try {
      const payload = {
        label: navLabel.trim(),
        url: navUrl.trim(),
        sortOrder: Number(navSort) || 0,
        visible: navVisible,
      };
      if (navModal === "create") {
        await contentApi.createNav({ ...payload, location: navLocation });
      } else if (navEditId) {
        await contentApi.updateNav(navEditId, payload);
      }
      toast.show("Navigation saved", "success");
      setNavModal(null);
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not save navigation", "error");
    } finally {
      setNavSaving(false);
    }
  };

  const deleteNav = async (item: NavigationItem) => {
    if (!window.confirm(`Delete the navigation item “${item.label}”?`)) return;
    try {
      await contentApi.deleteNav(item.id);
      toast.show("Navigation item deleted", "success");
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    }
  };

  // ── FAQs ───────────────────────────────────────────────────────────────────
  const openFaqCreate = () => {
    setFaqModal("create");
    setFaqEditId(null);
    setFaqQuestion("");
    setFaqAnswer("");
    setFaqSort(String((faqs.at(-1)?.sortOrder ?? 0) + 1));
    setFaqVisible(true);
  };

  const openFaqEdit = (faq: FaqItem) => {
    setFaqModal("edit");
    setFaqEditId(faq.id);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqSort(String(faq.sortOrder));
    setFaqVisible(faq.visible);
  };

  const saveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.show("Question and answer are required", "error");
      return;
    }
    setFaqSaving(true);
    try {
      const payload = {
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        sortOrder: Number(faqSort) || 0,
        visible: faqVisible,
      };
      if (faqModal === "create") await contentApi.createFaq(payload);
      else if (faqEditId) await contentApi.updateFaq(faqEditId, payload);
      toast.show("FAQ saved", "success");
      setFaqModal(null);
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not save the FAQ", "error");
    } finally {
      setFaqSaving(false);
    }
  };

  const deleteFaq = async (faq: FaqItem) => {
    if (!window.confirm("Delete this FAQ?")) return;
    try {
      await contentApi.deleteFaq(faq.id);
      toast.show("FAQ deleted", "success");
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    }
  };

  // ── Announcements ──────────────────────────────────────────────────────────
  const openAnnCreate = () => {
    setAnnModal("create");
    setAnnEditId(null);
    setAnnMessage("");
    setAnnLinkUrl("");
    setAnnLinkLabel("");
    setAnnStarts("");
    setAnnEnds("");
    setAnnVisible(true);
  };

  const openAnnEdit = (item: AnnouncementItem) => {
    setAnnModal("edit");
    setAnnEditId(item.id);
    setAnnMessage(item.message);
    setAnnLinkUrl(item.linkUrl);
    setAnnLinkLabel(item.linkLabel);
    setAnnStarts(toLocalInput(item.startsAt));
    setAnnEnds(toLocalInput(item.endsAt));
    setAnnVisible(item.visible);
  };

  const saveAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annMessage.trim()) {
      toast.show("Message is required", "error");
      return;
    }
    setAnnSaving(true);
    try {
      const payload = {
        message: annMessage.trim(),
        linkUrl: annLinkUrl.trim(),
        linkLabel: annLinkLabel.trim(),
        startsAt: fromLocalInput(annStarts),
        endsAt: fromLocalInput(annEnds),
        visible: annVisible,
      };
      if (annModal === "create") await contentApi.createAnnouncement(payload);
      else if (annEditId) await contentApi.updateAnnouncement(annEditId, payload);
      toast.show("Announcement saved", "success");
      setAnnModal(null);
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not save the announcement", "error");
    } finally {
      setAnnSaving(false);
    }
  };

  const deleteAnn = async (item: AnnouncementItem) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await contentApi.deleteAnnouncement(item.id);
      toast.show("Announcement deleted", "success");
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold text-[#09090b] tracking-tight">Website Content</h1>
        <p className="text-[12px] text-[#71717a] mt-0.5">
          Changes are published to the main site through the revalidation endpoint.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all",
              tab === t.id ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]",
            ].join(" ")}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={30} /></div>
      ) : tab === "homepage" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sections.map((section) => (
            <div key={section.key} className="bg-white rounded-xl border border-[#e8e8ed] p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#09090b] truncate">{section.title || section.key}</p>
                    <Badge variant={section.visible ? "green" : "gray"} dot>
                      {section.visible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-[#a1a1aa]">
                    {section.key} · {section.type} · order {section.sortOrder}
                  </p>
                  {section.subtitle && <p className="mt-1 text-[12px] text-[#71717a] line-clamp-2">{section.subtitle}</p>}
                </div>
                {canEdit && (
                  <button
                    onClick={() => openSection(section)}
                    className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-gray-100 hover:text-[#1d1d1f]"
                    title="Edit section"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <p className="text-[13px] text-[#71717a]">No homepage sections are configured.</p>
          )}
        </div>
      ) : tab === "navigation" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(["header", "footer"] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setNavLocation(loc)}
                  className={[
                    "px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all",
                    navLocation === loc ? "bg-[#9b1239] text-white" : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]",
                  ].join(" ")}
                >
                  {loc} menu
                </button>
              ))}
            </div>
            {canEdit && (
              <Button size="sm" icon={<Plus size={13} />} onClick={openNavCreate} className="ml-auto">
                Add item
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-gray-50">
                  {["Label", "URL", "Order", "Visible", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {nav.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[#6e6e73]">No navigation items</td></tr>
                ) : nav.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#1d1d1f]">{item.label}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#71717a]">{item.url}</td>
                    <td className="px-4 py-3 text-[#71717a]">{item.sortOrder}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.visible ? "green" : "gray"} dot>{item.visible ? "Yes" : "No"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={() => openNavEdit(item)} className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-gray-100 hover:text-[#1d1d1f]" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteNav(item)} className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-red-50 hover:text-[#dc2626]" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "faqs" ? (
        <div className="space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus size={13} />} onClick={openFaqCreate}>Add FAQ</Button>
            </div>
          )}
          <div className="space-y-2">
            {faqs.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e8e8ed] py-12 text-center text-[#6e6e73]">No FAQs yet</div>
            ) : faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-xl border border-[#e8e8ed] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#09090b]">{faq.question}</p>
                      {!faq.visible && <Badge variant="gray">Hidden</Badge>}
                      <span className="ml-auto text-[10px] text-[#a1a1aa]">#{faq.sortOrder}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#71717a] whitespace-pre-wrap">{faq.answer}</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openFaqEdit(faq)} className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-gray-100 hover:text-[#1d1d1f]" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteFaq(faq)} className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-red-50 hover:text-[#dc2626]" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus size={13} />} onClick={openAnnCreate}>Add announcement</Button>
            </div>
          )}
          <div className="space-y-2">
            {announcements.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e8e8ed] py-12 text-center text-[#6e6e73]">No announcements yet</div>
            ) : announcements.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-[#e8e8ed] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium text-[#09090b]">{item.message}</p>
                      <Badge variant={item.visible ? "green" : "gray"} dot>{item.visible ? "Live" : "Hidden"}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-[#a1a1aa]">
                      {item.startsAt ? `From ${new Date(item.startsAt).toLocaleString()}` : "No start"}
                      {" · "}
                      {item.endsAt ? `Until ${new Date(item.endsAt).toLocaleString()}` : "No end"}
                      {item.linkUrl ? ` · ${item.linkLabel || item.linkUrl}` : ""}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openAnnEdit(item)} className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-gray-100 hover:text-[#1d1d1f]" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteAnn(item)} className="p-1.5 rounded-lg text-[#6e6e73] hover:bg-red-50 hover:text-[#dc2626]" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Homepage section modal */}
      <Modal open={Boolean(sectionEdit)} onClose={() => setSectionEdit(null)} title={`Edit “${sectionEdit?.key ?? ""}”`} maxWidth="max-w-2xl">
        <div className="space-y-3">
          <Input label="Title" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
          <Textarea label="Subtitle" value={sectionSubtitle} onChange={(e) => setSectionSubtitle(e.target.value)} rows={2} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Sort order" type="number" value={sectionSort} onChange={(e) => setSectionSort(e.target.value)} />
            <Input label="Background" value={sectionBackground} onChange={(e) => setSectionBackground(e.target.value)} />
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-[13px] text-[#3f3f46]">
                <input type="checkbox" checked={sectionVisible} onChange={(e) => setSectionVisible(e.target.checked)} className="accent-[#9b1239]" />
                Visible on the website
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#3f3f46]">Content (JSON)</label>
            <textarea
              value={sectionJson}
              onChange={(e) => setSectionJson(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full rounded-lg border border-[#e4e4e7] bg-[#09090b] p-3 font-mono text-[12px] leading-relaxed text-[#d4d4d8] focus:outline-none focus:ring-2 focus:ring-[#9b1239]"
            />
            <p className="mt-1 text-[11px] text-[#a1a1aa]">
              Structured block data (body, image, imageAlt, linkLabel, linkHref, icon and any extra fields).
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSectionEdit(null)}>Cancel</Button>
            <Button onClick={saveSection} loading={sectionSaving} icon={<Save size={14} />}>Save section</Button>
          </div>
        </div>
      </Modal>

      {/* Navigation modal */}
      <Modal open={navModal !== null} onClose={() => setNavModal(null)} title={navModal === "edit" ? "Edit navigation item" : "Add navigation item"}>
        <form onSubmit={saveNav} className="space-y-3">
          <Input label="Label *" value={navLabel} onChange={(e) => setNavLabel(e.target.value)} required />
          <Input label="URL *" value={navUrl} onChange={(e) => setNavUrl(e.target.value)} placeholder="/venues" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sort order" type="number" value={navSort} onChange={(e) => setNavSort(e.target.value)} />
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-[13px] text-[#3f3f46]">
                <input type="checkbox" checked={navVisible} onChange={(e) => setNavVisible(e.target.checked)} className="accent-[#9b1239]" />
                Visible
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setNavModal(null)}>Cancel</Button>
            <Button type="submit" loading={navSaving}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* FAQ modal */}
      <Modal open={faqModal !== null} onClose={() => setFaqModal(null)} title={faqModal === "edit" ? "Edit FAQ" : "Add FAQ"} maxWidth="max-w-lg">
        <form onSubmit={saveFaq} className="space-y-3">
          <Input label="Question *" value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} required />
          <Textarea label="Answer *" value={faqAnswer} onChange={(e) => setFaqAnswer(e.target.value)} rows={5} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sort order" type="number" value={faqSort} onChange={(e) => setFaqSort(e.target.value)} />
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-[13px] text-[#3f3f46]">
                <input type="checkbox" checked={faqVisible} onChange={(e) => setFaqVisible(e.target.checked)} className="accent-[#9b1239]" />
                Visible
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFaqModal(null)}>Cancel</Button>
            <Button type="submit" loading={faqSaving}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Announcement modal */}
      <Modal open={annModal !== null} onClose={() => setAnnModal(null)} title={annModal === "edit" ? "Edit announcement" : "Add announcement"} maxWidth="max-w-lg">
        <form onSubmit={saveAnn} className="space-y-3">
          <Textarea label="Message *" value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} rows={3} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Link URL" value={annLinkUrl} onChange={(e) => setAnnLinkUrl(e.target.value)} placeholder="/blog/…" />
            <Input label="Link label" value={annLinkLabel} onChange={(e) => setAnnLinkLabel(e.target.value)} placeholder="Read more" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Starts" type="datetime-local" value={annStarts} onChange={(e) => setAnnStarts(e.target.value)} />
            <Input label="Ends" type="datetime-local" value={annEnds} onChange={(e) => setAnnEnds(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#3f3f46]">
            <input type="checkbox" checked={annVisible} onChange={(e) => setAnnVisible(e.target.checked)} className="accent-[#9b1239]" />
            Visible (subject to the start and end dates)
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAnnModal(null)}>Cancel</Button>
            <Button type="submit" loading={annSaving}>Save</Button>
          </div>
        </form>
      </Modal>

      <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
        {canEdit ? <Eye size={12} /> : <EyeOff size={12} />}
        {canEdit ? "You can edit website content." : "Read-only — you do not have content.edit permission."}
      </div>
    </div>
  );
}

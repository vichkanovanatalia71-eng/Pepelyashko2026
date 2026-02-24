import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import {
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileDown,
  Percent,
  RefreshCw,
  X,
  ImagePlus,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import type { MaterialItem, NhsuSettings, Service, SortDirection, SortField } from "../types";
import { LoadingSpinner, ConfirmDialog } from "../components/shared";

const fmt = (v: number) =>
  v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });


function emptyMaterial(): MaterialItem {
  return { name: "", unit: "", quantity: "", cost: "" };
}

// ── Фінансовий розрахунок на frontend ────────────────────────────────
function calcFinancials(
  price: number,
  materials: MaterialItem[],
  ep_rate: number,
  vz_rate: number
) {
  const total_materials_cost = materials.reduce((s, m) => s + (parseFloat(String(m.cost)) || 0), 0);
  const ep_amount = price * ep_rate / 100;
  const vz_amount = price * vz_rate / 100;
  const total_costs = total_materials_cost + ep_amount + vz_amount;
  const net_income = price - total_costs;
  return {
    total_materials_cost,
    ep_amount,
    vz_amount,
    total_costs,
    net_income,
    doctor_income: net_income / 2,
    org_income: net_income / 2,
  };
}

export default function ServicesPage() {
  // ── Дані ──
  const [services, setServices] = useState<Service[]>([]);
  const [nhsuSettings, setNhsuSettings] = useState<NhsuSettings | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Пошук та фільтри ──
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCode, setFilterCode] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");

  // ── Сортування ──
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // ── Масовий вибір ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Форма послуги ──
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formMaterials, setFormMaterials] = useState<MaterialItem[]>([]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // ── Діалоги підтвердження ──
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // ── Масова зміна вартості ──
  const [showBulkPriceChange, setShowBulkPriceChange] = useState(false);
  const [bulkPricePercent, setBulkPricePercent] = useState("");
  const [bulkPriceLoading, setBulkPriceLoading] = useState(false);

  // ── AI-імпорт з зображення ──
  interface ParsedService {
    code: string;
    name: string;
    price: number;
    materials: MaterialItem[];
    _selected: boolean;
  }
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview">("upload");
  const [importLoading, setImportLoading] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState("");
  const [importNotes, setImportNotes] = useState("");
  const [importProvider, setImportProvider] = useState("");
  const [parsedServices, setParsedServices] = useState<ParsedService[]>([]);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── Завантаження ──
  useEffect(() => {
    loadServices();
    loadNhsuSettings();
  }, []);

  async function loadServices() {
    setLoading(true);
    try {
      const res = await api.get("/services/");
      setServices(res.data);
    } catch {}
    setLoading(false);
  }

  async function loadNhsuSettings() {
    try {
      const res = await api.get("/nhsu/settings");
      setNhsuSettings(res.data);
    } catch {}
  }

  // ── Фільтр + сортування (client-side) ──
  const displayedServices = useMemo(() => {
    let result = [...services];

    // Глобальний пошук (код, назва, матеріали)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.materials.some((m) => m.name.toLowerCase().includes(q))
      );
    }
    // Фільтри
    if (filterCode.trim())
      result = result.filter((s) =>
        s.code.toLowerCase().includes(filterCode.toLowerCase())
      );
    if (filterName.trim())
      result = result.filter((s) =>
        s.name.toLowerCase().includes(filterName.toLowerCase())
      );
    if (filterMinPrice !== "")
      result = result.filter((s) => s.price >= parseFloat(filterMinPrice));
    if (filterMaxPrice !== "")
      result = result.filter((s) => s.price <= parseFloat(filterMaxPrice));

    // Сортування (numeric: true — щоб "2" < "10" < "100")
    result.sort((a, b) => {
      const av = a[sortField as keyof Service] as number | string;
      const bv = b[sortField as keyof Service] as number | string;
      const cmp =
        typeof av === "string"
          ? av.localeCompare(bv as string, undefined, { numeric: true, sensitivity: "base" })
          : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    services,
    searchQuery,
    filterCode,
    filterName,
    filterMinPrice,
    filterMaxPrice,
    sortField,
    sortDir,
  ]);

  // ── Вибір рядків ──
  const allFilteredSelected =
    displayedServices.length > 0 &&
    displayedServices.every((s) => selectedIds.has(s.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedServices.map((s) => s.id)));
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Сортування по колонці ──
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="ml-1 text-accent-400" />
    ) : (
      <ArrowDown size={12} className="ml-1 text-accent-400" />
    );
  }

  // ── CRUD ──
  function openCreate() {
    setEditingService(null);
    setFormCode("");
    setFormName("");
    setFormPrice("");
    setFormMaterials([]);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(svc: Service) {
    setEditingService(svc);
    setFormCode(svc.code);
    setFormName(svc.name);
    setFormPrice(String(svc.price));
    setFormMaterials(svc.materials.map((m) => ({ ...m })));
    setFormError("");
    setShowForm(true);
  }

  async function handleFormSubmit() {
    if (!formCode.trim()) { setFormError("Введіть код послуги"); return; }
    if (!formName.trim()) { setFormError("Введіть назву послуги"); return; }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) { setFormError("Невірна ціна"); return; }

    setFormLoading(true);
    setFormError("");
    try {
      const payload = {
        code: formCode.trim(),
        name: formName.trim(),
        price,
        materials: formMaterials.map(m => ({
          ...m,
          quantity: parseFloat(String(m.quantity)) || 0,
          cost: parseFloat(String(m.cost)) || 0,
        })),
      };
      if (editingService) {
        await api.put(`/services/${editingService.id}`, payload);
      } else {
        await api.post("/services/", payload);
      }
      setShowForm(false);
      await loadServices();
    } catch (e: any) {
      setFormError(e?.response?.data?.detail ?? "Помилка збереження");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/services/${id}`);
      setDeleteId(null);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      await loadServices();
    } catch {}
  }

  // ── Масові дії ──
  async function handleBulkDelete() {
    try {
      await api.post("/services/bulk-delete", { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      await loadServices();
    } catch {}
  }

  async function handleExport() {
    try {
      const res = await api.post("/services/export",
        { ids: Array.from(selectedIds) },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "services.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleBulkPriceChange() {
    const pct = parseFloat(bulkPricePercent);
    if (isNaN(pct)) return;
    setBulkPriceLoading(true);
    try {
      await api.post("/services/bulk-price-change",
        { ids: Array.from(selectedIds), percent: pct }
      );
      setShowBulkPriceChange(false);
      setBulkPricePercent("");
      setSelectedIds(new Set());
      await loadServices();
    } catch {}
    setBulkPriceLoading(false);
  }

  // ── AI-імпорт з зображення ──
  function openImportModal() {
    setShowImportModal(true);
    setImportStep("upload");
    setImportLoading(false);
    setImportSaving(false);
    setImportError("");
    setImportNotes("");
    setImportProvider("");
    setParsedServices([]);
    setImportResult(null);
  }

  function closeImportModal() {
    setShowImportModal(false);
    setParsedServices([]);
    setImportResult(null);
  }

  async function handleImportFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setImportLoading(true);
    setImportError("");
    setImportNotes("");
    setParsedServices([]);
    setImportResult(null);

    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("images", files[i]);
      }

      const res = await api.post("/services/analyze-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000, // 2 min for AI
      });

      const data = res.data;
      setImportProvider(data.provider || "");
      setImportNotes(data.notes || "");

      if (data.services && data.services.length > 0) {
        setParsedServices(
          data.services.map((s: any) => ({
            code: s.code || "",
            name: s.name || "",
            price: s.price || 0,
            materials: (s.materials || []).map((m: any) => ({
              name: m.name || "",
              unit: m.unit || "",
              quantity: m.quantity || 0,
              cost: m.cost || 0,
            })),
            _selected: true,
          }))
        );
        setImportStep("preview");
      } else {
        setImportError("AI не зміг розпізнати жодної послуги на зображенні. Спробуйте інше зображення з кращою якістю.");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Помилка аналізу зображення";
      setImportError(msg);
    } finally {
      setImportLoading(false);
    }
  }

  function handleImportDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleImportFiles(e.dataTransfer.files);
  }

  function toggleParsedService(idx: number) {
    setParsedServices((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, _selected: !s._selected } : s))
    );
  }

  function updateParsedService(idx: number, field: "code" | "name" | "price", value: string | number) {
    setParsedServices((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

  function removeParsedService(idx: number) {
    setParsedServices((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleAllParsed() {
    const allSelected = parsedServices.every((s) => s._selected);
    setParsedServices((prev) => prev.map((s) => ({ ...s, _selected: !allSelected })));
  }

  async function handleImportConfirm() {
    const selected = parsedServices.filter((s) => s._selected);
    if (selected.length === 0) return;

    setImportSaving(true);
    setImportError("");

    try {
      const payload = selected.map((s) => ({
        code: s.code,
        name: s.name,
        price: s.price,
        materials: s.materials,
      }));

      const res = await api.post("/services/bulk-create", payload);
      const created = res.data.length;
      const skipped = selected.length - created;
      setImportResult({ created, skipped });
      await loadServices();

      // Auto-close after success
      setTimeout(() => closeImportModal(), 2000);
    } catch (e: any) {
      setImportError(e?.response?.data?.detail || "Помилка збереження послуг");
    } finally {
      setImportSaving(false);
    }
  }

  // ── Фінансовий підсумок у формі ──
  const ep_rate = nhsuSettings?.ep_rate ?? 5;
  const vz_rate = nhsuSettings?.vz_rate ?? 1.5;
  const formPriceNum = parseFloat(formPrice) || 0;
  const formCalc = calcFinancials(formPriceNum, formMaterials, ep_rate, vz_rate);

  // ── Матеріали у формі ──
  function addMaterial() {
    setFormMaterials((prev) => [...prev, emptyMaterial()]);
  }

  function updateMaterial(idx: number, field: keyof MaterialItem, value: string | number) {
    setFormMaterials((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  }

  function removeMaterial(idx: number) {
    setFormMaterials((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── UI ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
            <ClipboardList size={22} className="text-accent-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Платні послуги</h1>
            <p className="text-sm text-gray-500">
              Управління послугами, витратами та доходами
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openImportModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-xl text-sm font-medium transition-all border border-violet-500/20"
          >
            <ImagePlus size={16} aria-hidden="true" />
            Імпорт з фото (AI)
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20"
          >
            <Plus size={16} aria-hidden="true" />
            Додати послугу
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card-neo p-4 space-y-3">
        <div className="flex gap-3">
          {/* Пошук */}
          <div className="flex-1 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Пошук за кодом, назвою або матеріалами..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-300 border border-dark-50/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              showFilters
                ? "bg-accent-500/10 text-accent-400 border-accent-500/20"
                : "text-gray-400 border-dark-50/20 hover:border-dark-50/30"
            }`}
          >
            <Filter size={15} aria-hidden="true" />
            Фільтри
          </button>
        </div>

        {/* Розширені фільтри */}
        {showFilters && (
          <div className="grid grid-cols-4 gap-3 pt-1 border-t border-dark-50/10">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Код</label>
              <input
                type="text"
                placeholder="Фільтр за кодом"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Назва</label>
              <input
                type="text"
                placeholder="Фільтр за назвою"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ціна від (грн)</label>
              <input
                type="number"
                placeholder="0"
                value={filterMinPrice}
                onChange={(e) => setFilterMinPrice(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ціна до (грн)</label>
              <input
                type="number"
                placeholder="∞"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Панель масових дій */}
      {selectedIds.size > 0 && (
        <div className="card-neo p-3 flex items-center gap-3 border-accent-500/20">
          <span className="text-sm text-accent-400 font-medium">
            Вибрано: {selectedIds.size}
          </span>
          <div className="h-4 w-px bg-dark-50/20" />
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-all"
          >
            <Trash2 size={14} aria-hidden="true" />
            Видалити
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-400 hover:bg-green-500/10 rounded-lg border border-green-500/20 transition-all"
          >
            <FileDown size={14} aria-hidden="true" />
            Експорт Excel
          </button>
          <button
            onClick={() => setShowBulkPriceChange(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent-400 hover:bg-accent-500/10 rounded-lg border border-accent-500/20 transition-all"
          >
            <Percent size={14} aria-hidden="true" />
            Змінити вартість
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            aria-label="Зняти виділення"
            className="ml-auto p-1.5 text-gray-500 hover:text-gray-300 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Таблиця послуг */}
      <div className="card-neo overflow-hidden">
        {loading ? (
          <LoadingSpinner height="h-40" label="Завантаження..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="border-b border-dark-50/10 bg-dark-300/50">
                  <th scope="col" className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="accent-accent-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  {(
                    [
                      ["code", "Код"],
                      ["name", "Назва"],
                      ["price", "Ціна (грн)"],
                      ["total_materials_cost", "Витрати (грн)"],
                      ["ep_amount", "ЄП (грн)"],
                      ["vz_amount", "ВЗ (грн)"],
                      ["total_costs", "Заг. витрати (грн)"],
                      ["doctor_income", "Дохід лікаря (грн)"],
                      ["org_income", "Дохід орг. (грн)"],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <th
                      key={label}
                      scope="col"
                      className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap cursor-pointer hover:text-gray-200 transition-colors"
                      onClick={() => handleSort(field)}
                    >
                      <span className="inline-flex items-center">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {displayedServices.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="text-center py-12 text-gray-600 text-sm"
                    >
                      {services.length === 0
                        ? "Послуг ще немає. Натисніть «Додати послугу»."
                        : "Нічого не знайдено за вказаними критеріями."}
                    </td>
                  </tr>
                )}
                {displayedServices.map((svc) => (
                  <tr
                    key={svc.id}
                    className={`card-tap border-b border-dark-50/5 transition-colors ${
                      selectedIds.has(svc.id)
                        ? "bg-accent-500/5"
                        : "hover:bg-dark-300/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(svc.id)}
                        onChange={() => toggleSelect(svc.id)}
                        className="accent-accent-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-accent-400 whitespace-nowrap">
                      {svc.code}
                    </td>
                    <td className="px-4 py-3 text-gray-200">{svc.name}</td>
                    <td className="px-4 py-3 text-gray-200 text-right tabular-nums">
                      {fmt(svc.price)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-right tabular-nums">
                      {fmt(svc.total_materials_cost)}
                    </td>
                    <td className="px-4 py-3 text-orange-400/80 text-right tabular-nums">
                      {fmt(svc.ep_amount)}
                    </td>
                    <td className="px-4 py-3 text-orange-400/80 text-right tabular-nums">
                      {fmt(svc.vz_amount)}
                    </td>
                    <td className="px-4 py-3 text-red-400/80 text-right tabular-nums">
                      {fmt(svc.total_costs)}
                    </td>
                    <td className="px-4 py-3 text-green-400 text-right tabular-nums font-medium">
                      {fmt(svc.doctor_income)}
                    </td>
                    <td className="px-4 py-3 text-green-400 text-right tabular-nums font-medium">
                      {fmt(svc.org_income)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(svc)}
                          className="p-1.5 text-gray-500 hover:text-accent-400 hover:bg-accent-500/10 rounded-lg transition-all"
                          title="Редагувати"
                          aria-label="Редагувати"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(svc.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Видалити"
                          aria-label="Видалити"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Модальне вікно форми послуги ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-dark-600 rounded-none sm:rounded-2xl w-full max-w-3xl min-h-full sm:min-h-0 sm:my-8 animate-modal-in pb-20 sm:pb-0 modal-glow">
            <div className="flex items-center justify-between p-6 border-b border-dark-50/10">
              <h2 className="text-lg font-semibold text-white">
                {editingService ? "Редагування послуги" : "Нова послуга"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                aria-label="Закрити"
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-dark-300 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Основні поля */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Код послуги <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Наприклад: SRV-001"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">
                    Назва послуги <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Назва послуги"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Ціна для клієнта (грн) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                  />
                </div>
              </div>

              {/* Матеріали */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-300">Витрати (матеріали)</p>
                  <button
                    onClick={addMaterial}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-accent-400 hover:bg-accent-500/10 rounded-lg border border-accent-500/20 transition-all"
                  >
                    <Plus size={13} aria-hidden="true" />
                    Додати матеріал
                  </button>
                </div>

                {formMaterials.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-dark-50/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-dark-300/50 border-b border-dark-50/10">
                          <th scope="col" className="text-left px-3 py-2 text-gray-500 font-medium">Назва</th>
                          <th scope="col" className="text-left px-3 py-2 text-gray-500 font-medium w-24">Одиниця</th>
                          <th scope="col" className="text-left px-3 py-2 text-gray-500 font-medium w-24">Кількість</th>
                          <th scope="col" className="text-left px-3 py-2 text-gray-500 font-medium w-28">Вартість (грн)</th>
                          <th scope="col" className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {formMaterials.map((m, idx) => (
                          <tr key={idx} className="border-b border-dark-50/5">
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                placeholder="Назва матеріалу"
                                value={m.name}
                                onChange={(e) => updateMaterial(idx, "name", e.target.value)}
                                className="w-full bg-dark-300 border border-dark-50/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/40"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                placeholder="шт"
                                value={m.unit}
                                onChange={(e) => updateMaterial(idx, "unit", e.target.value)}
                                className="w-full bg-dark-300 border border-dark-50/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/40"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={m.quantity}
                                onChange={(e) =>
                                  updateMaterial(idx, "quantity", e.target.value === "" ? "" : (parseFloat(e.target.value) || 0))
                                }
                                placeholder="1"
                                className="w-full bg-dark-300 border border-dark-50/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/40"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={m.cost}
                                onChange={(e) =>
                                  updateMaterial(idx, "cost", e.target.value === "" ? "" : (parseFloat(e.target.value) || 0))
                                }
                                placeholder="0.00"
                                className="w-full bg-dark-300 border border-dark-50/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/40"
                              />
                            </td>
                            <td className="px-1 py-1.5">
                              <button
                                onClick={() => removeMaterial(idx)}
                                aria-label="Видалити матеріал"
                                className="p-1 text-gray-600 hover:text-red-400 rounded"
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {formMaterials.length === 0 && (
                  <p className="text-xs text-gray-600 py-2">
                    Натисніть «Додати матеріал» для введення витрат.
                  </p>
                )}
              </div>

              {/* Фінансовий підсумок */}
              <div className="card-neo-inset p-4 space-y-2">
                <p className="text-xs font-medium text-gray-400 mb-3">
                  Фінансовий розрахунок (ЄП: {ep_rate}%, ВЗ: {vz_rate}%)
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Матеріали:</span>
                    <span className="tabular-nums">{fmt(formCalc.total_materials_cost)} грн</span>
                  </div>
                  <div className="flex justify-between text-orange-400/80">
                    <span>Єдиний податок ({ep_rate}%):</span>
                    <span className="tabular-nums">{fmt(formCalc.ep_amount)} грн</span>
                  </div>
                  <div className="flex justify-between text-orange-400/80">
                    <span>Військовий збір ({vz_rate}%):</span>
                    <span className="tabular-nums">{fmt(formCalc.vz_amount)} грн</span>
                  </div>
                  <div className="flex justify-between text-red-400/80 font-medium">
                    <span>Сумарні витрати:</span>
                    <span className="tabular-nums">{fmt(formCalc.total_costs)} грн</span>
                  </div>
                  <div className="flex justify-between text-gray-300 font-medium">
                    <span>Чистий дохід:</span>
                    <span
                      className={`tabular-nums ${
                        formCalc.net_income >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {fmt(formCalc.net_income)} грн
                    </span>
                  </div>
                  <div className="flex justify-between text-green-400">
                    <span>Дохід лікаря:</span>
                    <span className="tabular-nums">{fmt(formCalc.doctor_income)} грн</span>
                  </div>
                  <div className="flex justify-between text-green-400">
                    <span>Дохід організації:</span>
                    <span className="tabular-nums">{fmt(formCalc.org_income)} грн</span>
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}

              {/* Кнопки форми */}
              <div className="flex items-center justify-end gap-3 pt-1 pb-20 sm:pb-0">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm text-gray-400 hover:text-gray-200 rounded-xl border border-dark-50/20 transition-all"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleFormSubmit}
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 rounded-xl text-sm font-medium transition-all border border-accent-500/20 disabled:opacity-50"
                >
                  {formLoading && <RefreshCw size={14} className="animate-spin" />}
                  {editingService ? "Зберегти зміни" : "Створити послугу"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Підтвердження видалення одного запису ── */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Видалити послугу?"
        description="Цю дію неможливо скасувати."
        variant="danger"
        confirmLabel="Видалити"
        cancelLabel="Скасувати"
        onConfirm={() => handleDelete(deleteId!)}
        onCancel={() => setDeleteId(null)}
      />

      {/* ── Підтвердження масового видалення ── */}
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title={`Видалити ${selectedIds.size} послуг(и)?`}
        description="Цю дію неможливо скасувати."
        variant="danger"
        confirmLabel="Видалити все"
        cancelLabel="Скасувати"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />

      {/* ── Масова зміна вартості ── */}
      {showBulkPriceChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) { setShowBulkPriceChange(false); setBulkPricePercent(""); } }}>
          <div className="bg-dark-600 rounded-2xl p-6 w-full max-w-sm animate-modal-in modal-glow">
            <h3 className="text-lg font-semibold text-white mb-2">
              Змінити вартість ({selectedIds.size} послуг)
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Введіть відсоток зміни. Позитивне значення — підвищення, від&rsquo;ємне — зниження.
            </p>
            <div className="relative mb-5">
              <input
                type="number"
                step="0.1"
                placeholder="Наприклад: 10 або -5"
                value={bulkPricePercent}
                onChange={(e) => setBulkPricePercent(e.target.value)}
                className="w-full bg-dark-300 border border-dark-50/20 rounded-xl px-4 py-2.5 pr-8 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
              />
              <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            {bulkPricePercent !== "" && !isNaN(parseFloat(bulkPricePercent)) && (
              <p className="text-xs text-gray-400 mb-4">
                Нова ціна = Поточна ціна × (1 + {bulkPricePercent}% / 100)
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowBulkPriceChange(false); setBulkPricePercent(""); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 rounded-xl border border-dark-50/20 transition-all"
              >
                Скасувати
              </button>
              <button
                onClick={handleBulkPriceChange}
                disabled={bulkPriceLoading || bulkPricePercent === ""}
                className="flex items-center gap-2 px-4 py-2 text-sm text-accent-400 hover:bg-accent-500/10 rounded-xl border border-accent-500/20 transition-all disabled:opacity-50"
              >
                {bulkPriceLoading && <RefreshCw size={13} className="animate-spin" />}
                Застосувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модальне вікно AI-імпорту з зображення ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) closeImportModal(); }}>
          <div className="bg-dark-600 rounded-none sm:rounded-2xl w-full max-w-4xl min-h-full sm:min-h-0 sm:my-8 animate-modal-in pb-20 sm:pb-0 modal-glow">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-50/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Імпорт послуг з зображення (AI)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Завантажте фото прайс-листа — AI розпізнає всі послуги автоматично
                  </p>
                </div>
              </div>
              <button
                onClick={closeImportModal}
                aria-label="Закрити"
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-dark-300 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Результат імпорту */}
              {importResult && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <Check size={18} className="text-green-400" />
                  <div className="text-sm">
                    <span className="text-green-400 font-medium">
                      Імпортовано: {importResult.created} послуг(и)
                    </span>
                    {importResult.skipped > 0 && (
                      <span className="text-gray-400 ml-2">
                        (пропущено {importResult.skipped} — дублікати за кодом)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Крок 1: Завантаження */}
              {importStep === "upload" && !importResult && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleImportDrop}
                    onClick={() => importFileRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      dragOver
                        ? "border-violet-400 bg-violet-500/10"
                        : "border-dark-50/20 hover:border-violet-500/30 hover:bg-dark-300/30"
                    }`}
                  >
                    {importLoading ? (
                      <>
                        <RefreshCw size={36} className="text-violet-400 animate-spin" />
                        <div className="text-center">
                          <p className="text-sm text-violet-400 font-medium">AI аналізує зображення...</p>
                          <p className="text-xs text-gray-500 mt-1">Це може зайняти до хвилини</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                          <Upload size={28} className="text-violet-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-300">
                            Перетягніть зображення сюди або{" "}
                            <span className="text-violet-400 font-medium">натисніть для вибору</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, WebP — до 10 MB. Можна кілька файлів.
                          </p>
                        </div>
                      </>
                    )}
                    <input
                      ref={importFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImportFiles(e.target.files)}
                    />
                  </div>

                  {importError && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-400">{importError}</p>
                    </div>
                  )}
                </>
              )}

              {/* Крок 2: Попередній перегляд */}
              {importStep === "preview" && !importResult && (
                <>
                  {/* Info bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-violet-400" />
                      <span className="text-sm text-gray-300">
                        Розпізнано <strong className="text-white">{parsedServices.length}</strong> послуг
                      </span>
                      {importProvider && (
                        <span className="text-xs text-gray-500 ml-2">
                          через {importProvider === "anthropic" ? "Claude" : importProvider === "openai" ? "ChatGPT" : "Grok"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAllParsed}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {parsedServices.every((s) => s._selected) ? "Зняти все" : "Вибрати все"}
                      </button>
                      <button
                        onClick={() => { setImportStep("upload"); setParsedServices([]); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 rounded-lg border border-dark-50/20 transition-all"
                      >
                        <ImagePlus size={13} aria-hidden="true" />
                        Інше фото
                      </button>
                    </div>
                  </div>

                  {importNotes && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <AlertCircle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-yellow-400">{importNotes}</p>
                    </div>
                  )}

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border border-dark-50/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-dark-300/50 border-b border-dark-50/10">
                          <th scope="col" className="px-3 py-2.5 w-10">
                            <input
                              type="checkbox"
                              checked={parsedServices.every((s) => s._selected)}
                              onChange={toggleAllParsed}
                              className="accent-violet-500 w-4 h-4 cursor-pointer"
                            />
                          </th>
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium w-20">Код</th>
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium">Назва</th>
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium w-28">Ціна (грн)</th>
                          <th scope="col" className="text-left px-3 py-2.5 text-gray-400 font-medium w-16">Матеріали</th>
                          <th scope="col" className="px-3 py-2.5 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {parsedServices.map((svc, idx) => (
                          <tr
                            key={idx}
                            className={`border-b border-dark-50/5 transition-colors ${
                              svc._selected ? "bg-violet-500/5" : "opacity-50"
                            }`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={svc._selected}
                                onChange={() => toggleParsedService(idx)}
                                className="accent-violet-500 w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={svc.code}
                                onChange={(e) => updateParsedService(idx, "code", e.target.value)}
                                className="w-full bg-dark-300 border border-dark-50/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/40"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={svc.name}
                                onChange={(e) => updateParsedService(idx, "name", e.target.value)}
                                className="w-full bg-dark-300 border border-dark-50/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/40"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={svc.price}
                                onChange={(e) => updateParsedService(idx, "price", parseFloat(e.target.value) || 0)}
                                className="w-full bg-dark-300 border border-dark-50/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/40"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-xs text-gray-400">
                                {svc.materials.length}
                              </span>
                            </td>
                            <td className="px-1 py-2">
                              <button
                                onClick={() => removeParsedService(idx)}
                                aria-label="Видалити послугу"
                                className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-400">{importError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-500">
                      Вибрано {parsedServices.filter((s) => s._selected).length} з {parsedServices.length} послуг.
                      Ви можете відредагувати код, назву та ціну перед імпортом.
                    </p>
                    <div className="flex items-center gap-3 pb-20 sm:pb-0">
                      <button
                        onClick={closeImportModal}
                        className="px-5 py-2.5 text-sm text-gray-400 hover:text-gray-200 rounded-xl border border-dark-50/20 transition-all"
                      >
                        Скасувати
                      </button>
                      <button
                        onClick={handleImportConfirm}
                        disabled={importSaving || parsedServices.filter((s) => s._selected).length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-xl text-sm font-medium transition-all border border-violet-500/20 disabled:opacity-50"
                      >
                        {importSaving ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Імпортувати {parsedServices.filter((s) => s._selected).length} послуг
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

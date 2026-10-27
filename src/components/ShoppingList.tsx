/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

export interface ListItem {
  id: string;
  title: string;
  category: string;
  priceChf: number;
  imageUrl: string | null;
  sourceUrl: string;
  reason?: string;
}

export interface ShoppingListData {
  items: ListItem[];
  totalChf: number;
  budgetChf: number;
  withinBudget: boolean;
}

export default function ShoppingListView({
  list,
}: {
  list: ShoppingListData;
}) {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const pct = Math.min(
    100,
    Math.round((list.totalChf / list.budgetChf) * 100)
  );
  return (
    <div className="space-y-4">
      {/* Budgetanzeige */}
      <div className="rounded-[24px] bg-[#294b38] p-5 text-white shadow-[0_14px_34px_-25px_rgba(30,62,42,0.9)] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
              Geplante Investition
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {list.totalChf.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-2 text-sm font-medium text-white/70">CHF</span>
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
            {list.withinBudget ? "Im Budget" : "Budget prüfen"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className={`h-full rounded-full transition-all ${
              list.withinBudget ? "bg-[#c3d5ad]" : "bg-[#f0ab92]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-white/75">
          <span>Budget {list.budgetChf.toLocaleString("de-CH")} CHF</span>
          {list.withinBudget
            ? <span>{(list.budgetChf - list.totalChf).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF verbleibend</span>
            : <span>{(list.totalChf - list.budgetChf).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF überschritten</span>}
        </div>
      </div>

      {/* Produktkarten */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.items.map((item) => (
          <a
            key={item.id}
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-[20px] border border-[#e1e5dc] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#a8b9a5] hover:shadow-[0_14px_30px_-22px_rgba(36,66,45,0.65)]"
          >
            {item.imageUrl && !brokenImages.has(item.id) ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-36 w-full bg-[#f7f7f2] object-contain p-3"
                loading="lazy"
                onError={() => setBrokenImages((current) => new Set(current).add(item.id))}
              />
            ) : (
              <div className="flex h-36 flex-col items-center justify-center gap-1 bg-[#f7f7f2] text-xs text-[#879187]">
                <span aria-hidden="true" className="text-xl">▧</span>
                <span>Produktbild nicht verfügbar</span>
              </div>
            )}
            <div className="p-3.5">
              <p className="line-clamp-2 min-h-9 text-xs font-semibold leading-5 text-[#35443a]">
                {item.title}
              </p>
              <p className="mt-2 text-sm font-bold tabular-nums text-[#42654a]">
                {item.priceChf.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF
              </p>
              <p className="mt-3 flex items-center justify-between border-t border-[#eef0eb] pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#839084] group-hover:text-[#42654a]">
                Produkt ansehen <span aria-hidden="true">↗</span>
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

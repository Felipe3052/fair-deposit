"use client";

import { useState } from "react";

/** Antwortbrief: editierbar, kopierbar, als Markdown oder (über den Druckdialog) als PDF-Beweisbericht. */
export default function LetterPanel({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "fair-deposit-reply.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  const buttonClass = "rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#294b38] ring-1 ring-black/10 hover:bg-[#fafbf8]";
  return (
    <section id="letter" className="rounded-3xl bg-white p-5 ring-1 ring-black/5 print:break-before-page print:p-0 print:ring-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h3 className="font-semibold text-[#2c3a30]">Your reply to the landlord</h3>
          <p className="text-xs text-[#758177]">Drafted from the verified report. Fill in the [placeholders] and edit freely.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={buttonClass}>{copied ? "✓ Copied" : "Copy"}</button>
          <button type="button" onClick={download} className={buttonClass}>Download .md</button>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-[#294b38] px-3 py-2 text-sm font-semibold text-white hover:bg-[#21402f]">
            Evidence report (PDF)
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={22}
        className="w-full resize-y rounded-2xl border border-[#e3e7df] bg-[#fcfdfb] p-4 font-mono text-[13px] leading-6 text-[#2c3a30] outline-none focus:border-[#6f866e] print:hidden"
        aria-label="Reply letter"
      />
      {/* Druckfassung: Markdown-Fett als echtes Fett */}
      <div className="hidden whitespace-pre-wrap text-[12pt] leading-relaxed text-black print:block">
        {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
        )}
      </div>
    </section>
  );
}

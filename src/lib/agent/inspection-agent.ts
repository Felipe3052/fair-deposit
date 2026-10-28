import { MODEL_SAM, SPARK_MAX_TOKENS, agentModel, visionModel } from "@/lib/meta-client";
import { normalizeImage, boxFromNormalized, coverage, cropRegion, iou, type NormalizedImage } from "@/lib/images";
import { getRulePack } from "@/lib/rules";
import { ageFromInstalledYear, computeShares, COMPONENT_TYPES, type ComponentType, type ShareInput, type ShareLine, type ShareTotals } from "@/lib/fair-share";
import { inspectPhoto } from "@/lib/agent/tools/inspect-photo";
import { segmentFinding, type SegmentStrategy } from "@/lib/agent/tools/segment-finding";
import { checkReport, reviewFinding } from "@/lib/agent/tools/verify-report";
import type { AgentStep, Box, Finding, InspectionEvent, InspectionReport, InspectionRequest, PhotoMeta } from "@/lib/agent/types";

const MAX_ITERATIONS = 16;
const MAX_PARALLEL = 4;
const DISCLAIMER = "Not legal advice. This is an estimate based on the photos provided and the cited lifespan rules.";

const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "inspect_photos",
      description: "Inspect whole move-out photos with vision. Returns findings with ids, normalized boxes (0-1000) and wear/damage classification.",
      parameters: {
        type: "object",
        properties: { photo_ids: { type: "array", items: { type: "string" } } },
        required: ["photo_ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "zoom_region",
      description: "Zoom into a region of a photo and inspect it closely for small defects (dowel holes, fine scratches, chips). Use grid=true to inspect the photo as 4 zoomed tiles. New findings are added; duplicates are skipped.",
      parameters: {
        type: "object",
        properties: {
          photo_id: { type: "string" },
          region: { type: "array", items: { type: "number" }, description: "[x1,y1,x2,y2] normalized 0-1000" },
          grid: { type: "boolean" },
        },
        required: ["photo_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "segment_findings",
      description: "Create pixel-accurate SAM 3.1 evidence masks. strategy 'box' suits area damage (stains, water damage, cracks, holes, peeling paint); 'concept' suits thin or scattered damage (scratches, marks, cracks). The other strategy is tried automatically if the first one fails the plausibility check — except for thin damage, which never uses 'box' because a box prompt grabs the dominant object (sofa, whole floor) instead of the damage.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { finding_id: { type: "string" }, strategy: { type: "string", enum: ["box", "concept"] } },
              required: ["finding_id"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "review_findings",
      description: "Skeptical second-pass vision check of each finding on a close-up crop. Findings that are not confirmed are rejected automatically.",
      parameters: {
        type: "object",
        properties: { finding_ids: { type: "array", items: { type: "string" } } },
        required: ["finding_ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reject_finding",
      description: "Reject a finding you consider wrong (duplicate, furniture, not the tenant's responsibility).",
      parameters: {
        type: "object",
        properties: { finding_id: { type: "string" }, reason: { type: "string" } },
        required: ["finding_id", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compute_share",
      description: "Compute the tenant's fair share in code. One line per landlord claim (claim_id) linking the confirmed findings that relate to it; add lines with claim_id null for confirmed damage without a claim. Ages, material variants and amounts come from the tenant's input, lifespans from the rule pack.",
      parameters: {
        type: "object",
        properties: {
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                claim_id: { type: ["string", "null"] },
                component: { type: "string", enum: [...COMPONENT_TYPES] },
                finding_ids: { type: "array", items: { type: "string" } },
              },
              required: ["claim_id", "component", "finding_ids"],
            },
          },
        },
        required: ["lines"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verify_report",
      description: "Run code checks on the current report (evidence, reviews, claim coverage, totals). Returns the issues still open.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finish",
      description: "Finish the inspection. Only allowed directly after verify_report passed without issues.",
      parameters: { type: "object", properties: {} },
    },
  },
];

/** Einfaches Parallelitäts-Limit für Modell-Calls. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }));
  return results;
}

function toNorm(box: Box, photo: PhotoMeta): number[] {
  return [
    Math.round((box.left / photo.width) * 1000),
    Math.round((box.top / photo.height) * 1000),
    Math.round((box.right / photo.width) * 1000),
    Math.round((box.bottom / photo.height) * 1000),
  ];
}

/** Zentrale Statusregel: Schaden braucht Gegenprüfung und Maske, Abnutzung nur keine Ablehnung. */
function applyStatus(f: Finding): Finding {
  if (f.status === "rejected") return f;
  if (f.review && !f.review.confirmed) return { ...f, status: "rejected" };
  if (f.classification === "normal_wear") return { ...f, status: "confirmed" };
  if (f.review?.confirmed) return { ...f, status: f.evidence ? "confirmed" : "unconfirmed" };
  return { ...f, status: "pending" };
}

export async function* runInspectionAgent(request: InspectionRequest): AsyncGenerator<InspectionEvent, void, void> {
  const agentSteps: AgentStep[] = [];
  let modelCalls = 0;
  const step = (tool: string, summary: string): InspectionEvent => {
    agentSteps.push({ tool, summary, at: new Date().toISOString() });
    return { type: "step", tool, summary };
  };
  const pack = getRulePack(request.rulePack);

  try {
    // 1. Fotos normalisieren (alle Koordinaten beziehen sich auf diese Bilder)
    yield step("prepare", `Normalizing ${request.photos.length} photo(s)`);
    const images = new Map<string, NormalizedImage>();
    const photos: PhotoMeta[] = [];
    for (const p of request.photos) {
      const img = await normalizeImage(p.imageBase64);
      images.set(p.id, img);
      photos.push({ id: p.id, room: p.room, kind: p.kind, width: img.width, height: img.height });
    }
    yield { type: "photos", data: photos };
    const photoById = new Map(photos.map((p) => [p.id, p]));

    const findings = new Map<string, Finding>();
    let counter = 0;
    const addFindings = (candidates: Omit<Finding, "id">[]): Finding[] => {
      const added: Finding[] = [];
      for (const c of candidates) {
        // Zoom-Boxen sind oft enger oder weiter als die Übersichts-Box → auch Enthaltensein zählt als Duplikat
        const duplicate = [...findings.values()].some((f) =>
          f.photoId === c.photoId && f.status !== "rejected" &&
          (iou(f.box, c.box) > 0.3 || (f.category === c.category && Math.max(coverage(c.box, f.box), coverage(f.box, c.box)) > 0.6))
        );
        if (duplicate) continue;
        const f = applyStatus({ ...c, id: `f${++counter}` });
        findings.set(f.id, f);
        added.push(f);
      }
      return added;
    };
    const update = (f: Finding): Finding => {
      const next = applyStatus(f);
      findings.set(next.id, next);
      return next;
    };
    const summarize = (f: Finding) => ({
      id: f.id, photo: f.photoId, label: f.label, category: f.category, component: f.component,
      classification: f.classification, severity: f.severity, confidence: f.confidence,
      box: toNorm(f.box, photoById.get(f.photoId)!), source: f.source, status: f.status,
      hasMask: Boolean(f.evidence), review: f.review ?? null,
    });

    let shareInputs: ShareInput[] | null = null;
    let lines: ShareLine[] = [];
    let totals: ShareTotals | null = null;
    let lastVerify: { passed: boolean; issues: string[] } | null = null;
    let finished = false;

    // Alter und Variante nur aus der Eingabe des Mieters — das Modell wählt nie eine (evtl. ungünstigere) Variante
    const knownComponent = (component: ComponentType) => request.components.find((c) => c.component === component);
    const ageOf = (component: ComponentType): number | null => {
      const known = knownComponent(component);
      return known ? ageFromInstalledYear(known.installedYear, request.moveOutDate) : null;
    };

    const moveOutPhotos = photos.filter((p) => p.kind === "move_out");
    const messages: Record<string, unknown>[] = [
      {
        role: "system",
        content: `You are Fair Deposit, a tenant-side move-out inspection agent. Your job: find every defect in the move-out photos, prove each damage finding with evidence, link findings to the landlord's claims and compute what the tenant fairly owes. Numbers are always computed by tools, never by you.

Workflow:
1. inspect_photos for all move-out photos.
2. For overview photos of whole rooms, use zoom_region (grid=true or a region) where small defects could hide — walls where pictures hung, floors in walking paths, corners, door frames. Skip zooming into close-ups.
3. segment_findings for every damage finding (choose the strategy per damage type).
4. review_findings for every damage finding. Rejected findings stay out of the report.
5. compute_share: one line per landlord claim, linking only confirmed findings for the same component; a claim without supporting findings gets finding_ids []. Add lines (claim_id null) for confirmed damage without a claim.
6. verify_report. If issues remain, fix them (segment, review, reject, recompute) and verify again.
7. finish right after a clean verify_report.

Rule pack: ${pack.name}${pack.isEstimate ? " (ESTIMATE, no legal source)" : ""}.
Components known from the tenant: ${request.components.length ? request.components.map((c) => `${c.component}${c.variant ? ` (${c.variant})` : ""} installed ${c.installedYear}`).join(", ") : "none"}.
Tenancy: ${request.tenancyStart} to ${request.moveOutDate}.`,
      },
      {
        role: "user",
        content: `Move-out photos: ${moveOutPhotos.map((p) => `${p.id} (${p.room})`).join(", ")}
Landlord claims: ${request.landlordClaims.length ? request.landlordClaims.map((c) => `${c.id}: "${c.description}" ${c.amount} ${request.currency}`).join("; ") : "none — report damage and normal wear only"}
Start with inspect_photos.`,
      },
    ];

    const { client, model } = agentModel();
    for (let i = 0; i < MAX_ITERATIONS && !finished; i++) {
      const res = await client.chat.completions.create({
        model,
        max_tokens: SPARK_MAX_TOKENS,
        messages: messages as never,
        tools: AGENT_TOOLS as never,
      });
      modelCalls++;
      const msg = (res.choices[0]?.message ?? {}) as unknown as Record<string, unknown>;
      const toolCalls = (msg.tool_calls ?? []) as Array<{ id: string; function: { name: string; arguments: string } }>;

      if (!toolCalls.length) {
        messages.push({ role: "assistant", content: msg.content ?? "" });
        messages.push({ role: "user", content: "Use only the provided tools. Continue with the workflow." });
        continue;
      }
      messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: toolCalls });

      for (const tc of toolCalls) {
        const name = tc.function?.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? "{}");
        } catch {
          args = {};
        }
        let result: unknown;
        // Jede Änderung invalidiert eine vorherige Verifikation
        if (name !== "verify_report" && name !== "finish") lastVerify = null;

        if (name === "inspect_photos") {
          const ids = ((args.photo_ids as string[]) ?? []).filter((id) => photoById.get(id)?.kind === "move_out");
          yield step("inspect_photos", `Inspecting ${ids.length} photo(s) with muse-spark vision`);
          const batches = await mapLimit(ids, MAX_PARALLEL, (id) => inspectPhoto({ photoId: id, image: images.get(id)!, pack }));
          modelCalls += ids.length;
          const added = addFindings(batches.flat());
          for (const f of added) yield { type: "finding", data: f };
          yield step("inspect_photos", `${added.length} finding(s): ${added.filter((f) => f.classification === "damage").length} damage, ${added.filter((f) => f.classification === "normal_wear").length} normal wear`);
          result = { findings: added.map(summarize) };
        } else if (name === "zoom_region") {
          const photo = photoById.get(String(args.photo_id));
          if (!photo || photo.kind !== "move_out") {
            result = { error: "Unknown move-out photo_id" };
          } else {
            const image = images.get(photo.id)!;
            const regions: Box[] = args.grid || !Array.isArray(args.region)
              ? [[0, 0, 550, 550], [450, 0, 1000, 550], [0, 450, 550, 1000], [450, 450, 1000, 1000]].map((r) => boxFromNormalized(r, image.width, image.height))
              : [boxFromNormalized(args.region as number[], image.width, image.height)];
            yield step("zoom_region", `Zooming into ${regions.length} region(s) of ${photo.id}`);
            const batches = await mapLimit(regions, MAX_PARALLEL, async (region) => {
              const { crop, region: padded } = await cropRegion(image, region, 0);
              return inspectPhoto({ photoId: photo.id, image: crop, pack, region: { box: padded, original: image } });
            });
            modelCalls += regions.length;
            const added = addFindings(batches.flat());
            for (const f of added) yield { type: "finding", data: f };
            yield step("zoom_region", added.length ? `Zoom found ${added.length} new finding(s): ${added.map((f) => f.label).join(", ")}` : "Zoom found nothing new");
            result = { newFindings: added.map(summarize) };
          }
        } else if (name === "segment_findings") {
          const items = ((args.items as { finding_id: string; strategy?: SegmentStrategy }[]) ?? []).filter((it) => findings.has(it.finding_id));
          yield step("segment_findings", `Creating SAM 3.1 evidence masks for ${items.length} finding(s)`);
          const outcomes = await mapLimit(items, MAX_PARALLEL, async (it) => {
            const f = findings.get(it.finding_id)!;
            const seg = await segmentFinding(f, images.get(f.photoId)!, it.strategy);
            const next = update({ ...f, evidence: seg.evidence ?? undefined });
            return { f: next, tried: seg.tried };
          });
          for (const o of outcomes) yield { type: "finding", data: o.f };
          const ok = outcomes.filter((o) => o.f.evidence).length;
          yield step("segment_findings", `${ok}/${outcomes.length} masks plausible${outcomes.some((o) => o.tried.length > 1) ? " (switched strategy where needed)" : ""}`);
          result = outcomes.map((o) => ({ finding_id: o.f.id, hasMask: Boolean(o.f.evidence), strategy: o.f.evidence?.strategy ?? null, tried: o.tried }));
        } else if (name === "review_findings") {
          const ids = ((args.finding_ids as string[]) ?? []).filter((id) => findings.has(id));
          yield step("review_findings", `Skeptical second look at ${ids.length} finding(s)`);
          const reviewed = await mapLimit(ids, MAX_PARALLEL, async (id) => {
            const f = findings.get(id)!;
            const review = await reviewFinding(f, images.get(f.photoId)!);
            return update({ ...f, review });
          });
          modelCalls += ids.length;
          for (const f of reviewed) yield { type: "finding", data: f };
          const rejected = reviewed.filter((f) => f.status === "rejected");
          yield step("review_findings", `${reviewed.length - rejected.length} confirmed, ${rejected.length} rejected${rejected.length ? `: ${rejected.map((f) => f.label).join(", ")}` : ""}`);
          result = reviewed.map((f) => ({ finding_id: f.id, status: f.status, reason: f.review?.reason }));
        } else if (name === "reject_finding") {
          const f = findings.get(String(args.finding_id));
          if (!f) {
            result = { error: "Unknown finding_id" };
          } else {
            const next = update({ ...f, status: "rejected", review: { confirmed: false, reason: String(args.reason ?? "Rejected by agent").slice(0, 200) } });
            yield { type: "finding", data: next };
            yield step("reject_finding", `Rejected ${f.label}: ${next.review?.reason}`);
            result = { ok: true };
          }
        } else if (name === "compute_share") {
          const raw = (args.lines as { claim_id: string | null; component: ComponentType; finding_ids: string[] }[]) ?? [];
          shareInputs = raw.map((l) => {
            const claim = request.landlordClaims.find((c) => c.id === l.claim_id) ?? null;
            const linked = (l.finding_ids ?? []).map((id) => findings.get(id)).filter((f): f is Finding => Boolean(f) && f!.status === "confirmed");
            return {
              claimId: claim?.id ?? null,
              claimDescription: claim?.description ?? null,
              claimedAmount: claim?.amount ?? null,
              component: COMPONENT_TYPES.includes(l.component) ? l.component : "other",
              variant: knownComponent(l.component)?.variant ?? null,
              findingIds: linked.map((f) => f.id),
              findingClassifications: linked.map((f) => f.classification),
              ageYears: ageOf(l.component),
            };
          });
          ({ lines, totals } = computeShares(shareInputs, pack.lifespans, request.currency));
          yield { type: "share", lines, totals };
          yield step("compute_share", `Claimed ${totals.claimed} ${totals.currency} → fair share ${totals.tenantPays} ${totals.currency}${totals.openLines ? ` (${totals.openLines} line(s) need more input)` : ""}`);
          result = { lines: lines.map((l) => ({ claim_id: l.claimId, component: l.component, status: l.status, tenantPays: l.tenantPays, explanation: l.explanation })), totals };
        } else if (name === "verify_report") {
          const issues = checkReport({ findings: [...findings.values()], shareInputs, lines, totals, lifespans: pack.lifespans, claims: request.landlordClaims });
          lastVerify = { passed: issues.length === 0, issues };
          yield { type: "verification", ...lastVerify };
          yield step("verify_report", issues.length ? `${issues.length} open issue(s): ${issues[0]}` : "All checks passed — every damage finding has a mask and a review, totals recomputed");
          result = lastVerify;
        } else if (name === "finish") {
          if (lastVerify?.passed) {
            finished = true;
            yield step("finish", "Report complete");
            result = { ok: true };
          } else {
            yield step("finish", "Rejected: run verify_report and fix all issues first");
            result = { ok: false, error: "finish requires a clean verify_report directly before it" };
          }
        } else {
          result = { error: `Unknown tool: ${name}` };
        }

        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    // Ohne sauberen Abschluss trotzdem einen Report liefern — aber ehrlich als nicht verifiziert
    const finalIssues = checkReport({ findings: [...findings.values()], shareInputs, lines, totals, lifespans: pack.lifespans, claims: request.landlordClaims });
    if (!finished) yield step("finish", `Iteration limit reached — report is not fully verified (${finalIssues.length} issue(s))`);

    const report: InspectionReport = {
      id: crypto.randomUUID(),
      rulePack: { id: pack.id, name: pack.name, isEstimate: pack.isEstimate, sourceTitle: pack.source?.title ?? null, sourceUrl: pack.source?.url ?? null },
      photos,
      findings: [...findings.values()],
      lines,
      totals: totals ?? { claimed: 0, tenantPays: 0, openLines: 0, currency: request.currency },
      verification: { passed: finished && finalIssues.length === 0, issues: finalIssues },
      agentSteps,
      modelCalls,
      models: { agent: agentModel().model, vision: visionModel().model, segmentation: MODEL_SAM, openWeights: visionModel().openWeights || agentModel().openWeights },
      disclaimer: DISCLAIMER,
      createdAt: new Date().toISOString(),
    };
    yield { type: "done", data: report };
  } catch (err) {
    yield { type: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

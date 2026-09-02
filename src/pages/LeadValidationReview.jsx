import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { wilsonCI, formatCI } from "@/lib/wilsonCI";
import { Page, Card, StatusPanel, SectionTitle, PrimaryButton, SecondaryButton } from "@/components/autoleads/UiPrimitives";
import { CheckCircle2, XCircle, AlertCircle, FileSearch, ChevronLeft, ChevronRight, Keyboard, ExternalLink, ShieldCheck, Flag, MapPin, Target, Lock, Snowflake } from "lucide-react";

const CLASSIFICATIONS = ["active_opportunity", "not_an_opportunity", "duplicate", "expired", "out_of_scope"];
const ERROR_CLASSES = ["FALSE_ACTIVE_BID", "MISSED_ACTIVE_BID", "WRONG_CLASSIFICATION", "WRONG_LOCATION", "WRONG_TRADE", "WRONG_DEADLINE", "WRONG_VALUE", "STALE_RECORD", "DUPLICATE_FAILURE", "SOURCE_PARSER_ERROR", "INSUFFICIENT_SOURCE_EVIDENCE", "OTHER"];

const QUEUES = [
  { id: "FL_BATCH_001", label: "FL Review Batch 001", filter: null, isBatch: true },
  { id: "A", label: "FL Active Candidates", filter: (r) => r.detected_state === "FL" && r.corpus_role === "candidate" && r.review_status !== "reviewed" },
  { id: "B", label: "FL Negatives", filter: (r) => r.detected_state === "FL" && r.corpus_role === "negative_candidate" && r.review_status !== "reviewed" },
  { id: "C", label: "Other-State", filter: (r) => r.detected_state !== "FL" && r.review_status !== "reviewed" },
  { id: "D", label: "Uncertain / Difficult", filter: (r) => r.review_status !== "reviewed" && (!r.system_classification || r.system_classification === "pending_review") },
  { id: "ALL", label: "All Pending", filter: (r) => r.review_status !== "reviewed" },
  { id: "REVIEWED", label: "Reviewed", filter: (r) => r.review_status === "reviewed" },
];

function maturityLabel(reviewed) {
  if (reviewed < 25) return { label: "INSUFFICIENT", color: "text-gray-500", bg: "bg-gray-100" };
  if (reviewed < 50) return { label: "EARLY SIGNAL", color: "text-blue-600", bg: "bg-blue-50" };
  if (reviewed < 100) return { label: "PRELIMINARY", color: "text-amber-600", bg: "bg-amber-50" };
  if (reviewed < 250) return { label: "MEANINGFUL BETA", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (reviewed < 600) return { label: "STRONG BETA", color: "text-emerald-700", bg: "bg-emerald-100" };
  return { label: "TARGET COMPLETE", color: "text-emerald-700", bg: "bg-emerald-200" };
}

const MILESTONES = [25, 50, 100, 250, 600];

function classBadge(cls) {
  const colors = {
    active_opportunity: "bg-emerald-50 text-emerald-700",
    not_an_opportunity: "bg-red-50 text-red-700",
    duplicate: "bg-amber-50 text-amber-700",
    expired: "bg-gray-100 text-gray-600",
    out_of_scope: "bg-blue-50 text-blue-700",
    pending_review: "bg-yellow-50 text-yellow-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ${colors[cls] || "bg-gray-100 text-gray-600"}`}>{(cls || "unknown").replace(/_/g, " ")}</span>;
}

export default function LeadValidationReview() {
  const [records, setRecords] = useState([]);
  const [batchRecords, setBatchRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQueue, setActiveQueue] = useState("FL_BATCH_001");
  const [reviewing, setReviewing] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [correctedClass, setCorrectedClass] = useState("");
  const [errorClass, setErrorClass] = useState("");
  const [reviewTargetId, setReviewTargetId] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await base44.entities.LeadValidationRecord.list("-created_date", 500);
      setRecords(all.filter((r) => r.data_class !== "NON_PRODUCTION_EXAMPLE"));

      // Load FL_REVIEW_BATCH_001
      try {
        const batches = await base44.entities.ReviewBatch.filter({ batch_id: "FL_REVIEW_BATCH_001" });
        if (batches.length > 0) {
          const batch = batches[0];
          const ids = batch.record_ids || [];
          const batchRecs = all.filter((r) => ids.includes(r.id));
          setBatchRecords({ batch, records: batchRecs });
        }
      } catch (e) {}
    } catch (e) {
      setError(e.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    const handler = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "1") handleReview("correct");
      else if (key === "2" && !showCorrect) openCorrection("partial");
      else if (key === "3" && !showCorrect) openCorrection("incorrect");
      else if (key === "4") handleReview("insufficient_evidence");
      else if (key === "n" && !showCorrect) goNext();
      else if (key === "b" && !showCorrect) goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Determine which records to show based on queue
  const queueDef = QUEUES.find((q) => q.id === activeQueue) || QUEUES[0];
  const filtered = useMemo(() => {
    if (queueDef.isBatch && batchRecords) return batchRecords.records;
    if (queueDef.isBatch) return [];
    return records.filter(queueDef.filter);
  }, [records, queueDef, batchRecords]);

  const current = filtered[currentIndex];
  const reviewedCount = records.filter((r) => r.review_status === "reviewed").length;
  const flReviewed = records.filter((r) => r.review_status === "reviewed" && r.detected_state === "FL").length;
  const pendingCount = records.length - reviewedCount;
  const maturity = maturityLabel(reviewedCount);

  // Batch progress
  const batchReviewedCount = batchRecords ? batchRecords.records.filter((r) => r.review_status === "reviewed").length : 0;
  const batchTotal = batchRecords ? batchRecords.records.length : 25;
  const isQuarantined = batchRecords?.batch?.data_class === 'NON_PRODUCTION_EXAMPLE';
  const quarantinedRecordIds = isQuarantined ? (batchRecords?.records?.map(r => r.id) || []) : [];

  // FL-specific metrics with Wilson CIs
  const flReviewedRecords = records.filter((r) => r.review_status === "reviewed" && r.detected_state === "FL" && !quarantinedRecordIds.includes(r.id));
  const flActive = flReviewedRecords.filter((r) => r.ground_truth_classification === "active_opportunity");
  const flPrecisionCI = flActive.length > 0 ? wilsonCI(flActive.filter((r) => r.classification_match).length, flActive.length) : { point: null, lower: null, upper: null };
  const flFalsePosCount = flReviewedRecords.filter((r) => r.system_classification === "active_opportunity" && r.ground_truth_classification !== "active_opportunity").length;
  const flFalsePosCI = flReviewedRecords.length > 0 ? wilsonCI(flReviewedRecords.length - flFalsePosCount, flReviewedRecords.length) : { point: null, lower: null, upper: null };

  const nextMilestone = MILESTONES.find((m) => m > reviewedCount) || 600;

  const goNext = useCallback(() => setCurrentIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1))), [filtered.length]);
  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(i - 1, 0)), []);

  // Synchronize ReviewBatch reviewed_count and status from actual child records
  const syncReviewBatch = useCallback(async (batchId) => {
    if (!batchId) return;
    try {
      const batches = await base44.entities.ReviewBatch.filter({ batch_id: batchId });
      if (batches.length === 0) return;
      const batch = batches[0];
      const childIds = batch.record_ids || [];
      // Recompute reviewed count from actual child LeadValidationRecords
      const allRecords = await base44.entities.LeadValidationRecord.list("-created_date", 500);
      const childRecords = allRecords.filter((r) => childIds.includes(r.id));
      const reviewedCount = childRecords.filter((r) => r.review_status === "reviewed").length;
      const totalCount = batch.record_count || childIds.length;
      const status = reviewedCount === 0 ? "PENDING" : reviewedCount >= totalCount ? "COMPLETE" : "IN_REVIEW";
      const batchUpdates = {
        reviewed_count: reviewedCount,
        status,
      };
      if (reviewedCount > 0 && !batch.started_at) {
        batchUpdates.started_at = new Date().toISOString();
      }
      if (status === "COMPLETE" && !batch.completed_at) {
        batchUpdates.completed_at = new Date().toISOString();
      }
      await base44.entities.ReviewBatch.update(batch.id, batchUpdates);
    } catch (e) {
      console.error("Failed to sync review batch:", e);
    }
  }, []);

  // Open correction form — snapshot the target ID at click time, never use mutable current.id after this
  const openCorrection = (verdict) => {
    if (!current || reviewing) return;
    if (isQuarantined && activeQueue === 'FL_BATCH_001') {
      setError('FL_REVIEW_BATCH_001 is QUARANTINED. Review actions are disabled for this batch.');
      return;
    }
    if (current.review_status === "reviewed") {
      setError("This record is already reviewed. Cannot open correction form for a reviewed record.");
      return;
    }
    setReviewTargetId(current.id);
    setCorrectedClass("");
    setErrorClass("");
    setSaveError(null);
    setShowCorrect(true);
  };

  const handleReview = async (verdict) => {
    if (!current || reviewing) return;
    if (isQuarantined && activeQueue === 'FL_BATCH_001') {
      setError('FL_REVIEW_BATCH_001 is QUARANTINED. Review actions are disabled for this batch.');
      return;
    }

    // If correction form is open and user picks Correct/Insufficient, close the form first
    if (showCorrect && (verdict === "correct" || verdict === "insufficient_evidence")) {
      setShowCorrect(false);
      setReviewTargetId(null);
      setCorrectedClass("");
      setErrorClass("");
      setSaveError(null);
    }

    // For INCORRECT/PARTIAL, require corrected_classification before saving
    if ((verdict === "incorrect" || verdict === "partial") && !correctedClass) {
      setSaveError("Corrected classification is required for PARTIAL/INCORRECT. Select one, or press Correct/Insufficient instead.");
      return;
    }

    // Determine the locked target ID — use reviewTargetId for PARTIAL/INCORRECT, current.id for CORRECT/INSUFFICIENT
    const targetId = (verdict === "incorrect" || verdict === "partial") ? reviewTargetId : current.id;

    if (!targetId) {
      setError("No locked target ID. Reopen the correction form before submitting.");
      return;
    }

    setReviewing(true);
    setError(null);
    setSaveError(null);
    try {
      // Pre-write verification: fetch the target record to confirm it's still pending
      const targetRecord = await base44.entities.LeadValidationRecord.get(targetId);

      if (!targetRecord || !targetRecord.id) {
        throw new Error("Target record not found. Aborting write.");
      }
      if (targetRecord.id !== targetId) {
        throw new Error(`Target ID mismatch: expected ${targetId}, got ${targetRecord.id}. Aborting write.`);
      }
      if (targetRecord.review_status === "reviewed") {
        throw new Error("Target record is already reviewed. Aborting write to prevent overwrite.");
      }

      const updates = {
        reviewer: "admin",
        review_timestamp: new Date().toISOString(),
        review_verdict: verdict,
        review_status: "reviewed",
      };

      if (verdict === "correct") {
        updates.ground_truth_classification = targetRecord.system_classification;
        updates.classification_match = true;
        updates.corrected_classification = targetRecord.system_classification;
      } else if (verdict === "incorrect" || verdict === "partial") {
        updates.classification_match = false;
        updates.ground_truth_classification = correctedClass;
        updates.corrected_classification = correctedClass;
        if (errorClass) updates.error_class = errorClass;
      } else if (verdict === "insufficient_evidence") {
        // Do NOT treat insufficient_evidence as false positive.
        // Leave ground_truth_classification as-is (pending_review).
        // Do NOT set classification_match — we don't know if prediction was correct.
        updates.error_class = "INSUFFICIENT_SOURCE_EVIDENCE";
      }

      // Persist atomically — update exact locked target ID
      const saved = await base44.entities.LeadValidationRecord.update(targetId, updates);

      // Write confirmation: saved.id must match locked target AND status must be reviewed
      if (!saved || !saved.id) {
        throw new Error("Write did not return a valid record. Data may not have been saved.");
      }
      if (saved.id !== targetId) {
        throw new Error(`Write returned wrong record ID: expected ${targetId}, got ${saved.id}. Possible target drift.`);
      }
      if (saved.review_status !== "reviewed") {
        throw new Error("Write returned but review_status is not 'reviewed'. Data may not have been saved correctly.");
      }

      // Write confirmed successful — clear form state and locked target
      setCorrectedClass("");
      setErrorClass("");
      setShowCorrect(false);
      setReviewTargetId(null);

      // Synchronize ReviewBatch from actual reviewed child records
      await syncReviewBatch("FL_REVIEW_BATCH_001");

      // Reload records to reflect updated state
      await loadRecords();

      // Advance to next record only after confirmed success
      goNext();
    } catch (e) {
      // DO NOT advance. Show inline error. Leave record open for retry. UI stays visible.
      setSaveError(`Save failed — record NOT advanced. ${e.message || String(e)}`);
    } finally {
      setReviewing(false);
    }
  };

  // Batch diversity display
  const batchDiversity = batchRecords ? (() => {
    const srcDist = {}, catDist = {}, tradeDist = {}, classDist = {};
    batchRecords.records.forEach(r => {
      srcDist[r.source_name] = (srcDist[r.source_name] || 0) + 1;
      catDist[r.source_category] = (catDist[r.source_category] || 0) + 1;
      tradeDist[r.trade || 'Unknown'] = (tradeDist[r.trade || 'Unknown'] || 0) + 1;
      classDist[r.corpus_role] = (classDist[r.corpus_role] || 0) + 1;
    });
    return { srcDist, catDist, tradeDist, classDist };
  })() : null;

  return (
    <Page
      title="Lead Validation Review"
      description="Side-by-side AUTOLEADS prediction vs source evidence. AI summarizes evidence — only human action finalizes ground truth. UNREVIEWED ≠ NEGATIVE."
      eyebrow="Evidence Validation"
      actions={
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${maturity.bg} ${maturity.color}`}>{maturity.label}</span>
        </div>
      }
    >
      {/* Reviewer Progress — prominent */}
      <Card className="mb-4 p-4 border-[#f2df0d]/30">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">FL Batch</p>
            <p className="text-2xl font-black">{batchReviewedCount}<span className="text-sm text-muted-foreground">/{batchTotal}</span></p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Reviewed</p>
            <p className="text-2xl font-black">{reviewedCount}<span className="text-sm text-muted-foreground">/{records.length}</span></p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Target</p>
            <p className="text-2xl font-black">{reviewedCount}<span className="text-sm text-muted-foreground">/600</span></p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-[#f2df0d] transition-all" style={{ width: `${Math.min(100, (reviewedCount / 600) * 100)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {MILESTONES.map((m) => (
            <span key={m} className={`rounded-full px-2 py-0.5 text-[10px] font-black ${reviewedCount >= m ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
              {m} {reviewedCount >= m ? "✓" : ""}
            </span>
          ))}
        </div>
      </Card>

      {/* Batch Diversity Display */}
      {activeQueue === "FL_BATCH_001" && batchDiversity && (
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Flag size={14} className="text-[#b0a209]" />
            <h3 className="text-sm font-black uppercase tracking-wider">FL_REVIEW_BATCH_001 Diversity</h3>
            <span className="text-xs text-muted-foreground">{batchTotal} records</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Sources</p>
              {Object.entries(batchDiversity.srcDist).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Categories</p>
              {Object.entries(batchDiversity.catDist).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Trades</p>
              {Object.entries(batchDiversity.tradeDist).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Candidate Type</p>
              {Object.entries(batchDiversity.classDist).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Prioritized Review Queues */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Flag size={14} className="text-[#b0a209]" />
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Queue Priority</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUEUES.map((q) => {
            const count = q.isBatch ? (batchRecords?.records.length || 0) : records.filter(q.filter).length;
            return (
              <button
                key={q.id}
                onClick={() => { if (!showCorrect) { setActiveQueue(q.id); setCurrentIndex(0); } }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${activeQueue === q.id ? "bg-[#f2df0d] text-black" : "border border-border bg-background hover:bg-muted"}`}
              >
                <span className="rounded-full bg-black/10 px-1.5 text-[10px]">{q.id === "FL_BATCH_001" ? "FL" : q.id}</span>
                {q.label}
                <span className="rounded-full bg-black/10 px-1.5 text-[10px]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quarantine Banner for FL_REVIEW_BATCH_001 */}
      {isQuarantined && activeQueue === "FL_BATCH_001" && (
        <Card className="mb-4 border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-red-700">QUARANTINED — PROVISIONAL EVIDENCE ONLY</h3>
              <p className="mt-1 text-xs text-red-600">FL_REVIEW_BATCH_001 is quarantined due to a confirmed record-target integrity defect. Review actions are disabled for this batch. Excluded from precision, false-positive rate, source-quality scoring, marketing claims, and production-readiness claims. Do not migrate corrupted V1 verdicts — use clean Review V2 batches instead.</p>
            </div>
          </div>
        </Card>
      )}

      {/* FL-Specific Scorecard with Wilson CIs */}
      {flReviewed > 0 && (
        <Card className="mb-4 p-4 border-[#f2df0d]/30">
          <div className="mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-[#b0a209]" />
            <h3 className="text-sm font-black uppercase tracking-wider">Florida Quality Scorecard</h3>
            <span className="text-xs text-muted-foreground">n={flReviewed} reviewed</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] font-bold text-muted-foreground">FL Active Precision</p>
              <p className="text-lg font-black">{flPrecisionCI.point !== null ? `${flPrecisionCI.point}%` : "N/A"}</p>
              {flPrecisionCI.lower !== null && <p className="text-[10px] text-muted-foreground">{formatCI(flPrecisionCI)} · n={flActive.length}</p>}
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] font-bold text-muted-foreground">FL False Positive Rate</p>
              <p className="text-lg font-black">{flFalsePosCI.point !== null ? `${(100 - flFalsePosCI.point).toFixed(1)}%` : "N/A"}</p>
              {flFalsePosCI.lower !== null && <p className="text-[10px] text-muted-foreground">95% CI: {(100 - flFalsePosCI.upper).toFixed(1)}%–{(100 - flFalsePosCI.lower).toFixed(1)}% · n={flReviewed}</p>}
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] font-bold text-muted-foreground">FL Reviewed</p>
              <p className="text-lg font-black">{flReviewed}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] font-bold text-muted-foreground">FL Total Corpus</p>
              <p className="text-lg font-black">{records.filter(r => r.detected_state === "FL").length}</p>
            </div>
          </div>
        </Card>
      )}

      <StatusPanel state={loading && !current ? "loading" : error && !current ? "error" : "empty"}>
        {current ? (
          <div className="space-y-4">
            {/* Inline save error — keeps review UI visible */}
            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-black text-red-700">Save Failed</p>
                  <p className="text-xs text-red-600">{saveError}</p>
                </div>
              </div>
            )}
            {/* Record counter + nav */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">Record {currentIndex + 1} of {filtered.length} · Queue {activeQueue}</span>
              <div className="flex gap-2">
                <SecondaryButton onClick={goPrev} disabled={currentIndex === 0 || showCorrect}><ChevronLeft size={16} />Prev [B]</SecondaryButton>
                <SecondaryButton onClick={goNext} disabled={currentIndex >= filtered.length - 1 || showCorrect}>Next [N]<ChevronRight size={16} /></SecondaryButton>
              </div>
            </div>

            {/* Frozen Prediction Indicator */}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2">
              <Lock size={14} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-700">Original prediction frozen at review time. Corrections become separate GROUND TRUTH — system prediction is never modified.</span>
            </div>

            {/* Side-by-side */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Prediction */}
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#b0a209]" />
                  <h3 className="text-sm font-black uppercase tracking-wider">AUTOLEADS Prediction (Frozen)</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">System Classification</p>
                    <div className="mt-1">{classBadge(current.system_classification)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs font-bold text-muted-foreground">Trade</p><p className="text-sm font-bold">{current.trade || "—"}</p></div>
                    <div><p className="text-xs font-bold text-muted-foreground">State</p><p className="text-sm font-bold">{current.detected_state || "—"}</p></div>
                    <div><p className="text-xs font-bold text-muted-foreground">Deadline</p><p className="text-sm font-bold">{current.deadline || "—"}</p></div>
                    <div><p className="text-xs font-bold text-muted-foreground">Value</p><p className="text-sm font-bold">{current.published_value ? `$${Number(current.published_value).toLocaleString()}` : "—"}</p></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Original Prediction (Preserved)</p>
                    <p className="text-sm font-bold">{current.original_prediction || current.system_classification || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Prediction Version</p>
                    <p className="text-sm font-bold">{current.prediction_version || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Duplicate Status</p>
                    <p className="text-sm font-bold">{current.duplicate_status || "unique"}</p>
                  </div>
                </div>
              </Card>

              {/* Source Evidence */}
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FileSearch size={18} className="text-muted-foreground" />
                  <h3 className="text-sm font-black uppercase tracking-wider">Source Evidence (Prefetched)</h3>
                </div>
                <div className="space-y-3">
                  <div><p className="text-xs font-bold text-muted-foreground">Source Name</p><p className="text-sm font-bold">{current.source_name || "—"}</p></div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Source URL</p>
                    {current.source_url ? (
                      <a href={current.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline break-all">
                        {current.source_url.substring(0, 80)}{current.source_url.length > 80 ? "…" : ""}<ExternalLink size={12} />
                      </a>
                    ) : <p className="text-sm">—</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs font-bold text-muted-foreground">Source Category</p><p className="text-sm font-bold">{current.source_category || "—"}</p></div>
                    <div><p className="text-xs font-bold text-muted-foreground">Jurisdiction</p><p className="text-sm font-bold">{current.location || "—"}</p></div>
                    <div><p className="text-xs font-bold text-muted-foreground">Contact</p><p className="text-sm font-bold">{current.contact_info ? "Available" : "—"}</p></div>
                    <div><p className="text-xs font-bold text-muted-foreground">Provenance</p><p className="text-sm font-bold">{current.source_provenance_complete ? "Complete" : "Incomplete"}</p></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Canonical ID</p>
                    <p className="text-xs font-mono">{current.canonical_opportunity_id || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Provenance Trail</p>
                    <p className="text-xs text-muted-foreground">{current.provenance || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Ground Truth (Current)</p>
                    <div className="mt-1">{classBadge(current.ground_truth_classification)}</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Correction form with error classification */}
            {showCorrect && (
              <Card className="p-5 border-[#f2df0d]/40">
                <SectionTitle title="Correct Classification & Error Class" />
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 p-2">
                  <Lock size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700">LOCKED TARGET: {reviewTargetId}</span>
                </div>
                <div className="mb-3">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">Corrected Classification</p>
                  <div className="flex flex-wrap gap-2">
                    {CLASSIFICATIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCorrectedClass(c)}
                        className={`rounded-lg px-3 py-2 text-xs font-black transition ${correctedClass === c ? "bg-[#f2df0d] text-black" : "border border-border bg-background hover:bg-muted"}`}
                      >
                        {c.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">Error Classification (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {ERROR_CLASSES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setErrorClass(c)}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${errorClass === c ? "bg-red-100 text-red-700 border-2 border-red-300" : "border border-border bg-background hover:bg-muted"}`}
                      >
                        {c.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  {correctedClass && (
                    <>
                      <span className="text-sm font-bold">Corrected to:</span>
                      {classBadge(correctedClass)}
                      <PrimaryButton onClick={() => handleReview("incorrect")} disabled={reviewing}>Submit Correction</PrimaryButton>
                    </>
                  )}
                  <SecondaryButton
                    onClick={() => { setShowCorrect(false); setReviewTargetId(null); setCorrectedClass(""); setErrorClass(""); setSaveError(null); }}
                    disabled={reviewing}
                  >Cancel</SecondaryButton>
                </div>
              </Card>
            )}

            {/* Review actions — keyboard-first, AI does NOT self-grade */}
            <Card className="p-5">
              <SectionTitle title="Human Review Verdict (AI cannot press these)" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button onClick={() => handleReview("correct")} disabled={reviewing} className="flex flex-col items-center gap-1 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 transition hover:bg-emerald-100 disabled:opacity-50">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                  <span className="text-xs font-black uppercase">Correct</span>
                  <span className="text-[10px] text-muted-foreground">[1]</span>
                </button>
                <button onClick={() => openCorrection("partial")} disabled={reviewing || showCorrect} className="flex flex-col items-center gap-1 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100 disabled:opacity-50">
                  <AlertCircle size={24} className="text-amber-600" />
                  <span className="text-xs font-black uppercase">Partial</span>
                  <span className="text-[10px] text-muted-foreground">[2]</span>
                </button>
                <button onClick={() => openCorrection("incorrect")} disabled={reviewing || showCorrect} className="flex flex-col items-center gap-1 rounded-lg border-2 border-red-200 bg-red-50 p-4 transition hover:bg-red-100 disabled:opacity-50">
                  <XCircle size={24} className="text-red-600" />
                  <span className="text-xs font-black uppercase">Incorrect</span>
                  <span className="text-[10px] text-muted-foreground">[3]</span>
                </button>
                <button onClick={() => handleReview("insufficient_evidence")} disabled={reviewing} className="flex flex-col items-center gap-1 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100 disabled:opacity-50">
                  <FileSearch size={24} className="text-gray-600" />
                  <span className="text-xs font-black uppercase">Insufficient</span>
                  <span className="text-[10px] text-muted-foreground">[4]</span>
                </button>
              </div>
            </Card>

            {/* Keyboard shortcuts */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Keyboard size={14} />
              <span>Shortcuts: 1=Correct · 2=Partial · 3=Incorrect · 4=Insufficient · N=Next · B=Prev</span>
            </div>
          </div>
        ) : !loading ? (
          <div className="grid place-items-center p-12 text-center">
            <Target size={40} className="text-muted-foreground" />
            <h3 className="mt-4 font-black">No records in Queue {activeQueue}</h3>
            <p className="text-sm text-muted-foreground">Switch to another queue or refresh to load new records.</p>
          </div>
        ) : null}
      </StatusPanel>
    </Page>
  );
}
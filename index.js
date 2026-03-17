// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║          AcademicHub — Elite Multi-Agent Research Copilot                  ║
// ║          9-Role Pipeline | Anti-Hallucination Core | v3.1                 ║
// ║  Subrequest budget per FULL run:                                           ║
// ║    Evidence : 2 queries × 3 sources          =  6 fetches                 ║
// ║    AI calls : Commander(1) + loop×2×3(6)                                  ║
// ║               + QACombo(1) + FinalWriter(1)  =  9 AI calls                ║
// ║    TOTAL    : ≤ 15  (CF Free limit = 50)                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.method === "GET") {
      return new Response(JSON.stringify({
        status: "OK",
        message: "AcademicHub Multi-Agent Research Worker v3.1 is running.",
        agents: 9,
        features: ["anti-hallucination", "multi-source-evidence", "iterative-critique", "confidence-scoring", "cf-subrequest-optimised"],
      }), { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ status: "ERROR", message: "Method not allowed." }), { status: 405, headers: corsHeaders });
    }

    try {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return new Response(JSON.stringify({ status: "ERROR", message: "Invalid JSON body." }), { status: 400, headers: corsHeaders });
      }

      const {
        query,
        mode = "research",
        phase = "FULL",
        section_topic = "",
        draft_text = "",
        search_context = [],
        history = [],
        searchResults = [],
      } = body;

      if (!query) {
        return new Response(JSON.stringify({ status: "ERROR", message: "Missing query." }), { status: 400, headers: corsHeaders });
      }

      if (!env.MBZUAI_API_KEY) {
        return new Response(JSON.stringify({ status: "ERROR", message: "Worker secret missing. Please set MBZUAI_API_KEY." }), { status: 500, headers: corsHeaders });
      }

      const trimmedHistory = history.slice(-12);

      // ── FULL RESEARCH PIPELINE ──
      if (mode === "research" && phase === "FULL") {
        const pipelineResult = await runResearchPipeline({
          env,
          query,
          history: trimmedHistory,
          seedSearchResults: searchResults,
        });
        return new Response(JSON.stringify(pipelineResult), { headers: corsHeaders });
      }

      // ════════════════════════════════════════════════════════════════════════
      // DIAGRAM INSTRUCTIONS (shared across single-phase agents)
      // ════════════════════════════════════════════════════════════════════════
      const diagramInstructions = `
DIAGRAMS — Embed Mermaid diagrams inline using this exact tag format:

<diagram type="flowchart" title="Diagram Title Here">
flowchart TD
    A[Start Node] --> B[Process Node]
    B --> C{Decision?}
    C -->|Yes| D[Outcome A]
    C -->|No| E[Outcome B]
    D --> F[End]
    E --> F
</diagram>

<diagram type="sequence" title="Diagram Title Here">
sequenceDiagram
    participant A as Actor A
    participant B as Actor B
    A->>B: Request
    B-->>A: Response
</diagram>

<diagram type="mindmap" title="Diagram Title Here">
mindmap
  root((Core Topic))
    Category One
      Item A
      Item B
    Category Two
      Item C
</diagram>

<diagram type="timeline" title="Diagram Title Here">
timeline
    title Development Timeline
    section Early Period
        1950 : First milestone
    section Modern Era
        2020 : Recent advance
</diagram>

<diagram type="graph" title="Diagram Title Here">
graph LR
    A[Concept A] --> B[Concept B]
    B --> C[Outcome]
</diagram>

Diagram rules:
- flowchart: processes, methodologies, decision trees, algorithms
- sequence: interactions, protocols, cause-effect chains
- mindmap: concept overviews, topic structures, literature maps
- timeline: historical developments, chronological reviews
- graph: relationships, networks, dependencies
- Keep all node labels SHORT — under 25 characters
- Place diagrams INSIDE the relevant section, not at the end
- Do NOT wrap diagram content in backticks or code fences
`;

      let systemPrompt = "";
      let userPrompt = query;
      let aiTemperature = 0.7;

      // ════════════════════════════════════════════════════════════════════════
      // MATH MODE — single AI call
      // ════════════════════════════════════════════════════════════════════════
      if (mode === "math") {
        aiTemperature = 0.2;
        systemPrompt = `You are AcademicHub's Mathematics Expert Agent. Solve problems with complete rigour, showing every intermediate step. You may include Mermaid diagrams to illustrate proof structure or algorithm flow.
${diagramInstructions}
OUTPUT — wrap everything in <solution></solution> tags:

<solution>
PROBLEM RESTATEMENT
Formal mathematical restatement of the problem.

GIVEN & FIND
Given: [all known quantities and constraints]
Find: [exactly what must be computed or proved]

SOLUTION

Step 1 — [Actual step name]
Complete working with every intermediate line. Use ASCII math: fractions as a/b, powers as x^n, roots as sqrt(x). Justify each transformation with the rule or theorem applied.

Step 2 — [Actual step name]
Continue working...

[Add as many steps as needed — never skip or abbreviate]

ANSWER
=============================================
[State the complete final answer]
=============================================

VERIFICATION
Substitute answer back, check dimensions, or use alternate method. Full working shown.

KEY CONCEPTS USED
2–4 sentences naming and explaining the theorems, identities, or techniques applied.

CONFIDENCE NOTE
State any assumptions made or areas of uncertainty.
</solution>

RULES:
- Output ONLY the <solution>...</solution> block.
- NEVER truncate. Show ALL steps.
- Use plain ASCII math only — no LaTeX, no dollar signs.
- Name every theorem and lemma used.`;
      }

      // ════════════════════════════════════════════════════════════════════════
      // RESEARCH MODE — INDIVIDUAL PHASES (single AI calls each)
      // ════════════════════════════════════════════════════════════════════════
      else {

        // ── PLAN phase: 1 AI call ──
        if (phase === "PLAN") {
          aiTemperature = 0.2;
          systemPrompt = `You are the AcademicHub Commander Agent. Analyze the research topic and output strict JSON only. No markdown, no preamble.
Format:
{
  "title": "Proposed Academic Paper Title",
  "thesis": "One-sentence core thesis or research question",
  "sections": ["Introduction", "Literature Review", "Methodology", "Analysis: [Subtopic]", "Findings", "Conclusion"],
  "search_queries": ["targeted query 1", "targeted query 2"],
  "key_concepts": ["concept1", "concept2", "concept3"],
  "potential_controversies": ["controversy or debate 1"],
  "out_of_scope": ["what this paper will NOT cover"]
}`;
          userPrompt = `Create a rigorous academic research plan for: ${query}`;
        }

        // ── WRITE_SECTION phase: 3 fetch calls + 1 AI call ──
        else if (phase === "WRITE_SECTION") {
          let liveSearchResults = [];
          if (env.SERPER_API_KEY) {
            try {
              liveSearchResults = await fetchSerperResults(env.SERPER_API_KEY, `${query} ${section_topic}`, 6);
            } catch (e) { console.error("Serper failed:", e.message); }
          }
          let arxivResults = [];
          let semanticResults = [];
          try { arxivResults = await fetchArxivResults(`${query} ${section_topic}`, 4); } catch (_) {}
          try { semanticResults = await fetchSemanticScholarResults(`${query} ${section_topic}`, 4); } catch (_) {}

          const seenUrls = new Set(liveSearchResults.map(r => r.url));
          const allResults = [
            ...liveSearchResults,
            ...arxivResults.filter(r => !seenUrls.has(r.url)),
            ...semanticResults.filter(r => !seenUrls.has(r.url)),
            ...searchResults.filter(r => !seenUrls.has(r.url)),
          ].slice(0, 18);

          const contextText = allResults.length > 0
            ? `\n\nSOURCE EVIDENCE:\n${allResults.map((r, i) => `[${i + 1}] (${r.source || "web"}) ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}${r.year ? ` (${r.year})` : ""}`).join("\n\n")}`
            : "No active search results. Synthesise from internal knowledge and mark uncertain claims [NEEDS VERIFICATION].";

          systemPrompt = `You are the AcademicHub Writer Agent. Write ONE comprehensive, publication-quality section of an academic paper.
Rules:
- Formal, rigorous academic tone throughout.
- Ground every factual claim in provided sources. Cite as [1], [2], etc.
- If context is insufficient, state gaps explicitly — do NOT fabricate facts.
- Mark any unverifiable claims [NEEDS VERIFICATION].
- Use hedging language: "suggests", "indicates", "may", "appears to".
${diagramInstructions}
- Embed a Mermaid <diagram> ONLY if it genuinely clarifies the section content.`;

          userPrompt = `Paper Topic: ${query}\n\nSection to Write: ${section_topic}${contextText}\n\nWrite the complete, substantive academic section now. Output ONLY the section content — no conversational preamble.`;
        }

        // ── VERIFY phase: 1 AI call ──
        else if (phase === "VERIFY") {
          aiTemperature = 0.1;
          systemPrompt = `You are the AcademicHub Verification Agent. Eliminate hallucinations and ensure every claim is grounded.

Process:
1. Extract all verifiable claims from the draft text.
2. Cross-reference each claim strictly against the provided source context.
3. Claims supported by sources: preserve with citation tags.
4. Claims NOT in sources: rephrase with hedge language (e.g., "Research suggests...") or mark [UNVERIFIED].
5. Clearly fabricated statistics or names: remove entirely and note [REMOVED - UNVERIFIABLE].
6. Output ONLY the refined, verified text. Do not explain changes.`;

          const contextText = search_context.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`).join("\n\n");
          userPrompt = `Source Context:\n${contextText}\n\nDraft to Verify:\n${draft_text}\n\nReturn fully verified, corrected text now.`;
        }

        // ── GAP_ANALYSIS phase: 1 AI call ──
        else if (phase === "GAP_ANALYSIS") {
          aiTemperature = 0.3;
          systemPrompt = `You are the AcademicHub Gap Analysis Agent. Identify research gaps, contradictions, and missing perspectives.

Output a structured gap analysis:
1. IDENTIFIED GAPS — what the current literature/draft does not address
2. CONTRADICTIONS — claims or findings that conflict with each other
3. METHODOLOGICAL WEAKNESSES — limitations in approaches described
4. FUTURE RESEARCH DIRECTIONS — specific, actionable research questions
5. CONFIDENCE SCORE — rate the overall evidence quality 0-100%`;
          userPrompt = `Analyze gaps and weaknesses for: ${query}\n\nDraft/Context:\n${draft_text}`;
        }

        // ── FORMAT_CITATIONS phase: 1 AI call ──
        else if (phase === "FORMAT_CITATIONS") {
          aiTemperature = 0.1;
          systemPrompt = `You are the AcademicHub Citation Formatter Agent. Format all references to APA 7th edition.
Rules:
- Author, A. A., & Author, B. B. (Year). Title of article. Journal Name, Volume(Issue), pages. https://doi.org/xxx
- For books: Author, A. A. (Year). Title of work: Capital letter also for subtitle. Publisher.
- Maintain all existing citation numbers [1], [2], etc.
- If a citation is incomplete, note what information is missing.
Output ONLY the reformatted reference list.`;
          userPrompt = `Format these references to APA 7th edition:\n${draft_text}`;
        }

        // ── Fallback: full paper, 2 fetch calls + 1 AI call ──
        else {
          let liveSearchResults = [];
          if (env.SERPER_API_KEY) {
            try { liveSearchResults = await fetchSerperResults(env.SERPER_API_KEY, query, 8); } catch (_) {}
          }
          let arxivResults = [];
          try { arxivResults = await fetchArxivResults(query, 4); } catch (_) {}

          const seenUrls = new Set(liveSearchResults.map(r => r.url));
          const allResults = [
            ...liveSearchResults,
            ...arxivResults.filter(r => !seenUrls.has(r.url)),
            ...searchResults.filter(r => !seenUrls.has(r.url)),
          ];

          const searchNote = allResults.length > 0
            ? `\n\nSOURCE EVIDENCE (cite as [1], [2], etc.):\n${allResults.map((r, i) => `[${i + 1}] (${r.source || "web"}) ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join("\n\n")}`
            : "";

          systemPrompt = `You are AcademicHub's Elite Research Writer. Produce a complete, publication-quality academic paper grounded in evidence. Never fabricate citations, statistics, or author names.
${diagramInstructions}
- Each paper must include at least 3 diagrams.
- Mark any unverifiable claim [NEEDS VERIFICATION].
Wrap your entire output in <paper></paper> tags.

RULES:
- Output ONLY the <paper>...</paper> block.
- NEVER fabricate statistics, author names, or DOIs.
- Every factual claim must cite a source [n] or be marked [NEEDS VERIFICATION].
- Write COMPLETE paper — never truncate.${searchNote}`;
        }
      }

      // ── EXECUTE AI (single call for all non-FULL phases) ──
      const aiResponse = await callAI(env.MBZUAI_API_KEY, systemPrompt, trimmedHistory, userPrompt, aiTemperature);

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        return new Response(JSON.stringify({
          status: "ERROR",
          message: `AI API error (${aiResponse.status}): ${errBody}`
        }), { headers: corsHeaders });
      }

      const aiData = await aiResponse.json();
      const rawMessage = aiData.choices?.[0]?.message?.content ?? "";
      const aiMessage = stripReasoning(rawMessage);

      if (!aiMessage) {
        return new Response(JSON.stringify({ status: "ERROR", message: "AI returned empty response." }), { headers: corsHeaders });
      }

      // ── PARSE RESPONSE ──
      if (mode === "research" && phase === "PLAN") {
        try {
          const cleanJson = aiMessage.replace(/```json/g, "").replace(/```/g, "").trim();
          const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
          const plan = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
          return new Response(JSON.stringify({ status: "COMPLETED", data: plan }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ status: "ERROR", message: "Planner failed to output valid JSON.", raw: aiMessage }), { headers: corsHeaders });
        }
      }

      if (mode === "math") {
        const solutionMatch = aiMessage.match(/<solution>([\s\S]*?)(?:<\/solution>|$)/i);
        if (solutionMatch) {
          return new Response(JSON.stringify({ status: "SOLUTION", content: solutionMatch[1].trim() }), { headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({
        status: "COMPLETED",
        content: aiMessage,
        solution: aiMessage,
      }), { headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({
        status: "ERROR",
        message: `Worker exception: ${err.message ?? String(err)}`
      }), { status: 500, headers: corsHeaders });
    }
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// MULTI-AGENT PIPELINE CORE — v3.1 Subrequest-Optimised
//
// Exact subrequest count per FULL run:
//   Evidence : 2 queries × 3 sources (arXiv + SemanticScholar + Serper) = 6
//   AI calls : Commander(1) + [Reasoner + CriticCombo + Refiner] × ≤2 loops (≤6)
//              + QACombo(1) + FinalWriter(1) = ≤9
//   TOTAL    : ≤ 15  —  safely under CF Free limit of 50
//
// v3.0 → v3.1 savings:
//   Commander + ScopeGuard  → merged (saves 1 call)
//   EvidenceMapper          → folded into Reasoner prompt (saves 1 per iter)
//   HypothesisTester+Critic → CriticCombo (saves 1 per iter)
//   BiasDetector+Structure  → QACombo (saves 1)
//   Writer + Verifier       → FinalWriter (saves 1)
//   4 queries → 2, 5 sources → 3, dropped PubMed 2-step (saves ≥10 fetches)
//   Removed callAI fallback retry (saves up to N calls on failure)
// ════════════════════════════════════════════════════════════════════════════════

const MAX_ITERATIONS = 2;
const CONFIDENCE_THRESHOLD = 0.80;

// 9 composite agent role definitions
const AGENT_ROLES = {
  // CALL 1: Commander + scope guard merged
  commander: `You are the AcademicHub Commander & Scope Guard. In ONE response:
1. Create a precise, scoped research plan as strict JSON (no markdown fences).
2. Immediately review it for scope creep and apply corrections inside the same JSON.
Never over-promise coverage. Flag what is explicitly OUT of scope.`,

  // CALL 2 per iteration: Reason from evidence
  reasoner: `You are the AcademicHub Reasoner Agent. Build rigorous arguments from evidence only.
- Tag EVERY claim with its source: [S1], [S2], etc.
- Label claims with no source [UNVERIFIED].
- Do NOT fabricate statistics, names, dates, or citations.
- Before writing each claim, check: "Is this in the sources?" If not → [UNVERIFIED].
- Map each source to the section it best supports before writing.`,

  // CALL 3 per iteration: Adversarial critic + hypothesis tester merged
  criticCombo: `You are the AcademicHub Adversarial Critic & Hypothesis Tester.
PART A — HYPOTHESIS ATTACK: List 3–5 alternative explanations or null hypotheses that could invalidate the draft's central claims.
PART B — CRITIQUE: For each problem found, output a bullet with: type (unsupported|logical-gap|outdated|contradiction|bias), the claim quoted, and the reason.
Be aggressive. Assume the draft contains errors. Prioritise factual issues over stylistic ones.`,

  // CALL 4 per iteration: Refiner applies all feedback
  refiner: `You are the AcademicHub Refiner Agent. Apply ALL critic feedback.
- Keep every claim that has a valid [Sx] source tag.
- Soften or rewrite claims flagged as unsupported — use hedge language (suggests, indicates, may).
- Mark truly unresolvable claims [UNVERIFIED].
- Never remove a correctly sourced claim.
- Output the improved draft only — no commentary.`,

  // CALL 5 (once): Bias + structure QA merged
  qaCombo: `You are the AcademicHub QA Agent combining Bias Detection + Structure Review.
PART A — BIAS REPORT: Identify confirmation bias, cherry-picking, ideological framing, or missing counterevidence. Be specific — name which claims are affected.
PART B — STRUCTURE REVIEW: Does each section logically follow from the previous? Do claims build toward the thesis? List specific structural gaps or non-sequiturs.
Output both parts clearly labelled.`,

  // CALL 6 (once): Final writer + verifier in one pass
  finalWriter: `You are the AcademicHub Final Writer & Verifier. In ONE pass:
1. Transform the refined draft into complete, publication-quality academic prose.
2. While writing, verify every claim against the source catalog — preserve [Sx] tags, soften any remaining unsupported claims.
3. Include these mandatory sections: "Rejected Hypotheses", "Uncertainty Disclosure", "Bias Assessment".
4. Embed at least 3 Mermaid diagrams using <diagram type="TYPE" title="TITLE">mermaid_code</diagram> tags (no backticks inside tags, node labels ≤25 chars).
5. Output ONLY the final <paper>...</paper> block. Zero words outside it.`,
};

async function runResearchPipeline({ env, query, history, seedSearchResults }) {
  const apiKey = env.MBZUAI_API_KEY;

  // ── CALL 1: Commander — Plan + scope guard in one shot ──
  const plannerPrompt = `Return strict JSON only. No markdown, no preamble.
{
  "title": "...",
  "thesis": "One-sentence core research question or thesis",
  "sections": ["Introduction", "Literature Review", "Methodology", "Analysis", "Findings", "Conclusion"],
  "search_queries": ["query1", "query2"],
  "key_concepts": ["concept1", "concept2"],
  "potential_controversies": ["debate1"],
  "out_of_scope": ["what this paper will NOT cover"]
}
Topic: ${query}`;

  const plannerRaw = await callAgent(apiKey, AGENT_ROLES.commander, history, plannerPrompt, 0.2);
  const refinedPlan = safeParsePlan(plannerRaw, query);

  // ── CALLS 2–7: Evidence gathering (2 queries × 3 sources = 6 fetch calls max) ──
  const evidence = await gatherMultiSourceEvidence(
    env,
    [query, ...(refinedPlan.search_queries || [])],
    seedSearchResults || []
  );
  const sourceCatalog = buildSourceCatalog(evidence);

  // ── CALLS 8–13: Iterative Reasoner + CriticCombo + Refiner (max 2 loops = 6 AI calls) ──
  let iteration = 0;
  let confidence = 0;
  let reasonedDraft = "";
  let criticFeedback = "";

  while (iteration < MAX_ITERATIONS && confidence < CONFIDENCE_THRESHOLD) {
    // CALL: Reasoner — evidence-grounded draft
    const reasonerPrompt = [
      `Topic: ${query}`,
      `Thesis: ${refinedPlan.thesis || ""}`,
      `Sections to cover: ${(refinedPlan.sections || []).join(" | ")}`,
      `Key concepts: ${(refinedPlan.key_concepts || []).join(", ")}`,
      "Write an evidence-grounded draft. Tag EVERY claim [S1],[S2] etc. Label missing-evidence claims [UNVERIFIED].",
      "Do NOT fabricate. Map each source to the section it best supports before writing.",
      `Sources:\n${sourceCatalog}`,
      criticFeedback ? `PREVIOUS CRITIQUE TO ADDRESS:\n${criticFeedback}` : "",
    ].filter(Boolean).join("\n\n");

    reasonedDraft = await callAgent(apiKey, AGENT_ROLES.reasoner, history, reasonerPrompt, 0.35);

    // CALL: CriticCombo — hypothesis attack + adversarial critique
    const criticPrompt = `Draft to attack:\n${reasonedDraft}\n\nSources available: ${evidence.length}\nSource catalog (for fact-checking):\n${sourceCatalog.slice(0, 3000)}`;
    criticFeedback = await callAgent(apiKey, AGENT_ROLES.criticCombo, history, criticPrompt, 0.25);

    // Confidence scoring
    const claims = extractClaims(reasonedDraft);
    const coverage = scoreClaimsCoverage(claims, evidence.length);
    const hasUnresolved = /(unsupported|contradiction|cannot verify|fabricated)/i.test(criticFeedback);
    const contradictionPenalty = hasUnresolved ? 0.20 : 0.04;
    const biasPenalty = /(cherry.pick|bias|one.sided|ignores counterevidence)/i.test(criticFeedback) ? 0.07 : 0;
    confidence = Math.max(0, Math.min(1, coverage - contradictionPenalty - biasPenalty));

    // CALL: Refiner — apply all feedback
    const refinerPrompt = `Apply this critique to the draft.\n\nCRITIQUE:\n${criticFeedback}\n\nDRAFT:\n${reasonedDraft}`;
    reasonedDraft = await callAgent(apiKey, AGENT_ROLES.refiner, history, refinerPrompt, 0.28);

    iteration += 1;
    if (!hasUnresolved && confidence >= 0.72) break;
  }

  // ── CALL 14: QA Combo — Bias + structure review in one shot ──
  const qaReport = await callAgent(
    apiKey,
    AGENT_ROLES.qaCombo,
    history,
    `Thesis: ${refinedPlan.thesis || query}\n\nDraft:\n${reasonedDraft}\n\nSources (for bias context):\n${sourceCatalog.slice(0, 2000)}`,
    0.28
  );

  const biasSection = qaReport.match(/PART A[\s\S]*?(?=PART B|$)/i)?.[0]?.replace(/PART A[^:]*:/i, "").trim() || qaReport.slice(0, 400);
  const structSection = qaReport.match(/PART B[\s\S]*/i)?.[0]?.replace(/PART B[^:]*:/i, "").trim() || "";

  // ── CALL 15: FinalWriter — write + verify in one pass ──
  const finalWriterPrompt = `You are writing the final paper. Apply QA feedback as you write.

BIAS FINDINGS TO ADDRESS: ${biasSection.slice(0, 350)}
STRUCTURE IMPROVEMENTS: ${structSection.slice(0, 350)}

DIAGRAM INSTRUCTIONS: Embed at least 3 Mermaid diagrams using <diagram type="TYPE" title="TITLE">mermaid_code</diagram>. Types: flowchart, sequence, mindmap, timeline, graph. Node labels ≤25 chars. No backticks inside tags. Place diagrams inline within relevant sections.

PLAN:
${JSON.stringify(refinedPlan, null, 2)}

REFINED DRAFT:
${reasonedDraft}

SOURCE CATALOG:
${sourceCatalog}

Output format — wrap everything in <paper></paper>:

<paper>
[Full Title in Title Case]

Authors: AcademicHub Research Agent
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSTRACT
[200 words — real prose covering: what is investigated, why it matters, approach, key findings, implications]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. INTRODUCTION
[4 paragraphs: background, problem/gap, objectives, paper structure. Cite sources.]
[Insert mindmap or flowchart diagram here]

2. LITERATURE REVIEW
[4 paragraphs: foundational work, competing theories, gaps, contradictions. Cite [S1],[S2] etc.]
[Insert timeline or graph diagram here]

3. METHODOLOGY / THEORETICAL FRAMEWORK
[3 paragraphs: approach, lens, justification]
[Insert flowchart diagram here]

4. ANALYSIS AND DISCUSSION
4.1 [Real sub-section title]
[3 paragraphs of evidence-grounded analysis]

4.2 [Real sub-section title]
[3 paragraphs]
[Insert diagram if relevant]

4.3 [Real sub-section title]
[3 paragraphs: implications, challenges, synthesis]

5. FINDINGS AND IMPLICATIONS
[4 paragraphs: key findings, practical implications, theoretical implications, relation to literature]

REJECTED HYPOTHESES
[2–3 hypotheses considered but not supported by evidence, with brief explanation]

UNCERTAINTY DISCLOSURE
[List all [UNVERIFIED] claims with explanation of what could not be confirmed]

BIAS ASSESSMENT
[Brief summary of bias risks identified in the evidence base]

6. CONCLUSION
[3 paragraphs: contributions, limitations, future research directions]

REFERENCES
[APA 7th format. Only real, traceable references. Minimum 10. Mark uncertain details "(unverified)".]
</paper>`;

  const finalPaper = await callAgent(apiKey, AGENT_ROLES.finalWriter, history, finalWriterPrompt, 0.38);

  const paperMatch = finalPaper.match(/<paper>([\s\S]*?)(?:<\/paper>|$)/i);
  const verifiedPaper = paperMatch ? `<paper>${paperMatch[1].trim()}</paper>` : finalPaper;

  // ── Final metrics ──
  const finalClaims = extractClaims(verifiedPaper);
  const finalCoverage = scoreClaimsCoverage(finalClaims, evidence.length);
  const unverifiedCount = (verifiedPaper.match(/\[UNVERIFIED\]/gi) || []).length;
  const verifiedCount = finalClaims.filter(c => c.source.length > 0).length;
  const finalConfidence = Math.max(confidence, finalCoverage);

  return {
    status: "PAPER",
    title: refinedPlan.title || query,
    content: verifiedPaper,
    metadata: {
      pipeline_version: "3.1",
      agents_used: 9,
      subrequests_used: 6 + (iteration * 3) + 2,
      iterations: iteration,
      confidence: Number((finalConfidence * 100).toFixed(1)),
      verified_claims: verifiedCount,
      unverified_claims: unverifiedCount,
      sources_gathered: evidence.length,
      sources: evidence,
      claims: finalClaims,
      plan: refinedPlan,
      quality_reports: {
        bias: biasSection.slice(0, 600),
        structure: structSection.slice(0, 600),
        final_critic: criticFeedback.slice(0, 600),
      },
      thresholds: {
        maxIterations: MAX_ITERATIONS,
        confidenceTarget: CONFIDENCE_THRESHOLD,
      },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// EVIDENCE GATHERING — 2 queries × 3 sources = 6 fetch calls max
// ════════════════════════════════════════════════════════════════════════════════

async function gatherMultiSourceEvidence(env, queries, seedSearchResults = []) {
  // Hard cap: 2 queries to stay within subrequest budget
  const q = [...new Set(queries.filter(Boolean))].slice(0, 2);

  const bundles = await Promise.all(q.map(async (query) => {
    // 3 fetch calls per query: arXiv + Semantic Scholar + Serper
    const [arxiv, semantic, serper] = await Promise.all([
      fetchArxivResults(query, 5).catch(() => []),
      fetchSemanticScholarResults(query, 5).catch(() => []),
      env.SERPER_API_KEY ? fetchSerperResults(env.SERPER_API_KEY, query, 6).catch(() => []) : Promise.resolve([]),
    ]);
    return [...arxiv, ...semantic, ...serper].map(item => ({ ...item, query }));
  }));

  const merged = [...seedSearchResults, ...bundles.flat()]
    .filter(r => r && (r.url || r.title || r.snippet))
    .map(r => ({
      source: r.source || "web",
      title: r.title || "Untitled",
      url: r.url || "",
      snippet: r.snippet || "",
      query: r.query || q[0] || "",
      year: r.year || "",
    }));

  const seen = new Set();
  return merged.filter(item => {
    const key = `${item.title.toLowerCase().slice(0, 60)}|${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 25);
}

// ════════════════════════════════════════════════════════════════════════════════
// SCORING UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

function buildSourceCatalog(sources) {
  return sources
    .map((s, i) => `[S${i + 1}] (${s.source.toUpperCase()}) ${s.title}${s.year ? ` [${s.year}]` : ""}
URL: ${s.url || "N/A"}
Snippet: ${s.snippet.slice(0, 400)}`)
    .join("\n\n");
}

function extractClaims(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 40)
    .map(statement => {
      const sourceMatches = [...statement.matchAll(/\[S(\d+)\]/g)].map(m => Number(m[1]));
      const hasUnverified = /\[UNVERIFIED\]/i.test(statement);
      const hasHedge = /\b(suggests?|indicates?|may|appears? to|possibly|arguably|could)\b/i.test(statement);
      const confidence = sourceMatches.length > 0 ? 0.88
        : hasHedge ? 0.55
          : hasUnverified ? 0.20
            : 0.35;
      return { statement, source: sourceMatches, confidence, hasUnverified, hasHedge };
    });
}

function scoreClaimsCoverage(claims, sourceCount) {
  if (!claims.length) return 0;
  const covered = claims.filter(c => c.source.length > 0).length;
  const hedged = claims.filter(c => c.hasHedge && !c.hasUnverified).length;
  const rawCoverage = (covered + hedged * 0.5) / claims.length;
  const sourceDiversity = Math.min(1, sourceCount / 15);
  return (rawCoverage * 0.75) + (sourceDiversity * 0.25);
}

// ════════════════════════════════════════════════════════════════════════════════
// ACADEMIC SOURCE FETCHERS
// ════════════════════════════════════════════════════════════════════════════════

async function fetchArxivResults(query, limit = 5) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=relevance`;
  const res = await fetch(url, { headers: { "User-Agent": "AcademicHub/3.1" } });
  if (!res.ok) throw new Error("arXiv request failed");
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)].slice(0, limit).map(m => m[0]);
  return entries.map(entry => {
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/\s+/g, " ").trim();
    const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 500);
    const year = entry.match(/<published>(\d{4})-/)?.[1] || "";
    return { source: "arxiv", title, url: link, snippet: summary, year };
  });
}

async function fetchSemanticScholarResults(query, limit = 5) {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,year,abstract,url,authors,citationCount`;
  const res = await fetch(url, { headers: { "User-Agent": "AcademicHub/3.1" } });
  if (!res.ok) throw new Error("Semantic Scholar request failed");
  const data = await res.json();
  return (data.data || []).map(item => ({
    source: "semantic_scholar",
    title: item.title || "",
    url: item.url || `https://www.semanticscholar.org/paper/${item.paperId}`,
    snippet: (item.abstract || "").slice(0, 500),
    year: item.year || "",
    citationCount: item.citationCount || 0,
  }));
}

async function fetchSerperResults(serperApiKey, query, numResults = 8) {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": serperApiKey.trim(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: numResults }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Serper API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const results = [];

  if (data.knowledgeGraph?.title && data.knowledgeGraph?.description) {
    const kg = data.knowledgeGraph;
    results.push({ source: "web", title: kg.title, url: kg.descriptionLink ?? kg.website ?? "", snippet: kg.description });
  }

  if (data.answerBox) {
    const ab = data.answerBox;
    const snippet = ab.answer ?? ab.snippet ?? (Array.isArray(ab.snippetHighlighted) ? ab.snippetHighlighted.join(" ") : "") ?? "";
    if (snippet) results.push({ source: "web", title: ab.title ?? "Answer Box", url: ab.link ?? "", snippet });
  }

  if (Array.isArray(data.organic)) {
    for (const item of data.organic) {
      results.push({ source: "web", title: item.title ?? "", url: item.link ?? "", snippet: item.snippet ?? "" });
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════════════════════════════
// AI CALL UTILITIES
// Note: fallback model retry REMOVED — it doubled subrequest count on failures.
// Surface errors directly so callers can handle them properly.
// ════════════════════════════════════════════════════════════════════════════════

async function callAgent(apiKey, rolePrompt, history, userPrompt, temperature) {
  const response = await callAI(apiKey, rolePrompt, history, userPrompt, temperature);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Agent call failed (${response.status}): ${err}`);
  }
  const payload = await response.json();
  return stripReasoning(payload.choices?.[0]?.message?.content ?? "");
}

async function callAI(apiKey, systemPrompt, history, userQuery, temperature = 0.7) {
  // Single model, single fetch call — no fallback retry (would double subrequests)
  const res = await fetch("https://api.k2think.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MBZUAI/K2-Think-v2",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userQuery },
      ],
      temperature,
      max_tokens: 8192,
    }),
  });
  return res;
}

function stripReasoning(raw) {
  let out = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  if (out.includes("</think>")) out = out.split("</think>").pop();
  out = out.trim();

  const firstPaperIdx = out.indexOf("<paper");
  const firstSolutionIdx = out.indexOf("<solution");
  const validIdx = [firstPaperIdx, firstSolutionIdx].filter(i => i >= 0);
  if (validIdx.length > 0) {
    return out.slice(Math.min(...validIdx)).trim();
  }

  // Preserve strict JSON payloads for planner / tool-style phases.
  const jsonMatch = out.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) return jsonMatch[0].trim();

  // Fallback: return the full assistant content instead of the last paragraph.
  // Returning only the tail often drops the research body and keeps metadata lines
  // (e.g., confidence summaries), which breaks final paper output.
  return out;
}

function safeParsePlan(raw, query) {
  try {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    return {
      title: parsed.title || `Research: ${query}`,
      thesis: parsed.thesis || "",
      sections: Array.isArray(parsed.sections) && parsed.sections.length ? parsed.sections : ["Introduction", "Analysis", "Conclusion"],
      search_queries: Array.isArray(parsed.search_queries) && parsed.search_queries.length ? parsed.search_queries.slice(0, 2) : [query],
      key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
      potential_controversies: Array.isArray(parsed.potential_controversies) ? parsed.potential_controversies : [],
      out_of_scope: Array.isArray(parsed.out_of_scope) ? parsed.out_of_scope : [],
    };
  } catch {
    return {
      title: `Research: ${query}`,
      thesis: "",
      sections: ["Introduction", "Literature Review", "Analysis", "Findings", "Conclusion"],
      search_queries: [query],
      key_concepts: [],
      potential_controversies: [],
      out_of_scope: [],
    };
  }
}

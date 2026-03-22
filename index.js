// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║          Stremini Agent v7.0 — Research + Code Generation Engine            ║
// ║          10-Agent Pipeline | IMRAD | Peer-Review | Code Gen | Export        ║
// ║  Subrequest budget per FULL run (CF Free hard limit = 50):                  ║
// ║    Evidence  : 2 queries × 2 sources (serial)         =  4 fetches          ║
// ║    AI calls  : Commander(1)+Reasoner+Contra(1)+        =                    ║
// ║                Critic(1)+SectionWriter(7)+             =                    ║
// ║                PeerReview(1)+FinalAssembler(1)         = 11 AI calls        ║
// ║    CODE GEN  : Architect(1)+ResearchPaper(1)+          =                    ║
// ║                FileWriter(N)+DocWriter(1)              ≤ 15 AI calls        ║
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
        message: "Stremini Agent v7.0 — Research + Code Generation Engine is running.",
        agents: [
          "Commander", "ClaimEngine", "ContradictionAgent", "Reasoner",
          "Critic", "SectionWriter", "AbstractAgent", "PeerReviewAgent", "FinalAssembler",
          "LiteratureScanner", "HypothesisGenerator", "ExperimentDesigner", "DiscoveryWriter",
          "CodeArchitect", "CodeFileWriter", "CodeDocWriter", "CodeResearchWriter",
        ],
        features: [
          "full-manuscript-generation", "imrad-structure", "section-by-section-deep-writing",
          "peer-review-simulation", "claim-level-reasoning", "contradiction-detection",
          "confidence-scoring", "novelty-detection", "knowledge-graph", "evidence-first-writing",
          "apa7-citations", "evaluation-metrics-dashboard", "export-ready-output",
          "scientific-discovery-mode", "hypothesis-generation", "experiment-design",
          "literature-gap-analysis",
          // NEW v7.0
          "code-generation-mode", "production-code-output", "multi-file-projects",
          "research-paper-with-code", "architecture-diagrams", "setup-instructions",
          "docker-support", "test-generation",
        ],
      }), { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ status: "ERROR", message: "Method not allowed." }),
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      let body;
      try { body = await request.json(); }
      catch (_) {
        return new Response(
          JSON.stringify({ status: "ERROR", message: "Invalid JSON body." }),
          { status: 400, headers: corsHeaders }
        );
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
        manuscript_options = {},
        code_options = {},
      } = body;

      if (!query) return new Response(JSON.stringify({ status: "ERROR", message: "Missing query." }), { status: 400, headers: corsHeaders });
      if (!env.MBZUAI_API_KEY) return new Response(JSON.stringify({ status: "ERROR", message: "Worker secret missing." }), { status: 500, headers: corsHeaders });

      const trimmedHistory = history.slice(-12);

      // ── RESEARCH PIPELINE ──
      if (mode === "research" && phase === "FULL") {
        const pipelineResult = await runResearchPipeline({ env, query, history: trimmedHistory, seedSearchResults: searchResults });
        return new Response(JSON.stringify(pipelineResult), { headers: corsHeaders });
      }

      // ── MANUSCRIPT PIPELINE ──
      if (mode === "manuscript" || phase === "MANUSCRIPT") {
        const manuscriptResult = await runManuscriptPipeline({
          env, query, history: trimmedHistory,
          seedSearchResults: searchResults, options: manuscript_options,
        });
        return new Response(JSON.stringify(manuscriptResult), { headers: corsHeaders });
      }

      // ── DISCOVERY PIPELINE ──
      if (mode === "discovery" || phase === "DISCOVERY") {
        const discoveryResult = await runDiscoveryPipeline({
          env, query, history: trimmedHistory, seedSearchResults: searchResults,
        });
        return new Response(JSON.stringify(discoveryResult), { headers: corsHeaders });
      }

      // ── CODE GENERATION PIPELINE (v7.0 NEW) ──
      if (mode === "code" || phase === "CODE") {
        const codeResult = await runCodeGenerationPipeline({
          env, query, history: trimmedHistory,
          seedSearchResults: searchResults, options: code_options,
        });
        return new Response(JSON.stringify(codeResult), { headers: corsHeaders });
      }

      // ════════════════════════════════════════════════════════════════════════
      // DIAGRAM INSTRUCTIONS (shared)
      // ════════════════════════════════════════════════════════════════════════
      const diagramInstructions = `
DIAGRAMS — Embed Mermaid diagrams inline using this EXACT tag format (no backticks inside):

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
- Keep ALL node labels SHORT — under 22 characters, no special chars except spaces
- Place diagrams INSIDE the relevant section, not at the end
- Do NOT wrap diagram content in backticks or code fences
- Use simple ASCII node labels — no parentheses, brackets, or quotes inside node text
`;

      let systemPrompt = "";
      let userPrompt = query;
      let aiTemperature = 0.8;

      // MATH MODE
      if (mode === "math") {
        aiTemperature = 0.8;
        systemPrompt = `You are Stremini Agent's Mathematics Expert. Solve every problem with complete, unabbreviated rigour.
${diagramInstructions}
OUTPUT — wrap everything in <solution></solution> tags:

<solution>
PROBLEM RESTATEMENT
Precise formal restatement. Identify the mathematical domain.

GIVEN & FIND
Given: [all known quantities, constraints, domains, initial conditions]
Find: [exactly what must be computed, proven, or demonstrated]

APPROACH
State the strategy. Name all theorems, identities, or techniques.

SOLUTION
Step 1 — [Descriptive Name]
Full working with every intermediate line. Use plain ASCII math only.

ANSWER
=============================================
[Complete, unambiguous final answer]
=============================================

VERIFICATION
Independent check — substitute back, use a different method, or check edge cases.

INTERPRETATION
2-4 sentences on what the answer means.

KEY THEOREMS & CONCEPTS
List every theorem, identity, or lemma used.

EDGE CASES & CONSTRAINTS
Domain restrictions, special cases, conditions.

CONFIDENCE
State assumptions and any uncertainties.
</solution>

RULES: Output ONLY the <solution>...</solution> block. NEVER truncate. Plain ASCII math only.`;
      } else {
        if (phase === "PLAN") {
          aiTemperature = 0.8;
          systemPrompt = `You are the Stremini Agent Commander. Analyse the research topic and return strict JSON only. No markdown.
Format:
{
  "title": "Proposed Academic Paper Title — specific and informative",
  "thesis": "One-sentence core argument or research question",
  "sections": ["Introduction", "Literature Review", "Theoretical Framework", "Methodology", "Analysis: Subtopic A", "Analysis: Subtopic B", "Findings and Implications", "Conclusion"],
  "search_queries": ["targeted query 1", "targeted query 2", "targeted query 3", "targeted query 4", "targeted query 5"],
  "key_concepts": ["concept1", "concept2", "concept3", "concept4"],
  "potential_controversies": ["major debate 1", "major debate 2"],
  "competing_theories": ["theory A", "theory B"],
  "out_of_scope": ["what this paper will NOT cover"]
}`;
          userPrompt = `Create a rigorous, comprehensive academic research plan for: ${query}`;
        } else {
          // Fallback single-call paper
          let liveSearchResults = [];
          if (env.SERPER_API_KEY) { try { liveSearchResults = await fetchSerperResults(env.SERPER_API_KEY, query, 8); } catch (_) {} }
          let arxivResults = [];
          try { arxivResults = await fetchArxivResults(query, 5); } catch (_) {}
          const seenUrls = new Set(liveSearchResults.map(r => r.url));
          const allResults = [
            ...liveSearchResults,
            ...arxivResults.filter(r => !seenUrls.has(r.url)),
            ...searchResults.filter(r => !seenUrls.has(r.url)),
          ];
          const searchNote = allResults.length > 0
            ? `\n\nSOURCE EVIDENCE (cite as [1], [2], etc.):\n${allResults.map((r, i) => `[${i + 1}] (${r.source || "web"}) ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join("\n\n")}`
            : "";
          systemPrompt = `You are Stremini Agent's Elite Research Writer. Produce a complete, deeply detailed, publication-quality academic paper.
${diagramInstructions}
- Include at least 3 Mermaid diagrams placed inline.
- Mark any unverifiable claim [NEEDS VERIFICATION].
- Minimum 3000 words total.
- Pure academic prose — no bullet points in body text.
Wrap your entire output in <paper></paper> tags.
RULES: Output ONLY the <paper>...</paper> block. NEVER fabricate statistics or author names.${searchNote}`;
        }
      }

      const aiResponse = await callAI(env.MBZUAI_API_KEY, systemPrompt, trimmedHistory, userPrompt, aiTemperature);

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        return new Response(JSON.stringify({ status: "ERROR", message: `AI API error (${aiResponse.status}): ${errBody}` }), { headers: corsHeaders });
      }

      const aiData = await aiResponse.json();
      const rawMessage = aiData.choices?.[0]?.message?.content ?? "";
      const aiMessage = stripReasoning(rawMessage);

      if (!aiMessage) return new Response(JSON.stringify({ status: "ERROR", message: "AI returned empty response." }), { headers: corsHeaders });

      if (mode === "research" && phase === "PLAN") {
        try {
          const parsed = safeParsePlan(aiMessage, query);
          return new Response(JSON.stringify({ status: "PLAN", data: parsed }), { headers: corsHeaders });
        } catch (_) {
          return new Response(JSON.stringify({ status: "PLAN", data: { title: query, search_queries: [query], sections: [] } }), { headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({
        status: mode === "math" ? "SOLUTION" : "PAPER",
        content: aiMessage,
        metadata: { mode, phase },
      }), { headers: corsHeaders });

    } catch (err) {
      console.error("Top-level error:", err);
      return new Response(
        JSON.stringify({ status: "ERROR", message: err.message || "Unexpected server error." }),
        { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// IMRAD SECTIONS — v6.0
// ════════════════════════════════════════════════════════════════════════════════
const IMRAD_SECTIONS = [
  {
    id: "abstract",
    title: "Abstract",
    minWords: 300,
    instructions: "Structured abstract: Background, Objective, Methods, Results, Conclusions. Bold each label. 250-350 words. No citations.",
    diagramType: null,
  },
  {
    id: "introduction",
    title: "1. Introduction",
    minWords: 700,
    instructions: "Establish context, identify research gap, state thesis, outline paper structure. End with explicit statement of contributions.",
    diagramType: "mindmap",
  },
  {
    id: "literature_review",
    title: "2. Literature Review",
    minWords: 900,
    instructions: "Systematically review existing work. Organise by theme. Identify debates, gaps, and contradictions. Cite prolifically. Critical, not descriptive.",
    diagramType: "timeline",
  },
  {
    id: "theoretical_framework",
    title: "3. Theoretical Framework",
    minWords: 600,
    instructions: "Articulate the theoretical lens. Justify chosen framework over alternatives. State assumptions explicitly.",
    diagramType: "flowchart",
  },
  {
    id: "methodology",
    title: "4. Methodology",
    minWords: 700,
    instructions: "Research design, data sources, analytical procedures, validation approach. Justify every choice. Address limitations.",
    diagramType: "flowchart",
  },
  {
    id: "analysis_1",
    title: "5. Analysis and Discussion — Part I",
    minWords: 900,
    instructions: "First major thematic analysis. Every claim must be evidenced. Engage with counterarguments. Use hedging where appropriate.",
    diagramType: "graph",
  },
  {
    id: "analysis_2",
    title: "6. Analysis and Discussion — Part II",
    minWords: 900,
    instructions: "Second major theme. Explicitly address counterarguments. Nuance and hedging where evidence is contested.",
    diagramType: "flowchart",
  },
  {
    id: "findings",
    title: "7. Findings, Implications & Limitations",
    minWords: 800,
    instructions: "Synthesise findings. Theoretical implications. Practical recommendations. Compare to prior benchmarks. Unexpected findings. Study limitations.",
    diagramType: null,
  },
  {
    id: "conclusion",
    title: "8. Conclusion",
    minWords: 500,
    instructions: "Restate contributions. Synthesis of argument. Acknowledge limitations. Concrete future research agenda with specific questions.",
    diagramType: null,
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// AGENT ROLES — v7.0 (includes new Code agents)
// ════════════════════════════════════════════════════════════════════════════════
const AGENT_ROLES = {

  commander: `You are the Stremini Agent Commander. Create a precise research plan as strict JSON (no markdown). Identify key debates, competing theories, and explicit out-of-scope items. Never over-promise coverage.`,

  claimEngine: `You are the Stremini Agent Claim Engine. Your job is to decompose text into atomic, falsifiable claims.

For each claim output strict JSON in this format:
{
  "claims": [
    {
      "id": "C1",
      "statement": "exact claim text",
      "type": "empirical|theoretical|methodological|statistical",
      "variables": ["key variable 1", "key variable 2"],
      "conditions": "conditions under which this claim holds, or 'general'",
      "source_tags": ["S1", "S2"],
      "confidence_raw": 0.0
    }
  ]
}

Rules:
- Break compound sentences into single-fact atomic units
- type=statistical: must include numeric value
- type=empirical: must reference a study, observation, or dataset
- type=theoretical: conceptual, not yet empirically confirmed
- type=methodological: about research approach
- confidence_raw: 0.9 if cited, 0.5 if hedged, 0.2 if unverified, 0.1 if speculative
- Output ONLY valid JSON. No preamble, no markdown.`,

  contradictionAgent: `You are the Stremini Agent Contradiction Detector. Your job is to find evidence that OPPOSES each claim.

For each claim, search the source catalog for:
1. Direct contradictions (same variables, opposite conclusion)
2. Scope violations (claim is too broad; evidence only applies narrowly)
3. Recency problems (claim cites old data superseded by newer studies)
4. Confound issues (claim ignores a known confounding variable)

Output strict JSON:
{
  "verdicts": [
    {
      "claim_id": "C1",
      "support": [{"source": "S1", "relevance": "how it supports"}],
      "contradict": [{"source": "S2", "type": "direct|scope|recency|confound", "detail": "specific contradiction"}],
      "confidence": 0.0,
      "verdict": "supported|contested|refuted|insufficient_evidence"
    }
  ]
}

Confidence formula: base from citations, -0.2 per direct contradiction, -0.1 per scope/recency issue.
Be aggressive — assume every claim has at least one weakness. Output ONLY valid JSON.`,

  reasoner: `You are the Stremini Agent Deep Reasoner. You operate on VERIFIED CLAIMS, not raw text.
- Your input is a set of claims with confidence scores and contradiction verdicts.
- Build arguments claim by claim. Each paragraph must advance exactly one or two claims.
- Tag EVERY factual claim with its source: [S1], [S2], etc.
- Label any claim without a source [UNVERIFIED].
- Do NOT fabricate statistics, names, dates, or citations.
- Where evidence conflicts, note the disagreement explicitly.
- Use formal academic prose. No bullet points in body text.`,

  critic: `You are the Stremini Agent Adversarial Critic. Your only job is finding TRUTH FAILURES.

For each problem found, output:
TYPE: unsupported | logical-gap | outdated | contradiction | oversimplification | missing-counterevidence
CLAIM: exact quoted claim
REASON: specific reason it fails, with reference to which source disproves or fails to support it
FIX: minimum change needed to make the claim defensible

Do NOT comment on writing style, tone, or structure.
Be aggressive — assume the draft contains at least 5 truth failures.
Prioritise: fabricated stats > unsupported causal claims > missing contradicting evidence.`,

  sectionWriter: `You are the Stremini Agent Section Writer. You write ONE section of an academic manuscript at a time with exceptional depth and rigour.

Rules:
- Write ONLY the section assigned. No titles of other sections.
- Minimum word count must be met — substantive content only, never padding.
- Every factual claim must cite a source as [S1], [S2], etc.
- Label unverifiable claims [UNVERIFIED] — never fabricate.
- Pure academic prose: no bullet points, no numbered lists in body text.
- Engage competing views explicitly. Do not present one-sided arguments.
- Use precise hedging: "suggests", "indicates", "appears to", "the evidence implies".
- Where diagrams are requested, embed them inline using the format:
  <diagram type="TYPE" title="TITLE">mermaid_code</diagram>
  Node labels ≤22 chars, no special characters.`,

  abstractAgent: `You are the Stremini Agent Abstract Writer. You write ONLY the structured abstract.

Structure (use bold labels):
**Background:** 2-3 sentences on the problem context and why it matters.
**Objective:** 1 sentence — the precise research question or aim.
**Methods:** 2 sentences — research approach, data sources, analytical strategy.
**Results:** 2-3 sentences — key verified findings with confidence qualifiers.
**Conclusions:** 2 sentences — main contribution and implication.
**Keywords:** 6-8 terms separated by semicolons.

Rules:
- 250-350 words. No citations. No jargon.
- Write from the verified claims and section summaries provided.
- Do NOT fabricate results not present in the provided summaries.
- Output ONLY the structured abstract text. No section headers beyond the bold labels.`,

  peerReviewAgent: `You are the Stremini Agent Peer Reviewer. Simulate a rigorous academic peer review for a top-tier journal.

Your review must follow this structure:

SUMMARY
2-3 sentences on what the paper does and its main contribution.

MAJOR CONCERNS (must address before publication)
List each as: [M1], [M2], etc.
- State the specific section and paragraph
- Describe the problem precisely
- Suggest a concrete fix

MINOR CONCERNS (should be addressed)
List each as: [m1], [m2], etc.

STRENGTHS
What the paper does well — be specific.

VERDICT
Accept | Minor Revision | Major Revision | Reject
Justification: 2 sentences.

CONFIDENCE SCORE: X/10 (your confidence in the paper's claims overall)

Be genuinely critical. Assume the paper has at least 3 major concerns. Do NOT be diplomatic at the expense of accuracy.`,

  finalAssembler: `You are the Stremini Agent Final Assembler. You receive all individually written sections and assemble them into one complete, publication-ready academic manuscript.

Your tasks:
1. Remove redundancy — if the same point appears in multiple sections, keep the deepest treatment and trim the rest.
2. Ensure transitions — add 1-2 transition sentences between sections so the paper reads as a unified whole.
3. Ensure the argument flows: Introduction sets up → Literature Review contextualises → Framework/Methodology grounds it → Analysis proves it → Findings synthesise it → Conclusion closes it.
4. Cross-check all citation numbers — ensure [S1], [S2] etc. are consistent throughout.
5. Fix any hedge language inconsistencies — do not let confident claims in one section contradict hedged ones in another.
6. Incorporate peer review feedback where addressed.
7. Assemble the final reference list in APA 7th edition — ONLY sources actually cited in the text.

Output the ENTIRE manuscript wrapped in <manuscript></manuscript> tags. Include all sections in order. Minimum 5000 words total.`,

  finalWriter: `You are the Stremini Agent Final Writer. You write LAST, after all claims are verified.
Evidence-first rule: every paragraph starts from a verified claim — you are prose-ifying evidence, not generating text.
1. Transform the claim-verified draft into complete, publication-quality academic prose.
2. Every section must be FULLY written — minimum 400 words per major section.
3. Preserve all [Sx] citation tags. Soften unverified claims with hedge language.
4. Include mandatory sections: "Rejected Hypotheses", "Uncertainty Disclosure", "Bias Assessment".
5. Embed at least 3 Mermaid diagrams using <diagram type="TYPE" title="TITLE">mermaid_code</diagram> — node labels ≤22 chars, no special characters.
6. Output ONLY the final <paper>...</paper> block.`,

  // ── DISCOVERY AGENTS ──
  discoveryScanner: `You are the Stremini Discovery Agent — Literature Scanner. Your task: read the provided research literature and extract the current state of knowledge. Output strict JSON only (no markdown):
{"field":"concise field name","established_facts":[{"fact":"...","confidence":0.9,"sources":["S1"]}],"open_questions":[{"question":"...","importance":"high|medium|low","why_unsolved":"..."}],"methodological_gaps":["gap 1"],"conflicting_findings":[{"topic":"...","side_a":"...","side_b":"..."}],"frontier_areas":["area 1"],"key_methods":["method 1"]}
Be specific. Base everything on provided sources. Output ONLY valid JSON.`,

  hypothesisAgent: `You are the Stremini Discovery Agent — Hypothesis Generator. Generate original, testable scientific hypotheses based on literature gaps. Output strict JSON only (no markdown):
{"hypotheses":[{"id":"H1","statement":"If X, then Y, because Z","type":"mechanistic|correlational|causal|predictive","novelty":"high|medium|low","testability":"high|medium|low","rationale":"2-3 sentences grounding this in the gap","required_data":["data type 1"],"potential_confounds":["confound 1"],"falsification_criteria":"What result refutes this?","priority_score":0.85}]}
Generate 5-7 hypotheses ranked by priority_score. Each must address a gap from the scan. No trivially obvious hypotheses. Output ONLY valid JSON.`,

  experimentDesigner: `You are the Stremini Discovery Agent — Experiment Designer. Design rigorous, feasible experiments to test hypotheses. Output strict JSON only (no markdown):
{"experiments":[{"hypothesis_id":"H1","experiment_name":"Name","design_type":"RCT|observational|computational|meta-analysis","objective":"Precise objective","independent_variables":[{"var":"name","levels":["A","B"],"operationalisation":"how measured"}],"dependent_variables":[{"var":"name","measurement":"how","unit":"unit"}],"control_conditions":["ctrl 1"],"sample_requirements":{"size":"N=100","population":"who","inclusion":"criteria","exclusion":"criteria"},"analysis_plan":"statistical methods","expected_duration":"X months","resource_requirements":["equipment 1"],"success_criteria":"What confirms H?","null_result_interpretation":"What null means","feasibility":"high|medium|low","estimated_cost":"low|medium|high"}]}
Prioritise feasibility. Prefer computational/observational where possible. Output ONLY valid JSON.`,

  discoveryWriter: `You are the Stremini Discovery Agent — Scientific Discovery Report Writer. Synthesise literature analysis, hypotheses, and experiment designs into a coherent report. Wrap output in <discovery></discovery> tags. Structure:

EXECUTIVE SUMMARY — 3-4 sentences on top discovery and hypothesis.
LITERATURE STATE — Prose synthesis 400+ words, cite [S1][S2] etc.
IDENTIFIED GAPS — Critical open questions, 300+ words.
NOVEL HYPOTHESES — Each: state it, rationale, novelty, risk. 500+ words total.
EXPERIMENTAL ROADMAP — For each experiment: design, expected findings, timeline. 500+ words total.
PREDICTED DISCOVERIES — What new knowledge would emerge from top 3 experiments. 300+ words.
RISK ASSESSMENT — False positives, confounds, barriers. 200+ words.
CONCLUSION — Why this matters. 200+ words.
REFERENCES — All cited sources.

Rules: cite every claim [S1] etc. No fabricated stats. Include 2 Mermaid diagrams inline. Output ONLY the <discovery>...</discovery> block.`,

  // ── CODE GENERATION AGENTS (v7.0 NEW) ──
  codeArchitect: `You are the Stremini Code Architect. Your role is to design a complete, production-ready software system.

Given a description, return STRICT JSON (no markdown, no preamble):
{
  "project_name": "kebab-case-name",
  "description": "1-2 sentence description",
  "tech_stack": {
    "language": "primary language",
    "runtime": "e.g. Node.js 20, Python 3.11",
    "framework": "e.g. FastAPI, Express, Next.js",
    "database": "e.g. PostgreSQL, SQLite, none",
    "orm": "e.g. Prisma, SQLAlchemy, none",
    "testing": "e.g. pytest, Jest, vitest",
    "deployment": "e.g. Docker + Railway, Vercel, AWS Lambda"
  },
  "architecture_type": "monolith|microservices|serverless|cli",
  "folder_structure": [
    {"path": "src/", "description": "Source code"},
    {"path": "src/routes/", "description": "API route handlers"},
    {"path": "src/models/", "description": "Data models"},
    {"path": "src/services/", "description": "Business logic"},
    {"path": "src/utils/", "description": "Utilities"},
    {"path": "tests/", "description": "Test files"},
    {"path": "docs/", "description": "Documentation"}
  ],
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "description": "What this file does",
      "priority": "core|config|test|doc",
      "language": "python|javascript|typescript|json|yaml|markdown|dockerfile|sql"
    }
  ],
  "api_endpoints": [
    {"method": "GET", "path": "/api/v1/items", "description": "List all items", "auth": false}
  ],
  "environment_variables": [
    {"name": "DATABASE_URL", "description": "PostgreSQL connection string", "required": true, "example": "postgresql://user:pass@localhost:5432/db"}
  ],
  "setup_steps": [
    "Step 1: Clone repository",
    "Step 2: Install dependencies"
  ],
  "docker_support": true,
  "has_tests": true,
  "estimated_files": 8
}

Rules:
- Design for PRODUCTION quality — proper error handling, logging, security
- Keep scope realistic — generate 6-12 core files maximum
- Every file listed WILL be generated, so be precise
- Output ONLY valid JSON`,

  codeFileWriter: `You are the Stremini Code File Writer. You write ONE complete, production-quality source code file.

Rules:
- Output ONLY the file contents — no explanations, no preamble, no markdown fences
- The code must be COMPLETE and RUNNABLE — no placeholders, no "TODO: implement this"
- Include proper error handling, input validation, and logging
- Follow language-specific best practices and idiomatic patterns
- Add helpful inline comments for non-obvious logic
- Never truncate or abbreviate — write the FULL file
- For Python: type hints, docstrings, proper exception handling
- For JavaScript/TypeScript: JSDoc comments, proper async/await, error boundaries
- For config files: include all necessary fields with sensible defaults
- For SQL: include proper indexes, constraints, and comments`,

  codeDocWriter: `You are the Stremini Code Documentation Writer. You write clear, complete technical documentation.

Write a comprehensive README.md for the project. Include:
1. Project title and badges (build, license, version)
2. One-paragraph description
3. Features list
4. Prerequisites
5. Installation (step by step commands)
6. Configuration (.env setup)
7. Usage with examples
8. API Reference (if applicable)
9. Project structure explanation
10. Running tests
11. Docker usage (if applicable)
12. Deployment guide
13. Contributing guide
14. License

Use proper Markdown formatting. Include actual command examples. Be concrete and actionable.
Output ONLY the README.md content.`,

  codeResearchWriter: `You are the Stremini Research-Code Integration Writer. You produce publication-quality research papers that include complete implementation details.

You receive:
- A research topic with implementation focus
- A complete software system architecture
- Generated source code files

Your job: Write a full research paper that:
1. Describes the problem being solved
2. Reviews related approaches
3. Details the system architecture with diagrams
4. Explains implementation decisions
5. Provides evaluation methodology
6. Presents results and limitations
7. Includes the ACTUAL CODE inline in an "Implementation" section

Structure:
<paper>
[Title]
Authors: Stremini Agent Research Pipeline (v7.0)
Date: [date]
Keywords: [keywords]

ABSTRACT
[structured abstract]

1. INTRODUCTION
[motivation, problem statement, contributions]

2. RELATED WORK
[existing solutions, their limitations, why this approach differs]

3. SYSTEM ARCHITECTURE
[design decisions, component overview — include architecture diagram]

4. IMPLEMENTATION
[Technical implementation details. Include KEY code snippets inline using triple backtick fences with language tag. Focus on novel or complex parts.]

5. EVALUATION
[How to measure success, test cases, performance considerations]

6. RESULTS AND DISCUSSION
[What the system achieves, limitations, tradeoffs]

7. CONCLUSION
[Summary of contributions, future work]

REFERENCES
[cited sources in APA format]
</paper>

Rules:
- Minimum 2500 words
- Include at least 2 Mermaid architecture diagrams using <diagram> tags
- Include actual code snippets from the provided files — do NOT fabricate code
- Academic prose for all non-code sections`,
};

// ════════════════════════════════════════════════════════════════════════════════
// CODE GENERATION PIPELINE — v7.0
//
//  Step 1: Code Architect — design system, generate file manifest (1 AI call)
//  Step 2: Gather relevant sources / docs (evidence gathering)
//  Step 3: Code File Writer — generate each file (N AI calls, parallel-ish)
//  Step 4: Code Doc Writer — generate README (1 AI call)
//  Step 5: Research Paper Writer — write paper with code (1 AI call)
// ════════════════════════════════════════════════════════════════════════════════
async function runCodeGenerationPipeline({ env, query, history, seedSearchResults, options = {} }) {
  const apiKey = env.MBZUAI_API_KEY;
  const includeResearchPaper = options.include_research_paper !== false; // default true
  const targetLanguage = options.language || "auto";
  const framework = options.framework || "auto";

  // ── STEP 1: Code Architect — design the system ──
  const architectPrompt = `Design a complete, production-ready software system for this requirement:

${query}
${targetLanguage !== "auto" ? `\nRequired language: ${targetLanguage}` : ""}
${framework !== "auto" ? `\nRequired framework: ${framework}` : ""}

Return strict JSON only. No markdown. No preamble.`;

  const architectRaw = await callAgent(apiKey, AGENT_ROLES.codeArchitect, history, architectPrompt, 0.2);
  let architecture;
  try {
    const cleaned = architectRaw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    architecture = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  } catch (_) {
    architecture = {
      project_name: "stremini-generated-project",
      description: query,
      tech_stack: { language: "python", runtime: "Python 3.11", framework: "FastAPI", database: "SQLite", orm: "SQLAlchemy", testing: "pytest", deployment: "Docker" },
      architecture_type: "monolith",
      folder_structure: [],
      files: [
        { path: "main.py", description: "Main application entry point", priority: "core", language: "python" },
        { path: "requirements.txt", description: "Python dependencies", priority: "config", language: "text" },
        { path: "Dockerfile", description: "Docker configuration", priority: "config", language: "dockerfile" },
        { path: ".env.example", description: "Environment variables template", priority: "config", language: "text" },
        { path: "README.md", description: "Project documentation", priority: "doc", language: "markdown" },
        { path: "tests/test_main.py", description: "Main test file", priority: "test", language: "python" },
      ],
      api_endpoints: [],
      environment_variables: [],
      setup_steps: ["pip install -r requirements.txt", "python main.py"],
      docker_support: true,
      has_tests: true,
    };
  }

  // ── STEP 2: Gather relevant technical sources ──
  const evidence = await gatherMultiSourceEvidence(
    env,
    [query, `${architecture.tech_stack?.framework || ""} ${architecture.tech_stack?.language || ""} best practices`],
    seedSearchResults || []
  );
  const sourceCatalog = buildSourceCatalog(evidence);

  // ── STEP 3: Generate each file ──
  const coreFiles = (architecture.files || []).filter(f => f.priority === "core" || f.priority === "config");
  const testFiles = (architecture.files || []).filter(f => f.priority === "test");
  const docFiles = (architecture.files || []).filter(f => f.priority === "doc" && !f.path.toLowerCase().includes("readme"));

  const filesToGenerate = [...coreFiles, ...testFiles].slice(0, 10); // cap at 10 non-readme files

  const generatedFiles = {};
  const contextSoFar = [];

  for (const file of filesToGenerate) {
    const filePrompt = `PROJECT: ${architecture.project_name}
DESCRIPTION: ${architecture.description}
TECH STACK: ${JSON.stringify(architecture.tech_stack)}
ARCHITECTURE TYPE: ${architecture.architecture_type}

ALL PROJECT FILES (for context):
${(architecture.files || []).map(f => `- ${f.path}: ${f.description}`).join("\n")}

API ENDPOINTS:
${(architecture.api_endpoints || []).map(e => `${e.method} ${e.path} — ${e.description}`).join("\n") || "N/A"}

ENV VARIABLES:
${(architecture.environment_variables || []).map(e => `${e.name}: ${e.description} (example: ${e.example || "..."})`).join("\n") || "N/A"}

ALREADY GENERATED FILES (do not re-generate, use for imports/references):
${contextSoFar.map(f => `=== ${f.path} ===\n${f.content.slice(0, 400)}...`).join("\n\n") || "None yet"}

RELEVANT TECHNICAL SOURCES:
${sourceCatalog.slice(0, 1200)}

USER REQUIREMENT: ${query}

FILE TO GENERATE NOW:
Path: ${file.path}
Description: ${file.description}
Language: ${file.language}

Write the COMPLETE, PRODUCTION-READY contents of ${file.path}. Output ONLY the file contents. No markdown fences. No explanations.`;

    let fileContent = "";
    try {
      fileContent = await callAgent(apiKey, AGENT_ROLES.codeFileWriter, [], filePrompt, 0.3);
      // Strip accidental markdown fences if model adds them
      fileContent = fileContent
        .replace(/^```[\w]*\n?/gm, "")
        .replace(/\n?```\s*$/gm, "")
        .trim();
    } catch (err) {
      fileContent = `# ERROR: Could not generate ${file.path}\n# ${err.message}`;
    }

    generatedFiles[file.path] = fileContent;
    contextSoFar.push({ path: file.path, content: fileContent });
  }

  // ── STEP 4: Generate README ──
  const readmeFile = (architecture.files || []).find(f =>
    f.path.toLowerCase().includes("readme") || f.priority === "doc"
  );

  const readmePrompt = `PROJECT NAME: ${architecture.project_name}
DESCRIPTION: ${architecture.description}
TECH STACK: ${JSON.stringify(architecture.tech_stack)}
SETUP STEPS: ${(architecture.setup_steps || []).join(" | ")}
DOCKER: ${architecture.docker_support ? "Yes" : "No"}
API ENDPOINTS: ${(architecture.api_endpoints || []).map(e => `${e.method} ${e.path}`).join(", ") || "N/A"}
ENV VARIABLES: ${(architecture.environment_variables || []).map(e => e.name).join(", ") || "N/A"}
FOLDER STRUCTURE:
${(architecture.folder_structure || []).map(f => `${f.path} — ${f.description}`).join("\n")}

GENERATED FILES:
${Object.keys(generatedFiles).join("\n")}

USER REQUIREMENT: ${query}

Write the complete README.md. Output ONLY the README.md content.`;

  let readmeContent = "";
  try {
    readmeContent = await callAgent(apiKey, AGENT_ROLES.codeDocWriter, [], readmePrompt, 0.4);
  } catch (_) {
    readmeContent = `# ${architecture.project_name}\n\n${architecture.description}\n\n## Setup\n\n${(architecture.setup_steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }

  generatedFiles["README.md"] = readmeContent;

  // ── STEP 5: Research paper with code (optional but default ON) ──
  let researchPaper = null;
  if (includeResearchPaper) {
    const codeSnippetSummary = Object.entries(generatedFiles)
      .filter(([path]) => !path.includes("README"))
      .slice(0, 4)
      .map(([path, content]) => `=== ${path} ===\n${content.slice(0, 600)}`)
      .join("\n\n");

    const paperPrompt = `Research topic with implementation: ${query}

SYSTEM ARCHITECTURE:
${JSON.stringify(architecture, null, 2).slice(0, 2000)}

KEY GENERATED CODE FILES (excerpts):
${codeSnippetSummary}

FULL FILE LIST:
${Object.keys(generatedFiles).join(", ")}

RELEVANT TECHNICAL SOURCES:
${sourceCatalog.slice(0, 1500)}

Write the complete research paper with implementation details. Include architecture diagrams. Wrap in <paper></paper>.`;

    try {
      researchPaper = await callAgent(apiKey, AGENT_ROLES.codeResearchWriter, history, paperPrompt, 0.45);
      const paperMatch = researchPaper.match(/<paper>([\s\S]*?)(?:<\/paper>|$)/i);
      if (paperMatch) researchPaper = `<paper>${paperMatch[1].trim()}</paper>`;
    } catch (_) {
      researchPaper = null;
    }
  }

  // ── Build file tree for display ──
  const fileTree = buildFileTree(generatedFiles, architecture);

  return {
    status: "CODE",
    title: `${architecture.project_name} — Production Code + Research Paper`,
    project_name: architecture.project_name,
    description: architecture.description,
    architecture,
    files: generatedFiles,
    file_tree: fileTree,
    research_paper: researchPaper,
    content: researchPaper || "",
    metadata: {
      pipeline_version: "7.0",
      pipeline_type: "code-generation",
      agents_used: [
        "CodeArchitect",
        `CodeFileWriter×${Object.keys(generatedFiles).filter(k => !k.includes("README")).length}`,
        "CodeDocWriter",
        ...(includeResearchPaper ? ["CodeResearchWriter"] : []),
      ],
      tech_stack: architecture.tech_stack,
      architecture_type: architecture.architecture_type,
      total_files: Object.keys(generatedFiles).length,
      total_lines: Object.values(generatedFiles).reduce((acc, c) => acc + c.split("\n").length, 0),
      has_docker: architecture.docker_support,
      has_tests: architecture.has_tests,
      sources: evidence,
      sources_gathered: evidence.length,
      api_endpoints_count: (architecture.api_endpoints || []).length,
      has_research_paper: !!researchPaper,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// FILE TREE BUILDER
// ════════════════════════════════════════════════════════════════════════════════
function buildFileTree(files, architecture) {
  const tree = {};
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/");
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = {};
      node = node[parts[i]];
    }
    const filename = parts[parts.length - 1];
    const lines = content.split("\n").length;
    const desc = (architecture.files || []).find(f => f.path === path)?.description || "";
    node[filename] = { type: "file", lines, description: desc, size: content.length };
  }
  return tree;
}

// ════════════════════════════════════════════════════════════════════════════════
// MANUSCRIPT PIPELINE — v6.0 Full Publication Engine
// ════════════════════════════════════════════════════════════════════════════════
async function runManuscriptPipeline({ env, query, history, seedSearchResults, options = {} }) {
  const apiKey = env.MBZUAI_API_KEY;
  const citationStyle = options.citation_style || "APA7";
  const targetJournal = options.target_journal || "";
  const wordCountTarget = options.word_count || 6000;

  const plannerPrompt = `Return strict JSON only. No markdown, no preamble.
{
  "title": "Full descriptive academic paper title",
  "thesis": "One-sentence core research question or thesis",
  "sections": ["Introduction", "Literature Review", "Theoretical Framework", "Methodology", "Analysis Part I", "Analysis Part II", "Findings", "Conclusion"],
  "search_queries": ["query1", "query2", "query3", "query4", "query5"],
  "key_concepts": ["concept1", "concept2", "concept3", "concept4"],
  "potential_controversies": ["debate1", "debate2", "debate3"],
  "competing_theories": ["theory A", "theory B"],
  "methodological_approach": "qualitative|quantitative|mixed|theoretical|meta-analysis",
  "target_contribution": "What new knowledge this paper contributes",
  "out_of_scope": ["what this paper will NOT cover"]
}
Topic: ${query}${targetJournal ? `\nTarget Journal/Venue: ${targetJournal}` : ""}`;

  const plannerRaw = await callAgent(apiKey, AGENT_ROLES.commander, history, plannerPrompt, 0.2);
  const refinedPlan = safeParsePlan(plannerRaw, query);

  const evidence = await gatherMultiSourceEvidence(
    env,
    [query, ...(refinedPlan.search_queries || [])],
    seedSearchResults || []
  );
  const sourceCatalog = buildSourceCatalog(evidence);

  const reasonerPrompt = [
    `Topic: ${query}`,
    `Thesis: ${refinedPlan.thesis || ""}`,
    `Sections: ${(refinedPlan.sections || []).join(" | ")}`,
    `Key concepts: ${(refinedPlan.key_concepts || []).join(", ")}`,
    `Competing theories: ${(refinedPlan.competing_theories || []).join(", ")}`,
    `Controversies: ${(refinedPlan.potential_controversies || []).join(", ")}`,
    `Methodological approach: ${refinedPlan.methodological_approach || "theoretical"}`,
    "Write a detailed evidence-grounded skeleton draft. Tag EVERY factual claim [S1],[S2] etc. Mark missing-evidence claims [UNVERIFIED].",
    "Each section minimum 200 words. Engage competing perspectives. Formal academic prose. No bullet points.",
    `Sources:\n${sourceCatalog}`,
    `
AFTER the draft, append a JSON block exactly like this (no markdown fences):
<claims>
{
  "claims": [
    {"id":"C1","statement":"exact claim text","type":"empirical|theoretical|statistical|methodological","variables":["v1"],"conditions":"general","source_tags":["S1"],"confidence_raw":0.88},
    {"id":"C2","statement":"...","type":"...","variables":[],"conditions":"general","source_tags":[],"confidence_raw":0.2}
  ]
}
</claims>`,
  ].join("\n\n");

  const reasonerRaw = await callAgent(apiKey, AGENT_ROLES.reasoner, history, reasonerPrompt, 0.38);
  const claimsMatch = reasonerRaw.match(/<claims>([\s\S]*?)<\/claims>/i);
  let skeletonDraft = claimsMatch ? reasonerRaw.slice(0, reasonerRaw.indexOf("<claims>")).trim() : reasonerRaw;
  let claims = [];
  if (claimsMatch) {
    try { const parsed = JSON.parse(claimsMatch[1].trim()); claims = Array.isArray(parsed.claims) ? parsed.claims : []; } catch (_) {}
  }
  if (!claims.length) claims = extractClaimsFallback(skeletonDraft);

  const verdicts = scoreClaimsAgainstSources(claims, evidence);
  const scoredVerdicts = verdicts.map(v => ({ ...v, ...scoreVerdict(v, evidence) }));
  const avgConfidence = scoredVerdicts.length > 0
    ? scoredVerdicts.reduce((a, v) => a + v.confidence, 0) / scoredVerdicts.length : 0;

  const noveltyReport = detectNovelty(claims, evidence);
  const knowledgeGraph = buildKnowledgeGraph(claims, scoredVerdicts, evidence);

  const weakClaimSummary = scoredVerdicts
    .filter(v => v.confidence < 0.6 || v.contradiction_count > 0).slice(0, 12)
    .map(v => { const c = claims.find(cl => cl.id === v.claim_id); return `[${v.claim_id}|conf=${v.confidence}|${v.verdict}] ${c?.statement?.slice(0, 100) || ""}` }).join("\n");

  const criticPrompt = `Review this draft for TRUTH FAILURES only. Focus on: fabricated stats, unsupported causal claims, missing contradicting evidence.
WEAK CLAIMS: ${weakClaimSummary || "None flagged."}
SOURCES: ${sourceCatalog.slice(0, 2500)}
DRAFT: ${skeletonDraft.slice(0, 4000)}
For each problem: TYPE | CLAIM (quoted) | REASON | FIX`;

  const criticFeedback = await callAgent(apiKey, AGENT_ROLES.critic, history, criticPrompt, 0.2);

  const verifiedClaimBlock = scoredVerdicts
    .filter(v => v.verdict === "supported" || v.confidence >= 0.6)
    .map(v => { const c = claims.find(cl => cl.id === v.claim_id); return `[${v.claim_id}|${v.confidence}|${v.verdict}] ${c?.statement || ""}` }).join("\n");

  const contestedClaimBlock = scoredVerdicts
    .filter(v => v.verdict === "contested" || v.contradiction_count > 0)
    .map(v => { const c = claims.find(cl => cl.id === v.claim_id); return `[${v.claim_id}|${v.confidence}] ${c?.statement || ""}` }).join("\n");

  const writtenSections = {};
  for (const section of IMRAD_SECTIONS) {
    const sectionPrompt = buildSectionPrompt({
      section, query, refinedPlan, sourceCatalog, verifiedClaimBlock,
      contestedClaimBlock, criticFeedback, noveltyReport, skeletonDraft, citationStyle,
    });
    try {
      writtenSections[section.id] = await callAgent(apiKey, AGENT_ROLES.sectionWriter, [], sectionPrompt, 0.45);
    } catch (_) {
      writtenSections[section.id] = `[Section generation failed for: ${section.title}]`;
    }
  }

  const fullDraftForReview = Object.entries(writtenSections)
    .map(([id, text]) => `=== ${id.toUpperCase()} ===\n${text.slice(0, 600)}`).join("\n\n").slice(0, 5000);

  const peerReviewPrompt = `You are peer-reviewing this manuscript.
TITLE: ${refinedPlan.title}
EXCERPT: ${fullDraftForReview}
EVIDENCE QUALITY: Sources: ${evidence.length} | Verified: ${scoredVerdicts.filter(v => v.verdict === "supported").length}/${claims.length} | Avg confidence: ${(avgConfidence * 100).toFixed(1)}%
Conduct a full peer review.`;

  const peerReviewReport = await callAgent(apiKey, AGENT_ROLES.peerReviewAgent, [], peerReviewPrompt, 0.3);

  const refsPrompt = `Generate a ${citationStyle} reference list.
SOURCES: ${sourceCatalog.slice(0, 3000)}
FORMAT: Number each [1], [2], etc. One per line. Include DOI/URL.
OUTPUT: ONLY the formatted reference list. No heading, no preamble.`;

  let referenceList = "";
  try {
    referenceList = await callAgent(apiKey, AGENT_ROLES.finalWriter, [], refsPrompt, 0.1);
  } catch (_) {
    referenceList = evidence.map((s, i) => `[${i + 1}] ${s.title}${s.year ? ` (${s.year})` : ""}. ${s.url || ""}`).join("\n");
  }

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const keywordsStr = (refinedPlan.key_concepts || []).slice(0, 8).join("; ");

  const sectionBlocks = IMRAD_SECTIONS.map(s => {
    const body = writtenSections[s.id] || "";
    return `${s.title}\n\n${body}`;
  }).join("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

  const finalManuscript = `<manuscript>
${refinedPlan.title}

Authors: Stremini Agent Research Pipeline (v7.0)
Date: ${dateStr}
Keywords: ${keywordsStr}
Citation Style: ${citationStyle}${targetJournal ? `\nTarget Journal: ${targetJournal}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sectionBlocks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REFERENCES

${referenceList}
</manuscript>`;

  const evalMetrics = buildEvaluationMetrics(claims, verdicts, evidence, 1);

  return {
    status: "MANUSCRIPT",
    title: refinedPlan.title || query,
    content: finalManuscript,
    sections: writtenSections,
    peer_review: peerReviewReport,
    follow_up: {
      type: "offer_code_generation",
      question: "Would you like production-ready code generated from this manuscript?",
      suggested_code_query: `Build a full production-ready software project that implements and operationalizes this research manuscript topic: ${refinedPlan.title || query}.`,
      recommended_options: {
        include_research_paper: false,
        language: "auto",
        framework: "auto",
      },
    },
    metadata: {
      pipeline_version: "7.0",
      pipeline_type: "full-manuscript",
      pipeline_architecture: "imrad-section-by-section",
      agents_used: ["Commander", "Reasoner+ClaimEngine", "Critic", `SectionWriter×${IMRAD_SECTIONS.length - 1}`, "AbstractAgent", "PeerReviewAgent", "FinalAssembler"],
      citation_style: citationStyle,
      target_journal: targetJournal || null,
      word_count_target: wordCountTarget,
      evaluation: { ...evalMetrics, novelty: noveltyReport.summary },
      claims: claims.map(c => {
        const v = scoredVerdicts.find(sv => sv.claim_id === c.id);
        const n = noveltyReport.claim_novelty.find(nv => nv.claim_id === c.id);
        return { ...c, confidence: v?.confidence ?? c.confidence_raw, verdict: v?.verdict ?? "unscored", support_count: v?.support_count ?? 0, contradiction_count: v?.contradiction_count ?? 0, novelty_status: n?.novelty_status ?? "unknown" };
      }),
      knowledge_graph: knowledgeGraph,
      sources: evidence,
      sources_gathered: evidence.length,
      plan: refinedPlan,
      quality_reports: { critic: criticFeedback.slice(0, 800), peer_review: peerReviewReport },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// SECTION PROMPT BUILDER
// ════════════════════════════════════════════════════════════════════════════════
function buildSectionPrompt({ section, query, refinedPlan, sourceCatalog, verifiedClaimBlock, contestedClaimBlock, criticFeedback, noveltyReport, skeletonDraft, citationStyle }) {
  const diagramNote = section.diagramType
    ? `\n\nDIAGRAM REQUIRED: Embed ONE ${section.diagramType} diagram inline using:\n<diagram type="${section.diagramType}" title="Relevant Title">\n${section.diagramType === "mindmap" ? 'mindmap\n  root((Core Topic))\n    Branch A\n      Item 1' : 'flowchart TD\n    A[Start] --> B[Step]'}\n</diagram>\nNode labels ≤22 chars, no special characters.` : "";
  const skeletonSection = extractSkeletonSection(skeletonDraft, section.title);

  return `PAPER TOPIC: ${query}
PAPER TITLE: ${refinedPlan.title}
THESIS: ${refinedPlan.thesis}
SECTION TO WRITE: ${section.title}
MINIMUM WORDS: ${section.minWords}
CITATION STYLE: ${citationStyle}

SECTION INSTRUCTIONS: ${section.instructions}${diagramNote}

KEY CONCEPTS: ${(refinedPlan.key_concepts || []).join(", ")}
COMPETING THEORIES: ${(refinedPlan.competing_theories || []).join(", ")}
CONTROVERSIES: ${(refinedPlan.potential_controversies || []).join(", ")}

VERIFIED CLAIMS (build this section from these):
${verifiedClaimBlock.slice(0, 2000)}

CONTESTED CLAIMS (hedge or note contradictions):
${contestedClaimBlock.slice(0, 600)}

NOVELTY: novel=${noveltyReport.summary.novel} redundant=${noveltyReport.summary.redundant} ratio=${noveltyReport.summary.novelty_ratio}

CRITIC FEEDBACK TO ADDRESS:
${criticFeedback.slice(0, 400)}

SKELETON DRAFT FOR THIS SECTION:
${skeletonSection.slice(0, 800)}

SOURCE CATALOG:
${sourceCatalog}

Write the COMPLETE section now. Minimum ${section.minWords} words. Output ONLY the section content.`;
}

function extractSkeletonSection(draft, sectionTitle) {
  const cleanTitle = sectionTitle.replace(/^\d+\.\s*/, "").toLowerCase();
  const lines = draft.split("\n");
  let inSection = false;
  const sectionLines = [];
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    if (lineLower.includes(cleanTitle) && line.length < 100) { inSection = true; continue; }
    if (inSection) {
      if (/^#+\s|^\d+\.\s/.test(line) && line.length < 100 && sectionLines.length > 5) break;
      sectionLines.push(line);
    }
  }
  return sectionLines.join("\n").trim() || draft.slice(0, 600);
}

// ════════════════════════════════════════════════════════════════════════════════
// LEGACY RESEARCH PIPELINE — v5.1
// ════════════════════════════════════════════════════════════════════════════════
async function runResearchPipeline({ env, query, history, seedSearchResults }) {
  const apiKey = env.MBZUAI_API_KEY;

  const plannerPrompt = `Return strict JSON only. No markdown, no preamble.
{"title":"...","thesis":"One-sentence core research question","sections":["Introduction","Literature Review","Theoretical Framework","Methodology","Analysis","Findings","Conclusion"],"search_queries":["q1","q2","q3","q4","q5"],"key_concepts":["c1","c2","c3"],"potential_controversies":["d1","d2"],"competing_theories":["t1","t2"],"out_of_scope":["..."]}\nTopic: ${query}`;

  const plannerRaw = await callAgent(apiKey, AGENT_ROLES.commander, history, plannerPrompt, 0.2);
  const refinedPlan = safeParsePlan(plannerRaw, query);

  const evidence = await gatherMultiSourceEvidence(env, [query, ...(refinedPlan.search_queries || [])], seedSearchResults || []);
  const sourceCatalog = buildSourceCatalog(evidence);

  const reasonerSeedPrompt = [
    `Topic: ${query}`, `Thesis: ${refinedPlan.thesis || ""}`,
    `Sections: ${(refinedPlan.sections || []).join(" | ")}`,
    `Key concepts: ${(refinedPlan.key_concepts || []).join(", ")}`,
    `Competing theories: ${(refinedPlan.competing_theories || []).join(", ")}`,
    "Write a detailed, evidence-grounded draft. Tag every factual claim [S1],[S2] etc. Label missing-evidence claims [UNVERIFIED]. Each section minimum 200 words. Formal academic prose.",
    `Sources:\n${sourceCatalog}`,
    `\nAFTER the draft append:\n<claims>\n{"claims":[{"id":"C1","statement":"...","type":"empirical","variables":[],"conditions":"general","source_tags":["S1"],"confidence_raw":0.88}]}\n</claims>`,
  ].join("\n\n");

  const reasonerRaw = await callAgent(apiKey, AGENT_ROLES.reasoner, history, reasonerSeedPrompt, 0.38);
  const claimsMatch = reasonerRaw.match(/<claims>([\s\S]*?)<\/claims>/i);
  let reasonedDraft = claimsMatch ? reasonerRaw.slice(0, reasonerRaw.indexOf("<claims>")).trim() : reasonerRaw;
  let claims = [];
  if (claimsMatch) { try { const p = JSON.parse(claimsMatch[1].trim()); claims = Array.isArray(p.claims) ? p.claims : []; } catch (_) {} }
  if (!claims.length) claims = extractClaimsFallback(reasonedDraft);

  const verdicts = scoreClaimsAgainstSources(claims, evidence);
  const scoredVerdicts = verdicts.map(v => ({ ...v, ...scoreVerdict(v, evidence) }));
  const avgConfidence = scoredVerdicts.length > 0 ? scoredVerdicts.reduce((a, v) => a + v.confidence, 0) / scoredVerdicts.length : 0;
  const noveltyReport = detectNovelty(claims, evidence);
  const knowledgeGraph = buildKnowledgeGraph(claims, scoredVerdicts, evidence);

  const weakClaimSummary = scoredVerdicts.filter(v => v.confidence < 0.6 || v.contradiction_count > 0).slice(0, 12)
    .map(v => { const c = claims.find(cl => cl.id === v.claim_id); return `[${v.claim_id}|${v.confidence}|${v.verdict}] ${c?.statement?.slice(0, 100) || ""}` }).join("\n");

  const criticPrompt = `Fact-check this draft. TRUTH FAILURES only.\nWEAK CLAIMS:\n${weakClaimSummary || "None."}\nSOURCES:\n${sourceCatalog.slice(0, 2500)}\nDRAFT:\n${reasonedDraft.slice(0, 4000)}\nFor each: TYPE | CLAIM | REASON | FIX`;
  const criticFeedback = await callAgent(apiKey, AGENT_ROLES.critic, history, criticPrompt, 0.2);
  const confidence = Math.max(0, Math.min(1, avgConfidence - (/(unsupported|contradiction|cannot verify|fabricated)/i.test(criticFeedback) ? 0.12 : 0.02)));

  const verifiedClaimSummary = scoredVerdicts.filter(v => v.verdict === "supported" || v.confidence >= 0.6)
    .map(v => { const c = claims.find(cl => cl.id === v.claim_id); return `[${v.claim_id}|${v.confidence}|${v.verdict}] ${c?.statement || ""}` }).join("\n");
  const contestedClaimSummary = scoredVerdicts.filter(v => v.verdict === "contested" || v.contradiction_count > 0)
    .map(v => { const c = claims.find(cl => cl.id === v.claim_id); return `[${v.claim_id}|${v.confidence}] ${c?.statement || ""}` }).join("\n");

  const finalWriterPrompt = `Write the definitive publication-quality version of this research paper.
EVIDENCE-FIRST RULE: Every paragraph must start from a verified claim.
VERIFIED CLAIMS:\n${verifiedClaimSummary.slice(0, 2000)}
CONTESTED CLAIMS:\n${contestedClaimSummary.slice(0, 800)}
CRITIC FINDINGS:\n${criticFeedback.slice(0, 600)}
DIAGRAM INSTRUCTIONS: Embed exactly 3-5 Mermaid diagrams: <diagram type="TYPE" title="TITLE HERE">mermaid_code</diagram>
RESEARCH PLAN:\n${JSON.stringify(refinedPlan, null, 2)}
DRAFT:\n${reasonedDraft}
SOURCE CATALOG:\n${sourceCatalog}
Output — wrap EVERYTHING in <paper></paper>. Minimum 3500 words.`;

  const finalPaper = await callAgent(apiKey, AGENT_ROLES.finalWriter, history, finalWriterPrompt, 0.38);
  const paperMatch = finalPaper.match(/<paper>([\s\S]*?)(?:<\/paper>|$)/i);
  const verifiedPaper = paperMatch ? `<paper>${paperMatch[1].trim()}</paper>` : finalPaper;

  const evalMetrics = buildEvaluationMetrics(claims, verdicts, evidence, 1);

  return {
    status: "PAPER",
    title: refinedPlan.title || query,
    content: verifiedPaper,
    metadata: {
      pipeline_version: "5.1",
      pipeline_architecture: "evidence-first",
      agents_used: ["Commander", "Reasoner+ClaimEngine", "Critic", "FinalWriter"],
      confidence,
      evaluation: { ...evalMetrics, novelty: noveltyReport.summary },
      claims: claims.map(c => {
        const v = scoredVerdicts.find(sv => sv.claim_id === c.id);
        const n = noveltyReport.claim_novelty.find(nv => nv.claim_id === c.id);
        return { ...c, confidence: v?.confidence ?? c.confidence_raw, verdict: v?.verdict ?? "unscored", support_count: v?.support_count ?? 0, contradiction_count: v?.contradiction_count ?? 0, novelty_status: n?.novelty_status ?? "unknown" };
      }),
      knowledge_graph: knowledgeGraph,
      sources: evidence,
      sources_gathered: evidence.length,
      plan: refinedPlan,
      quality_reports: { final_critic: criticFeedback.slice(0, 600) },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// DISCOVERY PIPELINE
// ════════════════════════════════════════════════════════════════════════════════
async function runDiscoveryPipeline({ env, query, history, seedSearchResults }) {
  const apiKey = env.MBZUAI_API_KEY;

  const evidence = await gatherMultiSourceEvidence(env, [query, `${query} recent advances`, `${query} open problems`], seedSearchResults || []);
  const sourceCatalog = buildSourceCatalog(evidence);

  const scanRaw = await callAgent(apiKey, AGENT_ROLES.discoveryScanner, history, `Scientific field/topic: ${query}\n\nSOURCE LITERATURE:\n${sourceCatalog}\n\nAnalyse and extract state of knowledge. Return strict JSON only.`, 0.2);
  let literatureScan = {};
  try { const c = scanRaw.replace(/```json/gi, "").replace(/```/g, "").trim(); const m = c.match(/\{[\s\S]*\}/); literatureScan = JSON.parse(m ? m[0] : c); } catch (_) { literatureScan = { field: query, open_questions: [], established_facts: [], methodological_gaps: [], frontier_areas: [] }; }

  const hypothesisRaw = await callAgent(apiKey, AGENT_ROLES.hypothesisAgent, history, `Scientific field: ${query}\n\nLITERATURE SCAN:\n${JSON.stringify(literatureScan, null, 2).slice(0, 3000)}\n\nSOURCE CATALOG:\n${sourceCatalog.slice(0, 2000)}\n\nGenerate 5-7 novel hypotheses. Return strict JSON only.`, 0.5);
  let hypotheses = [];
  try { const c = hypothesisRaw.replace(/```json/gi, "").replace(/```/g, "").trim(); const m = c.match(/\{[\s\S]*\}/); const p = JSON.parse(m ? m[0] : c); hypotheses = Array.isArray(p.hypotheses) ? p.hypotheses : []; } catch (_) {}

  const experimentRaw = await callAgent(apiKey, AGENT_ROLES.experimentDesigner, history, `Scientific field: ${query}\n\nHYPOTHESES:\n${JSON.stringify(hypotheses.slice(0, 5), null, 2).slice(0, 3000)}\n\nEVIDENCE:\n${sourceCatalog.slice(0, 1500)}\n\nDesign one experiment per hypothesis. Return strict JSON only.`, 0.35);
  let experiments = [];
  try { const c = experimentRaw.replace(/```json/gi, "").replace(/```/g, "").trim(); const m = c.match(/\{[\s\S]*\}/); const p = JSON.parse(m ? m[0] : c); experiments = Array.isArray(p.experiments) ? p.experiments : []; } catch (_) {}

  const reportRaw = await callAgent(apiKey, AGENT_ROLES.discoveryWriter, history, `Writing discovery report for: ${query}\n\nLITERATURE SCAN:\n${JSON.stringify(literatureScan, null, 2).slice(0, 2000)}\n\nHYPOTHESES (${hypotheses.length}):\n${JSON.stringify(hypotheses, null, 2).slice(0, 2500)}\n\nEXPERIMENTS (${experiments.length}):\n${JSON.stringify(experiments, null, 2).slice(0, 2500)}\n\nSOURCE CATALOG:\n${sourceCatalog.slice(0, 2000)}\n\nWrite full discovery report. Include 2 Mermaid diagrams. Wrap in <discovery></discovery>.`, 0.45);
  const reportMatch = reportRaw.match(/<discovery>([\s\S]*?)(?:<\/discovery>|$)/i);
  const report = reportMatch ? reportMatch[1].trim() : reportRaw;

  return {
    status: "DISCOVERY",
    title: `${literatureScan.field || query} — Scientific Discovery Report`,
    content: report,
    literature_scan: literatureScan,
    hypotheses,
    experiments,
    metadata: {
      pipeline_version: "7.0",
      pipeline_type: "scientific-discovery",
      agents_used: ["LiteratureScanner", "HypothesisGenerator", "ExperimentDesigner", "DiscoveryWriter"],
      sources_gathered: evidence.length,
      sources: evidence,
      hypotheses_count: hypotheses.length,
      novel_hypotheses: hypotheses.filter(h => h.novelty === "high").length,
      high_priority_hypotheses: hypotheses.filter(h => (h.priority_score || 0) >= 0.7).length,
      experiments_designed: experiments.length,
      feasible_experiments: experiments.filter(e => e.feasibility === "high").length,
      open_questions: (literatureScan.open_questions || []).length,
      frontier_areas: literatureScan.frontier_areas || [],
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH
// ════════════════════════════════════════════════════════════════════════════════
function buildKnowledgeGraph(claims, verdicts, sources) {
  const nodes = {};
  const edges = [];
  for (const c of claims) nodes[c.id] = { id: c.id, type: "claim", label: c.statement.slice(0, 80), claimType: c.type, confidence: c.confidence_raw ?? 0 };
  for (let i = 0; i < sources.length; i++) nodes[`S${i + 1}`] = { id: `S${i + 1}`, type: "source", label: sources[i].title?.slice(0, 60) || "Untitled", url: sources[i].url || "", year: sources[i].year || "", citationCount: sources[i].citationCount || 0 };
  for (const v of verdicts) {
    for (const s of (v.support || [])) edges.push({ from: s.source, to: v.claim_id, rel: "supports", weight: 1.0 });
    for (const c of (v.contradict || [])) edges.push({ from: c.source, to: v.claim_id, rel: "contradicts", type: c.type, weight: -1.0 });
    const thisClaim = claims.find(c => c.id === v.claim_id);
    if (thisClaim) for (const other of claims) {
      if (other.id === v.claim_id) continue;
      const sharedVars = (thisClaim.variables || []).filter(v2 => (other.variables || []).includes(v2));
      if (sharedVars.length > 0) edges.push({ from: thisClaim.id, to: other.id, rel: "shares_variable", vars: sharedVars });
    }
  }
  return { nodes, edges, stats: { claimCount: claims.length, sourceCount: sources.length, edgeCount: edges.length } };
}

// ════════════════════════════════════════════════════════════════════════════════
// NOVELTY DETECTION
// ════════════════════════════════════════════════════════════════════════════════
function detectNovelty(claims, sources) {
  const allText = sources.map(s => `${s.snippet || ""} ${s.title || ""}`.toLowerCase()).join(" ");
  const results = claims.map(claim => {
    const words = claim.statement.toLowerCase().split(/\s+/).filter(w => w.length > 5);
    const keyWords = words.slice(0, 8);
    const matchCount = keyWords.filter(w => allText.includes(w)).length;
    const overlapRatio = keyWords.length > 0 ? matchCount / keyWords.length : 0;
    let noveltyStatus = overlapRatio > 0.75 ? "redundant" : overlapRatio > 0.45 ? "partially_known" : "potentially_novel";
    return { claim_id: claim.id, novelty_status: noveltyStatus, overlap_ratio: Number(overlapRatio.toFixed(2)) };
  });
  const novelCount = results.filter(r => r.novelty_status === "potentially_novel").length;
  const redundantCount = results.filter(r => r.novelty_status === "redundant").length;
  return { claim_novelty: results, summary: { novel: novelCount, partially_known: results.length - novelCount - redundantCount, redundant: redundantCount, novelty_ratio: Number((novelCount / Math.max(results.length, 1)).toFixed(2)) } };
}

// ════════════════════════════════════════════════════════════════════════════════
// CLAIM EXTRACTION FALLBACK
// ════════════════════════════════════════════════════════════════════════════════
function extractClaimsFallback(text) {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.length > 40).map((statement, i) => {
    const sourceTags = [...statement.matchAll(/\[S(\d+)\]/g)].map(m => `S${m[1]}`);
    const isHedged = /\b(suggests?|indicates?|may|appears? to|possibly|could)\b/i.test(statement);
    const isUnverified = /\[UNVERIFIED\]/i.test(statement);
    return { id: `C${i + 1}`, statement: statement.trim(), type: "empirical", variables: [], conditions: "general", source_tags: sourceTags, confidence_raw: sourceTags.length > 0 ? 0.88 : isHedged ? 0.5 : isUnverified ? 0.2 : 0.35 };
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// CONTRADICTION SCORING
// ════════════════════════════════════════════════════════════════════════════════
function scoreClaimsAgainstSources(claims, sources) {
  return claims.map(claim => {
    const words = claim.statement.toLowerCase().split(/\s+/).filter(w => w.length > 5);
    const keyWords = words.slice(0, 10);
    const support = [], contradict = [];
    for (let i = 0; i < sources.length; i++) {
      const sid = `S${i + 1}`;
      const text = `${sources[i].title || ""} ${sources[i].snippet || ""}`.toLowerCase();
      const matchCount = keyWords.filter(w => text.includes(w)).length;
      const matchRatio = keyWords.length > 0 ? matchCount / keyWords.length : 0;
      const isCited = claim.source_tags.includes(sid);
      if (isCited || matchRatio >= 0.5) support.push({ source: sid, relevance: isCited ? "explicitly cited" : `${Math.round(matchRatio * 100)}% keyword match` });
      else if (matchRatio >= 0.3) contradict.push({ source: sid, type: "scope", detail: `Partial overlap (${Math.round(matchRatio * 100)}%)` });
    }
    const currentYear = new Date().getFullYear();
    const hasRecentSource = claim.source_tags.some(tag => { const idx = parseInt(tag.replace("S", "")) - 1; return sources[idx]?.year && Number(sources[idx].year) >= currentYear - 5; });
    if (claim.source_tags.length > 0 && !hasRecentSource) contradict.push({ source: claim.source_tags[0], type: "recency", detail: "All cited sources may be older than 5 years" });
    let verdict = support.length >= 2 ? "supported" : support.length === 1 && contradict.length === 0 ? "supported" : contradict.length > support.length ? "contested" : support.length === 0 && claim.source_tags.length === 0 ? "insufficient_evidence" : "contested";
    return { claim_id: claim.id, support, contradict, verdict, confidence: claim.confidence_raw };
  });
}

function scoreVerdict(verdict, sources) {
  const supportCount = (verdict.support || []).length;
  const contradictCount = (verdict.contradict || []).length;
  const directContradictions = (verdict.contradict || []).filter(c => c.type === "direct").length;
  const recencyIssues = (verdict.contradict || []).filter(c => c.type === "recency").length;
  const currentYear = new Date().getFullYear();
  const supportedSourceYears = (verdict.support || []).map(s => { const src = sources.find((_, i) => `S${i + 1}` === s.source); return src?.year ? Number(src.year) : 0; });
  const avgRecency = supportedSourceYears.length > 0 ? supportedSourceYears.reduce((a, b) => a + b, 0) / supportedSourceYears.length : 0;
  const recencyFactor = avgRecency > 0 ? Math.min(0.1, (avgRecency - (currentYear - 5)) / 50) : 0;
  const citationStrength = (verdict.support || []).reduce((acc, s) => { const src = sources.find((_, i) => `S${i + 1}` === s.source); return acc + Math.min(0.05, (src?.citationCount || 0) / 1000); }, 0);
  const confidence = Math.max(0, Math.min(1, (0.5 * Math.min(supportCount / 3, 1)) - (0.25 * directContradictions) - (0.1 * (contradictCount - directContradictions)) - (0.05 * recencyIssues) + recencyFactor + Math.min(citationStrength, 0.15)));
  return { confidence: Number(confidence.toFixed(3)), support_count: supportCount, contradiction_count: contradictCount, recency_factor: Number(recencyFactor.toFixed(3)), citation_strength: Number(citationStrength.toFixed(3)) };
}

function buildEvaluationMetrics(claims, verdicts, sources, iterations) {
  const scoredVerdicts = verdicts.map(v => ({ ...v, ...scoreVerdict(v, sources) }));
  const totalClaims = claims.length;
  const verifiedClaims = scoredVerdicts.filter(v => v.verdict === "supported").length;
  const contestedClaims = scoredVerdicts.filter(v => v.verdict === "contested").length;
  const refutedClaims = scoredVerdicts.filter(v => v.verdict === "refuted").length;
  const insufficientClaims = scoredVerdicts.filter(v => v.verdict === "insufficient_evidence").length;
  const avgConfidence = totalClaims > 0 ? scoredVerdicts.reduce((a, v) => a + v.confidence, 0) / totalClaims : 0;
  const contradictionRate = totalClaims > 0 ? scoredVerdicts.filter(v => v.contradiction_count > 0).length / totalClaims : 0;
  const hallucination_proxy = (refutedClaims + insufficientClaims * 0.5) / Math.max(totalClaims, 1);
  return { total_claims: totalClaims, verified_claims: verifiedClaims, contested_claims: contestedClaims, refuted_claims: refutedClaims, insufficient_evidence_claims: insufficientClaims, pct_verified: Number((verifiedClaims / Math.max(totalClaims, 1) * 100).toFixed(1)), avg_confidence_score: Number((avgConfidence * 100).toFixed(1)), contradiction_rate: Number((contradictionRate * 100).toFixed(1)), hallucination_proxy_rate: Number((hallucination_proxy * 100).toFixed(1)), source_count: sources.length, iterations_run: iterations, scored_verdicts: scoredVerdicts };
}

// ════════════════════════════════════════════════════════════════════════════════
// EVIDENCE GATHERING
// ════════════════════════════════════════════════════════════════════════════════
async function gatherMultiSourceEvidence(env, queries, seedSearchResults = []) {
  const q = [...new Set(queries.filter(Boolean))].slice(0, 2);
  const results = [];
  for (const query of q) {
    try { const semantic = await fetchSemanticScholarResults(query, 8); results.push(...semantic.map(r => ({ ...r, query }))); } catch (_) {}
    if (env.SERPER_API_KEY) { try { const serper = await fetchSerperResults(env.SERPER_API_KEY, query, 6); results.push(...serper.map(r => ({ ...r, query }))); } catch (_) {} }
  }
  const merged = [...seedSearchResults, ...results].filter(r => r && (r.url || r.title || r.snippet)).map(r => ({ source: r.source || "web", title: r.title || "Untitled", url: r.url || "", snippet: r.snippet || "", query: r.query || q[0] || "", year: r.year || "", citationCount: r.citationCount || 0 }));
  const seen = new Set();
  return merged.filter(item => { const key = `${item.title.toLowerCase().slice(0, 60)}|${item.url}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 24);
}

function buildSourceCatalog(sources) {
  return sources.map((s, i) => `[S${i + 1}] (${s.source.toUpperCase()}) ${s.title}${s.year ? ` [${s.year}]` : ""}${s.citationCount ? ` [cited ${s.citationCount}x]` : ""}\nURL: ${s.url || "N/A"}\nSnippet: ${s.snippet.slice(0, 450)}`).join("\n\n");
}

// ════════════════════════════════════════════════════════════════════════════════
// ACADEMIC SOURCE FETCHERS
// ════════════════════════════════════════════════════════════════════════════════
async function fetchArxivResults(query, limit = 6) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=relevance`;
  const res = await fetch(url, { headers: { "User-Agent": "Stremini Agent/7.0" } });
  if (!res.ok) throw new Error("arXiv request failed");
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)].slice(0, limit).map(m => m[0]);
  return entries.map(entry => {
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/\s+/g, " ").trim();
    const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 550);
    const year = entry.match(/<published>(\d{4})-/)?.[1] || "";
    return { source: "arxiv", title, url: link, snippet: summary, year, citationCount: 0 };
  });
}

async function fetchSemanticScholarResults(query, limit = 6) {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,year,abstract,url,authors,citationCount`;
  const res = await fetch(url, { headers: { "User-Agent": "Stremini Agent/7.0" } });
  if (!res.ok) throw new Error("Semantic Scholar request failed");
  const data = await res.json();
  return (data.data || []).map(item => ({ source: "semantic_scholar", title: item.title || "", url: item.url || `https://www.semanticscholar.org/paper/${item.paperId}`, snippet: (item.abstract || "").slice(0, 550), year: item.year || "", citationCount: item.citationCount || 0 }));
}

async function fetchSerperResults(serperApiKey, query, numResults = 8) {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": serperApiKey.trim(), "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: numResults }),
  });
  if (!response.ok) { const errText = await response.text(); throw new Error(`Serper API error (${response.status}): ${errText}`); }
  const data = await response.json();
  const results = [];
  if (data.knowledgeGraph?.title && data.knowledgeGraph?.description) results.push({ source: "web", title: data.knowledgeGraph.title, url: data.knowledgeGraph.descriptionLink ?? data.knowledgeGraph.website ?? "", snippet: data.knowledgeGraph.description, citationCount: 0 });
  if (data.answerBox) { const ab = data.answerBox; const snippet = ab.answer ?? ab.snippet ?? (Array.isArray(ab.snippetHighlighted) ? ab.snippetHighlighted.join(" ") : "") ?? ""; if (snippet) results.push({ source: "web", title: ab.title ?? "Answer Box", url: ab.link ?? "", snippet, citationCount: 0 }); }
  if (Array.isArray(data.organic)) for (const item of data.organic) results.push({ source: "web", title: item.title ?? "", url: item.link ?? "", snippet: item.snippet ?? "", citationCount: 0 });
  return results;
}

// ════════════════════════════════════════════════════════════════════════════════
// AI CALL UTILITIES — with exponential backoff retry
// ════════════════════════════════════════════════════════════════════════════════
const RETRY_DELAYS_MS = [0, 2000, 5000, 12000];
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep_ms(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callAgent(apiKey, rolePrompt, history, userPrompt, temperature) {
  let lastErr = null;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) await sleep_ms(RETRY_DELAYS_MS[attempt]);
    let response;
    try { response = await callAI(apiKey, rolePrompt, history, userPrompt, temperature); }
    catch (networkErr) { lastErr = new Error(`Network error on attempt ${attempt + 1}: ${networkErr.message}`); continue; }
    if (response.status === 400 || response.status === 401 || response.status === 403) { const body = await response.text(); throw new Error(`Agent call failed (${response.status}): ${body}`); }
    if (!response.ok && RETRYABLE_STATUS.has(response.status)) { let body = ""; try { body = await response.text(); } catch (_) {} lastErr = new Error(`Agent call failed (${response.status}): ${body}`); if (attempt === RETRY_DELAYS_MS.length - 1) throw lastErr; continue; }
    if (!response.ok) { const body = await response.text(); throw new Error(`Agent call failed (${response.status}): ${body}`); }
    let payload;
    try { payload = await response.json(); } catch (parseErr) { lastErr = new Error(`Parse error on attempt ${attempt + 1}: ${parseErr.message}`); if (attempt === RETRY_DELAYS_MS.length - 1) throw lastErr; continue; }
    const content = payload.choices?.[0]?.message?.content ?? "";
    if (!content && attempt < RETRY_DELAYS_MS.length - 1) { lastErr = new Error(`Empty content on attempt ${attempt + 1}`); continue; }
    return stripReasoning(content);
  }
  throw lastErr ?? new Error("Agent call failed after all retries");
}

async function callAI(apiKey, systemPrompt, history, userQuery, temperature = 0.8) {
  return fetch("https://api.k2think.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "MBZUAI-IFM/K2-Think-v2", messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userQuery }], temperature, max_tokens: 8192 }),
  });
}

function stripReasoning(raw) {
  let out = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  if (out.includes("</think>")) out = out.split("</think>").pop();
  out = out.trim();
  const firstManuscriptIdx = out.indexOf("<manuscript");
  const firstPaperIdx = out.indexOf("<paper");
  const firstSolutionIdx = out.indexOf("<solution");
  const validIdx = [firstManuscriptIdx, firstPaperIdx, firstSolutionIdx].filter(i => i >= 0);
  if (validIdx.length > 0) return out.slice(Math.min(...validIdx)).trim();
  const jsonMatch = out.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) return jsonMatch[0].trim();
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
      sections: Array.isArray(parsed.sections) && parsed.sections.length ? parsed.sections : ["Introduction", "Literature Review", "Theoretical Framework", "Methodology", "Analysis", "Findings", "Conclusion"],
      search_queries: Array.isArray(parsed.search_queries) && parsed.search_queries.length ? parsed.search_queries.slice(0, 5) : [query],
      key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
      potential_controversies: Array.isArray(parsed.potential_controversies) ? parsed.potential_controversies : [],
      competing_theories: Array.isArray(parsed.competing_theories) ? parsed.competing_theories : [],
      methodological_approach: parsed.methodological_approach || "theoretical",
      target_contribution: parsed.target_contribution || "",
      out_of_scope: Array.isArray(parsed.out_of_scope) ? parsed.out_of_scope : [],
    };
  } catch {
    return { title: `Research: ${query}`, thesis: "", sections: ["Introduction", "Literature Review", "Theoretical Framework", "Methodology", "Analysis", "Findings", "Conclusion"], search_queries: [query], key_concepts: [], potential_controversies: [], competing_theories: [], methodological_approach: "theoretical", target_contribution: "", out_of_scope: [] };
  }
}

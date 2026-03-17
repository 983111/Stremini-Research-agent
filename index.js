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
      return new Response(JSON.stringify({ status: "OK", message: "Stremini Multi-Agent Research & Math Worker is running." }), { headers: corsHeaders });
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
        phase = "FULL", // "PLAN", "WRITE_SECTION", "VERIFY", or "FULL" (legacy)
        section_topic = "",
        draft_text = "",
        search_context = [],
        history = [],
        iteration = 0,
        searchResults = [],
      } = body;

      if (!query) {
        return new Response(JSON.stringify({ status: "ERROR", message: "Missing query." }), { status: 400, headers: corsHeaders });
      }

      if (!env.MBZUAI_API_KEY) {
        return new Response(JSON.stringify({ status: "ERROR", message: "Worker secret missing. Please set MBZUAI_API_KEY." }), { status: 500, headers: corsHeaders });
      }

      const trimmedHistory = history.slice(-10);

      // ── Shared diagram instructions ──
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
    A->>B: Follow-up
</diagram>

<diagram type="mindmap" title="Diagram Title Here">
mindmap
  root((Core Topic))
    Category One
      Item A
      Item B
    Category Two
      Item C
      Item D
    Category Three
      Item E
</diagram>

<diagram type="timeline" title="Diagram Title Here">
timeline
    title Development Timeline
    section Early Period
        1950 : First milestone
        1960 : Second milestone
    section Modern Era
        2000 : Key development
        2020 : Recent advance
</diagram>

<diagram type="graph" title="Diagram Title Here">
graph LR
    A[Concept A] --> B[Concept B]
    B --> C[Concept C]
    A --> C
    C --> D[Outcome]
</diagram>

Diagram usage guide:
- flowchart: use for processes, methodologies, decision trees, algorithms
- sequence: use for interactions, protocols, cause-effect chains
- mindmap: use for concept overviews, topic structures, literature maps
- timeline: use for historical developments, chronological reviews
- graph: use for relationships, networks, dependencies between concepts
- Keep all node labels SHORT — under 25 characters per node
- Place diagrams naturally INSIDE the relevant section, not at the end
- Do NOT wrap diagram content in backticks or code fences — use only the <diagram> tag
`;

      let systemPrompt = "";
      let userPrompt = query;
      let aiTemperature = 0.8; // Default for math and creative generation

      // ════════════════════════════════════════════════════════════════════════
      // MATH MODE
      // ════════════════════════════════════════════════════════════════════════
      if (mode === "math") {
        systemPrompt = `You are Stremini, a world-class mathematics expert and professor. You solve mathematical problems with complete rigour, showing every step. You may include Mermaid diagrams to illustrate proof structure, algorithm flow, or geometric relationships.
${diagramInstructions}
- Each math solution may include 1-2 diagrams if helpful.
OUTPUT — wrap everything in <solution></solution> tags and fill in ALL content with real mathematics:

<solution>
PROBLEM RESTATEMENT
Write a formal restatement of the problem in precise mathematical language.

GIVEN & FIND
Given: list all known quantities, conditions, and constraints
Find: state exactly what must be computed or proved

SOLUTION

Step 1 — [Write the actual name of this step, e.g. "Factor the denominator"]
Write the complete algebraic or logical working for this step. Show every intermediate line. Use ASCII math notation: fractions as a/b, powers as x^n, roots as sqrt(x), integrals as integral(f dx), sums as sum(i=1 to n). Justify each transformation with the rule or theorem applied.

Step 2 — [Write the actual name of this step]
Continue the working...

[Continue with as many steps as the problem requires — never skip or abbreviate]

[Insert a <diagram> here if it helps — e.g. flowchart of proof steps, or graph of relationships]

ANSWER
=============================================
[State the complete final answer clearly]
=============================================

VERIFICATION
Show the verification: substitute the answer back, check dimensions, or use an alternate method. Write out the full verification working.

KEY CONCEPTS USED
Write 2-4 sentences naming and briefly explaining the mathematical theorems, identities, or techniques applied in this solution.
</solution>

ABSOLUTE RULES:
- Output ONLY the <solution>...</solution> block. Zero words outside it.
- NEVER truncate. Show ALL steps with full working.
- Use plain ASCII math only — no LaTeX, no dollar signs, no backslashes.
- Fill in every section with real content — no placeholders.
- Name every theorem and lemma used in proofs.`;
      } 
      
      // ════════════════════════════════════════════════════════════════════════
      // RESEARCH MODE - MULTI-AGENT PIPELINE
      // ════════════════════════════════════════════════════════════════════════
      else {
        
        // ── AGENT 1: THE PLANNER ──
        if (phase === "PLAN") {
          aiTemperature = 0.3; // Low temp for strict JSON structuring
          systemPrompt = `You are the Stremini Commander Agent. Your job is to analyze a research topic and output a strictly formatted JSON research plan.
          Do not output any markdown formatting (no \`\`\`json) or pleasantries. Output ONLY raw JSON.
          Format:
          {
            "title": "Proposed Academic Paper Title",
            "sections": ["Introduction", "Literature Review", "Methodology", "Analysis: [Specific Subtopic]", "Conclusion"],
            "search_queries": ["highly targeted search query 1", "highly targeted search query 2", "highly targeted search query 3"]
          }`;
          userPrompt = `Create a rigorous academic research plan for the following topic: ${query}`;
        }
        
        // ── AGENT 2 & 3: THE RESEARCHER & WRITER ──
        else if (phase === "WRITE_SECTION") {
          let liveSearchResults = [];
          if (env.SERPER_API_KEY) {
            try {
              liveSearchResults = await fetchSerperResults(env.SERPER_API_KEY, `${query} ${section_topic}`);
            } catch (searchErr) {
              console.error("Serper search failed:", searchErr.message);
            }
          }

          const seenUrls = new Set(liveSearchResults.map(r => r.url));
          const mergedSearchResults = [
            ...liveSearchResults,
            ...searchResults.filter(r => !seenUrls.has(r.url)),
          ];

          const contextText = mergedSearchResults.length > 0
            ? `\n\nWEB SEARCH RESULTS:\n${mergedSearchResults.map((r, i) => `[${i+1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join("\n\n")}`
            : "No active search results provided. Rely on your internal knowledge base securely.";

          systemPrompt = `You are the Stremini Writer Agent. You are writing ONE comprehensive section of a larger academic paper.
          Maintain a formal, rigorous academic tone. 
          Use the provided search context to ground your writing and eliminate hallucinations. Cite sources using [1], [2], etc.
          If the context does not contain enough information, synthesize what is known and explicitly state theoretical gaps rather than hallucinating facts.
          ${diagramInstructions}
          Embed a Mermaid <diagram> ONLY if it highly clarifies the specific data or concepts in this section.`;
          
          userPrompt = `Paper Overall Topic: ${query}\n\nSection to Write: ${section_topic}\n${contextText}\n\nWrite the complete, substantive academic text for this section now. Do not include introductory conversational text. Output only the section content.`;
        }

        // ── AGENT 4: THE SELF-VERIFIER ──
        else if (phase === "VERIFY") {
          aiTemperature = 0.1; // Lowest temp for fact-checking
          systemPrompt = `You are the Stremini Self-Verification Agent. Your job is to review drafted academic text and aggressively eliminate hallucinations, ensuring alignment with the provided source context.
          Step 1: Extract verifiable claims from the text.
          Step 2: Cross-reference them strictly against the provided context.
          Step 3: Rewrite any sentence that is not supported by the context. If a claim cannot be verified, rephrase it as a suggestion (e.g., "Research suggests...") or remove it entirely.
          Output ONLY the refined, verified text. Do not explain your changes.`;
          
          const contextText = search_context.map((r, i) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
          userPrompt = `Context Data:\n${contextText}\n\nDraft Text to Verify:\n${draft_text}\n\nReturn the fully verified, corrected text now.`;
        }

        // ── LEGACY SINGLE-SHOT RESEARCH MODE (Fallback) ──
        else {
          let liveSearchResults = [];
          if (env.SERPER_API_KEY) {
            try {
              liveSearchResults = await fetchSerperResults(env.SERPER_API_KEY, query);
            } catch (searchErr) {
              console.error("Serper search failed:", searchErr.message ?? String(searchErr));
            }
          }

          const seenUrls = new Set(liveSearchResults.map(r => r.url));
          const mergedSearchResults = [
            ...liveSearchResults,
            ...searchResults.filter(r => !seenUrls.has(r.url)),
          ];

          const searchNote = mergedSearchResults.length > 0
            ? `\n\nWEB SEARCH RESULTS:\n${mergedSearchResults.map((r, i) => `[${i+1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join("\n\n")}\n\nUse these sources. Cite as [1], [2], etc. Prioritise these results for current facts.`
            : "";

          systemPrompt = `You are Stremini, an elite academic research assistant. You write complete, publication-quality research papers filled with real content, real analysis, and embedded Mermaid diagrams. You never output templates or placeholder text.

Given a topic, write the ENTIRE paper NOW — every sentence, every paragraph, every diagram — all real and complete.
${diagramInstructions}
- Each paper must include at least 3 diagrams.
Wrap your entire output in <paper></paper> tags. Structure as follows, replacing every instruction line with real written content:

<paper>
[The actual full title of this paper in Title Case]

Authors: Stremini Research Agent
Date: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSTRACT

Write 200 words of real abstract prose here. Cover: what the paper investigates and why it matters, the analytical approach used, the key findings discovered, and the implications for the field. Must be a fully written paragraph with real sentences.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. INTRODUCTION

Write 4 full paragraphs of real introduction text. Paragraph 1: establish background and context for the topic. Paragraph 2: identify the specific problem or research gap. Paragraph 3: state the objectives and scope of this paper. Paragraph 4: preview the structure of the paper. Use formal academic English.

[Insert a mindmap or flowchart <diagram> here visualising the paper's core themes or the topic's key dimensions]

2. LITERATURE REVIEW / BACKGROUND

Write 4 full paragraphs reviewing real prior work. Discuss key foundational studies and their contributions. Describe competing theories or perspectives. Note gaps or contradictions in the existing literature. Reference real authors and publications.

[Insert a timeline <diagram> showing the field's historical development, OR a graph <diagram> showing relationships between key concepts]

3. METHODOLOGY / THEORETICAL FRAMEWORK

Write 3 full paragraphs describing the analytical approach used in this paper. Explain the theoretical lens or framework applied. Justify why this approach is appropriate for the research question.

[Insert a flowchart <diagram> illustrating the methodological process or analytical steps]

4. ANALYSIS AND DISCUSSION

4.1 [Write a real sub-section title directly relevant to the paper's topic]
Write 3 full paragraphs of substantive analysis under this sub-heading. Engage with evidence, data, arguments, and counterarguments. Draw on the literature reviewed.

4.2 [Write a real sub-section title directly relevant to the paper's topic]
Write 3 full paragraphs of substantive analysis. Develop the argument further. Introduce new dimensions or considerations.

[Insert a <diagram> here relevant to the analysis content — use flowchart, sequence, or graph as most appropriate]

4.3 [Write a real sub-section title directly relevant to the paper's topic]
Write 3 full paragraphs of substantive analysis. Address implications or challenges. Synthesise insights from earlier sections.

5. FINDINGS AND IMPLICATIONS

Write 4 full paragraphs presenting the key findings of the analysis. Discuss practical implications for practitioners or policymakers. Discuss theoretical implications for the academic field. Address how findings relate to the literature reviewed.

6. CONCLUSION

Write 3 full paragraphs concluding the paper. Paragraph 1: summarise the paper's core argument and contributions. Paragraph 2: acknowledge the limitations of this analysis. Paragraph 3: suggest specific, concrete directions for future research.

REFERENCES

[1] Author Last, First. "Article or Book Title." Journal Name or Publisher, Volume(Issue), Year, Pages. DOI or URL.
[2] ...
Write at least 10 real, verifiable academic references. Use real author names, real titles, real journals, and real years.
</paper>

ABSOLUTE RULES:
- Output ONLY the <paper>...</paper> block. Zero words before or after.
- NEVER output placeholder text — replace every instruction with real written content.
- Every major section must have full substantive paragraphs — minimum 3 per section.
- Include at least 3 Mermaid <diagram> blocks placed inline within relevant sections.
- Write the COMPLETE paper from title to last reference — never truncate.
- Use formal academic English with proper hedging language (suggests, indicates, may, appears to).${searchNote}`;
        }
      }

      // ── EXECUTE K2-THINK API ──
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

      // ── PARSE RESPONSE BASED ON MODE & PHASE ──
      
      if (mode === "research" && phase === "PLAN") {
        try {
          // Attempt to parse strictly, stripping out markdown formatting just in case
          const cleanJson = aiMessage.replace(/```json/g, "").replace(/```/g, "").trim();
          const plan = JSON.parse(cleanJson);
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

      if (mode === "research" && phase === "FULL") {
        const paperMatch = aiMessage.match(/<paper>([\s\S]*?)(?:<\/paper>|$)/i);
        if (paperMatch) {
          const paperContent = paperMatch[1].trim();
          const titleMatch = paperContent.match(/^(.+)/);
          const title = titleMatch ? titleMatch[1].trim() : "Research Paper";
          return new Response(JSON.stringify({ status: "PAPER", title, content: paperContent }), { headers: corsHeaders });
        }
      }

      // Plain text fallback (catches WRITE_SECTION, VERIFY, or missed tags)
      return new Response(JSON.stringify({
        status: "COMPLETED",
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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchSerperResults(serperApiKey, query, numResults = 10) {
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

  if (data.knowledgeGraph) {
    const kg = data.knowledgeGraph;
    if (kg.title && kg.description) {
      results.push({ title: kg.title, url: kg.descriptionLink ?? kg.website ?? "", snippet: kg.description });
    }
  }

  if (data.answerBox) {
    const ab = data.answerBox;
    const snippet = ab.answer ?? ab.snippet ?? (Array.isArray(ab.snippetHighlighted) ? ab.snippetHighlighted.join(" ") : "") ?? "";
    if (snippet) {
      results.push({ title: ab.title ?? "Answer Box", url: ab.link ?? "", snippet });
    }
  }

  if (Array.isArray(data.organic)) {
    for (const item of data.organic) {
      results.push({ title: item.title ?? "", url: item.link ?? "", snippet: item.snippet ?? "" });
    }
  }

  return results;
}

function stripReasoning(raw) {
  let out = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  if (out.includes("</think>")) {
    out = out.split("</think>").pop();
  }
  const lastPaperIdx    = out.lastIndexOf("<paper");
  const lastSolutionIdx = out.lastIndexOf("<solution");
  const actionIdx       = Math.max(lastPaperIdx, lastSolutionIdx);
  if (actionIdx !== -1) return out.slice(actionIdx).trim();

  const paragraphs = out.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    if (paragraphs[i].length <= 800 && paragraphs[i].includes("{") === false) return paragraphs[i]; // Avoid ripping out JSON responses
  }
  const lines = out.split("\n").map(l => l.trim()).filter(l => l);
  return (lines[lines.length - 1] ?? "").trim();
}

async function callAI(apiKey, systemPrompt, history, userQuery, temperature = 0.8) {
  const primaryUrl = "https://api.k2think.ai/v1/chat/completions";
  const headers = {
    "Authorization": `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
  };

  const buildBody = (model) => JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userQuery },
    ],
    temperature: temperature, // Dynamically adjusted based on agent phase
    max_tokens: 8192,
  });

  let res = await fetch(primaryUrl, { method: "POST", headers, body: buildBody("MBZUAI/K2-Think-v2") });
  if (!res.ok) {
    res = await fetch(primaryUrl, { method: "POST", headers, body: buildBody("MBZUAI-IFM/K2-Think-v2") });
  }
  return res;
}
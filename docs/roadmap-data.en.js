// Roadmap content — 10 months × 3 tracks × ~4 episodes/series.
// Exposed as window.ROADMAP.

(function () {
  // Helper: build episode row.
  const ep = (id, track, monthNum, seriesName, num, title, blurb, points) => ({
    id, track, month: "m" + monthNum, monthNum, num,
    series: seriesName, title, blurb, points,
  });

  // ── Series catalogue (one row per track-month). Episodes inline. ──────
  const series = [
    // ── AGENTS ────────────────────────────────────────────────────────
    {
      track: "agents", month: 1, name: "Mastering the tool",
      summary: "Stop yanking the prompt around and start using the tool.",
      episodes: [
        ep("a1","agents",1,"Mastering the tool","01","Three modes of work: research, development, chat",
          "Three different modes of interacting with an agent: research — to understand, development — to get it done, chat — a quick question. When to use which, and why you can't mix them.",
          ["Research: understand before you build","Development: a task with a clear outcome","Chat: a quick question without project context"]),
        ep("a2","agents",1,"Mastering the tool","02","Managing the session: chat tricks",
          "A session with an agent is a resource you have to manage. When to keep going, when to start over, how to keep the context from drowning in noise.",
          ["When to start a new session, when to continue","Clearing and branching the context","Techniques: pins, summaries, restarts"]),
        ep("a3","agents",1,"Mastering the tool","03","Code review of AI code: what to look for",
          "Confident hallucinations and where to look for them. What has to be in place before the code is even worth reading.",
          ["90-second checklist: types, tests, invariants, names","The 'plausible nonsense' pattern — how to spot it","What to ignore so you don't burn out on reviews"]),
        ep("a4","agents",1,"Mastering the tool","04","Agentic loops: stopping in order to move faster",
          "The signs of drift and over-engineering. When a rollback is cheaper than pushing on.",
          ["Checkpoints inside the loop","Symptoms: it rewrites things nobody asked for","The 3-iteration rule"]),
      ],
    },
    {
      track: "agents", month: 2, name: "Delegation and scale",
      summary: "What we hand off, what we keep, and how we control what we handed off.",
      episodes: [
        ep("a5","agents",2,"Delegation and scale","05","The delegation map: what we hand off to the agent",
          "The risk scale: boilerplate → business logic → decisions. What does NOT get delegated, and why.",
          ["The 'risk × observability' matrix","Trust as a function of tests and logs","The red zone: what to never delegate"]),
        ep("a6","agents",2,"Delegation and scale","06","Parallelism: several agents at once",
          "Worktrees, isolation, merge strategies. When parallelism saves time, and when it just adds chaos.",
          ["Isolating branches and contexts","Slot management: how many agents to keep in your head","The 'three parallel refactorings' anti-pattern"]),
        ep("a7","agents",2,"Delegation and scale","07","Tests as a contract with the agent",
          "The TDD loop with AI, reimagined. Property tests and invariants. Tests that catch the AI-specific mistakes.",
          ["Red-green-refactor: what changes","Property-based testing for the slippery spots","'Sanity-check' tests that catch hallucinations"]),
        ep("a8","agents",2,"Delegation and scale","08","Recovery patterns: when the agent gets it wrong",
          "Diagnosis: where in the chain the failure is. When to give up and do it yourself.",
          ["The diagnosis tree: context / instruction / model","Rollback vs splitting up vs rephrasing","The 'cheaper by hand' point — how to catch it"]),
      ],
    },
    {
      track: "agents", month: 3, name: "Context engineering",
      summary: "The context window as a primary resource. RAG, indexes, compression.",
      episodes: [
        ep("a9","agents",3,"Context engineering","09","RAG: when you need it, when it's hype",
          "Where retrieval genuinely helps, and where it's just a way to pile tokens into the context.",
          ["Signs of a 'RAG-shaped' task","Alternatives: indexes, graphs, file tools","The cost of retrieval accuracy"]),
        ep("a10","agents",3,"Context engineering","10","Context libraries: an index of project knowledge",
          "What to put in the context library so the agent stops asking the same things over and over.",
          ["The structure of a context library","Versioning the context","Who updates it — a human or the agent"]),
        ep("a11","agents",3,"Context engineering","11","Context compression: what to drop, what to keep",
          "Strategies for compressing history and working on a long task inside a short window.",
          ["Summary instructions and handoff","When a summary is worse than a hard cutoff","Multi-step work with memory"]),
        ep("a12","agents",3,"Context engineering","12","The context window as a resource",
          "The token budget as the new CPU budget. Where to save, where to spend.",
          ["Profiling the context","A cheap model on a cheap step","When a long context doesn't help"]),
      ],
    },
    {
      track: "agents", month: 4, name: "Agentic patterns",
      summary: "Patterns for building agents: planning, reflection, sub-agents, evals.",
      episodes: [
        ep("a13","agents",4,"Agentic patterns","13","Planning vs ReAct: when to use which approach",
          "When you need an explicit plan, and when it's better to step and react.",
          ["Signs of a 'planning-shaped' task","Pure ReAct: where it works","The hybrid: plan + ReAct"]),
        ep("a14","agents",4,"Agentic patterns","14","Reflection: an agent that checks itself",
          "Self-critique and multi-pass: where it pays off, where it makes you three times slower.",
          ["A reflection-prompt template","When reflection is worse than a linear pass","Cost and accuracy"]),
        ep("a15","agents",4,"Agentic patterns","15","Sub-agents: when to split up a task",
          "One big agent vs an orchestrator + specialists.",
          ["The line between a sub-agent and a tool","Passing context between agents","When a specialist is worse than a generalist"]),
        ep("a16","agents",4,"Agentic patterns","16","Evaluator-optimizer loop",
          "The 'executor + evaluator' pair. When it's worth it, when it's overkill.",
          ["Metrics the evaluator understands","Infinite loops: how to catch them","Applying it to code generation"]),
      ],
    },
    // ── COMMS ─────────────────────────────────────────────────────────
    {
      track: "comms", month: 1, name: "Influence without authority",
      summary: "Where a senior's influence comes from when they manage no one.",
      episodes: [
        ep("c1","comms",1,"Influence without authority","01","A senior has no authority, but has influence",
          "Formal authority vs technical influence. Why 'I'm right' doesn't work.",
          ["Sources of influence: expertise, relationships, track record","Trust capital — how to build it and spend it","Why being right is necessary but not sufficient"]),
        ep("c2","comms",1,"Influence without authority","02","The language of stakeholders: translating from technical",
          "How to explain tech debt to a product manager. How to explain risk to a manager.",
          ["Framework: problem → impact → proposal","What to cut from the explanation and why","The 'technical details in the first sentence' anti-pattern"]),
        ep("c3","comms",1,"Influence without authority","03","Feedback that actually gets heard",
          "Why your PR comments get ignored. SBI: Situation–Behavior–Impact.",
          ["SBI in practice: 3 before/after examples","PR comments: what to rewrite","When not to give feedback at all"]),
        ep("c4","comms",1,"Influence without authority","04","Disagreement and commitment",
          "Disagree and commit in practice. How to voice disagreement without becoming 'that guy'.",
          ["A disagree-comment template","Putting your position in writing — why","The line: where disagreement becomes sabotage"]),
      ],
    },
    {
      track: "comms", month: 2, name: "Expectations and commitments",
      summary: "How to keep estimates from turning into promises, and say 'no' so that you're heard.",
      episodes: [
        ep("c5","comms",2,"Expectations and commitments","05","Estimates vs commitments: a dangerous mix-up",
          "Why your estimates get treated as promises.",
          ["Language markers of estimate vs commitment","Ranges instead of points","What to write in a note alongside an estimate"]),
        ep("c6","comms",2,"Expectations and commitments","06","'No' as a senior's tool",
          "When and how to say no. Alternatives to a flat refusal.",
          ["'No, but' templates","The cost of 'yes' — how to make it visible","When 'no' is mandatory — and when it's sabotage"]),
        ep("c7","comms",2,"Expectations and commitments","07","Status updates: the art of visibility",
          "Why silence = everything's wrong. Proactive communication without micromanagement.",
          ["The rhythm of updates: daily / weekly / event-driven","A 3-line update template","The 'heroic silence' anti-pattern"]),
        ep("c8","comms",2,"Expectations and commitments","08","Escalation: when and how to raise a problem",
          "Escalation ≠ complaint. The formula: facts + impact + ask.",
          ["Signs that it's time to escalate","An email / message template","What to do after escalating"]),
      ],
    },
    {
      track: "comms", month: 3, name: "Written communication",
      summary: "RFCs, design docs, async without chaos — text as a senior's primary tool.",
      episodes: [
        ep("c9","comms",3,"Written communication","09","RFC: the document that moves decisions forward",
          "Why you need an RFC, how it differs from just a 'doc', and how to write one.",
          ["A 1-page RFC skeleton","What gets discussed in comments, what gets discussed out loud","When an RFC is unnecessary"]),
        ep("c10","comms",3,"Written communication","10","Design docs: what to write, what to leave out",
          "The line between a 'document for yourself' and a 'document for the team'.",
          ["The document's audience determines its content","Levels of detail","The anti-pattern: writing everything down"]),
        ep("c11","comms",3,"Written communication","11","Async without chaos",
          "The messaging rules that make async actually work.",
          ["The structure of an async message","What speaks for you — and what doesn't","When async breaks down and it's time to talk live"]),
        ep("c12","comms",3,"Written communication","12","Long text vs short message",
          "Why short is harder. And when long is better.",
          ["BLUF: bottom line up front","When to write long — and how","One paragraph versus ten"]),
      ],
    },
    {
      track: "comms", month: 4, name: "Meetings you won't be ashamed of",
      summary: "When a meeting is needed, how to prepare it, and what's left after it.",
      episodes: [
        ep("c13","comms",4,"Meetings you won't be ashamed of","13","When a meeting — and when a document",
          "A simple test before you schedule a meeting.",
          ["Decision vs discussion vs sync","The cost of a meeting in person-hours","Alternatives in an async format"]),
        ep("c14","comms",4,"Meetings you won't be ashamed of","14","Preparing a meeting in 10 minutes",
          "The minimal set that turns a meeting into one with an outcome.",
          ["An agenda template","Pre-read as a mandatory element","Who to invite, who not to invite"]),
        ep("c15","comms",4,"Meetings you won't be ashamed of","15","Facilitation: how to pull out a decision",
          "What a facilitator does and why it's so often a senior's role.",
          ["Steering a discussion without authority","When to step in, when to stay quiet","A decision by the end of the hour"]),
        ep("c16","comms",4,"Meetings you won't be ashamed of","16","Follow-up: what's left afterward",
          "A meeting without a follow-up never happened.",
          ["A follow-up template","Action items, owners, deadlines","How not to miss a decision quietly being reversed"]),
      ],
    },
    {
      track: "comms", month: 5, name: "Difficult conversations",
      summary: "Conflicts, emotions, and the conversations you've been putting off.",
      episodes: [
        ep("c17","comms",5,"Difficult conversations","17","Preparing for a difficult conversation",
          "Half the battle is won before you walk into the room.",
          ["The goal of the conversation in one sentence","What the other side wants","The worst case and a plan B"]),
        ep("c18","comms",5,"Difficult conversations","18","Emotion vs position",
          "How to separate what a person feels from what they're defending.",
          ["Hear the emotion without reacting to it","Naming the feeling defuses the tension","When the emotion matters more than the position"]),
        ep("c19","comms",5,"Difficult conversations","19","A one-way conversation → a two-way one",
          "How to turn 'he won't listen' into 'we're discussing it'.",
          ["Questions instead of statements","Paraphrasing without mockery","Points of agreement as an anchor"]),
        ep("c20","comms",5,"Difficult conversations","20","When to escalate, when to let it go",
          "Not every conflict needs to be resolved.",
          ["A scale of conflict importance","The cost of escalation","What to choose — the relationship or the decision"]),
      ],
    },
    // ── ARCHITECTURE ──────────────────────────────────────────────────
    {
      track: "arch", month: 1, name: "What a senior actually does",
      summary: "If AI writes the code — what's actually left as the senior's work.",
      episodes: [
        ep("r1","arch",1,"What a senior actually does","01","Architecture Decision Records",
          "ADRs in practice: we document the why, not the what. Plus Design and Project Records — capturing more than just the architecture.",
          ["A 1-page ADR template","Design / Project Records: what else is worth capturing","An ADR as a contract with your future self and with the agent"]),
        ep("r2","arch",1,"What a senior actually does","02","NFR: the invisible contract",
          "What non-functional requirements are and why nobody brings them up in meetings.",
          ["A map of the NFRs that usually go unspoken","Exercise: find the hidden NFRs in your project","How to drag an NFR all the way into a ticket"]),
        ep("r3","arch",1,"What a senior actually does","03","Architecture, linguistics, and terminology",
          "Half of all architecture arguments are arguments about words. A shared language as an architectural tool.",
          ["A term as a boundary of responsibility","Ubiquitous language in practice","When an argument about a name is an argument about design"]),
        ep("r4","arch",1,"What a senior actually does","04","Insights: AI and architecture",
          "What AI changes in architectural work, the myths that have grown up around it, and where intuition is still needed.",
          ["Insights: where AI genuinely helps the architect","Myths and architecture: what didn't pan out","Aesthetics and intuition in architectural decisions"]),
      ],
    },
    {
      track: "arch", month: 2, name: "The art of breaking things down",
      summary: "Decomposing tasks: vertical slices, small and verifiable.",
      episodes: [
        ep("r5","arch",2,"The art of breaking things down","05","Why big tasks are bound to fail",
          "Epics that never close. The link between size and uncertainty.",
          ["Size vs uncertainty: the chart","Signs of a zombie task","The 'second week' rule"]),
        ep("r6","arch",2,"The art of breaking things down","06","Vertical vs horizontal decomposition",
          "Why 'database first, then the API, then the UI' is a bad idea.",
          ["A slice through every layer in one ticket","Markers of horizontal decomposition","Exercise: slice up your own epic"]),
        ep("r7","arch",2,"The art of breaking things down","07","Acceptance criteria as a contract",
          "AC you can verify vs AC you can't.",
          ["Given–When–Then in practice","The 'works correctly' anti-pattern","AC that turn straight into tests"]),
        ep("r8","arch",2,"The art of breaking things down","08","Planning for AI delegation",
          "How to phrase tasks so they can be handed off to an agent.",
          ["A 'ready for the agent' checklist","Implicit knowledge: how to extract it","Tasks that stay with the human"]),
      ],
    },
    {
      track: "arch", month: 3, name: "Debt that matters",
      summary: "Technical debt and refactoring: which debt to pay down, how to sell a refactor.",
      episodes: [
        ep("r9","arch",3,"Debt that matters","09","Not all tech debt is equal",
          "Debt comes in different kinds. Which to pay off urgently, which to leave, which to take on deliberately.",
          ["Fowler's quadrant: four kinds of debt","Debt that never gets repaid","The metric that reveals dangerous debt"]),
        ep("r10","arch",3,"Debt that matters","10","Selling a refactor: the language of ROI",
          "How to explain to the business why you'd spend time on something that 'works fine as is'.",
          ["Refactoring in terms of money and risk","Tying it to features, not a standalone ticket","The 'we just need to rewrite it' anti-pattern"]),
        ep("r11","arch",3,"Debt that matters","11","Strangler fig: refactoring without stopping",
          "Replacing the system piece by piece without ever shutting it down.",
          ["The boundary between old and new","Cutover metrics","When the fig tree chokes the oak"]),
        ep("r12","arch",3,"Debt that matters","12","AI-assisted refactoring: new possibilities",
          "What changes in refactoring once the agent takes over the mechanics.",
          ["What to delegate to the agent during a refactor","Tests as a safety net in AI refactoring","Where the agent is dangerous in legacy code"]),
      ],
    },
    {
      track: "arch", month: 4, name: "Review as architectural control",
      summary: "Code review as a tool for influence and for controlling architectural boundaries.",
      episodes: [
        ep("r13","arch",4,"Review as architectural control","13","What to look for in review: a hierarchy of importance",
          "Not everything in a review is equally important. The order in which to look.",
          ["The hierarchy: correctness → boundaries → style","What to ignore so you don't drown","A 90-second first pass"]),
        ep("r14","arch",4,"Review as architectural control","14","Boundary review: where code meets code",
          "The most important thing in a review is the architectural boundaries and the points of contact.",
          ["Module boundaries as the focus of the review","Contracts at the seams","Where coupling is born"]),
        ep("r15","arch",4,"Review as architectural control","15","Review for AI-generated code",
          "What changes in a review when the code's author is an agent.",
          ["New red flags in review","Confident hallucinations","Who's responsible for the merge"]),
        ep("r16","arch",4,"Review as architectural control","16","From review to pairing: when to switch",
          "Sometimes PR comments are the wrong format. When it's better to sit down together.",
          ["Signals that the review isn't working","Pairing with a human and with an agent","The cost of switching"]),
      ],
    },
    {
      track: "arch", month: 5, name: "Scaling through people",
      summary: "Mentoring and knowledge transfer: how to stop being a single point of failure.",
      episodes: [
        ep("r17","arch",5,"Scaling through people","17","Your knowledge doesn't scale",
          "You are the single point of failure. What to do about it.",
          ["Bus factor as a risk","What to move out of your head and into a system","When you are the team's bottleneck"]),
        ep("r18","arch",5,"Scaling through people","18","Documentation people actually read: docs as code",
          "Why most docs are dead and how to make living ones.",
          ["Docs as code: next to the code, in review","What to document, what not to","Documentation as a test of clarity"]),
        ep("r19","arch",5,"Scaling through people","19","Onboarding as an architectural test",
          "Onboarding speed is a direct indicator of architecture quality.",
          ["Onboarding as a design metric","A new engineer's first week","Context documents as the raw material"]),
        ep("r20","arch",5,"Scaling through people","20","How to teach AI to train developers",
          "The agent as a tool for transferring knowledge within the team.",
          ["The context library as a textbook","A mentor agent for onboarding","The limits of trust in training"]),
      ],
    },
  ];

  // Demo: the `agents` track starts later than the others — at week 7
  // (mid-month-2). Months stay natural; the week offset is applied at render
  // time, so the engine has to cope with an arbitrary, non-month-aligned hole.
  const trackStartWeek = { comms: 1, arch: 1, agents: 7 };
  const visibleSeries = series;
  const episodes = visibleSeries.flatMap((s) => s.episodes);

  window.ROADMAP = {
    concept: {
      title: "Background learning",
      kicker: "v1.0 — a regular program",
      tagline:
        "Not a course with deadlines. Not a marathon. Content that ships regularly and slots into your week — in the background, like editor updates.",
      pitch: [
        "Every week, three short 15-minute videos.",
        "Three parallel tracks. One is about the tool, the other two are about the engineer.",
        "Over time you end up with a different vocabulary and a different lens. Not higher — deeper.",
      ],
    },

    horizons: [
      { id: "h1", code: "T+1", label: "Quick wins",     range: "1–4 weeks",  hint: "what you'll notice almost immediately" },
      { id: "h2", code: "T+2", label: "Maturity",       range: "1–3 months", hint: "how your work changes" },
      { id: "h3", code: "T+3", label: "Transformation", range: "6+ months",  hint: "who you become" },
    ],

    tracks: [
      {
        id: "comms", code: "01", name: "Communication", shortName: "Communication",
        kicker: "Influence without authority",
        summary:
          "A senior doesn't manage people, yet decisions get made around them. Where that influence comes from and how to use it without becoming 'that guy'.",
        benefits: {
          h1: "Your PR comments get heard. Estimates stop turning into promises.",
          h2: "You get pulled into decisions beyond your own code. Stakeholders come to you on their own.",
          h3: "You set the frame the team makes decisions within — instead of just carrying out other people's.",
        },
      },
      {
        id: "arch", code: "02", name: "Architecture", shortName: "Architecture",
        kicker: "Constraints, not patterns",
        summary:
          "Architecture isn't a catalog of solutions, it's a system of rules within which decisions get made. Without that system, AI produces plausible nonsense and the engineer redoes the work.",
        benefits: {
          h1: "You speak the language of trade-offs, not patterns. Decisions get documented.",
          h2: "You see hidden constraints before they turn into rework.",
          h3: "You design systems where others — people and agents — work on their own.",
        },
      },
      {
        id: "agents", code: "03", name: "Agentic development", shortName: "Agents",
        kicker: "AI as a tool, not as magic",
        summary:
          "Not 'how to write a prompt'. But how to build agents into a real workflow: what to hand off, what to keep, how to control it, where to stop.",
        benefits: {
          h1: "Time frees up. The routine goes to the agent; you go learn everything else.",
          h2: "Focus shifts from writing code to high-level decisions and constraints.",
          h3: "Dark software factory — a whole team's output from a single engineer.",
        },
      },
    ],

    // 10 months × 3 tracks worth of series
    series: visibleSeries,
    episodes,
    trackStartWeek,

    months: [
      { num: 1,  label: "Month 1",  theme: "Context and constraints" },
      { num: 2,  label: "Month 2",  theme: "Decomposition and delegation" },
      { num: 3,  label: "Month 3",  theme: "Depth: reading, context, patterns" },
      { num: 4,  label: "Month 4",  theme: "Motion: evolving the system and the style" },
      { num: 5,  label: "Month 5",  theme: "Foundation: data and tools" },
      { num: 6,  label: "Month 6",  theme: "Reality: distributed systems and boundaries" },
      { num: 7,  label: "Month 7",  theme: "Production: cost, latency, policy" },
      { num: 8,  label: "Month 8",  theme: "Team and systems in the AI era" },
      { num: 9,  label: "Month 9",  theme: "Maturity: trade-offs and reputation" },
      { num: 10, label: "Month 10", theme: "Closing out the season" },
    ],

    // Anchor for the dynamic "now" marker: Monday of week 1 of the season.
    // The marker advances one cell each week from this date (week 7 = agents track start).
    seasonStart: "2026-04-20",
    // Fallback position on the 10-month axis if seasonStart is missing/invalid
    // (1.0 = end of month 1; 1.625 = week 6.5, i.e. mid-week-7).
    nowMonth: 1.625,
  };
})();

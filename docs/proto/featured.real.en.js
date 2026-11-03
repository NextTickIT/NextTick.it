// Ready-made questions for the landing: real questions guild members asked the bot (anonymised),
// answers condensed from the bot's logged answers, sources are the guild materials it cited.
// English translation of featured.real.ru.js; material titles stay in Russian (the materials are in Russian).
// Generated from guildmaster's ai_chat_log — do not edit by hand.
window.FEATURED_REAL = [
 {
  "id": "ai-fits-tests",
  "track": "agents",
  "q": "AI adjusts the tests instead of fixing the code. How do I stop that?",
  "a": "The cause is usually a vague acceptance criterion: given “there should be no errors”, the model can simply delete all the checks, and the condition is formally met. Write acceptance criteria as given/when/then: under this condition the system returns this error with this code. When the agent fixes a bug, read the test code rather than the plan, and approve the implementation only if the test actually reproduces your problem. Check that the tests really ran, and always send changes that touch only tests, with no code changes, to a careful review.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Acceptance Criteria",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/da8817fc-43b0-4a6d-ac56-e765adffcedf"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Тесты как контракт с агентом",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/25128a36-9b09-478f-bd8c-36c29095460d"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Агенты: что делегировать?",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/55dbe6f4-f0ae-4f1f-a0e2-913e7156d79a"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Ревьювим AI-код",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a6d9ec5a-b558-46e5-a2f2-a6880185f390"
   }
  ]
 },
 {
  "id": "ai-90-percent",
  "track": "agents",
  "q": "How do I get AI to write 90% correct code? In practice it doesn't happen",
  "a": "90% comes from a process, not from one lucky prompt: the rules for writing and reviewing code need to be documented. Write acceptance criteria as given/when/then so they can be turned into a test and back: a vague “the password reset email expires in 30 minutes” produces a muddled test. Keep detailed documentation for people as the single source of truth, and regularly distill dry imperative rules for the agent from it, phrased as “do Y” rather than “don't do X”. Give the distiller the previous version of the file, otherwise the wording will change every time and the agent's behavior will drift.",
  "s": [
   {
    "kind": "video",
    "track": "agents",
    "title": "Контекстные библиотеки: индекс знаний проекта",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a8b09abe-4639-4661-96bb-1502006ae228"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Acceptance Criteria",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/da8817fc-43b0-4a6d-ac56-e765adffcedf"
   }
  ]
 },
 {
  "id": "ai-correct-but-bad-code",
  "track": "agents",
  "q": "The agent solves the task correctly but writes bad code. How do I fix that?",
  "a": "Without explicit boundaries the model falls back on the internet-wide average, which can differ a lot from what your team has agreed on. Write down the implicit conventions: which patterns are appropriate (SOLID, GRASP), which layer is responsible for what, how many dependencies and lines are acceptable, what takes priority — speed, memory or security. Put the rules where the agent is sure to see them, for example in CLAUDE.md, not only in separate documents it may ignore. Review the code while the agent works, leaving comments right in the files, and after each module run a separate pass: “check against each document that its requirements are met”.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Почему AI пишет вам мусор? (и как это исправить за 5 минут)",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/4cd0e408-4226-4e4d-90a8-bc410fdc272c"
   },
   {
    "kind": "call",
    "track": "agents",
    "title": "Третья сессия разработки Billing Service",
    "meta": "meeting recording",
    "url": "https://web.nexttick.it/u/5dca7bab-0776-453f-9359-59acbb009b6d"
   }
  ]
 },
 {
  "id": "ai-code-review-needed",
  "track": "agents",
  "q": "Do we still need code review if AI writes the code?",
  "a": "Yes: the model doesn't guess, it hallucinates — it writes syntactically flawless, confidently formatted code that may do the wrong thing, and line-by-line understanding doesn't protect you from that. Before opening the diff, spend 90 seconds checking that the tests actually ran, the contract is described (input, output, forbidden states) and the change makes sense from the business side. Then look for any and as casts, generic names like data and item, and plausible nonsense like retry without jitter. Separately check the infrastructure glue — CI configs, migrations, contracts between services: if “who will fix this in six months” has no specific name as an answer, the code has no owner.",
  "s": [
   {
    "kind": "video",
    "track": "agents",
    "title": "Ревьювим AI-код",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a6d9ec5a-b558-46e5-a2f2-a6880185f390"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Зона без хозяина",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/4e9aa97f-1b72-44ab-b534-704474174204"
   }
  ]
 },
 {
  "id": "ai-review-fatigue",
  "track": "agents",
  "q": "Reviewing AI code wears me out and kills my motivation. What should I do?",
  "a": "Deliberately narrow what you spend attention on: style isn't up for discussion if the linter passes, and with a good test, minor performance issues and unclear implementation details don't block the review — you'll understand the implementation when you need to change it. Be strict only about critical performance, security and money. Sort your last five AI tasks on a “risk × observability” matrix: if the risk is low and you'll learn about a problem right away from failing tests or types, with a mature harness you can skip reviewing that task. Investing in tests, typing and monitoring moves more and more tasks into this green zone, and the time you free up is better spent on interesting work than on reviewing even more PRs.",
  "s": [
   {
    "kind": "video",
    "track": "agents",
    "title": "Ревьювим AI-код",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a6d9ec5a-b558-46e5-a2f2-a6880185f390"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Агенты: что делегировать?",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/55dbe6f4-f0ae-4f1f-a0e2-913e7156d79a"
   },
   {
    "kind": "call",
    "track": "comms",
    "title": "Подвешенное состояние, disagree and commit и почему ваш harness — это уже ваше CV",
    "meta": "meeting recording",
    "url": "https://web.nexttick.it/u/0cd87bda-f200-49a2-8cb8-f531b1bcb52b"
   }
  ]
 },
 {
  "id": "dev-only-prompts",
  "track": "agents",
  "q": "Is it normal that I don't write code anymore, just steer agents?",
  "a": "That's where the industry is heading, but responsibility for the result stays with you: an agent can't be held accountable. Don't send the agent off on a long autonomous run; stop at three checkpoints: the scope of the changes, the direction of the implementation, integration with the rest of the codebase. You can read less code, but only once you've built a model of how AI code usually breaks on your project, and you only build it through review. The time you free up goes to decisions about architecture, module boundaries and contracts: these now concern not only leads and seniors but juniors and mid-levels too.",
  "s": [
   {
    "kind": "video",
    "track": "agents",
    "title": "Agentic loops: останавливаться, чтобы двигаться быстрее",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/cf40f6ad-a5be-47bd-8b8c-38aef631eb4a"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Ревьювим AI-код",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a6d9ec5a-b558-46e5-a2f2-a6880185f390"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Дорасти до архитектурной автономии",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/7a180b75-fbe9-4a71-9183-62427e473299"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "3 режима работы с агентом",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/dc763df1-d181-448b-84c8-6be5eb071044"
   }
  ]
 },
 {
  "id": "ai-layoffs-fear",
  "track": "agents",
  "q": "I feel like I won't learn everything I need in time to avoid layoffs",
  "a": "When a business transforms, people are laid off more often for unwillingness to change than for performance: a technically strong engineer who resists change is at greater risk than one who says “let's think about how to apply this”. The key skill right now is reviewing AI code: generation speed keeps growing, while the ability to check that code properly doesn't. Architectural thinking also protects you: the model solves the task at hand and doesn't think about the project six months out. While access to the tools is cheap, build practice rather than theory, and keep a financial cushion for at least six months.",
  "s": [
   {
    "kind": "audio",
    "track": "agents",
    "title": "Опять AI, опять сокращения: иной взгляд",
    "meta": "audio",
    "url": "https://web.nexttick.it/u/bd238912-9a13-40cf-b34a-8e9f7e5c51ae"
   },
   {
    "kind": "audio",
    "track": "agents",
    "title": "Пятничные мысли об AI-эпохе: что это значит для тебя прямо сейчас",
    "meta": "audio",
    "url": "https://web.nexttick.it/u/3635ddc9-b709-403b-a429-10e995dbaffc"
   },
   {
    "kind": "call",
    "track": "comms",
    "title": "Подвешенное состояние, disagree and commit и почему ваш harness — это уже ваше CV",
    "meta": "meeting recording",
    "url": "https://web.nexttick.it/u/0cd87bda-f200-49a2-8cb8-f531b1bcb52b"
   }
  ]
 },
 {
  "id": "agent-setup-mess",
  "track": "agents",
  "q": "The agent setup in our project turned into a mess. How do I start over?",
  "a": "Deleting everything and starting over is a valid option if the rule files have grown into an unreadable dump. Don't solve everything in one endless conversation: separate the modes “just ask”, “development” and “research”, and use /clear, restore conversation or summarize from here in time so garbage doesn't pile up in the context. Instead of one file with twenty do/don't items, keep short imperative principles with a link to the source of truth, and don't accumulate the history of decisions in the agent's context. Explicitly write down what you used to keep in your head: acceptance criteria, constraints on security, compatibility and scope of changes, priorities and the output format.",
  "s": [
   {
    "kind": "video",
    "track": "agents",
    "title": "3 режима работы с агентом",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/dc763df1-d181-448b-84c8-6be5eb071044"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Контекстные библиотеки: индекс знаний проекта",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a8b09abe-4639-4661-96bb-1502006ae228"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Почему AI пишет вам мусор? (и как это исправить за 5 минут)",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/4cd0e408-4226-4e4d-90a8-bc410fdc272c"
   }
  ]
 },
 {
  "id": "agent-plans-in-repo",
  "track": "agents",
  "q": "Should I keep the plans the agent worked from in the repo?",
  "a": "It depends on the type of plan. Vision, roadmap, migration plan, RFC and NFR are worth keeping in Markdown in the docs folder: the agent reads them as project context, and they help new people onboard. A tactical plan for a specific session is usually disposable: after generating it, run /clear and implement in a fresh context, checking the plan for completeness along the way. If you're worried about the session dropping, instead of storing the plan ask the agent to commit after each logical step and keep a log of prompts and actions in a separate file. Personal backlogs of tasks that are too hard or too big can live in the repo, but block agents from both reading and writing them.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Design and other Project Records",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/3c107f84-be3e-4c3e-96f6-34f0543a30d9"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "TOO-HARD.md и TOO-BIG.md",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/33d49959-63d6-4306-b993-60de83a2538e"
   }
  ]
 },
 {
  "id": "agent-existing-codebase",
  "track": "agents",
  "q": "How do I work with an AI agent on an existing project?",
  "a": "Give the agent something to lean on in the repository itself, not just requirements in words: a reference module nearby, ideally neighboring code in the same monorepo, a strict linter and a written description of layers and module boundaries. Without that, the agent starts piling up abstractions and overcomplicating things. Don't create skills just in case; create them for a specific recurring pain, like custom libraries or a UI kit. Don't feed it the full engineering documentation as is: regularly generate a compact file of imperative rules from it, each tied to its original source.",
  "s": [
   {
    "kind": "video",
    "track": "agents",
    "title": "Контекстные библиотеки: индекс знаний проекта",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a8b09abe-4639-4661-96bb-1502006ae228"
   },
   {
    "kind": "digest",
    "track": "agents",
    "title": "Greenfield с агентами: почему нет «вау-эффекта» и что помогает",
    "meta": "chat digest",
    "url": "https://web.nexttick.it/digest/5901fa54-c455-4353-9293-cf7d154b5752"
   }
  ]
 },
 {
  "id": "saying-no",
  "track": "comms",
  "q": "How do I say “no” to my manager without it backfiring on me?",
  "a": "“No” means “with the current priorities this isn't possible”, not a refusal to help. Three formats work: “no” with an explanation of priorities (“until Tuesday I have X — how does your task fit into that list?”), “no” with an alternative, for example a colleague who has already dealt with that part, and “no” with a condition (“I'll take it if this task moves to the next sprint”). Don't apologize or over-explain: every extra detail turns the conversation into a negotiation. “No” stays a tool only if you don't say it to everything and you have a reputation as someone who usually helps; and put verbal agreements in writing, right in the ticket.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "\"Нет\" как инструмент инженера",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/54d0a3e8-3285-4893-b85f-9ee492dc2baa"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Estimates vs Commitments: чувствуем разницу",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/53a11bb0-bbe4-476e-871b-e689c10ab83c"
   }
  ]
 },
 {
  "id": "followup-no-reply",
  "track": "comms",
  "q": "I send a summary after meetings and get silence back. Should I keep going?",
  "a": "Keep going: most follow-ups get no reply, and the lack of response counts as tacit agreement with what's written. Such a record anchors the agreements in case the decision is quietly revisited later, and it's your proof that everything was documented. Send the follow-up within an hour after the meeting: the decision, action items with an owner and a deadline, open questions — and through a separate channel, email or an issue, so it doesn't get lost in the messenger. Regular updates also build your reputation and your manager's trust, even when there's no visible reaction.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "Follow-up: что остаётся после",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/e377bdcb-0782-4132-a822-a13b467dae40"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Искусство status updates",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/9521ca77-12e0-4a83-832d-819b90e99567"
   }
  ]
 },
 {
  "id": "cto-forgets",
  "track": "comms",
  "q": "I explain things to the CTO, hear “ok”, then get the same question again",
  "a": "Nobody keeps verbal agreements in memory, so stop explaining in words for the second and third time. Right after the conversation, send a short structured text following the inverted pyramid — the gist and conclusion first, then the details — and ask for written confirmation. When the question comes up again, that text becomes the point of truth to work from. If this keeps happening, escalate using “facts, impact, request”: not “the CTO doesn't listen” but “X was agreed in writing three times this month and the topic keeps coming back”, plus what it costs in time and risk and what decision you need.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "Секреты асинхронной коммуникации",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/03545b97-7793-4d11-bd45-6e637dcd10e6"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Follow-up: что остаётся после",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/e377bdcb-0782-4132-a822-a13b467dae40"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Escalation: когда и как поднимать проблему",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/af9a8d23-2a7c-4e77-82e3-483f5c1e3e98"
   }
  ]
 },
 {
  "id": "prs-not-reviewed",
  "track": "comms",
  "q": "Nobody reviews my pull requests, and it's blocking my work",
  "a": "First try the direct route: ping specific reviewers privately, ask about timelines, offer help, and if one person is the bottleneck, ask if everything is OK with them. If that doesn't help, escalate privately to someone with the authority to fix it, for example your manager or the reviewers' team lead, using “facts, impact, request”. Facts without judgment: “one PR has been waiting for review for five days, another for three, both have my request to take a look”; impact: “task X won't make the deadline”; one specific request: “please assign a responsible reviewer”. If there's no response after escalating, ask directly in your one-on-one what was decided.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "Escalation: когда и как поднимать проблему",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/af9a8d23-2a7c-4e77-82e3-483f5c1e3e98"
   },
   {
    "kind": "digest",
    "track": "comms",
    "title": "Коллега-блокер, который читает и молчит днями",
    "meta": "chat digest",
    "url": "https://web.nexttick.it/digest/284cc494-ba9f-4c67-8596-37f6b2359903"
   }
  ]
 },
 {
  "id": "estimate-doubled",
  "track": "comms",
  "q": "How do I say the estimate was wrong and there's twice as much work?",
  "a": "Say it as soon as you realize it, not on the day of the deadline: an early signal leaves your manager options — move the demo, cut scope, get help — while a late message is already a crisis. The formula: “I won't make it by this date, I need this much more time, here's why and here's what I suggest”, with options, and get to the point right away, without a long lead-in. Name the source of the miss honestly: technical uncertainty, dependencies outside your control or changed requirements. If you originally gave an estimate rather than a promise, remind them of that, and once it's resolved, write down for yourself what you didn't know at the start and how you could have found out sooner.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "Estimates vs Commitments: чувствуем разницу",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/53a11bb0-bbe4-476e-871b-e689c10ab83c"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Escalation: когда и как поднимать проблему",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/af9a8d23-2a7c-4e77-82e3-483f5c1e3e98"
   }
  ]
 },
 {
  "id": "not-my-zone",
  "track": "comms",
  "q": "Frontend is doing nonsense, I'm on backend. How can I influence their side?",
  "a": "Don't go rewriting someone else's part: the problem needs to go to whoever has the mandate to solve it, for example the frontend lead or the overall team lead. Do it privately, using “facts, impact, request”: what exactly was done and what it contradicts, how it hits your part (risks, bugs, rework on the backend), and one specific request to revisit or agree on X. Push for a clear answer — yes, no or “we won't do it” — so the issue isn't quietly dropped. If someone tries to make you responsible for another person's decision, don't make it yourself; return it to the owner in writing, describing the cost and the risk.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "Escalation: когда и как поднимать проблему",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/af9a8d23-2a7c-4e77-82e3-483f5c1e3e98"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Верни решение владельцу",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/f20feb21-5279-44e2-b0ef-d8543c3b22c7"
   }
  ]
 },
 {
  "id": "visibility-value",
  "track": "comms",
  "q": "How do I make my work and value more visible to the business?",
  "a": "Propose solutions using the formula: problem, what it affects, which options you considered, what you recommend and why — instead of “I think we need X”. Translate tech into the listener's language: a product manager thinks about feature delivery speed, a manager about risk and predictability, so not “we need two sprints for refactoring” but “this module adds weeks to every integration; give me a sprint and the next one will take days”. Give status updates proactively: what's done, what I'm doing now, what's blocking, at roughly 70% of the interval at which your manager usually pings you. Send a non-technical manager a two-to-three-minute screen recording with a demo: it's easy to forward up.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "У синьйора нет власти, но есть влияние",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/20381440-9e6d-4250-893f-9191ce2336c2"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Язык стейкхолдеров: перевод с технического",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/44768684-a832-4c0c-80e1-aa7d2c379bca"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Искусство status updates",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/9521ca77-12e0-4a83-832d-819b90e99567"
   }
  ]
 },
 {
  "id": "sell-tech-debt",
  "track": "comms",
  "q": "How do I “sell” tech debt to my manager?",
  "a": "Talk about money and risk, not patterns and SOLID: feature delivery speed, number of incidents, onboarding time, dependence on specific people. Fit each step — problem, impact, proposal — into one sentence with numbers: “last quarter this took 6 weeks instead of 2; give us one sprint and the next integration will take 5 days instead of 5 weeks”. Ask for a specific resource, such as one sprint or two people half-time for two weeks, not “let's think about it”. Don't bring your whole wishlist in one go: name the minimum scope you need and pick in advance the metric you'll use to check the result — time to feature, incident rate or onboarding time.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Рефакторинг: как убедить руководство?",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/e566527f-95a0-43ce-8929-0f75236146a8"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Язык стейкхолдеров: перевод с технического",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/44768684-a832-4c0c-80e1-aa7d2c379bca"
   }
  ]
 },
 {
  "id": "sync-vs-async",
  "track": "comms",
  "q": "When do I need a call, and when is it better to write?",
  "a": "If the decision is already made and just needs to be communicated, write — unless it affects people emotionally: a layoff, and also a bonus or praise, is better delivered by voice. If the decision can still change, start with a document that has comments and a public deadline, such as a ticket or a pull request; a meeting is needed when the decision is time-sensitive or you don't have a ready option. Keep retros and similar rituals synchronous, while the daily stand-up can move to a channel with daily updates. If two rounds of question and answer in writing get no result, get on a call, and ask for the meeting agenda 24 hours in advance.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "Когда митинг — а когда документ",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/d298a45f-7d29-433d-8d7a-7dfba59e9b34"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Секреты асинхронной коммуникации",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/03545b97-7793-4d11-bd45-6e637dcd10e6"
   }
  ]
 },
 {
  "id": "sell-ai-to-team",
  "track": "comms",
  "q": "How do I sell an AI approach to my team?",
  "a": "Sell the effect, not the tool: a specific pain, a measurable impact and a request, for example “right now a feature takes 5 days; give us two weeks to set up an AI approach in this module and it'll take 2”. Consider who you're talking to: a product manager thinks about delivery speed, a manager about risk and predictability, a tech lead about maintainability. Adoption takes root from the bottom up: find one or two “champions” with a personal interest who will quickly show visible results, and for each rollout, a co-owner on the business side. Take metrics before and after, and ask for a small pilot with a specific deadline instead of announcing “we're switching to AI”.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Рефакторинг: как убедить руководство?",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/e566527f-95a0-43ce-8929-0f75236146a8"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Язык стейкхолдеров: перевод с технического",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/44768684-a832-4c0c-80e1-aa7d2c379bca"
   },
   {
    "kind": "digest",
    "track": "comms",
    "title": "Раскатывание Claude Teams на всю компанию: с чего начать",
    "meta": "chat digest",
    "url": "https://web.nexttick.it/digest/0e7e3e2c-f397-4138-95e8-c72205ca159d"
   }
  ]
 },
 {
  "id": "before-refactoring",
  "track": "arch",
  "q": "Where do I start a refactoring, and what should I do before it?",
  "a": "First check whether this debt is worth fixing: does the code slow down the flow of changes, how often does it actually change (check git blame), and do your colleagues suffer from it. Isolated, tested code that rarely changes can be left alone even if it's ugly; start where the impact is high and the cost of fixing is low. If the decision isn't yours alone, calculate how much time goes into working around the problem and what measurable effect the refactoring will have. Before changing anything, pin down the current behavior with tests and contracts, isolate the module behind facades or adapters, and prepare a rollback in advance via feature flags or canary: never change the external contract and the internals at the same time.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Технический долг",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/2e02c596-9396-4440-ba74-c7c68a9862a4"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Rewrite, Refactoring, Migrations",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/48597cce-1a2b-488c-ae6c-79b5c54e8b5a"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Рефакторинг: как убедить руководство?",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/e566527f-95a0-43ce-8929-0f75236146a8"
   }
  ]
 },
 {
  "id": "when-adr",
  "track": "arch",
  "q": "When should I write an ADR, and when is it overkill?",
  "a": "Write ADRs for expensive, hard-to-reverse decisions: choice of database, how services communicate, the contract between layers, caching strategy, event format, protocol, migration strategy. For small things that are easy to roll back and forth, a comment in the PR or issue is enough, otherwise the team will come to hate the practice as bureaucracy. A record needs context, the alternatives considered, expected consequences, a date and a status, and ideally a revisit trigger as well: for example, a local in-memory cache will stop working once you scale to several instances. Decisions already made on the project that live only in people's heads should be written up retroactively.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Architecture Decision Records",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/5cbc3ca5-4ecd-4f28-a2b5-95bb9528cd16"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Design docs: что, кому и когда писать",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/26da2ce8-ac8a-4a18-8159-f86b411999dc"
   }
  ]
 },
 {
  "id": "nfr-analyst-architect",
  "track": "arch",
  "q": "Types of requirements, and where's the line between analyst and architect?",
  "a": "Functional requirements describe what the product does and have relatively little influence on the architecture. Non-functional ones — number of users, data volume and growth, latency, throughput, reliability, security, observability — determine the choice of language, platform and framework, and ignoring them most often ends with rewriting the system from scratch. Next to them live business requirements, use cases and user stories, acceptance criteria and compliance requirements. Product requirements and definitions of done were traditionally written by the analyst, while NFRs are the architect's area: they gather them from stakeholders, product owners and operations, and use them to make decisions and write ADRs.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Почему приходится переписывать код с нуля? Вся правда о NFR",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/ae087915-a92a-495e-9c42-ea49e664babf"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Design and other Project Records",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/3c107f84-be3e-4c3e-96f6-34f0543a30d9"
   }
  ]
 },
 {
  "id": "what-is-architectural",
  "track": "arch",
  "q": "How do I tell that a decision is architectural and not just code?",
  "a": "The criterion isn't the size of the change. If a lot of code changed inside a module but the external contract is stable, that's ordinary code. If a boundary between modules, layers or services changes — that is, a contract other consumers depend on — the decision is architectural, even if it looks minor. By Hyrum's law, any detail someone has started relying on becomes a public contract, so ask whether the decision crosses a boundary visible to other parts of the system and whether it changes the dependency rules between them.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Архитектурные границы и ревью контракта",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/b9475e86-548c-4087-a78f-065576ab14d4"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Твоя система растёт вертикально или горизонтально?",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/dc88a79a-1a06-4683-ab19-36d35a218f39"
   }
  ]
 },
 {
  "id": "mixed-abstraction-tests",
  "track": "arch",
  "q": "My tests mix levels of abstraction. Does that mean the code is the problem?",
  "a": "Almost always, yes: a test can't read at a single level if the code under test itself works at several — domain logic has leaked into the UI, a service validates someone else's model, fetching and serialization are mixed with rendering. A good test reads almost like natural language and has no ifs, while a mixed one checks a business assertion and implementation details like the SQL query or call order at the same time. Fix the code, not the test: move the rule to the owner of the responsibility, keep side effects explicit, and don't let one layer know the details of another. Once the code is separated into layers, the test gets simpler on its own.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "AI-assisted Migration & Refactoring",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/9b998292-1586-40cc-a40b-ec4f791dea22"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Тесты как контракт с агентом",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/25128a36-9b09-478f-bd8c-36c29095460d"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Архитектурные границы и ревью контракта",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/b9475e86-548c-4087-a78f-065576ab14d4"
   }
  ]
 },
 {
  "id": "arch-thinking-from-zero",
  "track": "arch",
  "q": "I know nothing about architecture. How do I build architectural thinking?",
  "a": "Architecture is breaking a system into parts, naming those parts and connecting them; layered, clean, hexagonal or microservices are just different forms of the same decomposition. Start with the project's language: find places where different things are called by the same word, such as “controller”, or one thing by different words, and settle on a single vocabulary. Then look in your project for tasks that require designing an entire horizontal layer, and for inconsistency between similar features. Practice by reviewing other people's code at the level of boundaries and contracts, and ask any piece of code the same questions: where are the boundaries, what is connected to what, what is it called.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Dictionary",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/92d88540-3d31-486f-84dc-e3756d42c2dd"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Твоя система растёт вертикально или горизонтально?",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/dc88a79a-1a06-4683-ab19-36d35a218f39"
   },
   {
    "kind": "call",
    "track": "arch",
    "title": "Созвон — Архитектура #1",
    "meta": "meeting recording",
    "url": "https://web.nexttick.it/u/339ba754-d72a-4143-acce-b96c87e79b9e"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Архитектурное code review",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/1eb2df2d-609e-450f-bed5-5b19b67e2c0a"
   }
  ]
 },
 {
  "id": "docs-existing-project",
  "track": "arch",
  "q": "How do I document the architecture of an existing project?",
  "a": "Start with retroactive ADRs: record the decisions that have de facto been made and are known by word of mouth — choice of database, how services communicate, caching, event format — but only the expensive, hard-to-reverse ones. Earlier than seems necessary, start a glossary next to the ADRs: one term with different meanings in different parts of the system is a source of confusion that's hard to trace. Sort everything else by record type in the docs folder: requirements, container, component and deployment diagrams, the domain model, API specs, and for legacy, always a migration plan. Write each document for one audience: if it has more than one or two groups of readers, split it into separate documents.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Architecture Decision Records",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/5cbc3ca5-4ecd-4f28-a2b5-95bb9528cd16"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Dictionary",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/92d88540-3d31-486f-84dc-e3756d42c2dd"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Design and other Project Records",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/3c107f84-be3e-4c3e-96f6-34f0543a30d9"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Design docs: что, кому и когда писать",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/26da2ce8-ac8a-4a18-8159-f86b411999dc"
   }
  ]
 },
 {
  "id": "docs-human-or-agent",
  "track": "arch",
  "q": "Who should project docs be written for: people or the agent?",
  "a": "These should be different artifacts. Write design docs, RFCs and architecture documents for people and don't generate them with AI: their job is to align understanding between people. For the agent, keep a separate short file of imperative rules, generated from the human documentation with a fixed prompt. When a document doubles in length, the chance it gets read drops roughly fourfold, so more than 2–3 pages not counting diagrams is a sign that the document is bloated and has no clear audience. Keep these Markdown files right in the repository, in the docs folder: you can give them to the agent for search or to a junior for onboarding.",
  "s": [
   {
    "kind": "video",
    "track": "comms",
    "title": "Design docs: что, кому и когда писать",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/26da2ce8-ac8a-4a18-8159-f86b411999dc"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Контекстные библиотеки: индекс знаний проекта",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a8b09abe-4639-4661-96bb-1502006ae228"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Design and other Project Records",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/3c107f84-be3e-4c3e-96f6-34f0543a30d9"
   }
  ]
 },
 {
  "id": "learn-fundamentals-ai",
  "track": "arch",
  "q": "Does it still make sense to learn the basics: algorithms, architecture?",
  "a": "Yes, and now it matters more than before. By Ashby's law, a controlling system must have more states than the system it controls, so with AI you can only do tasks whose results you're able to understand and evaluate. Without understanding algorithms, data structures, complexity, cohesion and abstraction boundaries, you won't give the model a clear task or verify its answer, and a month later nobody will be able to make sense of the generated code. You can't just offload these concepts into skills for the agent: you need to understand them yourself so that at the design level you can sense that something is going wrong.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "AI и архитектура",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/01d55a03-8e71-41ee-af66-730131a3ed60"
   },
   {
    "kind": "post",
    "track": "agents",
    "title": "Эффективный TypeScript #1: Основы",
    "meta": "post",
    "url": "https://web.nexttick.it/u/0f23e244-6eac-4eb5-8195-0968962d6319"
   }
  ]
 },
 {
  "id": "drop-code-review",
  "track": "arch",
  "q": "My team wants to drop code review. Is that a bad idea?",
  "a": "It is: in most teams review is the only mandatory point of interaction between engineers and a channel for passing on context, and with AI code, without it you won't develop an understanding of how that code breaks. Rebuild the process: don't discuss style that passes the linter, and move matters of taste into linter rules instead of blocking comments. Split findings into must fix before merge (boundary violations, a breaking change without a migration), should fix soon and optional. Build comments on the “situation — behavior — impact” pattern, label them as blocking, suggestion or nitpick, and phrase them as questions: this reduces the author's defensiveness.",
  "s": [
   {
    "kind": "video",
    "track": "arch",
    "title": "Архитектурное code review",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/1eb2df2d-609e-450f-bed5-5b19b67e2c0a"
   },
   {
    "kind": "video",
    "track": "agents",
    "title": "Ревьювим AI-код",
    "meta": "Agents",
    "url": "https://web.nexttick.it/u/a6d9ec5a-b558-46e5-a2f2-a6880185f390"
   },
   {
    "kind": "video",
    "track": "arch",
    "title": "Архитектурные границы и ревью контракта",
    "meta": "Architecture",
    "url": "https://web.nexttick.it/u/b9475e86-548c-4087-a78f-065576ab14d4"
   },
   {
    "kind": "video",
    "track": "comms",
    "title": "Обратная связь, которую слышат",
    "meta": "Communication",
    "url": "https://web.nexttick.it/u/f68d4869-b6ea-494d-a19d-283565e96759"
   }
  ]
 }
];

const DB_NAME = "offline-great-courses";
const DB_VERSION = 1;
const STORE = "progress";
const DEFAULT_PROGRESS = {
  currentWeek: 1,
  currentDay: 1,
  completed: {},
  activityScores: {},
  highlights: [],
  scores: { weekly: {}, lifetime: 0 },
  mastery: {},
  streaks: { current: 0, longest: 0, lastActiveDate: "" }
};

const state = {
  route: "today",
  index: null,
  weeks: new Map(),
  week: null,
  progress: clone(DEFAULT_PROGRESS),
  activeGame: null,
  activityAnswers: {},
  activityFeedback: null,
  pendingHighlight: null,
  gameResult: null,
  selected: null
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function dbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function dbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const request = tx.objectStore(STORE).put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function loadIndex() {
  state.index = await fetchJson("./content/curriculum-index.json");
}

async function loadWeek(number) {
  if (state.weeks.has(number)) return state.weeks.get(number);
  const padded = String(number).padStart(3, "0");
  const week = await fetchJson(`./content/weeks/week-${padded}.json`);
  state.weeks.set(number, week);
  return week;
}

function ensureProgressShape() {
  state.progress.completed ||= {};
  state.progress.activityScores ||= {};
  state.progress.highlights ||= [];
  state.progress.scores ||= { weekly: {}, lifetime: 0 };
  state.progress.scores.weekly ||= {};
  state.progress.scores.lifetime ||= 0;
  state.progress.mastery ||= {};
  state.progress.streaks ||= { current: 0, longest: 0, lastActiveDate: "" };
}

async function saveProgress() {
  await dbSet("local-user", state.progress);
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function seededShuffle(items, seedText) {
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function markComplete(itemId, points = 10, conceptId = null, correct = true) {
  const weekId = state.week.id;
  state.progress.completed[weekId] ||= {};
  if (!state.progress.completed[weekId][itemId]) {
    state.progress.completed[weekId][itemId] = true;
    state.progress.scores.weekly[weekId] = (state.progress.scores.weekly[weekId] || 0) + points;
    state.progress.scores.lifetime += points;
  }

  if (conceptId) {
    const mastery = state.progress.mastery[conceptId] || { seen: 0, correct: 0, strength: 0 };
    mastery.seen += 1;
    mastery.correct += correct ? 1 : 0;
    mastery.strength = Math.round((mastery.correct / mastery.seen) * 100) / 100;
    mastery.lastSeen = todayKey();
    state.progress.mastery[conceptId] = mastery;
  }

  updateStreak();
  saveProgress();
}

async function resetToWeekOneDayOne() {
  state.progress = clone(DEFAULT_PROGRESS);
  ensureProgressShape();
  state.activeGame = null;
  state.activityAnswers = {};
  state.activityFeedback = null;
  state.pendingHighlight = null;
  state.gameResult = {
    title: "Reset Complete",
    body: "Progress has been reset to Week 1, Day 1 on this device."
  };
  state.week = await loadWeek(1);
  await dbSet("local-user", state.progress);
}

function activityKey(gameKey) {
  return `${state.week.id}-day-${state.progress.currentDay}-${gameKey}`;
}

function activityMaxPoints() {
  return 100 / 21;
}

function attemptMultiplier(attempts) {
  if (attempts <= 1) return 1;
  if (attempts === 2) return 0.75;
  if (attempts === 3) return 0.5;
  return 0.25;
}

function recordActivityScore(gameKey, correctCount, totalCount, correctItems = []) {
  const weekId = state.week.id;
  const key = activityKey(gameKey);
  state.progress.activityScores[weekId] ||= {};
  const previous = state.progress.activityScores[weekId][key] || {
    attempts: 0,
    earned: 0,
    max: activityMaxPoints(),
    correct: 0,
    total: totalCount,
    correctItems: []
  };
  const lockedItems = [...new Set([...(previous.correctItems || []), ...correctItems])].sort((a, b) => a - b);
  const attempts = previous.attempts + 1;
  const max = activityMaxPoints();
  const bestCorrect = Math.max(correctCount, lockedItems.length);
  const ratio = totalCount ? bestCorrect / totalCount : 0;
  const earned = Math.round(max * ratio * attemptMultiplier(attempts) * 100) / 100;
  const bestEarned = Math.max(previous.earned || 0, earned);

  state.progress.activityScores[weekId][key] = {
    attempts,
    earned: bestEarned,
    max,
    correct: bestCorrect,
    total: totalCount,
    correctItems: lockedItems,
    perfect: lockedItems.length === totalCount,
    lastPlayed: todayKey()
  };

  for (const control of document.querySelectorAll("#active-game select[data-concept], #active-game input[data-concept]")) {
    const concept = control.dataset.concept;
    if (!concept) continue;
    const correct = normalizedAnswer(control.value) === normalizedAnswer(control.dataset.answer);
    const mastery = state.progress.mastery[concept] || { seen: 0, correct: 0, strength: 0 };
    mastery.seen += 1;
    mastery.correct += correct ? 1 : 0;
    mastery.strength = Math.round((mastery.correct / mastery.seen) * 100) / 100;
    mastery.lastSeen = todayKey();
    state.progress.mastery[concept] = mastery;
  }

  state.progress.scores.weekly[weekId] = weeklyScore(weekId);
  state.progress.scores.lifetime = Object.values(state.progress.activityScores)
    .flatMap((weekScores) => Object.values(weekScores))
    .reduce((sum, item) => sum + item.earned, 0);

  updateStreak();
  saveProgress();

  return state.progress.activityScores[weekId][key];
}

function weeklyScore(weekId = state.week.id) {
  const scores = Object.values(state.progress.activityScores[weekId] || {});
  const total = scores.reduce((sum, item) => sum + (item.earned || 0), 0);
  return Math.min(100, Math.round(total * 10) / 10);
}

function activityScore(gameKey) {
  return state.progress.activityScores[state.week.id]?.[activityKey(gameKey)] || null;
}

function activityIsPerfect(gameKey) {
  return activityScore(gameKey)?.perfect === true;
}

function normalizedAnswer(value) {
  return String(value || "").trim().toUpperCase();
}

function questionIsLocked(index) {
  if (!state.activeGame) return false;
  return activityScore(state.activeGame)?.correctItems?.includes(index) === true;
}

async function savePendingHighlight() {
  captureCurrentSelection();
  if (!state.pendingHighlight?.text) return false;
  await saveHighlight(state.pendingHighlight);
  state.pendingHighlight = null;
  return true;
}

async function saveHighlight(highlight) {
  if (!highlight?.text) return false;
  const exists = state.progress.highlights.some((item) =>
    item.sourceId === highlight.sourceId && item.text === highlight.text
  );
  if (!exists) {
    state.progress.highlights.push({
      id: `highlight-${Date.now()}`,
      weekId: state.week.id,
      weekNumber: state.week.number,
      day: state.progress.currentDay,
      sourceId: highlight.sourceId,
      sourceTitle: highlight.sourceTitle,
      text: highlight.text,
      createdAt: new Date().toISOString()
    });
    await saveProgress();
  }
  return true;
}

function updateStreak() {
  const key = todayKey();
  if (state.progress.streaks.lastActiveDate === key) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  state.progress.streaks.current = state.progress.streaks.lastActiveDate === yKey ? state.progress.streaks.current + 1 : 1;
  state.progress.streaks.longest = Math.max(state.progress.streaks.longest, state.progress.streaks.current);
  state.progress.streaks.lastActiveDate = key;
}

function dayPlan(week, day) {
  const plans = {
    1: {
      title: "Orientation + Core Lesson",
      lesson: week.lessons.core,
      modules: ["definitionMatch", "contextBlank", "conceptTournamentLite"],
      challenge: "Which concept best prevents victory from becoming ruin?"
    },
    2: {
      title: "Classical Passage + Historical Parallel",
      lesson: { title: week.passage.title, body: `${week.passage.body}\n\nHistorical parallel: ${week.historicalParallel.body}` },
      modules: ["passageCloze", "etymologyTrail", "scenarioChallenge"],
      challenge: "Apply the passage to a historical decision under pressure."
    },
    3: {
      title: "Leadership Case + Modern Application",
      lesson: week.leadershipCase,
      modules: ["chooseConcept", "forcedApplication", "definitionMatch"],
      challenge: "Choose a modern institutional response governed by prudence."
    },
    4: {
      title: "Rhetoric Insight + Argument Duel",
      lesson: week.rhetoricInsight,
      modules: ["argumentDuel", "synonymAntonym", "contextBlank"],
      challenge: "Find the stronger argument and name the weaker premise."
    },
    5: {
      title: "Mini-Essay + Concept Sorting",
      lesson: week.lessons.miniEssay,
      modules: ["conceptSorting", "microCrossword", "chooseConcept"],
      challenge: "Sort ideas by virtue, danger, restraint, and consequence."
    },
    6: {
      title: "Retrieval Day + Scenario Gauntlet",
      lesson: { title: "Retrieval Brief", body: week.retrievalBrief },
      modules: ["scenarioGauntlet", "conceptConstellation", "passageCloze"],
      challenge: "Move through modern, historical, and literary cases."
    },
    7: {
      title: "Synthesis + Concept Bracket",
      lesson: week.lessons.synthesisEssay,
      modules: ["conceptBracket", "cloze", "cumulativeApplication"],
      challenge: "Name the concept that should govern the whole week."
    }
  };
  return plans[day];
}

function appShell(content) {
  const score = state.week ? weeklyScore(state.week.id) : 0;
  return `
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <h1>Offline Great Courses</h1>
          <span class="status-pill">Offline-ready</span>
        </div>
        <nav class="tabs" aria-label="Primary">
          ${tab("today", "Today")}
          ${tab("week", "Week")}
          ${tab("library", "Library")}
          ${tab("progress", "Points")}
        </nav>
        <p class="scoreline">
          <span>Week ${state.progress.currentWeek}</span>
          <span>Day ${state.progress.currentDay}</span>
          <span>Week score ${score}/100</span>
        </p>
      </header>
      <main>${content}</main>
    </div>
  `;
}

function tab(route, label) {
  return `<button data-route="${route}" aria-pressed="${state.route === route}">${label}</button>`;
}

function renderToday() {
  if (state.activeGame) return appShell(gameMarkup(state.activeGame));

  const plan = dayPlan(state.week, state.progress.currentDay);
  return appShell(`
    <section class="card soft">
      <p class="eyebrow">${state.week.title}</p>
      <h2>${plan.title}</h2>
      <p>${state.week.centralQuestion}</p>
    </section>
    ${state.progress.currentDay === 1 ? vocabularyStudyCard() : ""}
    ${state.week.number === 1 && state.progress.currentDay === 1 ? historicalContextCard() : ""}
    ${lessonCard(plan.lesson, `week-${state.week.number}-day-${state.progress.currentDay}-lesson`, plan.title)}
    <section class="card">
      <p class="eyebrow">Game Modules</p>
      <h3>10-14 minutes</h3>
      <div class="grid">
        ${plan.modules.map((module) => activityButton(module)).join("")}
      </div>
    </section>
    <section class="card">
      <p class="eyebrow">High-End Challenge</p>
      <h3>${plan.challenge}</h3>
      ${activityButton("highEndChallenge", "Begin High-End Challenge")}
    </section>
    ${state.gameResult ? resultCard(state.gameResult) : ""}
    <div class="footer-actions">
      <button data-complete-day>Complete Day ${state.progress.currentDay}</button>
    </div>
  `);
}

function historicalContextCard() {
  return `
    <section class="card readable" data-source-id="week-1-caesar-context" data-source-title="Caesar at the Rubicon">
      <p class="eyebrow">Historical Context</p>
      <h2>${state.week.historicalParallel.title}</h2>
      <div class="lesson-body">${paragraphs(state.week.historicalParallel.body, "week-1-caesar-context", state.week.historicalParallel.title)}</div>
      <div class="footer-actions">
        <button data-save-highlight>Save Selected Highlight</button>
      </div>
    </section>
  `;
}

function activityButton(module, label = labelForGame(module)) {
  const score = activityScore(module);
  if (score?.perfect) {
    return `<button data-game="${module}" disabled>${label} - perfect complete</button>`;
  }
  const suffix = score ? ` - current ${Math.round(score.earned * 100) / 100}/${Math.round(score.max * 100) / 100}` : "";
  return `<button data-game="${module}">${label}${suffix}</button>`;
}

function lessonCard(lesson, sourceId = "lesson", sourceTitle = lesson.title) {
  return `
    <section class="card readable" data-source-id="${escapeHtml(sourceId)}" data-source-title="${escapeHtml(sourceTitle)}">
      <p class="eyebrow">Teaching Component</p>
      <h2>${lesson.title}</h2>
      <div class="lesson-body">${paragraphs(lesson.body, sourceId, sourceTitle)}</div>
      <div class="footer-actions">
        <button data-save-highlight>Save Selected Highlight</button>
      </div>
    </section>
  `;
}

function vocabularyStudyCard() {
  return `
    <section class="card">
      <p class="eyebrow">Day 1 Word List</p>
      <h2>Full Vocabulary With Etymology</h2>
      <p>Study every term before playing. Later activities require choosing the precise word for full-sentence contexts.</p>
      ${state.week.vocabulary.map((v) => `
        <article class="card">
          <h3>${v.term}</h3>
          <p><strong>Definition:</strong> ${v.definition}</p>
          <p><strong>Etymology:</strong> ${v.etymology}</p>
          <p><strong>Example:</strong> ${v.example}</p>
        </article>
      `).join("")}
    </section>
  `;
}

function resultCard(result) {
  return `
    <section class="card">
      <p class="eyebrow">Result</p>
      <h3>${result.title}</h3>
      <div class="result ${result.correct === false ? "wrong" : "correct"}">${paragraphs(result.body)}</div>
    </section>
  `;
}

function paragraphs(text, sourceId = "", sourceTitle = "") {
  return String(text || "")
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p>${highlightText(line, sourceId)}</p>`)
    .join("");
}

function highlightText(text, sourceId) {
  let output = escapeHtml(text);
  if (!sourceId) return output;

  const highlights = state.progress.highlights
    .filter((highlight) => highlight.sourceId === sourceId)
    .map((highlight) => highlight.text.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const highlight of highlights) {
    const escaped = escapeHtml(highlight);
    output = output.replaceAll(escaped, `<mark>${escaped}</mark>`);
  }

  return output;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function labelForGame(key) {
  return {
    definitionMatch: "Definition Match",
    contextBlank: "Context Fill-in-the-Blank",
    conceptTournamentLite: "Concept Tournament Lite",
    passageCloze: "Passage Cloze",
    etymologyTrail: "Etymology Trail",
    scenarioChallenge: "Scenario Challenge",
    chooseConcept: "Choose the Concept",
    forcedApplication: "Forced Application",
    argumentDuel: "Argument Duel",
    synonymAntonym: "Synonym / Antonym Grid",
    conceptSorting: "Concept Sorting Tournament",
    microCrossword: "Micro-Crossword",
    scenarioGauntlet: "Scenario Gauntlet",
    conceptConstellation: "Concept Constellation",
    conceptBracket: "Concept Bracket",
    highEndChallenge: "High-End Narrative Challenge",
    cloze: "Cloze Test",
    cumulativeApplication: "Cumulative Application"
  }[key] || key;
}

function renderWeek() {
  return appShell(`
    <section class="card soft">
      <p class="eyebrow">Week ${state.week.number}</p>
      <h2>${state.week.title}</h2>
      <p>${state.week.centralQuestion}</p>
      <p class="meta">${state.week.difficultyBand} vocabulary progression</p>
    </section>
    <section class="card">
      <p class="eyebrow">Seven-Day Rhythm</p>
      <div class="grid">
        ${[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const plan = dayPlan(state.week, day);
          return `<button data-set-day="${day}">Day ${day}: ${plan.title}</button>`;
        }).join("")}
      </div>
    </section>
    <section class="card">
      <p class="eyebrow">Vocabulary</p>
      ${state.week.vocabulary.map((v) => `
        <article class="card">
          <h3>${v.term}</h3>
          <p><strong>Definition:</strong> ${v.definition}</p>
          <p><strong>Etymology:</strong> ${v.etymology}</p>
          <p><strong>Example:</strong> ${v.example}</p>
          <p><strong>Historical:</strong> ${v.historicalAnchor}</p>
          <p><strong>Literary:</strong> ${v.literaryAnchor}</p>
          <p><strong>Philosophical:</strong> ${v.philosophicalAnchor}</p>
        </article>
      `).join("")}
    </section>
  `);
}

function renderLibrary() {
  return appShell(`
    <section class="card soft">
      <p class="eyebrow">Curriculum</p>
      <h2>52-Week Spine</h2>
      <p>Weeks 1-8 are installed as local content packs. Weeks 9-52 are outlined and ready for later pack expansion.</p>
    </section>
    <section class="card">
      <div class="grid">
        ${state.index.weeks.map((week) => `
          <button data-open-week="${week.number}" ${week.available ? "" : "disabled"}>
            Week ${week.number}: ${week.title}
            <br><span class="meta">${week.available ? week.difficultyBand : "future content pack"}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `);
}

function renderProgress() {
  const mastery = Object.entries(state.progress.mastery);
  const weekScores = Object.entries(state.progress.activityScores[state.week.id] || {});
  const weekScore = weeklyScore(state.week.id);
  const highlights = state.progress.highlights.filter((highlight) => highlight.weekId === state.week.id);
  return appShell(`
    <section class="card soft">
      <p class="eyebrow">Weekly Score</p>
      <h2>${weekScore}/100</h2>
      <p>A perfect 100 requires every weekly activity completed correctly on the first try. Later attempts reduce the available points for that activity.</p>
      <p>Lifetime points: ${Math.round(state.progress.scores.lifetime * 10) / 10}. Current streak: ${state.progress.streaks.current}. Longest streak: ${state.progress.streaks.longest}.</p>
    </section>
    <section class="card">
      <p class="eyebrow">Activity Points</p>
      ${weekScores.length ? weekScores.map(([key, score]) => `
        <p><strong>${activityNameFromKey(key)}</strong>: ${activityRank(score)}, ${Math.round(score.earned * 100) / 100}/${Math.round(score.max * 100) / 100} points, ${score.correct}/${score.total} correct, ${score.attempts} ${score.attempts === 1 ? "try" : "tries"}${score.perfect ? " - locked" : ""}</p>
      `).join("") : "<p>No scored activities yet. Open an activity, answer every item, and submit.</p>"}
    </section>
    <section class="card">
      <p class="eyebrow">Unlocks</p>
      ${unlockList(weekScores.map(([, score]) => score))}
    </section>
    <section class="card">
      <p class="eyebrow">Achievement Levels</p>
      ${achievementLegend()}
    </section>
    <section class="card">
      <p class="eyebrow">Weekly Word And Concept Mastery</p>
      <p class="meta">This uses a hidden local formula blending accuracy, exposure, locked activity items, and week score. It is meant as a study signal, not a permanent grade.</p>
      ${weeklyConceptMastery()}
    </section>
    <section class="card">
      <p class="eyebrow">Mastery</p>
      ${mastery.length ? mastery.map(([term, m]) => `
        <p><strong>${term}</strong>: ${m.correct}/${m.seen}, strength ${Math.round(m.strength * 100)}%</p>
      `).join("") : "<p>No mastery data yet. Play a module to begin.</p>"}
    </section>
    <section class="card">
      <p class="eyebrow">Saved Highlights</p>
      ${highlights.length ? highlights.map((highlight) => `
        <article class="card">
          <p class="meta">Week ${highlight.weekNumber}, Day ${highlight.day}: ${escapeHtml(highlight.sourceTitle)}</p>
          <p><mark>${escapeHtml(highlight.text)}</mark></p>
          <button data-delete-highlight="${highlight.id}">Delete Highlight</button>
        </article>
      `).join("") : "<p>No highlights saved yet. Select text in a reading card and tap Save Selected Highlight.</p>"}
    </section>
    <section class="card">
      <p class="eyebrow">Maintenance</p>
      <button data-reset-start>Reset to Week 1, Day 1</button>
      <button data-export>Export Progress JSON</button>
      <button data-refresh-cache>Refresh Offline Cache</button>
    </section>
  `);
}

function activityNameFromKey(key) {
  const game = key.split("-").slice(4).join("-");
  return labelForGame(game);
}

function unlockList(scores) {
  const perfectCount = scores.filter((score) => score.perfect).length;
  const masterfulCount = scores.filter((score) => score.perfect && score.attempts === 1).length;
  const unlocks = [];
  if (perfectCount >= 1) unlocks.push("Hard-mode review note unlocked: revisit a perfect activity only through its Points summary.");
  if (perfectCount >= 3) unlocks.push("Scholar streak unlocked: three activities completed perfectly this week.");
  if (masterfulCount >= 1) unlocks.push("Masterful mark unlocked: at least one first-try perfect activity.");
  return unlocks.length ? unlocks.map((item) => `<p>${item}</p>`).join("") : "<p>No unlocks yet. Perfect an activity to reveal the first one.</p>";
}

function achievementLegend() {
  return `
    <p><strong>Masterful:</strong> First-try perfection. You recognized denotation, connotation, and governing context without correction.</p>
    <p><strong>Formidable:</strong> Eventually perfect. You corrected your thinking and brought the whole activity under command.</p>
    <p><strong>Sharp:</strong> Strong command with a few unresolved distinctions, usually involving nuance or tempting near-concepts.</p>
    <p><strong>Competent:</strong> Functional understanding. You see the main denotation but need more work on application and connotation.</p>
    <p><strong>Novice:</strong> Early exposure. The terms are familiar, but the conceptual architecture is not yet stable.</p>
  `;
}

function weeklyConceptMastery() {
  return state.week.vocabulary.map((entry) => {
    const mastery = state.progress.mastery[entry.id] || state.progress.mastery[entry.term] || { seen: 0, correct: 0, strength: 0 };
    const exposure = Math.min(1, mastery.seen / 4);
    const accuracy = mastery.seen ? mastery.correct / mastery.seen : 0;
    const weekSignal = weeklyScore(state.week.id) / 100;
    const hiddenScore = Math.round(((accuracy * 0.55) + (exposure * 0.25) + (weekSignal * 0.2)) * 100);
    return `
      <article class="card">
        <h3>${entry.term}: ${conceptMasteryLabel(hiddenScore)}</h3>
        <p>${hiddenScore}% local mastery signal. ${mastery.correct || 0}/${mastery.seen || 0} direct checks correct.</p>
        <p class="meta">Study cue: ${conceptStudyCue(entry, hiddenScore)}</p>
      </article>
    `;
  }).join("");
}

function conceptMasteryLabel(score) {
  if (score >= 92) return "Masterful";
  if (score >= 82) return "Formidable";
  if (score >= 70) return "Sharp";
  if (score >= 50) return "Competent";
  return "Novice";
}

function conceptStudyCue(entry, score) {
  if (score >= 82) return `Refine connotation: distinguish ${entry.term} from near neighbors under pressure.`;
  if (score >= 50) return `Strengthen application: use the historical anchor to recognize ${entry.term} in a new case.`;
  return `Begin with denotation and etymology: ${entry.etymology}`;
}

function gameMarkup(key) {
  const week = state.week;
  const vocab = week.vocabulary;
  const seed = `${week.id}-${state.progress.currentDay}-${key}`;
  const allTerms = vocab.map((v) => v.term);
  const activityScore = state.progress.activityScores[week.id]?.[activityKey(key)];
  const attemptText = activityScore ? `Previous best: ${Math.round(activityScore.earned * 100) / 100}/${Math.round(activityScore.max * 100) / 100}, ${activityScore.attempts} ${activityScore.attempts === 1 ? "try" : "tries"}.` : "No attempts yet.";

  if (key === "definitionMatch") {
    return definitionMatchGame(vocab, seed, key, attemptText);
  }

  if (key === "contextBlank" || key === "cloze") {
    return gameCard("Context Fill-in-the-Blank", "Choose the correct vocabulary word for every full sentence.", vocab.map((v, index) =>
      selectQuestion(index, blankSentence(v), v.term, seededShuffle(allTerms, `${seed}-${index}`), v.id, vocabularyExplanation(v))
    ).join(""), key, attemptText);
  }

  if (key === "passageCloze") {
    const questions = week.clozeTests.map((item, index) => {
      const answer = item.answers[0].accepted[0];
      const vocabEntry = vocab.find((v) => v.term.toLowerCase() === answer.toLowerCase());
      return selectQuestion(index, item.body.replace(/\{\{[^}]+\}\}/g, "_____"), answer, seededShuffle(allTerms, `${seed}-${index}`), answer, vocabEntry ? vocabularyExplanation(vocabEntry) : "The surrounding sentence points to the term that best completes the concept.");
    }).join("");
    return gameCard("Passage Cloze", "Complete each authored cloze sentence from the week.", questions, key, attemptText);
  }

  if (key === "etymologyTrail") {
    return gameCard("Etymology Trail", "Choose the word that belongs to each etymological path.", vocab.map((v, index) =>
      selectQuestion(index, v.etymology, v.term, seededShuffle(allTerms, `${seed}-${index}`), v.id, `The etymology belongs to ${v.term}: ${v.definition}`)
    ).join(""), key, attemptText);
  }

  if (key === "synonymAntonym") {
    return gameCard("Synonym / Antonym Grid", "Use synonym and antonym clues to recover the correct term.", vocab.map((v, index) =>
      selectQuestion(index, `Synonym: <strong>${v.synonyms[0]}</strong>. Antonym: <strong>${v.antonyms[0]}</strong>.`, v.term, seededShuffle(allTerms, `${seed}-${index}`), v.id, `${v.term} means ${v.definition}`)
    ).join(""), key, attemptText);
  }

  if (key === "argumentDuel") {
    return gameCard("Argument Duel", "Select the stronger argument in each duel.", week.argumentDuels.map((duel, index) =>
      selectQuestion(index, `${duel.claimA}<br><br>${duel.claimB}<br><span class="meta">Criteria: ${duel.criteria.join(", ")}</span>`, duel.stronger, ["A", "B"], duel.id, `Claim ${duel.stronger} is stronger under these criteria: ${duel.criteria.join(", ")}.`)
    ).join(""), key, attemptText);
  }

  if (key === "microCrossword") {
    const crossword = seededShuffle(week.crosswords, seed)[0];
    return gameCard("Micro-Crossword", crossword.title, `
      ${crosswordGrid(crossword)}
      ${crossword.entries.map((e) => `<p><strong>${e.direction}:</strong> ${e.clue}</p>`).join("")}
      ${crossword.entries.map((entry, index) =>
        selectQuestion(index, `${entry.direction}: ${entry.clue}`, entry.term, seededShuffle(allTerms, `${seed}-${index}`), entry.term, `The clue points to ${entry.term}.`)
      ).join("")}
    `, key, attemptText);
  }

  if (key === "scenarioGauntlet") {
    return scenarioGauntletGame(week, seed, key, attemptText);
  }

  if (key === "scenarioChallenge" || key === "chooseConcept" || key === "forcedApplication") {
    const scenarios = seededShuffle([...week.scenarios.modern, ...week.scenarios.historical, ...week.scenarios.literary], seed).slice(0, 5);
    return gameCard(labelForGame(key), "Choose the concept that best explains each full scenario.", scenarios.map((scenario, index) =>
      selectQuestion(index, scenario.prompt, scenario.bestConcept, seededShuffle([scenario.bestConcept, ...scenario.distractors], `${seed}-${index}`), scenario.bestConcept, scenario.rationale)
    ).join(""), key, attemptText);
  }

  if (key === "highEndChallenge") {
    return highEndBossGame(week, seed, key, attemptText);
  }

  if (key === "conceptTournamentLite" || key === "conceptSorting" || key === "conceptBracket") {
    const bracket = week.conceptBracket;
    if (key === "conceptTournamentLite") {
      return conceptTournamentLiteGame(week, seed, key, attemptText);
    }
    return gameCard(labelForGame(key), "Advance the concept that best survives each intellectual test.", bracket.roundPrompts.map((prompt, index) =>
      selectQuestion(index, prompt, bracket.modelWinner, seededShuffle(bracket.concepts, `${seed}-${index}`), bracket.modelWinner, bracket.rationale)
    ).join(""), key, attemptText);
  }

  if (key === "conceptConstellation") {
    return gameCard("Concept Constellation", week.conceptConstellation.center, `
      ${selectQuestion(0, "Which cluster belongs nearest the center?", week.conceptConstellation.near.join(", "), seededShuffle([
        week.conceptConstellation.near.join(", "),
        week.conceptConstellation.tension.join(", "),
        week.conceptConstellation.corrective.join(", ")
      ], `${seed}-0`), week.conceptConstellation.center, "The near cluster names concepts most directly allied with the central idea.")}
      ${selectQuestion(1, "Which cluster creates tension?", week.conceptConstellation.tension.join(", "), seededShuffle([
        week.conceptConstellation.near.join(", "),
        week.conceptConstellation.tension.join(", "),
        week.conceptConstellation.corrective.join(", ")
      ], `${seed}-1`), week.conceptConstellation.center, "The tension cluster names concepts that pressure or endanger the central idea.")}
      ${selectQuestion(2, "Which cluster corrects or disciplines the theme?", week.conceptConstellation.corrective.join(", "), seededShuffle([
        week.conceptConstellation.near.join(", "),
        week.conceptConstellation.tension.join(", "),
        week.conceptConstellation.corrective.join(", ")
      ], `${seed}-2`), week.conceptConstellation.center, "The corrective cluster names concepts that restrain or discipline the central idea.")}
    `, key, attemptText);
  }

  return gameCard("Cumulative Application", "Choose the concept and write one severe sentence of application.", `
    <textarea aria-label="Cumulative application"></textarea>
    ${selectQuestion(0, "Which concept should govern the week's cumulative application?", week.conceptBracket.modelWinner, seededShuffle(week.conceptBracket.concepts, seed), week.conceptBracket.modelWinner, week.conceptBracket.rationale)}
  `, key, attemptText);
}

function gameCard(title, prompt, body, gameKey = "", attemptText = "") {
  const score = gameKey ? activityScore(gameKey) : null;
  return `
    <section class="card" id="active-game">
      <p class="eyebrow">Active Module</p>
      <h2>${title}</h2>
      ${score && !score.perfect ? activityScoreBanner(score) : ""}
      <p>${prompt}</p>
      <p class="meta">${attemptText}</p>
      <div class="grid">${body}</div>
      ${state.gameResult ? resultCard(state.gameResult) : ""}
      <div class="footer-actions">
        <button data-submit-game="${gameKey}">Submit Answers</button>
        <button data-back-today>Back to Today</button>
      </div>
    </section>
  `;
}

function activityScoreBanner(score) {
  return `
    <section class="card soft">
      <p class="eyebrow">Current Activity Score</p>
      <h3>${activityRank(score)} - ${Math.round(score.earned * 100) / 100}/${Math.round(score.max * 100) / 100} points</h3>
      <p>${score.correct}/${score.total} correct after ${score.attempts} ${score.attempts === 1 ? "try" : "tries"}. Correct the misses and resubmit for reduced points.</p>
      <p class="score-breakdown">Accuracy: ${Math.round((score.correct / score.total) * 100)}%. First-try pressure remains; each additional submission lowers the possible gain.</p>
    </section>
  `;
}

function activityRank(score) {
  const ratio = score.total ? score.correct / score.total : 0;
  if (score.perfect && score.attempts === 1) return "Masterful";
  if (score.perfect) return "Formidable";
  if (ratio >= 0.85) return "Sharp";
  if (ratio >= 0.65) return "Competent";
  return "Novice";
}

function definitionMatchGame(vocab, seed, gameKey, attemptText) {
  let questionIndex = 0;
  const rounds = chunk(vocab, 4).map((group, roundIndex) => {
    const letters = "ABCDEF".split("");
    const decoy = definitionDecoys(group)[0];
    const definitions = seededShuffle([...group.map((entry) => ({
      term: entry.term,
      definition: entry.definition,
      id: entry.id
    })), decoy], `${seed}-round-${roundIndex}`).map((entry, index) => ({ ...entry, letter: letters[index] }));
    const letterByTerm = Object.fromEntries(definitions.filter((entry) => entry.term).map((entry) => [entry.term, entry.letter]));
    const bank = definitions.map((entry) => `<p><strong>${entry.letter}.</strong> ${escapeHtml(entry.definition)}</p>`).join("");
    const questions = group.map((entry) =>
      letterInputQuestion(
        questionIndex++,
        entry.term,
        letterByTerm[entry.term],
        entry.id,
        correctDefinitionExplanation(entry),
        wrongDefinitionHint(entry)
      )
    ).join("");

    return `
      <section class="card soft match-round">
        <p class="eyebrow">Definition Match Round ${roundIndex + 1}</p>
        <p class="meta">One definition in this round is a decoy. Match only these words against this bank.</p>
        <div class="match-board">
          <div>
            <h3>Definition Bank</h3>
            ${bank}
          </div>
          <div>
            <h3>Words</h3>
            ${questions}
          </div>
        </div>
      </section>
    `;
  }).join("");

  return gameCard("Definition Match", "Work round by round so the definitions and words stay visible together. Type the matching letter beside each word.", rounds, gameKey, attemptText);
}

function definitionDecoys(vocab) {
  const terms = vocab.slice(0, 2);
  return terms.map((entry, index) => ({
    term: null,
    definition: index === 0
      ? `A merely emotional reaction that resembles ${entry.term} but lacks disciplined judgment.`
      : `A temporary convenience mistaken for the durable virtue of ${entry.term}.`,
    id: `decoy-${entry.id}`,
    explanation: "This is a decoy definition: it sounds conceptually adjacent but does not define any listed term precisely."
  }));
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

function correctDefinitionExplanation(entry) {
  return `${entry.term} is correct because its denotation is ${entry.definition} Its etymology, ${entry.etymology}, gives the word its conceptual grain; the historical anchor shows the term acting under pressure rather than as a dictionary ornament.`;
}

function wrongDefinitionHint(entry) {
  return `Do not match ${entry.term} by emotional neighborhood alone. Attend to the etymological grain, then ask which definition names the governing power of the word rather than a nearby mood or consequence.`;
}

function letterInputQuestion(index, term, answer, concept, rationale = "", hint = "") {
  const key = state.activeGame ? activityKey(state.activeGame) : "";
  const previousAnswer = key ? state.activityAnswers[key]?.[index] || "" : "";
  const feedback = state.activityFeedback?.gameKey === state.activeGame ? state.activityFeedback.questions[index] : null;
  const locked = questionIsLocked(index);
  const value = locked ? answer : previousAnswer;
  return `
    <article class="card ${feedback ? (feedback.correct ? "answer-correct" : "answer-wrong") : ""}">
      <label for="q-${index}"><strong>${escapeHtml(term)}</strong></label>
      <input id="q-${index}" class="letter-input" maxlength="1" autocomplete="off" autocapitalize="characters" value="${escapeHtml(value)}" ${locked ? "disabled" : ""} data-answer="${escapeHtml(answer)}" data-concept="${escapeHtml(concept || "")}" data-rationale="${escapeHtml(rationale)}" data-hint="${escapeHtml(hint)}" />
      ${locked ? lockedMarkup() : ""}
      ${feedback && !locked ? feedbackMarkup(feedback) : ""}
    </article>
  `;
}

function selectQuestion(index, prompt, answer, choices, concept, rationale = "", hint = "") {
  const key = state.activeGame ? activityKey(state.activeGame) : "";
  const previousAnswer = key ? state.activityAnswers[key]?.[index] || "" : "";
  const feedback = state.activityFeedback?.gameKey === state.activeGame ? state.activityFeedback.questions[index] : null;
  const locked = questionIsLocked(index);
  const value = locked ? answer : previousAnswer;
  return `
    <article class="card ${feedback ? (feedback.correct ? "answer-correct" : "answer-wrong") : ""}">
      <label for="q-${index}">${prompt}</label>
      <select id="q-${index}" ${locked ? "disabled" : ""} data-answer="${escapeHtml(answer)}" data-concept="${escapeHtml(concept || "")}" data-rationale="${escapeHtml(rationale)}" data-hint="${escapeHtml(hint)}">
        <option value="">Select...</option>
        ${choices.map((choice) => `<option value="${escapeHtml(choice)}" ${choice === value ? "selected" : ""}>${escapeHtml(choice)}</option>`).join("")}
      </select>
      ${locked ? lockedMarkup() : ""}
      ${feedback && !locked ? feedbackMarkup(feedback) : ""}
    </article>
  `;
}

function lockedMarkup() {
  return `<div class="feedback correct"><strong>Locked correct.</strong> You already earned this item; only missed items remain editable.</div>`;
}

function conceptTournamentLiteGame(week, seed, key, attemptText) {
  const questions = conceptTournamentLiteQuestions(week, seed);
  return gameCard("Concept Tournament Lite", "A fast bracket of ideas. Each round asks which concept explains more, then why the losing concept is insufficient.", questions.map((question, index) =>
    selectQuestion(index, question.prompt, question.answer, seededShuffle(question.choices, `${seed}-${index}`), question.answer, question.rationale)
  ).join(""), key, attemptText);
}

function conceptTournamentLiteQuestions(week, seed) {
  const scenarios = seededShuffle([...week.scenarios.modern, ...week.scenarios.historical, ...week.scenarios.literary], seed).slice(0, 4);
  const bracketConcepts = week.conceptBracket.concepts;
  return scenarios.flatMap((scenario, index) => {
    const rival = seededShuffle([...scenario.distractors, ...bracketConcepts], `${seed}-lite-${index}`).find((choice) => choice !== scenario.bestConcept);
    return [
      {
        prompt: `<strong>Round ${index + 1}: ${scenario.bestConcept} vs ${rival}</strong><br>${scenario.prompt}<br><span class="meta">Context: ${escapeHtml(scenario.rationale)} Choose the concept that explains the motive, public consequence, and danger of misreading the case.</span>`,
        answer: scenario.bestConcept,
        choices: [scenario.bestConcept, rival],
        rationale: `${scenario.bestConcept} advances because it explains the whole structure of the case; ${rival} is tempting but partial.`
      },
      {
        prompt: `<strong>Losing-Concept Analysis</strong><br>Why is ${rival} insufficient in the previous round?`,
        answer: "It names part of the case but not the governing pattern.",
        choices: [
          "It names part of the case but not the governing pattern.",
          "It is always morally wrong in every circumstance.",
          "It is unrelated to leadership or political judgment.",
          "It matters only in literature, not history."
        ],
        rationale: "Strong concept play requires seeing why the losing concept is tempting but insufficient."
      }
    ];
  });
}

function scenarioGauntletGame(week, seed, key, attemptText) {
  const scenarios = seededShuffle([...week.scenarios.modern, ...week.scenarios.historical, ...week.scenarios.literary], seed).slice(0, 5);
  const questions = scenarios.flatMap((scenario, index) => [
    {
      prompt: `<strong>Level ${index + 1}A - Diagnosis</strong><br>${scenario.prompt}`,
      answer: scenario.bestConcept,
      choices: [scenario.bestConcept, ...scenario.distractors],
      rationale: scenario.rationale
    },
    {
      prompt: `<strong>Level ${index + 1}B - Tempting Misread</strong><br>Which answer is plausible but less complete for this case?`,
      answer: scenario.distractors[0],
      choices: [scenario.bestConcept, ...scenario.distractors],
      rationale: `${scenario.distractors[0]} is plausible, but the fuller diagnosis still depends on ${scenario.bestConcept}.`
    },
    {
      prompt: `<strong>Level ${index + 1}C - Counsel</strong><br>Which sentence of counsel best follows from the governing concept?`,
      answer: `Act under ${scenario.bestConcept}, not under the pressure of the surface temptation.`,
      choices: [
        `Act under ${scenario.bestConcept}, not under the pressure of the surface temptation.`,
        "Choose whatever wins fastest; later legitimacy can be repaired.",
        "Avoid all action until no risk remains.",
        "Treat criticism as proof that the decision is correct."
      ],
      rationale: "Good counsel applies the concept without surrendering timing, legitimacy, or proportion."
    }
  ]);

  return gameCard("Scenario Gauntlet", "Five cases, three levels each: diagnose the concept, identify the tempting misread, then choose the best counsel.", questions.map((question, index) =>
    selectQuestion(index, question.prompt, question.answer, seededShuffle(question.choices, `${seed}-gauntlet-${index}`), question.answer, question.rationale)
  ).join(""), key, attemptText);
}

function highEndBossGame(week, seed, key, attemptText) {
  const challenge = week.highEndChallenge || fallbackHighEndChallenge(week);
  const questions = [
    ...challenge.questions,
    ...councilRoomQuestions(week, seed),
    {
      prompt: "<strong>Bracket City Logic</strong><br>Complete the nested judgment: [immediate victory] loses to [durable order] because the central issue is ____.",
      answer: week.conceptBracket.modelWinner,
      choices: week.conceptBracket.concepts,
      rationale: week.conceptBracket.rationale
    }
  ];

  return gameCard("Boss Challenge: Council Room", challenge.title, `
    <div class="narrative-case">${paragraphs(challenge.body, `week-${week.number}-day-${state.progress.currentDay}-high-end`, challenge.title)}</div>
    <section class="card soft">
      <p class="eyebrow">Stakes</p>
      <p>This is the week's boss challenge. It mixes diagnosis, adviser judgment, Bracket City logic, and consequence. A first-try perfect earns the highest rank.</p>
    </section>
    ${questions.map((question, index) =>
      selectQuestion(index, question.prompt, question.answer, seededShuffle(question.choices, `${seed}-boss-${index}`), question.answer, question.rationale)
    ).join("")}
  `, key, attemptText);
}

function councilRoomQuestions(week, seed) {
  const concepts = week.conceptBracket.concepts;
  const model = week.conceptBracket.modelWinner;
  const rival = seededShuffle(concepts.filter((concept) => concept !== model), seed)[0];
  return [
    {
      prompt: "<strong>Council Room - The Institutionalist</strong><br>An adviser says: preserve the rule that lets future decisions remain legitimate, even if today's applause is lost. Which concept is this adviser defending?",
      answer: model,
      choices: concepts,
      rationale: `The institutionalist defends ${model}: the concept that best preserves durable order.`
    },
    {
      prompt: "<strong>Council Room - The Dangerous Adviser</strong><br>Another adviser says: win the immediate fight first; the meaning of the victory can be repaired later. Which concept is seducing this adviser?",
      answer: rival,
      choices: concepts,
      rationale: `${rival} is dangerous here because it can make partial victory look like comprehensive wisdom.`
    },
    {
      prompt: "<strong>One Fatal Error</strong><br>Which choice would most damage the leader's later authority?",
      answer: "Win by humiliating rivals and then demand trust.",
      choices: [
        "Win by humiliating rivals and then demand trust.",
        "Explain the standard before enforcing it.",
        "Preserve dissenting counsel before deciding.",
        "Delay briefly to distinguish fact from appetite."
      ],
      rationale: "Humiliation may win compliance, but it spends the legitimacy needed for later rule."
    }
  ];
}

function fallbackHighEndChallenge(week) {
  const modern = week.scenarios.modern[0];
  const historical = week.scenarios.historical[0];
  const literary = week.scenarios.literary[0];
  return {
    title: `${week.title}: The Hard Case`,
    body: `A newly appointed leader inherits an institution that publicly praises ${week.coreConcepts[0]} but privately rewards its opposite. Senior figures insist that quick action will restore confidence, while quieter advisers warn that the institution's legitimacy has already been weakened by years of theatrical decisions.\n\nA modern dispute now forces the issue. ${modern.prompt} The leader can act swiftly and win applause, but the decision will create a precedent. Delay may preserve judgment, but it may also look like weakness.\n\nThe case echoes an older pattern: ${historical.prompt} It also has a literary analogue: ${literary.prompt} Your task is to decide which concept governs the whole field, which temptation must be resisted, and which public explanation would best preserve authority without surrendering truth.`,
    questions: [
      {
        prompt: "Which concept best governs the whole situation?",
        answer: week.conceptBracket.modelWinner,
        choices: week.conceptBracket.concepts,
        rationale: week.conceptBracket.rationale
      },
      {
        prompt: "Which concept is the strongest temptation in the case?",
        answer: modern.bestConcept,
        choices: [modern.bestConcept, ...modern.distractors],
        rationale: modern.rationale
      },
      {
        prompt: "Which parallel best clarifies the danger of misjudgment?",
        answer: historical.bestConcept,
        choices: [historical.bestConcept, ...historical.distractors],
        rationale: historical.rationale
      }
    ]
  };
}

function feedbackMarkup(feedback) {
  if (feedback.correct) {
    return `<div class="feedback correct"><strong>Correct.</strong> ${escapeHtml(feedback.explanation)}</div>`;
  }

  return `
    <div class="feedback wrong">
      <strong>Revise this one.</strong>
      <p>Your answer: ${escapeHtml(feedback.selected || "blank")}</p>
      <p>Hint: ${escapeHtml(feedback.explanation)}</p>
    </div>
  `;
}

function vocabularyExplanation(entry) {
  return `${entry.term} means ${entry.definition} Etymology: ${entry.etymology} Historical anchor: ${entry.historicalAnchor}`;
}

function blankSentence(entry) {
  const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  const sentence = regex.test(entry.example)
    ? entry.example.replace(regex, "_____")
    : `${entry.example} Which concept is being illustrated? _____`;
  return sentence;
}

function choiceButton(game, label, correct, concept, rationale = "") {
  return `<button class="choice" data-answer="${correct}" data-game-key="${game}" data-concept="${concept || ""}" data-rationale="${escapeHtml(rationale)}">${label}</button>`;
}

function crosswordGrid(crossword) {
  const grid = Array.from({ length: crossword.size }, () => Array.from({ length: crossword.size }, () => ""));
  for (const entry of crossword.entries) {
    [...entry.term.replaceAll(" ", "")].forEach((char, i) => {
      const row = entry.row + (entry.direction === "down" ? i : 0);
      const col = entry.col + (entry.direction === "across" ? i : 0);
      if (grid[row] && grid[row][col] !== undefined) grid[row][col] = char;
    });
  }
  return `<div class="crossword" style="grid-template-columns: repeat(${crossword.size}, 1fr)">${grid.flat().map((char) => `<span class="cell ${char ? "" : "block"}">${char}</span>`).join("")}</div>`;
}

function render() {
  const view = {
    today: renderToday,
    week: renderWeek,
    library: renderLibrary,
    progress: renderProgress
  }[state.route];
  document.getElementById("app").innerHTML = view();
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.route) {
    state.route = target.dataset.route;
    state.activeGame = null;
    state.activityFeedback = null;
    state.gameResult = null;
    render();
    return;
  }

  if (target.dataset.game) {
    if (activityIsPerfect(target.dataset.game)) {
      state.gameResult = {
        title: "Activity Locked",
        body: "You already completed this activity perfectly. It is locked so the weekly score stays meaningful."
      };
      render();
      return;
    }
    state.activeGame = target.dataset.game;
    state.activityFeedback = null;
    state.gameResult = null;
    render();
    return;
  }

  if (target.dataset.backToday !== undefined) {
    state.activeGame = null;
    state.activityFeedback = null;
    render();
    return;
  }

  if (target.dataset.saveHighlight !== undefined) {
    const saved = await savePendingHighlight();
    state.gameResult = saved
      ? { title: "Highlight Saved", body: "The selected passage is saved locally and will reappear highlighted here." }
      : { title: "No Highlight Selected", correct: false, body: "Select text inside the reading card first, then tap Save Selected Highlight." };
    render();
    return;
  }

  if (target.dataset.submitGame) {
    const controls = [...document.querySelectorAll("#active-game select[data-answer], #active-game input[data-answer]")];
    const total = controls.length;
    const correctItems = controls
      .map((control, index) => (normalizedAnswer(control.value) === normalizedAnswer(control.dataset.answer) ? index : -1))
      .filter((index) => index >= 0);
    const correctCount = correctItems.length;
    const key = activityKey(target.dataset.submitGame);
    state.activityAnswers[key] = controls.reduce((answers, control, index) => {
      answers[index] = control.value;
      return answers;
    }, {});
    state.activityFeedback = {
      gameKey: target.dataset.submitGame,
      questions: controls.map((control) => ({
        selected: control.value,
        answer: control.dataset.answer,
        correct: normalizedAnswer(control.value) === normalizedAnswer(control.dataset.answer),
        explanation: normalizedAnswer(control.value) === normalizedAnswer(control.dataset.answer)
          ? control.dataset.rationale || "That answer fits the definition, etymology, and conceptual role in the week's material."
          : wrongAnswerHint(control, target.dataset.submitGame)
      }))
    };
    const score = recordActivityScore(target.dataset.submitGame, correctCount, total, correctItems);
    if (score.perfect) {
      state.activeGame = null;
      state.activityFeedback = null;
    }
    state.gameResult = {
      title: correctCount === total ? "Perfect Submission" : "Submission Scored",
      correct: correctCount === total,
      body: score.perfect
        ? `${correctCount}/${total} correct. Rank: ${activityRank(score)}. This activity is now locked. Activity score: ${Math.round(score.earned * 100) / 100}/${Math.round(score.max * 100) / 100}. Check Points for unlocks.`
        : `${correctCount}/${total} correct. Attempt ${score.attempts}. Best score for this activity: ${Math.round(score.earned * 100) / 100}/${Math.round(score.max * 100) / 100}. Correct the marked items and resubmit for reduced points.`
    };
    render();
    return;
  }

  if (target.dataset.answer) {
    const correct = target.dataset.answer === "true";
    markComplete(`${target.dataset.gameKey}-${Date.now()}`, correct ? 15 : 5, target.dataset.concept, correct);
    state.gameResult = {
      title: correct ? "Correct" : "Not quite",
      correct,
      body: target.dataset.rationale || (correct ? "The selected concept fits the governing pattern." : "Review the concept anchors, then try the module again.")
    };
    render();
    return;
  }

  if (target.dataset.completeGame) {
    markComplete(`${target.dataset.completeGame}-${Date.now()}`, 15, target.dataset.concept || null, true);
    state.gameResult = { title: "Module Complete", body: "Progress saved locally in IndexedDB." };
    render();
    return;
  }

  if (target.dataset.completeDay !== undefined) {
    markComplete(`day-${state.progress.currentDay}`, 0);
    state.progress.currentDay = state.progress.currentDay === 7 ? 1 : state.progress.currentDay + 1;
    if (state.progress.currentDay === 1 && state.progress.currentWeek < 8) {
      state.progress.currentWeek += 1;
      state.week = await loadWeek(state.progress.currentWeek);
    }
    await saveProgress();
    render();
    return;
  }

  if (target.dataset.setDay) {
    state.progress.currentDay = Number(target.dataset.setDay);
    state.activeGame = null;
    state.activityFeedback = null;
    await saveProgress();
    state.route = "today";
    render();
    return;
  }

  if (target.dataset.openWeek) {
    state.progress.currentWeek = Number(target.dataset.openWeek);
    state.week = await loadWeek(state.progress.currentWeek);
    state.activeGame = null;
    state.activityFeedback = null;
    await saveProgress();
    state.route = "week";
    render();
    return;
  }

  if (target.dataset.export !== undefined) {
    const blob = new Blob([JSON.stringify(state.progress, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "offline-great-courses-progress.json";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (target.dataset.deleteHighlight) {
    state.progress.highlights = state.progress.highlights.filter((highlight) => highlight.id !== target.dataset.deleteHighlight);
    await saveProgress();
    render();
    return;
  }

  if (target.dataset.resetStart !== undefined) {
    await resetToWeekOneDayOne();
    state.route = "today";
    render();
    return;
  }

  if (target.dataset.refreshCache !== undefined) {
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
    state.gameResult = { title: "Cache Refresh Requested", body: "The service worker checked for updated app and content packs." };
    render();
  }
});

function captureCurrentSelection() {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text || text.length < 3) return false;

  const anchor = selection.anchorNode?.nodeType === Node.TEXT_NODE
    ? selection.anchorNode.parentElement
    : selection.anchorNode;
  const readable = anchor?.closest?.(".readable");
  if (!readable) return false;

  state.pendingHighlight = {
    text,
    sourceId: readable.dataset.sourceId,
    sourceTitle: readable.dataset.sourceTitle
  };
  return true;
}

async function boot() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.register("./service-worker.js");
    registration.update();
  }

  await loadIndex();
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "1") {
    await resetToWeekOneDayOne();
    window.history.replaceState({}, "", "./index.html?v=14");
  } else {
    state.progress = (await dbGet("local-user")) || clone(DEFAULT_PROGRESS);
  }
  ensureProgressShape();
  state.week = await loadWeek(state.progress.currentWeek);
  render();
}

function wrongAnswerHint(control, gameKey) {
  if (control.dataset.hint) return control.dataset.hint;
  if (!control.value) return "Choose an answer before submitting. No answer can be locked until it is correct.";
  if (gameKey === "definitionMatch") {
    return "That letter points to a neighboring idea, not the word's proper denotation. Compare etymology, connotation, and the example sentence; the right definition will name the word's governing function, not merely its atmosphere.";
  }
  if (gameKey === "conceptTournamentLite") {
    return "The selected concept names part of the scene, but it does not explain both motive and consequence. Look for the term with the widest explanatory authority over the case.";
  }
  if (gameKey === "scenarioGauntlet") {
    return "This is a plausible diagnosis at the level of surface description. The gauntlet is asking for the deeper pattern: what pressure shapes the choice, what virtue or vice governs it, and what consequence follows?";
  }
  if (gameKey === "highEndChallenge") {
    return "The case includes a trap: immediate advantage, public appearance, and durable authority are not identical. Re-read for the distinction between what wins now and what can still be defended later.";
  }
  return "That answer is tempting but insufficient. Re-read for nuance: denotation tells you what the word means, connotation tells you what kind of judgment it carries, and context tells you whether it truly governs the case.";
}

boot().catch((error) => {
  document.getElementById("app").innerHTML = `
    <main class="app">
      <section class="card">
        <h1>Could not start app</h1>
        <p>${escapeHtml(error.message)}</p>
      </section>
    </main>
  `;
});

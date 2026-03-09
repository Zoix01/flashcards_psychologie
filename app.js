(() => {
  const STORAGE_KEY = "flashcards_psychologie_cards_v1";

  /** @type {Array<any>} */
  let cards = [];
  let currentCard = null;
  let hasAnsweredCurrent = false;
  /** @type {boolean|null} true/false = actual correctness (MC, fill-in), null = use rating (open-ended) */
  let lastAnswerActualCorrect = null;

  // DOM references
  const tabButtons = document.querySelectorAll(".tab-button");
  const screens = document.querySelectorAll(".screen");

  const bookExistingGroup = document.getElementById("book-existing-group");
  const bookSelect = document.getElementById("book-select");
  const bookNameInput = document.getElementById("book-name-input");
  const jsonInput = document.getElementById("json-input");
  const addCardsBtn = document.getElementById("add-cards-btn");
  const exportCardsBtn = document.getElementById("export-cards-btn");
  const clearCardsBtn = document.getElementById("clear-cards-btn");
  const uploadMessage = document.getElementById("upload-message");
  const cardCountEl = document.getElementById("card-count");

  const bookFilter = document.getElementById("book-filter");
  const languageFilter = document.getElementById("language-filter");

  const practiceViewBtn = document.getElementById("practice-view-btn");
  const wrongLogViewBtn = document.getElementById("wrong-log-view-btn");
  const practiceView = document.getElementById("practice-view");
  const wrongLogView = document.getElementById("wrong-log-view");

  const noCardsMessage = document.getElementById("no-cards-message");
  const flashcardContainer = document.getElementById("flashcard-container");
  const cardTopicEl = document.getElementById("card-topic");
  const cardLanguageEl = document.getElementById("card-language");
  const cardBookEl = document.getElementById("card-book");
  const questionTextEl = document.getElementById("question-text");
  const answerAreaEl = document.getElementById("answer-area");
  const feedbackEl = document.getElementById("feedback");
  const confidenceContainer = document.getElementById("confidence-container");
  const confidenceButtons = document.querySelectorAll(".confidence-btn");
  const discardCardBtn = document.getElementById("discard-card-btn");

  const wrongLogEmpty = document.getElementById("wrong-log-empty");
  const wrongLogList = document.getElementById("wrong-log-list");
  const wrongLogDetail = document.getElementById("wrong-log-detail");
  const wrongLogQuestion = document.getElementById("wrong-log-question");
  const wrongLogAnswer = document.getElementById("wrong-log-answer");
  const wrongLogActions = document.getElementById("wrong-log-actions");

  const statsByBookEl = document.getElementById("stats-by-book");
  const statsByTopicEl = document.getElementById("stats-by-topic");
  const statsBookSection = document.getElementById("stats-book-section");
  const statsTopicSection = document.getElementById("stats-topic-section");
  const statsEmptyEl = document.getElementById("stats-empty");

  // Helpers
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function parseOptionLabelAndText(opt) {
    const m = String(opt).match(/^([A-Ea-e])[.:\s)]*\s*(.*)$/);
    if (m) return { letter: m[1].toUpperCase(), text: m[2].trim() };
    return null;
  }

  function rebuildOptionsWithShuffledTexts(options) {
    const letters = ["A", "B", "C", "D", "E"];
    const parsed = options.map((o) => parseOptionLabelAndText(o));
    const allValid = parsed.every((p) => p != null);
    if (!allValid || parsed.length === 0) return null;

    const texts = parsed.map((p) => p.text);
    shuffleArray(texts);

    return texts.map((t, i) => `${letters[i]}. ${t}`);
  }

  function extractCorrectText(correctStr, options) {
    const p = parseOptionLabelAndText(correctStr);
    if (p) {
      if (p.text) return p.text;
      const optWithLetter = (options || []).find((o) => {
        const q = parseOptionLabelAndText(o);
        return q && q.letter === p.letter;
      });
      const q = optWithLetter ? parseOptionLabelAndText(optWithLetter) : null;
      return q ? q.text : "";
    }
    return (correctStr || "").trim();
  }

  function loadCards() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        cards = [];
      } else {
        const parsed = JSON.parse(raw);
        cards = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Failed to load cards from localStorage", e);
      cards = [];
    }
    updateCardCount();
  }

  function saveCards() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.error("Failed to save cards to localStorage", e);
    }
    updateCardCount();
  }

  function updateCardCount() {
    cardCountEl.textContent = String(cards.length);
  }

  function showUploadMessage(text, type) {
    uploadMessage.textContent = text;
    uploadMessage.classList.remove("hidden", "info", "error", "success");
    uploadMessage.classList.add(type || "info");
  }

  function clearUploadMessage() {
    uploadMessage.textContent = "";
    uploadMessage.classList.add("hidden");
    uploadMessage.classList.remove("info", "error", "success");
  }

  function getUniqueBooks() {
    const set = new Set();
    cards.forEach((card) => {
      if (card && typeof card.book === "string" && card.book.trim() !== "") {
        set.add(card.book.trim());
      }
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }

  function refreshBookControls() {
    const books = getUniqueBooks();

    // Upload: existing book select
    if (books.length === 0) {
      if (bookExistingGroup) {
        bookExistingGroup.classList.add("hidden");
      }
      if (bookSelect) {
        bookSelect.innerHTML = "";
      }
    } else {
      if (bookExistingGroup) {
        bookExistingGroup.classList.remove("hidden");
      }
      if (bookSelect) {
        const previous = bookSelect.value;
        bookSelect.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose existing book…";
        placeholder.disabled = true;
        placeholder.selected = true;
        bookSelect.appendChild(placeholder);

        books.forEach((name) => {
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          bookSelect.appendChild(opt);
        });

        if (previous && books.includes(previous)) {
          bookSelect.value = previous;
        }
      }
    }

    // Study: book filter
    if (bookFilter) {
      const prevFilter = bookFilter.value;
      bookFilter.innerHTML = "";

      const allOpt = document.createElement("option");
      allOpt.value = "all";
      allOpt.textContent = "All books";
      bookFilter.appendChild(allOpt);

      books.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        bookFilter.appendChild(opt);
      });

      if (prevFilter && prevFilter !== "all" && books.includes(prevFilter)) {
        bookFilter.value = prevFilter;
      } else {
        bookFilter.value = "all";
      }
    }
  }

  function getFilteredCards() {
    const bookVal = bookFilter.value;
    const langVal = languageFilter.value;
    return cards.filter((card) => {
      if (bookVal !== "all" && card.book !== bookVal) return false;
      if (langVal !== "all" && card.language !== langVal) return false;
      return true;
    });
  }

  function pickWeightedRandomCard(candidates, excludeCard) {
    let pool = candidates;
    if (excludeCard && excludeCard.id != null) {
      pool = candidates.filter((c) => c.id !== excludeCard.id);
    }
    if (!pool.length) return null;
    let totalWeight = 0;
    for (const c of pool) {
      const w = typeof c.weight === "number" ? c.weight : 1;
      totalWeight += clamp(w, 0.2, 5.0);
    }
    if (totalWeight <= 0) return pool[0];
    let r = Math.random() * totalWeight;
    for (const c of pool) {
      const w = typeof c.weight === "number" ? c.weight : 1;
      const adjusted = clamp(w, 0.2, 5.0);
      if (r < adjusted) {
        return c;
      }
      r -= adjusted;
    }
    return pool[pool.length - 1];
  }

  function renderNextCard(excludeCard) {
    const filtered = getFilteredCards();
    if (!filtered.length) {
      currentCard = null;
      hasAnsweredCurrent = false;
      flashcardContainer.classList.add("hidden");
      noCardsMessage.classList.remove("hidden");
      feedbackEl.textContent = "";
      feedbackEl.classList.remove("correct", "wrong");
      confidenceContainer.classList.add("hidden");
      answerAreaEl.innerHTML = "";
      return;
    }

    currentCard = pickWeightedRandomCard(filtered, excludeCard);
    if (!currentCard) {
      currentCard = pickWeightedRandomCard(filtered);
    }
    hasAnsweredCurrent = false;

    noCardsMessage.classList.add("hidden");
    flashcardContainer.classList.remove("hidden");
    confidenceContainer.classList.add("hidden");
    feedbackEl.textContent = "";
    feedbackEl.classList.remove("correct", "wrong");

    const topic = currentCard.topic || "";
    cardTopicEl.textContent = topic ? topic : "No topic";
    cardLanguageEl.textContent = currentCard.language
      ? currentCard.language.toUpperCase()
      : "";
    cardBookEl.textContent = currentCard.book || "";

    questionTextEl.textContent = currentCard.question || "";

    answerAreaEl.innerHTML = "";

    if (currentCard.type === "multiple_choice") {
      renderMultipleChoice(currentCard);
    } else if (currentCard.type === "fill_in_blank") {
      renderFillInBlank(currentCard);
    } else if (currentCard.type === "open_ended") {
      renderOpenEnded(currentCard);
    } else {
      // Fallback: treat as open-ended
      renderOpenEnded(currentCard);
    }
  }

  function renderMultipleChoice(card) {
    const rawOptions = Array.isArray(card.options) ? [...card.options] : [];
    const rebuilt = rebuildOptionsWithShuffledTexts(rawOptions);
    const options = rebuilt || (() => { shuffleArray(rawOptions); return rawOptions; })();
    const correctText = extractCorrectText(card.correct || "", rawOptions);
    const correctDisplayOption = options.find((opt) => {
      const p = parseOptionLabelAndText(opt);
      return p && p.text === correctText;
    }) || card.correct;

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        if (hasAnsweredCurrent) return;
        hasAnsweredCurrent = true;

        const isCorrect =
          typeof correctDisplayOption === "string" &&
          correctDisplayOption.trim() === opt.trim();

        const allOptionButtons =
          answerAreaEl.querySelectorAll(".option-btn");
        allOptionButtons.forEach((b) => {
          b.classList.add("disabled");
          if (
            typeof correctDisplayOption === "string" &&
            correctDisplayOption.trim() === b.textContent.trim()
          ) {
            b.classList.add("correct");
          }
        });

        if (isCorrect) {
          btn.classList.add("correct");
          feedbackEl.textContent = "Correct!";
          feedbackEl.classList.remove("wrong");
          feedbackEl.classList.add("correct");
        } else {
          btn.classList.add("wrong");
          feedbackEl.textContent = `Wrong. Correct answer: ${correctDisplayOption}`;
          feedbackEl.classList.remove("correct");
          feedbackEl.classList.add("wrong");
        }

        lastAnswerActualCorrect = isCorrect;
        showConfidenceButtons();
      });
      answerAreaEl.appendChild(btn);
    });
  }

  function renderFillInBlank(card) {
    const row = document.createElement("div");
    row.className = "input-answer-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "field-input";
    input.placeholder = "Type your answer…";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn primary";
    btn.textContent = "Check";

    function submit() {
      if (hasAnsweredCurrent) return;
      hasAnsweredCurrent = true;
      const userAnswer = (input.value || "").trim();
      const correctAnswer =
        typeof card.correct === "string" ? card.correct.trim() : "";
      const isCorrect =
        userAnswer &&
        correctAnswer &&
        userAnswer.toLowerCase() === correctAnswer.toLowerCase();
      if (isCorrect) {
        feedbackEl.textContent = "Looks correct.";
        feedbackEl.classList.remove("wrong");
        feedbackEl.classList.add("correct");
      } else {
        feedbackEl.textContent = `Correct answer: ${card.correct}`;
        feedbackEl.classList.remove("correct");
        feedbackEl.classList.add("wrong");
      }
      lastAnswerActualCorrect = isCorrect;
      input.disabled = true;
      btn.disabled = true;
      showConfidenceButtons();
    }

    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });

    row.appendChild(input);
    row.appendChild(btn);
    answerAreaEl.appendChild(row);
  }

  function renderOpenEnded(card) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn primary";
    btn.textContent = "Reveal answer";

    btn.addEventListener("click", () => {
      if (hasAnsweredCurrent) return;
      hasAnsweredCurrent = true;
      feedbackEl.textContent = `Answer: ${card.correct}`;
      feedbackEl.classList.remove("wrong");
      feedbackEl.classList.add("correct");
      lastAnswerActualCorrect = null;
      showConfidenceButtons();
    });

    answerAreaEl.appendChild(btn);
  }

  function showConfidenceButtons() {
    confidenceContainer.classList.remove("hidden");
  }

  function applyConfidenceRating(card, rating) {
    let factor;
    switch (rating) {
      case "didnt_know":
        factor = 2.0;
        break;
      case "shaky":
        factor = 1.5;
        break;
      case "good":
        factor = 0.8;
        break;
      case "nailed_it":
      default:
        factor = 0.5;
        break;
    }

    const currentWeight =
      typeof card.weight === "number" ? card.weight : 1.0;
    const newWeight = clamp(currentWeight * factor, 0.2, 5.0);
    card.weight = newWeight;

    const isCorrectForStats =
      lastAnswerActualCorrect !== null
        ? lastAnswerActualCorrect
        : rating === "good" || rating === "nailed_it";
    if (isCorrectForStats) {
      card.timesCorrect = (card.timesCorrect || 0) + 1;
    } else {
      card.timesWrong = (card.timesWrong || 0) + 1;
    }
    card.lastSeen = new Date().toISOString();

    saveCards();
    renderNextCard(card);
  }

  function handleDiscardCurrentCard() {
    if (!currentCard) return;
    const confirmed = window.confirm(
      "Discard this card permanently from your deck?"
    );
    if (!confirmed) return;
    cards = cards.filter((c) => c.id !== currentCard.id);
    saveCards();
    currentCard = null;
    hasAnsweredCurrent = false;
    renderNextCard();
  }

  function refreshWrongLogView() {
    const wrongCards = [...cards].filter(
      (c) => (c.timesWrong || 0) > 0
    );
    wrongCards.sort((a, b) => (b.timesWrong || 0) - (a.timesWrong || 0));

    wrongLogList.innerHTML = "";
    wrongLogDetail.classList.add("hidden");

    if (!wrongCards.length) {
      wrongLogEmpty.classList.remove("hidden");
      return;
    }

    wrongLogEmpty.classList.add("hidden");

    wrongCards.forEach((card) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wrong-log-item-btn";

      const textSpan = document.createElement("span");
      textSpan.className = "wrong-log-item-text";
      const questionText = card.question || "";
      textSpan.textContent =
        questionText.length > 90
          ? questionText.slice(0, 87) + "..."
          : questionText;

      const countSpan = document.createElement("span");
      countSpan.className = "wrong-log-item-count";
      countSpan.textContent = `${card.timesWrong}× wrong`;

      btn.appendChild(textSpan);
      btn.appendChild(countSpan);

      btn.addEventListener("click", () => {
        wrongLogQuestion.textContent = card.question || "";
        wrongLogAnswer.textContent = card.correct || "";
        wrongLogDetail.classList.remove("hidden");
      });

      li.appendChild(btn);
      wrongLogList.appendChild(li);
    });

    if (wrongLogActions) {
      wrongLogActions.classList.toggle("hidden", wrongCards.length === 0);
    }
  }

  function computeStatsByBook() {
    const byBook = new Map();
    for (const c of cards) {
      const book = (c.book || "").trim() || "(No book)";
      if (!byBook.has(book)) {
        byBook.set(book, { correct: 0, wrong: 0 });
      }
      const t = byBook.get(book);
      t.correct += c.timesCorrect || 0;
      t.wrong += c.timesWrong || 0;
    }
    return Array.from(byBook.entries())
      .map(([name, t]) => ({ name, ...t }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  function computeStatsByTopic() {
    const byTopic = new Map();
    for (const c of cards) {
      const topic = (c.topic || "").trim() || "(No topic)";
      if (!byTopic.has(topic)) {
        byTopic.set(topic, { correct: 0, wrong: 0 });
      }
      const t = byTopic.get(topic);
      t.correct += c.timesCorrect || 0;
      t.wrong += c.timesWrong || 0;
    }
    return Array.from(byTopic.entries())
      .map(([name, t]) => ({ name, ...t }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  function formatStatRow(name, correct, wrong) {
    const total = correct + wrong;
    if (total === 0) return null;
    const pct = Math.round((correct / total) * 100);
    return { name, correct, wrong, total, pct };
  }

  function refreshStatisticsView() {
    const byBook = computeStatsByBook();
    const byTopic = computeStatsByTopic();

    const bookRows = byBook
      .map((b) => formatStatRow(b.name, b.correct, b.wrong))
      .filter(Boolean);
    const topicRows = byTopic
      .map((t) => formatStatRow(t.name, t.correct, t.wrong))
      .filter(Boolean);

    const hasAny = bookRows.length > 0 || topicRows.length > 0;

    if (statsEmptyEl) {
      statsEmptyEl.classList.toggle("hidden", hasAny);
    }
    if (statsBookSection) {
      statsBookSection.classList.toggle("hidden", bookRows.length === 0);
    }
    if (statsByBookEl) {
      statsByBookEl.innerHTML = "";
      bookRows.forEach((r) => {
        const div = document.createElement("div");
        div.className = "stats-row";
        div.innerHTML = `<span class="stats-label">${escapeHtml(r.name)}</span><span class="stats-pct">${r.pct}%</span><span class="stats-count">${r.correct} right / ${r.wrong} wrong</span>`;
        statsByBookEl.appendChild(div);
      });
    }
    if (statsTopicSection) {
      statsTopicSection.classList.toggle("hidden", topicRows.length === 0);
    }
    if (statsByTopicEl) {
      statsByTopicEl.innerHTML = "";
      topicRows.forEach((r) => {
        const div = document.createElement("div");
        div.className = "stats-row";
        div.innerHTML = `<span class="stats-label">${escapeHtml(r.name)}</span><span class="stats-pct">${r.pct}%</span><span class="stats-count">${r.correct} right / ${r.wrong} wrong</span>`;
        statsByTopicEl.appendChild(div);
      });
    }
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function resetAllStats() {
    const confirmed = window.confirm(
      "Reset all statistics (correct/wrong counts, weights, last seen)? This cannot be undone."
    );
    if (!confirmed) return;
    cards.forEach((c) => {
      c.timesCorrect = 0;
      c.timesWrong = 0;
      c.weight = 1.0;
      c.lastSeen = null;
    });
    saveCards();
    refreshStatisticsView();
    refreshWrongLogView();
    renderNextCard();
  }

  function clearWrongLog() {
    const confirmed = window.confirm(
      "Clear wrong answers log? This will set timesWrong to 0 for all cards."
    );
    if (!confirmed) return;
    cards.forEach((c) => {
      c.timesWrong = 0;
    });
    saveCards();
    refreshStatisticsView();
    refreshWrongLogView();
  }

  // Event wiring
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      if (!targetId) return;

      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      screens.forEach((s) => {
        if (s.id === targetId) {
          s.classList.add("active");
          if (targetId === "statistics-section") {
            refreshStatisticsView();
          }
        } else {
          s.classList.remove("active");
        }
      });
    });
  });

  addCardsBtn.addEventListener("click", () => {
    clearUploadMessage();
    const raw = jsonInput.value.trim();
    if (!raw) {
      showUploadMessage("Paste some JSON first.", "error");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error", e);
      showUploadMessage("Invalid JSON. Please check your input.", "error");
      return;
    }

    if (!Array.isArray(parsed)) {
      showUploadMessage("JSON must be an array of flashcard objects.", "error");
      return;
    }

    const existingBook = bookSelect ? bookSelect.value : "";
    const newBookName = bookNameInput
      ? bookNameInput.value.trim()
      : "";

    let targetBook = "";
    if (!cards.length && !newBookName) {
      showUploadMessage("Name your first book to continue.", "error");
      return;
    }

    if (newBookName) {
      targetBook = newBookName;
    } else if (existingBook) {
      targetBook = existingBook;
    } else {
      showUploadMessage(
        "Choose an existing book or enter a new book name.",
        "error"
      );
      return;
    }

    let addedCount = 0;

    parsed.forEach((rawCard) => {
      if (
        !rawCard ||
        typeof rawCard.id !== "string" ||
        typeof rawCard.question !== "string"
      ) {
        return;
      }

      const card = { ...rawCard };

      // Ensure schema / defaults
      card.type =
        card.type === "multiple_choice" ||
        card.type === "fill_in_blank" ||
        card.type === "open_ended"
          ? card.type
          : "open_ended";

      card.book = targetBook;

      if (!Array.isArray(card.options)) {
        if (card.type === "multiple_choice") {
          card.options = [];
        } else {
          delete card.options;
        }
      }

      card.language =
        card.language === "cs" || card.language === "en"
          ? card.language
          : "cs";

      if (typeof card.weight !== "number" || isNaN(card.weight)) {
        card.weight = 1.0;
      }
      card.weight = clamp(card.weight, 0.2, 5.0);

      card.timesCorrect = Number.isFinite(card.timesCorrect)
        ? card.timesCorrect
        : 0;
      card.timesWrong = Number.isFinite(card.timesWrong)
        ? card.timesWrong
        : 0;
      card.lastSeen =
        typeof card.lastSeen === "string" || card.lastSeen === null
          ? card.lastSeen
          : null;

      // Remove existing card with same id, then push new one
      cards = cards.filter((c) => c.id !== card.id);
      cards.push(card);
      addedCount += 1;
    });

    saveCards();

    if (addedCount > 0) {
      showUploadMessage(`Added ${addedCount} card(s).`, "success");
      jsonInput.value = "";
      if (bookNameInput) {
        bookNameInput.value = "";
      }
      refreshBookControls();
      // Refresh study area in case filters are set
      renderNextCard();
      refreshWrongLogView();
    } else {
      showUploadMessage(
        "No valid cards found in the JSON. Check the schema.",
        "error"
      );
    }
  });

  if (exportCardsBtn) {
    exportCardsBtn.addEventListener("click", () => {
      clearUploadMessage();
      if (!cards.length) {
        showUploadMessage("No cards to export.", "error");
        return;
      }
      const json = JSON.stringify(cards, null, 2);
      navigator.clipboard
        .writeText(json)
        .then(() => {
          showUploadMessage(
            `Copied ${cards.length} card(s) to clipboard. Paste in the JSON field on another device and click Add cards.`,
            "success"
          );
        })
        .catch(() => {
          showUploadMessage(
            "Could not copy to clipboard. Try selecting the JSON below and copy manually.",
            "error"
          );
          jsonInput.value = json;
        });
    });
  }

  clearCardsBtn.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Clear all stored cards? This cannot be undone."
    );
    if (!confirmed) return;
    cards = [];
    saveCards();
    clearUploadMessage();
    showUploadMessage("All cards cleared.", "success");
    refreshBookControls();
    renderNextCard();
    refreshWrongLogView();
  });

  [bookFilter, languageFilter].forEach((el) => {
    el.addEventListener("change", () => {
      renderNextCard();
    });
  });

  practiceViewBtn.addEventListener("click", () => {
    practiceViewBtn.classList.add("active");
    wrongLogViewBtn.classList.remove("active");
    practiceView.classList.add("active");
    wrongLogView.classList.remove("active");
  });

  wrongLogViewBtn.addEventListener("click", () => {
    practiceViewBtn.classList.remove("active");
    wrongLogViewBtn.classList.add("active");
    practiceView.classList.remove("active");
    wrongLogView.classList.add("active");
    refreshWrongLogView();
  });

  confidenceButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentCard || !hasAnsweredCurrent) return;
      const rating = btn.getAttribute("data-rating");
      if (!rating) return;
      applyConfidenceRating(currentCard, rating);
    });
  });

  discardCardBtn.addEventListener("click", () => {
    handleDiscardCurrentCard();
  });

  const resetStatsBtn = document.getElementById("reset-stats-btn");
  const clearWrongLogBtn = document.getElementById("clear-wrong-log-btn");
  const clearWrongLogBtnStats = document.getElementById("clear-wrong-log-btn-stats");

  if (resetStatsBtn) {
    resetStatsBtn.addEventListener("click", resetAllStats);
  }
  if (clearWrongLogBtn) {
    clearWrongLogBtn.addEventListener("click", clearWrongLog);
  }
  if (clearWrongLogBtnStats) {
    clearWrongLogBtnStats.addEventListener("click", clearWrongLog);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("sw.js")
          .catch((err) =>
            console.error("Service worker registration failed:", err)
          );
      });
    }
  }

  // Init
  loadCards();
  refreshBookControls();
  renderNextCard();
  refreshWrongLogView();
  refreshStatisticsView();
  registerServiceWorker();
})();


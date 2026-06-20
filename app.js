// UI wiring for the poker odds helper. Depends on window.PokerEngine (poker.js).
// v1.1: replaced rank/suit dropdowns with a one-tap full-screen card grid (investor
// feedback: dropdowns took ~8 taps to enter 2 hole cards on mobile -- see
// investor/founder_inputs/Archive/use_empty_loops.draft.txt).
(function () {
  var engine = window.PokerEngine;

  var holeSlotsEl = document.getElementById("holeSlots");
  var boardStageSel = document.getElementById("boardStage");
  var boardSlotsEl = document.getElementById("boardSlots");
  var opponentsSel = document.getElementById("opponents");
  var potSizeInput = document.getElementById("potSize");
  var betToCallInput = document.getElementById("betToCall");
  var calculateBtn = document.getElementById("calculate");
  var resultsEl = document.getElementById("results");
  var errorEl = document.getElementById("errorMsg");
  var pickerOverlay = document.getElementById("cardPicker");
  var pickerGrid = document.getElementById("cardPickerGrid");
  var pickerCancel = document.getElementById("cardPickerCancel");

  var BOARD_COUNT_BY_STAGE = { preflop: 0, flop: 3, turn: 4, river: 5 };
  var SUIT_SYMBOLS = { s: "♠", h: "♥", d: "♦", c: "♣" };

  // slots: { hole1: card|null, hole2: card|null, board: [card|null, ...] }
  var slots = { hole1: null, hole2: null, board: [] };
  var activeSlotKey = null; // "hole1" | "hole2" | "board0" | "board1" | ...

  function cardKey(c) { return c.rank + c.suit; }

  function allSelectedCards() {
    var cards = [];
    if (slots.hole1) cards.push(slots.hole1);
    if (slots.hole2) cards.push(slots.hole2);
    slots.board.forEach(function (c) { if (c) cards.push(c); });
    return cards;
  }

  function formatCard(c) {
    var rankLabel = engine.RANKS[c.rank - 2];
    return rankLabel + SUIT_SYMBOLS[c.suit];
  }

  function makeSlotButton(label, key) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-slot";
    btn.dataset.slotKey = key;
    btn.textContent = label;
    btn.addEventListener("click", function () { openPicker(key); });
    return btn;
  }

  function renderHoleSlots() {
    holeSlotsEl.innerHTML = "";
    holeSlotsEl.appendChild(makeSlotButton(slots.hole1 ? formatCard(slots.hole1) : "Card 1", "hole1"));
    holeSlotsEl.appendChild(makeSlotButton(slots.hole2 ? formatCard(slots.hole2) : "Card 2", "hole2"));
  }

  function renderBoardSlots() {
    var count = BOARD_COUNT_BY_STAGE[boardStageSel.value];
    while (slots.board.length < count) slots.board.push(null);
    slots.board.length = count;
    boardSlotsEl.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var label = slots.board[i] ? formatCard(slots.board[i]) : "Card " + (i + 1);
      boardSlotsEl.appendChild(makeSlotButton(label, "board" + i));
    }
  }

  var SUIT_LABELS = { s: "Spades", h: "Hearts", d: "Diamonds", c: "Clubs" };
  var pendingSuit = null; // set once step 1 (suit) is picked, cleared on close/select

  function usedCardKeys(excludeKey) {
    var used = allSelectedCards();
    var usedKeys = {};
    used.forEach(function (c) { usedKeys[cardKey(c)] = true; });
    // The card currently in the active slot should still be pickable (re-tapping it
    // just re-confirms/replaces it), so it's never blocked as "already used".
    var currentCard = getSlotValue(excludeKey);
    if (currentCard) delete usedKeys[cardKey(currentCard)];
    return usedKeys;
  }

  function openPicker(key) {
    activeSlotKey = key;
    pendingSuit = null;
    renderSuitStep();
    pickerOverlay.style.display = "flex";
  }

  // Two-step picker (investor feedback: full-screen, one big choice per screen
  // beats a small dropdown, even though it's 2 taps total) -- step 1: suit.
  function renderSuitStep() {
    pickerGrid.innerHTML = "";
    var heading = document.createElement("div");
    heading.className = "picker-heading";
    heading.textContent = "Pick a suit";
    pickerGrid.appendChild(heading);

    var row = document.createElement("div");
    row.className = "picker-row picker-row-suits";
    engine.SUITS.forEach(function (suit) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "picker-suit";
      btn.textContent = SUIT_SYMBOLS[suit] + " " + SUIT_LABELS[suit];
      btn.addEventListener("click", function () {
        pendingSuit = suit;
        renderRankStep();
      });
      row.appendChild(btn);
    });
    pickerGrid.appendChild(row);
  }

  // Step 2: rank, scoped to the suit chosen in step 1.
  function renderRankStep() {
    var usedKeys = usedCardKeys(activeSlotKey);

    pickerGrid.innerHTML = "";
    var heading = document.createElement("div");
    heading.className = "picker-heading";
    heading.textContent = SUIT_SYMBOLS[pendingSuit] + " " + SUIT_LABELS[pendingSuit] + " -- pick a rank";
    pickerGrid.appendChild(heading);

    var row = document.createElement("div");
    row.className = "picker-row picker-row-ranks";
    for (var rank = 14; rank >= 2; rank--) {
      var card = { rank: rank, suit: pendingSuit };
      var key2 = cardKey(card);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "picker-card" + (usedKeys[key2] ? " picker-card-used" : "");
      btn.textContent = engine.RANKS[rank - 2];
      if (usedKeys[key2]) {
        btn.disabled = true;
      } else {
        btn.addEventListener("click", function (card) {
          return function () { selectCard(card); };
        }(card));
      }
      row.appendChild(btn);
    }
    pickerGrid.appendChild(row);

    var backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "secondary";
    backBtn.textContent = "Back to suits";
    backBtn.addEventListener("click", renderSuitStep);
    pickerGrid.appendChild(backBtn);
  }

  function getSlotValue(key) {
    if (key === "hole1") return slots.hole1;
    if (key === "hole2") return slots.hole2;
    if (key.indexOf("board") === 0) return slots.board[parseInt(key.slice(5), 10)];
    return null;
  }

  function setSlotValue(key, card) {
    if (key === "hole1") slots.hole1 = card;
    else if (key === "hole2") slots.hole2 = card;
    else if (key.indexOf("board") === 0) slots.board[parseInt(key.slice(5), 10)] = card;
  }

  function selectCard(card) {
    setSlotValue(activeSlotKey, card);
    closePicker();
    renderHoleSlots();
    renderBoardSlots();
  }

  function closePicker() {
    pickerOverlay.style.display = "none";
    activeSlotKey = null;
    pendingSuit = null;
  }

  function cardsHaveDuplicates(cards) {
    var seen = {};
    for (var i = 0; i < cards.length; i++) {
      var key = cardKey(cards[i]);
      if (seen[key]) return true;
      seen[key] = true;
    }
    return false;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "block" : "none";
  }

  function calculate() {
    showError("");
    if (!slots.hole1 || !slots.hole2) {
      showError("Select both of your hole cards first.");
      return;
    }
    var board = slots.board.slice();
    if (board.some(function (c) { return !c; })) {
      showError("Fill in all board cards for the selected stage (or choose Preflop for none).");
      return;
    }

    var allCards = [slots.hole1, slots.hole2].concat(board);
    if (cardsHaveDuplicates(allCards)) {
      showError("You've entered the same card twice -- each card can only appear once.");
      return;
    }

    var numOpponents = parseInt(opponentsSel.value, 10);
    var trials = 3000;
    var sim = engine.runEquitySimulation([slots.hole1, slots.hole2], board, numOpponents, trials);

    var potSize = parseFloat(potSizeInput.value);
    var betToCall = parseFloat(betToCallInput.value);
    var requiredEquity = engine.potOddsRequiredEquity(potSize, betToCall);
    var rec = engine.recommend(sim.equityPct, requiredEquity);

    resultsEl.innerHTML =
      "<div class='hand-summary'>Your hand: " + formatCard(slots.hole1) + " " + formatCard(slots.hole2) +
      (board.length ? " | Board: " + board.map(formatCard).join(" ") : " | Preflop") + "</div>" +
      "<div class='equity-row'><span class='equity-label'>Win</span><span>" + sim.winPct.toFixed(1) + "%</span></div>" +
      "<div class='equity-row'><span class='equity-label'>Tie</span><span>" + sim.tiePct.toFixed(1) + "%</span></div>" +
      "<div class='equity-row'><span class='equity-label'>Lose</span><span>" + sim.losePct.toFixed(1) + "%</span></div>" +
      "<div class='equity-total'>Total equity: " + sim.equityPct.toFixed(1) + "% (vs " + numOpponents + " random opponent" + (numOpponents > 1 ? "s" : "") + ")</div>" +
      "<div class='recommendation'><strong>" + rec.action + "</strong><p>" + rec.why + "</p></div>" +
      "<p class='disclaimer'>Based on " + trials + " simulated outcomes assuming opponents hold random hands (no range modeling in v1). For home-game and study use only -- not intended for use during supervised/regulated play.</p>";
    resultsEl.style.display = "block";
  }

  renderHoleSlots();
  renderBoardSlots();
  boardStageSel.addEventListener("change", function () {
    renderBoardSlots();
  });
  calculateBtn.addEventListener("click", calculate);
  pickerCancel.addEventListener("click", closePicker);
  pickerOverlay.addEventListener("click", function (e) {
    if (e.target === pickerOverlay) closePicker();
  });
})();

// UI wiring for the poker odds helper. Depends on window.PokerEngine (poker.js).
(function () {
  var engine = window.PokerEngine;

  var holeSelects = [
    { rank: document.getElementById("hole1Rank"), suit: document.getElementById("hole1Suit") },
    { rank: document.getElementById("hole2Rank"), suit: document.getElementById("hole2Suit") }
  ];
  var boardStageSel = document.getElementById("boardStage");
  var boardCardsEl = document.getElementById("boardCards");
  var opponentsSel = document.getElementById("opponents");
  var potSizeInput = document.getElementById("potSize");
  var betToCallInput = document.getElementById("betToCall");
  var calculateBtn = document.getElementById("calculate");
  var resultsEl = document.getElementById("results");
  var errorEl = document.getElementById("errorMsg");

  var BOARD_COUNT_BY_STAGE = { preflop: 0, flop: 3, turn: 4, river: 5 };

  function populateRankSuitSelect(rankSel, suitSel) {
    rankSel.innerHTML = '<option value="">Rank</option>';
    engine.RANKS.forEach(function (label, i) {
      var opt = document.createElement("option");
      opt.value = i + 2;
      opt.textContent = label;
      rankSel.appendChild(opt);
    });
    suitSel.innerHTML = '<option value="">Suit</option>';
    var suitLabels = { s: "Spades ♠", h: "Hearts ♥", d: "Diamonds ♦", c: "Clubs ♣" };
    engine.SUITS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = suitLabels[s];
      suitSel.appendChild(opt);
    });
  }

  function renderBoardInputs() {
    var count = BOARD_COUNT_BY_STAGE[boardStageSel.value];
    boardCardsEl.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var wrap = document.createElement("div");
      wrap.className = "card-input";
      var rankSel = document.createElement("select");
      var suitSel = document.createElement("select");
      rankSel.dataset.boardIdx = i;
      suitSel.dataset.boardIdx = i;
      populateRankSuitSelect(rankSel, suitSel);
      wrap.appendChild(rankSel);
      wrap.appendChild(suitSel);
      boardCardsEl.appendChild(wrap);
    }
  }

  function readCard(rankSel, suitSel) {
    if (!rankSel.value || !suitSel.value) return null;
    return { rank: parseInt(rankSel.value, 10), suit: suitSel.value };
  }

  function readBoardCards() {
    var cards = [];
    var selects = boardCardsEl.children;
    for (var i = 0; i < selects.length; i++) {
      var rankSel = selects[i].children[0];
      var suitSel = selects[i].children[1];
      var card = readCard(rankSel, suitSel);
      if (!card) return null;
      cards.push(card);
    }
    return cards;
  }

  function cardsHaveDuplicates(cards) {
    var seen = {};
    for (var i = 0; i < cards.length; i++) {
      var key = cards[i].rank + cards[i].suit;
      if (seen[key]) return true;
      seen[key] = true;
    }
    return false;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "block" : "none";
  }

  function formatCard(c) {
    var rankLabel = engine.RANKS[c.rank - 2];
    var suitSymbol = { s: "♠", h: "♥", d: "♦", c: "♣" }[c.suit];
    return rankLabel + suitSymbol;
  }

  function calculate() {
    showError("");
    var hole1 = readCard(holeSelects[0].rank, holeSelects[0].suit);
    var hole2 = readCard(holeSelects[1].rank, holeSelects[1].suit);
    if (!hole1 || !hole2) {
      showError("Select both of your hole cards first.");
      return;
    }
    var board = readBoardCards();
    if (board === null) {
      showError("Fill in all board cards for the selected stage (or choose Preflop for none).");
      return;
    }
    var allCards = [hole1, hole2].concat(board);
    if (cardsHaveDuplicates(allCards)) {
      showError("You've entered the same card twice -- each card can only appear once.");
      return;
    }

    var numOpponents = parseInt(opponentsSel.value, 10);
    var trials = 3000;
    var sim = engine.runEquitySimulation([hole1, hole2], board, numOpponents, trials);

    var potSize = parseFloat(potSizeInput.value);
    var betToCall = parseFloat(betToCallInput.value);
    var requiredEquity = engine.potOddsRequiredEquity(potSize, betToCall);
    var rec = engine.recommend(sim.equityPct, requiredEquity);

    resultsEl.innerHTML =
      "<div class='hand-summary'>Your hand: " + formatCard(hole1) + " " + formatCard(hole2) +
      (board.length ? " | Board: " + board.map(formatCard).join(" ") : " | Preflop") + "</div>" +
      "<div class='equity-row'><span class='equity-label'>Win</span><span>" + sim.winPct.toFixed(1) + "%</span></div>" +
      "<div class='equity-row'><span class='equity-label'>Tie</span><span>" + sim.tiePct.toFixed(1) + "%</span></div>" +
      "<div class='equity-row'><span class='equity-label'>Lose</span><span>" + sim.losePct.toFixed(1) + "%</span></div>" +
      "<div class='equity-total'>Total equity: " + sim.equityPct.toFixed(1) + "% (vs " + numOpponents + " random opponent" + (numOpponents > 1 ? "s" : "") + ")</div>" +
      "<div class='recommendation'><strong>" + rec.action + "</strong><p>" + rec.why + "</p></div>" +
      "<p class='disclaimer'>Based on " + trials + " simulated outcomes assuming opponents hold random hands (no range modeling in v1). For home-game and study use only -- not intended for use during supervised/regulated play.</p>";
    resultsEl.style.display = "block";
  }

  populateRankSuitSelect(holeSelects[0].rank, holeSelects[0].suit);
  populateRankSuitSelect(holeSelects[1].rank, holeSelects[1].suit);
  renderBoardInputs();
  boardStageSel.addEventListener("change", renderBoardInputs);
  calculateBtn.addEventListener("click", calculate);
})();

// Poker hand-equity engine. Pure client-side, no backend.
// v1 scope: equity vs N random opponent hands (no range modeling) via Monte Carlo
// simulation, plus a pot-odds-based recommendation with a short "why" explanation.
(function () {
  var RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]; // value 2..14
  var SUITS = ["s", "h", "d", "c"]; // spades, hearts, diamonds, clubs

  function makeDeck() {
    var deck = [];
    for (var r = 2; r <= 14; r++) {
      for (var s = 0; s < 4; s++) {
        deck.push({ rank: r, suit: SUITS[s] });
      }
    }
    return deck;
  }

  function cardKey(c) { return c.rank + c.suit; }

  function removeKnown(deck, known) {
    var knownKeys = known.map(cardKey);
    return deck.filter(function (c) { return knownKeys.indexOf(cardKey(c)) === -1; });
  }

  function shuffleSample(arr, n) {
    // Fisher-Yates partial shuffle, returns first n as the sample, rest untouched semantics not needed.
    var a = arr.slice();
    for (var i = a.length - 1; i > a.length - 1 - n && i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a.slice(a.length - n);
  }

  // ---- 5-card hand evaluation ----
  // Returns a comparable array: [category, tiebreak1, tiebreak2, ...] -- higher is better.
  // category: 8=straight flush,7=quads,6=full house,5=flush,4=straight,3=trips,2=two pair,1=pair,0=high card
  function evaluate5(cards) {
    var ranks = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return b - a; });
    var suits = cards.map(function (c) { return c.suit; });
    var counts = {};
    ranks.forEach(function (r) { counts[r] = (counts[r] || 0) + 1; });
    var groups = Object.keys(counts).map(Number).map(function (r) {
      return { rank: r, count: counts[r] };
    }).sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

    var isFlush = suits.every(function (s) { return s === suits[0]; });

    var uniqueRanksDesc = Object.keys(counts).map(Number).sort(function (a, b) { return b - a; });
    var straightHigh = straightHighCard(uniqueRanksDesc);
    var isStraight = straightHigh !== null;

    if (isStraight && isFlush) return [8, straightHigh];
    if (groups[0].count === 4) return [7, groups[0].rank, groups[1].rank];
    if (groups[0].count === 3 && groups[1].count === 2) return [6, groups[0].rank, groups[1].rank];
    if (isFlush) return [5].concat(ranks);
    if (isStraight) return [4, straightHigh];
    if (groups[0].count === 3) return [3, groups[0].rank].concat(groups.slice(1).map(function (g) { return g.rank; }));
    if (groups[0].count === 2 && groups[1].count === 2) {
      var pairRanks = [groups[0].rank, groups[1].rank].sort(function (a, b) { return b - a; });
      return [2, pairRanks[0], pairRanks[1], groups[2].rank];
    }
    if (groups[0].count === 2) return [1, groups[0].rank].concat(groups.slice(1).map(function (g) { return g.rank; }));
    return [0].concat(ranks);
  }

  function straightHighCard(uniqueRanksDesc) {
    // Check for 5 consecutive ranks, including the wheel (A-2-3-4-5 => high card 5).
    var withAceLow = uniqueRanksDesc.slice();
    if (uniqueRanksDesc.indexOf(14) !== -1) withAceLow.push(1);
    var set = {};
    withAceLow.forEach(function (r) { set[r] = true; });
    for (var high = 14; high >= 5; high--) {
      var ok = true;
      for (var k = 0; k < 5; k++) {
        if (!set[high - k]) { ok = false; break; }
      }
      if (ok) return high === 5 && !set[6] && set[1] ? 5 : high; // wheel reported as high=5
    }
    return null;
  }

  function compareRanks(a, b) {
    var len = Math.max(a.length, b.length);
    for (var i = 0; i < len; i++) {
      var av = a[i] === undefined ? -1 : a[i];
      var bv = b[i] === undefined ? -1 : b[i];
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  function combinations(arr, k) {
    var results = [];
    function helper(start, combo) {
      if (combo.length === k) { results.push(combo.slice()); return; }
      for (var i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    }
    helper(0, []);
    return results;
  }

  function evaluateBest(cards7) {
    var best = null;
    combinations(cards7, 5).forEach(function (hand5) {
      var rank = evaluate5(hand5);
      if (best === null || compareRanks(rank, best) > 0) best = rank;
    });
    return best;
  }

  // ---- Equity simulation ----
  function runEquitySimulation(holeCards, boardCards, numOpponents, trials) {
    var fullDeck = makeDeck();
    var known = holeCards.concat(boardCards);
    var available = removeKnown(fullDeck, known);

    var wins = 0, ties = 0, losses = 0;

    for (var t = 0; t < trials; t++) {
      var needed = (5 - boardCards.length) + numOpponents * 2;
      var sample = shuffleSample(available, needed);
      var idx = 0;
      var fullBoard = boardCards.concat(sample.slice(idx, idx + (5 - boardCards.length)));
      idx += (5 - boardCards.length);

      var userBest = evaluateBest(holeCards.concat(fullBoard));

      var bestOpponent = null;
      for (var o = 0; o < numOpponents; o++) {
        var oppHole = sample.slice(idx, idx + 2);
        idx += 2;
        var oppBest = evaluateBest(oppHole.concat(fullBoard));
        if (bestOpponent === null || compareRanks(oppBest, bestOpponent) > 0) bestOpponent = oppBest;
      }

      var cmp = compareRanks(userBest, bestOpponent);
      if (cmp > 0) wins++;
      else if (cmp === 0) ties++;
      else losses++;
    }

    return {
      winPct: (wins / trials) * 100,
      tiePct: (ties / trials) * 100,
      losePct: (losses / trials) * 100,
      equityPct: ((wins + ties / 2) / trials) * 100
    };
  }

  function potOddsRequiredEquity(potSize, betToCall) {
    if (!potSize || !betToCall) return null;
    return (betToCall / (potSize + betToCall)) * 100;
  }

  function recommend(equityPct, requiredEquityPct) {
    if (requiredEquityPct === null) {
      var label = equityPct >= 65 ? "Strong hand" : equityPct >= 45 ? "Decent hand" : "Weak hand";
      return {
        action: label,
        why: "No pot/bet entered, so this is just your raw equity vs " + "the field: " +
          equityPct.toFixed(1) + "%. Enter a pot size and bet to call for a call/fold recommendation."
      };
    }
    if (equityPct >= requiredEquityPct) {
      return {
        action: "Call (or raise) looks profitable",
        why: "Your equity is ~" + equityPct.toFixed(1) + "%, and this pot only requires ~" +
          requiredEquityPct.toFixed(1) + "% equity to call profitably (bet ÷ (pot + bet)). " +
          "Since your equity is higher, calling has positive expected value on average."
      };
    }
    return {
      action: "Fold looks better",
      why: "Your equity is ~" + equityPct.toFixed(1) + "%, but this pot requires ~" +
        requiredEquityPct.toFixed(1) + "% equity to call profitably. Since your equity is lower, " +
        "calling loses money on average over many hands like this one."
    };
  }

  window.PokerEngine = {
    makeDeck: makeDeck,
    evaluate5: evaluate5,
    evaluateBest: evaluateBest,
    compareRanks: compareRanks,
    runEquitySimulation: runEquitySimulation,
    potOddsRequiredEquity: potOddsRequiredEquity,
    recommend: recommend,
    RANKS: RANKS,
    SUITS: SUITS
  };
})();

(function () {
  "use strict";

  var ROWS = ["melee", "ranged", "siege"];
  var ROW_META = {
    melee: { label: "近戰", icon: "⚔", weather: "霜封" },
    ranged: { label: "遠程", icon: "➶", weather: "濃霧" },
    siege: { label: "攻城", icon: "◆", weather: "暴雨" }
  };
  var DIFFICULTY = {
    easy: { label: "簡單 · 旅人", delay: 720 },
    medium: { label: "中等 · 傭兵", delay: 900 },
    hard: { label: "困難 · 軍略家", delay: 1050 }
  };
  var ABILITY_GLYPH = {
    bond: "♟",
    medic: "✚",
    spy: "◈",
    scorch: "☄",
    horn: "♬",
    weather: "❄",
    clear: "☀",
    hero: "★"
  };
  var nextId = 1;
  var aiTimer = null;
  var toastTimer = null;
  var fxTimer = null;
  var state = null;

  var el = {
    setupModal: document.getElementById("setupModal"),
    resultModal: document.getElementById("resultModal"),
    rulesDialog: document.getElementById("rulesDialog"),
    difficultyChip: document.getElementById("difficultyChip"),
    roundNumber: document.getElementById("roundNumber"),
    enemyStatus: document.getElementById("enemyStatus"),
    playerStatus: document.getElementById("playerStatus"),
    enemyPips: document.getElementById("enemyPips"),
    playerPips: document.getElementById("playerPips"),
    enemyHand: document.getElementById("enemyHand"),
    enemyBoard: document.getElementById("enemyBoard"),
    playerBoard: document.getElementById("playerBoard"),
    weatherDisplay: document.getElementById("weatherDisplay"),
    turnSeal: document.getElementById("turnSeal"),
    playerHand: document.getElementById("playerHand"),
    handCount: document.getElementById("handCount"),
    selectionHint: document.getElementById("selectionHint"),
    selectedReadout: document.getElementById("selectedReadout"),
    playButton: document.getElementById("playButton"),
    passButton: document.getElementById("passButton"),
    toast: document.getElementById("toast"),
    resultSigil: document.getElementById("resultSigil"),
    resultEyebrow: document.getElementById("resultEyebrow"),
    resultTitle: document.getElementById("resultTitle"),
    resultText: document.getElementById("resultText"),
    resultScore: document.getElementById("resultScore"),
    duelStage: document.getElementById("duelStage"),
    duelCaption: document.getElementById("duelCaption"),
    enemyFighter: document.getElementById("enemyFighter"),
    playerFighter: document.getElementById("playerFighter"),
    enemyFighterIcon: document.getElementById("enemyFighterIcon"),
    playerFighterIcon: document.getElementById("playerFighterIcon"),
    enemyFighterName: document.getElementById("enemyFighterName"),
    playerFighterName: document.getElementById("playerFighterName"),
    enemyFighterPower: document.getElementById("enemyFighterPower"),
    playerFighterPower: document.getElementById("playerFighterPower")
  };

  function unit(name, power, row, ability, icon, desc, hero) {
    return {
      type: "unit",
      name: name,
      power: power,
      row: row,
      ability: hero ? "hero" : (ability || null),
      icon: icon,
      desc: desc || "部署到" + ROW_META[row].label + "列。",
      hero: Boolean(hero)
    };
  }

  function special(name, kind, row, icon, desc) {
    return { type: "special", name: name, kind: kind, row: row || null, ability: kind, icon: icon, desc: desc };
  }

  var PLAYER_TEMPLATES = [
    unit("鐵誓守衛", 4, "melee", "bond", "🛡", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("鐵誓守衛", 4, "melee", "bond", "🛡", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("灰燼槍兵", 5, "melee", null, "♞", "穩健的近戰單位。"),
    unit("破曉騎士", 7, "melee", null, "♘", "重甲近戰主力。"),
    unit("戰地醫師", 5, "melee", "medic", "⚕", "救援：喚回棄牌中最強的普通單位。"),
    unit("赤冠元帥", 10, "melee", null, "♛", "英雄：不受天候與號角影響。", true),
    unit("暮林遊俠", 4, "ranged", "bond", "🏹", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("暮林遊俠", 4, "ranged", "bond", "🏹", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("獵隼使", 6, "ranged", null, "🦅", "敏銳的遠程獵手。"),
    unit("琉璃密探", 1, "ranged", "spy", "🜁", "間諜：部署到敵方兵列，自己抽兩張牌。"),
    unit("符文長弓", 8, "ranged", null, "➶", "精銳遠程單位。"),
    unit("燼火投石機", 6, "siege", null, "🔥", "可靠的攻城器械。"),
    unit("裂城戰槌", 8, "siege", null, "⚒", "沉重的攻城主力。"),
    unit("銅輪弩砲", 7, "siege", null, "⚙", "精密的遠距攻城器。"),
    special("白霜符", "weather", "melee", "❄", "霜封：所有普通近戰單位降至 1 點。"),
    special("幽谷濃霧", "weather", "ranged", "≋", "濃霧：所有普通遠程單位降至 1 點。"),
    special("黑潮暴雨", "weather", "siege", "☂", "暴雨：所有普通攻城單位降至 1 點。"),
    special("東風號角", "horn", "melee", "📯", "號角：己方近戰列普通單位戰力加倍。"),
    special("攻城戰鼓", "horn", "siege", "♬", "號角：己方攻城列普通單位戰力加倍。"),
    special("焚野令", "scorch", null, "☄", "焚滅：摧毀場上戰力最高且至少 8 點的所有普通單位。"),
    special("澄空火盆", "clear", null, "☀", "移除戰場上的全部天候。")
  ];

  var AI_TEMPLATES = [
    unit("凍土劫掠者", 4, "melee", "bond", "🪓", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("凍土劫掠者", 4, "melee", "bond", "🪓", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("骨面衛士", 5, "melee", null, "💀", "霜骨軍團的前鋒。"),
    unit("冬狼騎手", 7, "melee", null, "🐺", "快速而兇狠的近戰單位。"),
    unit("白骨巫醫", 5, "melee", "medic", "☥", "救援：喚回棄牌中最強的普通單位。"),
    unit("無冬女王", 10, "melee", null, "♚", "英雄：不受天候與號角影響。", true),
    unit("霜枝獵手", 4, "ranged", "bond", "❅", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("霜枝獵手", 4, "ranged", "bond", "❅", "同袍：每名同名單位令彼此戰力倍增。"),
    unit("渡鴉斥候", 6, "ranged", null, "🐦", "盤旋於霧中的射手。"),
    unit("空眼觀察者", 1, "ranged", "spy", "👁", "間諜：部署到敵方兵列，自己抽兩張牌。"),
    unit("冰裂投矛手", 8, "ranged", null, "↟", "精銳遠程單位。"),
    unit("寒鐵拋石機", 6, "siege", null, "❖", "霜骨軍團的攻城器械。"),
    unit("猛獁衝車", 8, "siege", null, "🐘", "沉重的攻城主力。"),
    unit("骨輪弩砲", 7, "siege", null, "⚙", "以寒鐵打造的巨弩。"),
    special("白霜符", "weather", "melee", "❄", "霜封：所有普通近戰單位降至 1 點。"),
    special("幽谷濃霧", "weather", "ranged", "≋", "濃霧：所有普通遠程單位降至 1 點。"),
    special("黑潮暴雨", "weather", "siege", "☂", "暴雨：所有普通攻城單位降至 1 點。"),
    special("狼角長鳴", "horn", "ranged", "📯", "號角：己方遠程列普通單位戰力加倍。"),
    special("冰城戰鼓", "horn", "siege", "♬", "號角：己方攻城列普通單位戰力加倍。"),
    special("寒星墜落", "scorch", null, "☄", "焚滅：摧毀場上戰力最高且至少 8 點的所有普通單位。"),
    special("破雲骨笛", "clear", null, "☀", "移除戰場上的全部天候。")
  ];

  function cloneDeck(templates, faction) {
    return templates.map(function (card) {
      var copy = Object.assign({}, card);
      copy.id = faction + "-" + nextId++;
      copy.faction = faction;
      return copy;
    });
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function emptyRows() {
    return { melee: [], ranged: [], siege: [] };
  }

  function startGame(difficulty) {
    window.clearTimeout(aiTimer);
    window.clearTimeout(fxTimer);
    el.duelStage.className = "duel-stage";
    el.enemyFighter.classList.remove("ready", "hero-fighter");
    el.playerFighter.classList.remove("ready", "hero-fighter");
    nextId = 1;
    state = {
      difficulty: difficulty,
      round: 1,
      wins: { player: 0, ai: 0 },
      matchScore: { player: 0, ai: 0 },
      decks: {
        player: shuffle(cloneDeck(PLAYER_TEMPLATES, "player")),
        ai: shuffle(cloneDeck(AI_TEMPLATES, "ai"))
      },
      hands: { player: [], ai: [] },
      boards: { player: emptyRows(), ai: emptyRows() },
      discard: { player: [], ai: [] },
      weather: [],
      horns: { player: [], ai: [] },
      passed: { player: false, ai: false },
      playerTurn: true,
      selectedId: null,
      resolving: false,
      playsThisRound: { player: 0, ai: 0 },
      lastUnits: { player: null, ai: null },
      history: []
    };
    drawCards("player", 10);
    drawCards("ai", 10);
    el.setupModal.classList.remove("visible");
    el.resultModal.classList.remove("visible");
    el.difficultyChip.textContent = DIFFICULTY[difficulty].label;
    render();
    showToast("第一回合 · 由你先攻");
  }

  function drawCards(side, count) {
    for (var i = 0; i < count; i += 1) {
      var card = state.decks[side].pop();
      if (card) state.hands[side].push(card);
    }
  }

  function opponent(side) {
    return side === "player" ? "ai" : "player";
  }

  function effectivePower(side, row, card) {
    if (card.type !== "unit") return 0;
    if (card.hero) return card.power;
    var value = state.weather.indexOf(row) >= 0 ? 1 : card.power;
    if (card.ability === "bond") {
      var matching = state.boards[side][row].filter(function (unitCard) {
        return unitCard.name === card.name;
      }).length;
      value *= Math.max(1, matching);
    }
    if (state.horns[side].indexOf(row) >= 0) value *= 2;
    return value;
  }

  function rowScore(side, row) {
    return state.boards[side][row].reduce(function (sum, card) {
      return sum + effectivePower(side, row, card);
    }, 0);
  }

  function totalScore(side) {
    return ROWS.reduce(function (sum, row) { return sum + rowScore(side, row); }, 0);
  }

  function render() {
    if (!state) return;
    el.roundNumber.textContent = state.round;
    renderPips(el.playerPips, state.wins.player);
    renderPips(el.enemyPips, state.wins.ai);
    renderEnemyHand();
    renderBoard("ai", el.enemyBoard, ["siege", "ranged", "melee"]);
    renderBoard("player", el.playerBoard, ["melee", "ranged", "siege"]);
    renderWeather();
    renderPlayerHand();
    renderStatuses();
  }

  function renderPips(container, wins) {
    container.innerHTML = "";
    for (var i = 0; i < 2; i += 1) {
      var pip = document.createElement("span");
      pip.className = "round-pip" + (i < wins ? " won" : "");
      container.appendChild(pip);
    }
  }

  function renderEnemyHand() {
    el.enemyHand.innerHTML = "";
    state.hands.ai.forEach(function (_, index) {
      var back = document.createElement("span");
      back.className = "card-back";
      back.style.setProperty("--tilt", ((index - state.hands.ai.length / 2) * 1.4) + "deg");
      el.enemyHand.appendChild(back);
    });
  }

  function renderBoard(side, container, order) {
    container.innerHTML = "";
    order.forEach(function (row) {
      var rowElement = document.createElement("div");
      var weathered = state.weather.indexOf(row) >= 0;
      var horned = state.horns[side].indexOf(row) >= 0;
      rowElement.className = "battle-row" + (weathered ? " weathered" : "") + (horned ? " horned" : "");

      var badge = document.createElement("div");
      badge.className = "row-badge";
      badge.innerHTML = "<b>" + ROW_META[row].icon + "</b><span>" + ROW_META[row].label + "</span>";

      var cards = document.createElement("div");
      cards.className = "row-cards";
      state.boards[side][row].forEach(function (card) {
        cards.appendChild(createMiniCard(side, row, card));
      });

      var score = document.createElement("div");
      score.className = "row-score";
      score.textContent = rowScore(side, row);

      rowElement.appendChild(badge);
      rowElement.appendChild(cards);
      rowElement.appendChild(score);
      container.appendChild(rowElement);
    });
  }

  function createMiniCard(side, row, card) {
    var element = document.createElement("div");
    element.className = "mini-card" + (card.faction === "ai" ? " frost-card" : "") + (card.hero ? " hero-card" : "");
    element.title = card.name + " · " + card.desc;
    element.innerHTML = "<span class=\"mini-power\">" + effectivePower(side, row, card) + "</span><span class=\"mini-icon\">" + card.icon + "</span>" + (card.ability ? "<span class=\"mini-ability\">" + ABILITY_GLYPH[card.ability] + "</span>" : "");
    return element;
  }

  function renderWeather() {
    if (state.weather.length === 0) {
      el.weatherDisplay.textContent = "晴朗 · 各列戰力不受影響";
      return;
    }
    el.weatherDisplay.textContent = state.weather.map(function (row) {
      return ROW_META[row].weather + "（" + ROW_META[row].label + "列降至 1）";
    }).join(" · ");
  }

  function renderPlayerHand() {
    el.playerHand.innerHTML = "";
    var canAct = state.playerTurn && !state.passed.player && !state.resolving;
    state.hands.player.forEach(function (card) {
      var button = document.createElement("button");
      var selected = state.selectedId === card.id;
      button.type = "button";
      button.className = "card" + (selected ? " selected" : "") + (card.type === "special" ? " special-card" : "") + (card.hero ? " hero" : "") + (!canAct ? " disabled" : "");
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", card.name + "，" + card.desc);
      button.innerHTML = cardMarkup(card);
      button.addEventListener("click", function () { selectCard(card.id); });
      button.addEventListener("dblclick", function () {
        selectCard(card.id);
        playSelected();
      });
      el.playerHand.appendChild(button);
    });
    el.handCount.textContent = state.hands.player.length + " 張";

    var selected = state.hands.player.find(function (card) { return card.id === state.selectedId; });
    el.selectedReadout.textContent = selected ? selected.name + "｜" + selected.desc : "尚未選牌";
    el.playButton.disabled = !selected || !canAct;
    el.passButton.disabled = !canAct;
  }

  function cardMarkup(card) {
    var power = card.type === "unit" ? card.power : "✦";
    var rowIcon = card.row ? ROW_META[card.row].icon : "◇";
    var ability = card.ability ? "<span class=\"ability-glyph\">" + ABILITY_GLYPH[card.ability] + "</span>" : "";
    return "<span class=\"card-top\"><span class=\"power-orb\">" + power + "</span><span class=\"row-icon\">" + rowIcon + "</span></span><span class=\"card-art\">" + card.icon + "</span><span class=\"card-name\">" + card.name + "</span>" + ability;
  }

  function renderStatuses() {
    var playerScore = totalScore("player");
    var aiScore = totalScore("ai");
    el.playerStatus.textContent = (state.passed.player ? "已讓牌" : (state.playerTurn ? "你的回合" : "等待對手")) + " · " + playerScore + " 戰力";
    el.enemyStatus.textContent = (state.passed.ai ? "已讓牌" : (!state.playerTurn && !state.resolving ? "正在部署" : "持有 " + state.hands.ai.length + " 張牌")) + " · " + aiScore + " 戰力";
    el.turnSeal.className = "turn-seal";
    if (state.resolving) {
      el.turnSeal.textContent = "結算";
    } else if (state.playerTurn) {
      el.turnSeal.textContent = "我方";
      el.turnSeal.classList.add("player-turn");
    } else {
      el.turnSeal.textContent = "敵方";
      el.turnSeal.classList.add("enemy-turn");
    }
    el.selectionHint.textContent = state.passed.player ? "你已讓牌，等待對手決定" : "點選卡牌查看能力；也可雙擊快速出牌";
  }

  function selectCard(cardId) {
    if (!state || !state.playerTurn || state.passed.player || state.resolving) return;
    state.selectedId = state.selectedId === cardId ? null : cardId;
    renderPlayerHand();
  }

  function playSelected() {
    if (!state || !state.playerTurn || state.passed.player || state.resolving || !state.selectedId) return;
    var index = state.hands.player.findIndex(function (card) { return card.id === state.selectedId; });
    if (index < 0) return;
    var card = state.hands.player.splice(index, 1)[0];
    state.selectedId = null;
    playCard("player", card);
    state.playsThisRound.player += 1;
    if (state.passed.ai) {
      state.playerTurn = true;
      render();
      return;
    }
    state.playerTurn = false;
    render();
    scheduleAiTurn();
  }

  function playCard(side, card) {
    if (card.type === "unit") {
      var target = card.ability === "spy" ? opponent(side) : side;
      state.boards[target][card.row].push(card);
      state.lastUnits[side] = card;
      animateUnitPlay(side, card);
      if (card.ability === "spy") {
        drawCards(side, 2);
        showToast((side === "player" ? "你" : "對手") + "派出間諜並抽了兩張牌");
      } else if (card.ability === "medic") {
        resurrectStrongest(side);
      }
    } else {
      resolveSpecial(side, card);
      state.discard[side].push(card);
    }
  }

  function resolveSpecial(side, card) {
    if (card.kind === "weather") {
      if (state.weather.indexOf(card.row) < 0) state.weather.push(card.row);
      showToast(card.name + "籠罩了" + ROW_META[card.row].label + "列");
    } else if (card.kind === "clear") {
      state.weather = [];
      showToast("天候已被驅散");
    } else if (card.kind === "horn") {
      if (state.horns[side].indexOf(card.row) < 0) state.horns[side].push(card.row);
      showToast((side === "player" ? "我方" : "敵方") + ROW_META[card.row].label + "列戰力加倍");
    } else if (card.kind === "scorch") {
      applyScorch();
    }
  }

  function resurrectStrongest(side) {
    var candidates = state.discard[side].filter(function (card) { return card.type === "unit" && !card.hero && card.ability !== "spy"; });
    if (candidates.length === 0) return;
    candidates.sort(function (a, b) { return b.power - a.power; });
    var revived = candidates[0];
    var index = state.discard[side].indexOf(revived);
    state.discard[side].splice(index, 1);
    state.boards[side][revived.row].push(revived);
    showToast(revived.name + "重返戰場");
  }

  function applyScorch() {
    var targets = [];
    ["player", "ai"].forEach(function (side) {
      ROWS.forEach(function (row) {
        state.boards[side][row].forEach(function (card) {
          if (!card.hero) targets.push({ side: side, row: row, card: card, power: effectivePower(side, row, card) });
        });
      });
    });
    var maxPower = targets.reduce(function (max, target) { return Math.max(max, target.power); }, 0);
    if (maxPower < 8) {
      showToast("焚滅沒有找到足夠強大的目標");
      return;
    }
    var destroyed = 0;
    targets.filter(function (target) { return target.power === maxPower; }).forEach(function (target) {
      var rowCards = state.boards[target.side][target.row];
      var index = rowCards.indexOf(target.card);
      if (index >= 0) {
        rowCards.splice(index, 1);
        state.discard[target.side].push(target.card);
        destroyed += 1;
      }
    });
    showToast("焚滅摧毀了 " + destroyed + " 個最高戰力單位");
  }

  function playerPass() {
    if (!state || !state.playerTurn || state.passed.player || state.resolving) return;
    state.passed.player = true;
    state.selectedId = null;
    state.playerTurn = false;
    showToast("你選擇讓牌，本回合不能再出牌");
    render();
    if (state.passed.ai) resolveRound();
    else scheduleAiTurn();
  }

  function scheduleAiTurn() {
    window.clearTimeout(aiTimer);
    aiTimer = window.setTimeout(aiTurn, DIFFICULTY[state.difficulty].delay);
  }

  function aiTurn() {
    if (!state || state.resolving || state.passed.ai) return;
    if (shouldAiPass()) {
      state.passed.ai = true;
      showToast("對手選擇讓牌");
      if (state.passed.player) {
        render();
        window.setTimeout(resolveRound, 550);
      } else {
        state.playerTurn = true;
        render();
      }
      return;
    }

    var card = chooseAiCard();
    if (!card) {
      state.passed.ai = true;
      if (state.passed.player) resolveRound();
      else {
        state.playerTurn = true;
        render();
      }
      return;
    }

    var index = state.hands.ai.indexOf(card);
    state.hands.ai.splice(index, 1);
    playCard("ai", card);
    state.playsThisRound.ai += 1;
    showToast("對手打出「" + card.name + "」");
    render();

    if (state.passed.player) {
      scheduleAiTurn();
    } else {
      state.playerTurn = true;
      render();
    }
  }

  function shouldAiPass() {
    var aiScore = totalScore("ai");
    var playerScore = totalScore("player");
    var hand = state.hands.ai.length;
    var played = state.playsThisRound.ai;
    if (hand === 0) return true;

    if (state.passed.player) {
      if (aiScore > playerScore) return true;
      var gap = playerScore - aiScore;
      var potential = state.hands.ai.reduce(function (sum, card) { return sum + Math.max(0, evaluateAiCard(card)); }, 0);
      if (state.difficulty === "easy") return gap > 13 && Math.random() < .55;
      if (state.difficulty === "medium") return gap > potential * .62 && state.wins.player < 1;
      return gap > potential * .78 && state.wins.player < 1;
    }

    if (played < 2) return false;
    var lead = aiScore - playerScore;
    if (state.difficulty === "easy") return Math.random() < .18;
    if (state.difficulty === "medium") {
      return (lead >= 11 && hand <= state.hands.player.length) || (played >= 5 && Math.random() < .12);
    }
    var cardAdvantage = hand - state.hands.player.length;
    if (lead >= 8 && cardAdvantage <= 0) return true;
    if (state.round === 1 && lead >= 5 && state.playsThisRound.player > played) return true;
    return played >= 6 && lead > 0 && Math.random() < .08;
  }

  function chooseAiCard() {
    var hand = state.hands.ai;
    if (hand.length === 0) return null;
    if (state.difficulty === "easy") return hand[Math.floor(Math.random() * hand.length)];

    var scored = hand.map(function (card) {
      return { card: card, value: evaluateAiCard(card) + (Math.random() * (state.difficulty === "medium" ? 4 : 1)) };
    });

    if (state.difficulty === "hard" && state.passed.player) {
      var gap = totalScore("player") - totalScore("ai");
      var closers = scored.filter(function (item) {
        return item.card.type === "unit" && item.card.ability !== "spy" && item.value > gap;
      }).sort(function (a, b) { return a.value - b.value; });
      if (closers.length) return closers[0].card;
    }

    scored.sort(function (a, b) { return b.value - a.value; });
    return scored[0].card;
  }

  function evaluateAiCard(card) {
    if (card.type === "unit") {
      var value = card.power;
      if (card.hero) value += 2;
      if (card.ability === "spy") value = 12 - card.power + (state.decks.ai.length > 0 ? 3 : 0);
      if (card.ability === "medic") {
        var bestDiscard = state.discard.ai.reduce(function (max, discarded) {
          return discarded.type === "unit" && !discarded.hero ? Math.max(max, discarded.power) : max;
        }, 0);
        value += bestDiscard;
      }
      if (card.ability === "bond") {
        var mate = state.boards.ai[card.row].some(function (unitCard) { return unitCard.name === card.name; });
        if (mate) value += card.power * 2;
      }
      if (state.weather.indexOf(card.row) >= 0 && !card.hero) value = Math.min(value, 1);
      if (state.horns.ai.indexOf(card.row) >= 0 && !card.hero) value *= 2;
      return value;
    }

    if (card.kind === "weather") {
      if (state.weather.indexOf(card.row) >= 0) return -3;
      return rawRowStrength("player", card.row) - rawRowStrength("ai", card.row) - 1;
    }
    if (card.kind === "clear") {
      var weatherPenalty = state.weather.reduce(function (sum, row) {
        return sum + rawRowStrength("ai", row) - rawRowStrength("player", row);
      }, 0);
      return weatherPenalty;
    }
    if (card.kind === "horn") {
      if (state.horns.ai.indexOf(card.row) >= 0) return -4;
      return rowScore("ai", card.row) - 1;
    }
    if (card.kind === "scorch") return scorchValueForAi();
    return 0;
  }

  function rawRowStrength(side, row) {
    return state.boards[side][row].reduce(function (sum, card) { return sum + (card.hero ? 0 : card.power); }, 0);
  }

  function scorchValueForAi() {
    var all = [];
    ["player", "ai"].forEach(function (side) {
      ROWS.forEach(function (row) {
        state.boards[side][row].forEach(function (card) {
          if (!card.hero) all.push({ side: side, value: effectivePower(side, row, card) });
        });
      });
    });
    var max = all.reduce(function (value, item) { return Math.max(value, item.value); }, 0);
    if (max < 8) return -5;
    return all.reduce(function (sum, item) {
      if (item.value !== max) return sum;
      return sum + (item.side === "player" ? max : -max);
    }, 0);
  }

  function resolveRound() {
    if (!state || state.resolving) return;
    state.resolving = true;
    state.playerTurn = false;
    var playerScore = totalScore("player");
    var aiScore = totalScore("ai");
    state.matchScore.player += playerScore;
    state.matchScore.ai += aiScore;
    var winner = "tie";
    if (playerScore > aiScore) {
      winner = "player";
      state.wins.player += 1;
    } else if (aiScore > playerScore) {
      winner = "ai";
      state.wins.ai += 1;
    }
    state.history.push({ round: state.round, player: playerScore, ai: aiScore, winner: winner });
    render();

    var message = winner === "tie" ? "本回合平手 · 雙方都未獲勝場" : (winner === "player" ? "你贏下了本回合" : "霜骨軍團贏下了本回合");
    showToast(message + "（" + playerScore + " : " + aiScore + "）");
    window.setTimeout(function () {
      if (state.wins.player >= 2 || state.wins.ai >= 2 || state.round >= 3) finishMatch();
      else beginNextRound();
    }, 1700);
  }

  function beginNextRound() {
    ["player", "ai"].forEach(function (side) {
      ROWS.forEach(function (row) {
        Array.prototype.push.apply(state.discard[side], state.boards[side][row]);
      });
      state.boards[side] = emptyRows();
    });
    state.weather = [];
    state.horns = { player: [], ai: [] };
    state.passed = { player: false, ai: false };
    state.playsThisRound = { player: 0, ai: 0 };
    state.lastUnits = { player: null, ai: null };
    state.round += 1;
    state.resolving = false;
    state.playerTurn = true;
    state.selectedId = null;
    drawCards("player", 2);
    drawCards("ai", 2);
    render();
    showToast("第 " + state.round + " 回合 · 雙方各補兩張牌");
  }

  function finishMatch() {
    var playerWon = state.wins.player > state.wins.ai;
    var tiedWins = state.wins.player === state.wins.ai;
    if (tiedWins) playerWon = state.matchScore.player > state.matchScore.ai;
    var exactTie = tiedWins && state.matchScore.player === state.matchScore.ai;
    el.resultSigil.textContent = exactTie ? "◇" : (playerWon ? "✦" : "❅");
    el.resultEyebrow.textContent = exactTie ? "STALEMATE" : (playerWon ? "VICTORY" : "DEFEAT");
    el.resultTitle.textContent = exactTie ? "灰燼未熄" : (playerWon ? "燼火照亮邊境" : "寒霜吞沒戰場");
    el.resultText.textContent = exactTie ? "雙方勝場與累積戰力完全相同，這場戰役將成為邊境的傳說。" : (playerWon ? "你在該出手時毫不遲疑，也在該保留時按下了讓牌。" : "霜骨軍團讀懂了你的節奏。調整保牌時機，再向北境發起挑戰。 ");
    el.resultScore.textContent = "勝場 " + state.wins.player + " : " + state.wins.ai + "　｜　累積戰力 " + state.matchScore.player + " : " + state.matchScore.ai;
    el.resultModal.classList.add("visible");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add("show");
    toastTimer = window.setTimeout(function () { el.toast.classList.remove("show"); }, 2000);
  }

  function animateUnitPlay(side, card) {
    var enemyCard = state.lastUnits.ai;
    var playerCard = state.lastUnits.player;
    updateFighter("ai", enemyCard);
    updateFighter("player", playerCard);

    window.clearTimeout(fxTimer);
    el.duelStage.className = "duel-stage";
    void el.duelStage.offsetWidth;

    var hasOpponent = Boolean(state.lastUnits[opponent(side)]);
    el.duelCaption.textContent = hasOpponent
      ? card.name + " 發動攻擊"
      : card.name + " 登場";
    el.duelStage.classList.add("active", hasOpponent ? "clash-" + side : "summon-" + side);

    fxTimer = window.setTimeout(function () {
      el.duelStage.className = "duel-stage";
    }, hasOpponent ? 1450 : 1200);
  }

  function updateFighter(side, card) {
    var fighter = side === "player" ? el.playerFighter : el.enemyFighter;
    var icon = side === "player" ? el.playerFighterIcon : el.enemyFighterIcon;
    var name = side === "player" ? el.playerFighterName : el.enemyFighterName;
    var power = side === "player" ? el.playerFighterPower : el.enemyFighterPower;
    fighter.classList.toggle("ready", Boolean(card));
    if (!card) return;
    icon.textContent = card.icon;
    name.textContent = card.name;
    power.textContent = card.power;
    fighter.classList.toggle("hero-fighter", Boolean(card.hero));
  }

  document.querySelectorAll("[data-difficulty]").forEach(function (button) {
    button.addEventListener("click", function () { startGame(button.dataset.difficulty); });
  });
  document.getElementById("rulesButton").addEventListener("click", function () { el.rulesDialog.showModal(); });
  document.getElementById("setupRulesButton").addEventListener("click", function () { el.rulesDialog.showModal(); });
  document.getElementById("closeRulesButton").addEventListener("click", function () { el.rulesDialog.close(); });
  document.getElementById("restartButton").addEventListener("click", function () {
    window.clearTimeout(aiTimer);
    el.setupModal.classList.add("visible");
  });
  document.getElementById("playAgainButton").addEventListener("click", function () {
    el.resultModal.classList.remove("visible");
    el.setupModal.classList.add("visible");
  });
  el.playButton.addEventListener("click", playSelected);
  el.passButton.addEventListener("click", playerPass);
})();

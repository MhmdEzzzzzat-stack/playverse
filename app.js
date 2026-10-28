(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const grid = $("#gamesGrid");
  const search = $("#gameSearch");
  const empty = $("#emptyState");
  const favoritesToggle = $("#favoritesToggle");
  const modal = $("#gameModal");
  const modalContent = $("#modalContent");
  const modalTitle = $("#modalTitle");
  const gameHint = $("#gameHint");
  let activeFilter = "All";
  let favoritesOnly = false;
  let currentGame = null;
  let gameCleanup = () => {};
  let snakeState = null;
  $("#year").textContent = new Date().getFullYear();

  let favorites = new Set();
  try { favorites = new Set(JSON.parse(localStorage.getItem("playverse-favorites") || "[]")); } catch (_) {}
  function saveFavorites() { try { localStorage.setItem("playverse-favorites", JSON.stringify([...favorites])); } catch (_) {} }
  function syncFavorites() {
    $$(".game-card").forEach(card => {
      const active = favorites.has(card.dataset.game);
      const button = $(".favorite-button", card);
      button.setAttribute("aria-pressed", String(active));
      button.textContent = active ? "♥" : "♡";
    });
    favoritesToggle.setAttribute("aria-pressed", String(favoritesOnly));
    favoritesToggle.textContent = favoritesOnly ? "♥" : "♡";
    favoritesToggle.setAttribute("aria-label", favoritesOnly ? "Show all games" : "Show favorites");
  }
  const recentKey = "playverse-recently-played";
  let recentlyPlayed = [];
  try { recentlyPlayed = JSON.parse(localStorage.getItem(recentKey) || "[]").filter(id => typeof id === "string"); } catch (_) {}
  function saveRecentlyPlayed(id) {
    recentlyPlayed = [id, ...recentlyPlayed.filter(item => item !== id)].slice(0, 4);
    try { localStorage.setItem(recentKey, JSON.stringify(recentlyPlayed)); } catch (_) {}
    renderRecentlyPlayed();
  }
  function renderRecentlyPlayed() {
    const section = $("#recentlyPlayedSection");
    const container = $("#recentlyPlayedGames");
    if (!section || !container) return;
    const cards = $$(".game-card");
    container.innerHTML = "";
    recentlyPlayed.forEach(id => {
      const card = cards.find(item => item.dataset.game === id);
      if (!card) return;
      const link = document.createElement("a");
      link.className = "recommendation-card";
      link.href = "#games";
      const icon = document.createElement("span");
      icon.className = "recommendation-icon";
      icon.textContent = ({ "2048":"🔢", snake:"🐍", memory:"🧠", tictactoe:"⭕", breakout:"🧱", minesweeper:"💣", reaction:"⚡", whack:"🔨" })[id] || "🎮";
      const details = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = card.querySelector("h3").textContent;
      const subtitle = document.createElement("small");
      subtitle.textContent = card.querySelector(".category-tag").textContent + " · Continue playing";
      details.append(title, subtitle);
      const action = document.createElement("b");
      action.textContent = "Play ↗";
      link.append(icon, details, action);
      link.addEventListener("click", event => {
        const launch = card.querySelector("[data-launch]");
        const href = card.querySelector("a.play-button");
        if (launch) { event.preventDefault(); launch.click(); }
        else if (href) { event.preventDefault(); window.location.href = href.getAttribute("href"); }
      });
      container.append(link);
    });
    section.hidden = container.children.length === 0;
  }
  renderRecentlyPlayed();
  $("#popularGames [data-recommend]").forEach(link => link.addEventListener("click", () => {
    const card = $$(".game-card").find(item => item.dataset.game === link.dataset.recommend);
    if (!card) return;
    const launch = card.querySelector("[data-launch]");
    const href = card.querySelector("a.play-button");
    if (launch) { launch.click(); }
    else if (href) { window.location.href = href.getAttribute("href"); }
  }));
  $("#clearRecentlyPlayed")?.addEventListener("click", () => {
    recentlyPlayed = [];
    try { localStorage.removeItem(recentKey); } catch (_) {}
    renderRecentlyPlayed();
  });
  function filterGames() {
    const term = search.value.trim().toLowerCase();
    let count = 0;
    $$(".game-card").forEach(card => {
      const matchesTerm = card.dataset.name.includes(term) || card.querySelector("h3").textContent.toLowerCase().includes(term);
      const matchesCategory = activeFilter === "All" || card.dataset.category === activeFilter;
      const matchesFavorite = !favoritesOnly || favorites.has(card.dataset.game);
      const show = matchesTerm && matchesCategory && matchesFavorite;
      card.hidden = !show;
      if (show) count++;
    });
    empty.hidden = count > 0;
  }
  $$("[data-jump-category]").forEach(link => link.addEventListener("click", () => {
    const target = link.dataset.jumpCategory;
    if (!["All","Arcade","Puzzle","Memory","Classic"].includes(target)) return;
    activeFilter = target;
    $$(".filter-chip").forEach(item => item.classList.toggle("selected", item.dataset.filter === target));
    filterGames();
  }));
  $$(".filter-chip").forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    $$(".filter-chip").forEach(item => item.classList.toggle("selected", item === button));
    filterGames();
  }));
  search.addEventListener("input", filterGames);
  favoritesToggle.addEventListener("click", () => { favoritesOnly = !favoritesOnly; syncFavorites(); filterGames(); $("#games").scrollIntoView({behavior:"smooth"}); });
  $$(".favorite-button").forEach(button => button.addEventListener("click", () => {
    const id = button.closest(".game-card").dataset.game;
    if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
    saveFavorites(); syncFavorites(); filterGames();
  }));
  $("#resetFilters").addEventListener("click", () => {
    search.value = ""; activeFilter = "All"; favoritesOnly = false;
    $$(".filter-chip").forEach(item => item.classList.toggle("selected", item.dataset.filter === "All"));
    syncFavorites(); filterGames();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !modal.hidden && event.target.tagName !== "INPUT") return;
    if (event.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
    if (event.key === "Escape" && !modal.hidden) closeGame();
  });

  const gameInfo = {
    "2048": {title:"2048", hint:"Use arrow keys or swipe to slide matching tiles together."},
    snake: {title:"Neon Snake", hint:"Use arrow keys, WASD, or the on-screen arrows."},
    memory: {title:"Memory Match", hint:"Flip two cards and find all matching pairs."},
    tictactoe: {title:"Tic Tac Toe", hint:"You're ✕. Get three in a row before the computer."}
  };
  function launchGame(id) {
    saveRecentlyPlayed(id);
    currentGame = id;
    gameCleanup();
    gameCleanup = () => {};
    modalTitle.textContent = gameInfo[id].title;
    gameHint.textContent = gameInfo[id].hint;
    modalContent.innerHTML = "";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    if (id === "2048") setup2048();
    if (id === "snake") setupSnake();
    if (id === "memory") setupMemory();
    if (id === "tictactoe") setupTicTacToe();
    $("#closeModal").focus();
  }
  function closeGame() {
    if (modal.hidden) return;
    gameCleanup(); gameCleanup = () => {}; modal.hidden = true;
    document.body.classList.remove("modal-open"); currentGame = null; snakeState = null;
  }
  function restartGame() { if (currentGame) launchGame(currentGame); }
  $(".game-card a.play-button").forEach(link => link.addEventListener("click", () => {
    const id = link.closest(".game-card").dataset.game;
    saveRecentlyPlayed(id);
  }));
  $("[data-launch]").forEach(button => button.addEventListener("click", () => launchGame(button.dataset.launch)));
  $("#closeModal").addEventListener("click", closeGame);
  $("#restartGame").addEventListener("click", restartGame);
  modal.addEventListener("click", event => { if (event.target.matches("[data-close]")) closeGame(); });

  function statusLine(text) { const node = document.createElement("p"); node.className = "game-status"; node.setAttribute("aria-live","polite"); node.textContent = text; return node; }
  function actionButton(text, fn) { const b = document.createElement("button"); b.className = "secondary-button"; b.textContent = text; b.addEventListener("click", fn); return b; }

  function setupTicTacToe() {
    modalContent.innerHTML = "";
    const status = statusLine("Your turn — you're ✕.");
    const boardEl = document.createElement("div"); boardEl.className = "ttt-play-board";
    const reset = actionButton("New round", setupTicTacToe);
    const actions = document.createElement("div"); actions.className = "game-actions"; actions.append(reset);
    modalContent.append(status, boardEl, actions);
    let board = Array(9).fill("");
    let ended = false;
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const winner = () => { for (const line of wins) if (board[line[0]] && line.every(i => board[i] === board[line[0]])) return board[line[0]]; return board.every(Boolean) ? "draw" : ""; };
    function render() {
      boardEl.innerHTML = "";
      board.forEach((value, index) => {
        const cell = document.createElement("button"); cell.className = "ttt-cell" + (value === "○" ? " o" : ""); cell.textContent = value;
        cell.setAttribute("aria-label", "Cell " + (index + 1) + (value ? ": " + value : ": empty"));
        cell.disabled = ended || Boolean(value);
        cell.addEventListener("click", () => move(index)); boardEl.append(cell);
      });
    }
    function move(index) {
      if (ended || board[index]) return;
      board[index] = "✕";
      let result = winner();
      if (result) return finish(result);
      status.textContent = "Computer is thinking…"; render();
      const empties = board.map((v,i) => v ? -1 : i).filter(i => i >= 0);
      // Prefer a winning move, then block the player's winning move, then center/corners.
      function winningSpot(mark) {
        for (const i of empties) { board[i] = mark; const won = wins.some(line => line.every(j => board[j] === mark)); board[i] = ""; if (won) return i; }
        return -1;
      }
      let choice = winningSpot("○");
      if (choice < 0) choice = winningSpot("✕");
      if (choice < 0 && empties.includes(4)) choice = 4;
      if (choice < 0) { const corners = [0,2,6,8].filter(i => empties.includes(i)); choice = corners.length ? corners[Math.floor(Math.random()*corners.length)] : empties[Math.floor(Math.random()*empties.length)]; }
      if (choice !== undefined && choice >= 0) board[choice] = "○";
      result = winner();
      if (result) return finish(result);
      status.textContent = "Your turn — you're ✕."; render();
    }
    function finish(result) { ended = true; status.textContent = result === "draw" ? "It's a draw. Nice game!" : result === "✕" ? "You win! Great move ✨" : "Computer wins this round. Try again!"; render(); }
    render();
  }

  function setupMemory() {
    modalContent.innerHTML = "";
    const status = statusLine("Find all 6 pairs. Moves: 0");
    const boardEl = document.createElement("div"); boardEl.className = "memory-play-board";
    const symbols = ["✦","☾","♫","✿","⚡","☀️"];
    let deck = [...symbols,...symbols].map((symbol,index) => ({symbol,id:index})).sort(() => Math.random()-.5);
    let opened = [], matched = new Set(), moves = 0, locked = false, timer = null;
    modalContent.append(status,boardEl);
    function render() {
      boardEl.innerHTML = "";
      deck.forEach(card => {
        const button = document.createElement("button"); button.className = "memory-card";
        const visible = opened.includes(card.id) || matched.has(card.id);
        button.textContent = visible ? card.symbol : "✦";
        if (visible) button.classList.add(matched.has(card.id) ? "matched" : "revealed");
        button.setAttribute("aria-label", visible ? card.symbol : "Hidden card");
        button.disabled = visible || locked;
        button.addEventListener("click", () => flip(card)); boardEl.append(button);
      });
    }
    function flip(card) {
      if (locked || matched.has(card.id) || opened.includes(card.id)) return;
      opened.push(card.id); render();
      if (opened.length === 2) {
        moves++; status.textContent = "Find all 6 pairs. Moves: " + moves;
        const [a,b] = opened.map(id => deck.find(c => c.id === id));
        if (a.symbol === b.symbol) { matched.add(a.id); matched.add(b.id); opened = []; if (matched.size === deck.length) status.textContent = "You matched every pair in " + moves + " moves! 🎉"; render(); }
        else { locked = true; timer = setTimeout(() => { opened = []; locked = false; render(); }, 750); }
      }
    }
    render();
    gameCleanup = () => { if (timer) clearTimeout(timer); };
  }

  function setup2048() {
    modalContent.innerHTML = "";
    const status = statusLine("Score: 0");
    const boardEl = document.createElement("div"); boardEl.className = "board-2048"; boardEl.tabIndex = 0; boardEl.setAttribute("aria-label","2048 game board. Use arrow keys to move.");
    const instructions = document.createElement("p"); instructions.className = "instructions"; instructions.textContent = "Combine equal numbers to reach 2048. Arrow keys or swipe.";
    modalContent.append(status,boardEl,instructions);
    let board = Array(16).fill(0), score = 0, over = false, won = false;
    function addTile() { const free = board.map((v,i)=>v? -1:i).filter(i=>i>=0); if (!free.length) return; board[free[Math.floor(Math.random()*free.length)]] = Math.random() < .9 ? 2 : 4; }
    function render() {
      boardEl.innerHTML = "";
      board.forEach(value => { const tile = document.createElement("div"); tile.className = "tile-2048"; tile.dataset.value = String(value); tile.textContent = value || ""; tile.setAttribute("aria-label",value ? String(value) : "empty"); boardEl.append(tile); });
      status.textContent = "Score: " + score + (won ? " · 2048 reached!" : over ? " · No moves left" : "");
    }
    function canMove() {
      for(let r=0;r<4;r++) for(let c=0;c<4;c++){ const i=r*4+c; if(!board[i]) return true; if(c<3&&board[i]===board[i+1])return true; if(r<3&&board[i]===board[i+4])return true; } return false;
    }
    function move(direction) {
      if(over) return;
      const before = board.join(",");
      for(let line=0;line<4;line++){
        let indices=[];
        for(let pos=0;pos<4;pos++){let r,c;if(direction==="left"||direction==="right"){r=line;c=direction==="left"?pos:3-pos;}else{c=line;r=direction==="up"?pos:3-pos;}indices.push(r*4+c);}
        let values=indices.map(i=>board[i]).filter(Boolean), merged=[];
        for(let j=0;j<values.length;j++){if(values[j]===values[j+1]){const value=values[j]*2;merged.push(value);score+=value;j++;}else merged.push(values[j]);}
        while(merged.length<4)merged.push(0);
        indices.forEach((idx,j)=>board[idx]=merged[j]);
      }
      if(board.join(",")===before) return;
      if(!won&&board.includes(2048)) won=true;
      addTile(); over=!canMove(); render();
    }
    function keydown(e){const map={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down"};if(map[e.key]){e.preventDefault();move(map[e.key]);}}
    let touchX=0,touchY=0;
    function touchStart(e){const t=e.changedTouches[0];touchX=t.clientX;touchY=t.clientY;}
    function touchEnd(e){const t=e.changedTouches[0],dx=t.clientX-touchX,dy=t.clientY-touchY;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));}
    document.addEventListener("keydown",keydown);
    boardEl.addEventListener("touchstart",touchStart,{passive:true});boardEl.addEventListener("touchend",touchEnd,{passive:true});
    addTile();addTile();render();boardEl.focus();
    gameCleanup=()=>{document.removeEventListener("keydown",keydown);};
  }

  function setupSnake() {
    modalContent.innerHTML = "";
    const status = statusLine("Score: 0 · Use arrows or WASD");
    const canvas = document.createElement("canvas"); canvas.className = "snake-canvas"; canvas.width=360; canvas.height=360; canvas.setAttribute("aria-label","Snake game board");
    const controls = document.createElement("div"); controls.className = "mobile-controls";
    [["↑","up"],["←","left"],["↓","down"],["→","right"]].forEach(([label,dir])=>{const b=document.createElement("button");b.textContent=label;b.setAttribute("aria-label",dir);b.addEventListener("click",()=>turn(dir));controls.append(b);});
    modalContent.append(status,canvas,controls);
    const ctx=canvas.getContext("2d"), cell=18, size=20;
    let snake=[{x:7,y:10},{x:6,y:10},{x:5,y:10}], dir={x:1,y:0}, nextDir={x:1,y:0}, score=0, alive=true, timer=null;
    function foodSpot(){let p;do{p={x:Math.floor(Math.random()*size),y:Math.floor(Math.random()*size)}}while(snake.some(s=>s.x===p.x&&s.y===p.y));return p;}
    let food=foodSpot();
    function turn(d){const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};const n=dirs[d];if(n&&!(n.x===-dir.x&&n.y===-dir.y))nextDir=n;}
    function draw(){
      ctx.fillStyle="#101c24";ctx.fillRect(0,0,360,360);
      ctx.strokeStyle="#ffffff08";for(let i=0;i<=size;i++){ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,360);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(360,i*cell);ctx.stroke();}
      ctx.fillStyle="#ff7eac";ctx.beginPath();ctx.arc(food.x*cell+9,food.y*cell+9,6,0,Math.PI*2);ctx.fill();
      snake.forEach((s,i)=>{ctx.fillStyle=i===0?"#8bffe2":"#43d8b2";ctx.shadowColor="#43d8b2";ctx.shadowBlur=i===0?12:3;ctx.beginPath();ctx.roundRect(s.x*cell+1,s.y*cell+1,cell-2,cell-2,5);ctx.fill();});ctx.shadowBlur=0;
      if(!alive){ctx.fillStyle="#101c24cc";ctx.fillRect(0,0,360,360);ctx.fillStyle="#ffffff";ctx.textAlign="center";ctx.font="700 25px sans-serif";ctx.fillText("GAME OVER",180,170);ctx.font="14px sans-serif";ctx.fillText("Score: "+score,180,198);}
    }
    function tick(){
      if(!alive)return;
      dir=nextDir;const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
      const eating=head.x===food.x&&head.y===food.y;
      if(head.x<0||head.y<0||head.x>=size||head.y>=size||snake.slice(0,eating?snake.length:snake.length-1).some(s=>s.x===head.x&&s.y===head.y)){alive=false;draw();status.textContent="Game over · Score: "+score+" · Restart to play again";return;}
      snake.unshift(head);if(eating){score+=10;food=foodSpot();status.textContent="Score: "+score+" · Nice bite!";}else snake.pop();draw();
    }
    function keydown(e){const map={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right",W:"up",S:"down",A:"left",D:"right"};if(map[e.key]){e.preventDefault();turn(map[e.key]);}}
    document.addEventListener("keydown",keydown);draw();timer=setInterval(tick,115);
    gameCleanup=()=>{clearInterval(timer);document.removeEventListener("keydown",keydown);};
  }

  syncFavorites(); filterGames();
})();
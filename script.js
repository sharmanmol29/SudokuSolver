"use strict";

const STORAGE_KEYS = {
  theme: "sudokuviz_theme",
  state: "sudokuviz_state"
};

const EXAMPLE_PUZZLES = [
  {
    label: "Classic #1",
    board: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ]
  },
  {
    label: "Classic #2",
    board: [
      [0, 2, 0, 6, 0, 8, 0, 0, 0],
      [5, 8, 0, 0, 0, 9, 7, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0, 0],
      [3, 7, 0, 0, 0, 0, 5, 0, 0],
      [6, 0, 0, 0, 0, 0, 0, 0, 4],
      [0, 0, 8, 0, 0, 0, 0, 1, 3],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 9, 8, 0, 0, 0, 3, 6],
      [0, 0, 0, 3, 0, 6, 0, 9, 0]
    ]
  },
  {
    label: "World's Hardest",
    board: [
      [8, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 3, 6, 0, 0, 0, 0, 0],
      [0, 7, 0, 0, 9, 0, 2, 0, 0],
      [0, 5, 0, 0, 0, 7, 0, 0, 0],
      [0, 0, 0, 0, 4, 5, 7, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 3, 0],
      [0, 0, 1, 0, 0, 0, 0, 6, 8],
      [0, 0, 8, 5, 0, 0, 0, 1, 0],
      [0, 9, 0, 0, 0, 0, 4, 0, 0]
    ]
  }
];

const STATE = {
  board: createEmptyBoard(),
  initialBoard: createEmptyBoard(),
  givenCells: new Set(),
  solverPlacedCells: new Set(),
  selectedCell: null,
  solveSteps: [],
  stepIndex: 0,
  solvingInterval: null,
  solvingSnapshot: null,
  exampleIndex: 0,
  difficulty: "easy",
  speed: 50,
  paused: false,
  status: "Idle",
  solveStart: null,
  elapsedMs: 0,
  maxDepth: 0,
  stats: {
    totalSteps: 0,
    numbersTried: 0,
    backtracks: 0,
    emptyCells: 81
  }
};

const DOM = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  applyThemeFromStorage();
  createBoardCells();
  initEventListeners();
  restoreOrCreatePuzzle();
  updateSpeedLabel();
  refreshStatsPanel();
  setControlState("idle");
});

function cacheDom() {
  DOM.body = document.body;
  DOM.board = document.getElementById("board");
  DOM.toastContainer = document.getElementById("toast-container");
  DOM.themeToggle = document.getElementById("theme-toggle");
  DOM.speedSlider = document.getElementById("speed-slider");
  DOM.speedLabel = document.getElementById("speed-label");
  DOM.exampleLabel = document.getElementById("example-label");
  DOM.educationToggle = document.getElementById("education-toggle");
  DOM.educationContent = document.getElementById("education-content");
  DOM.modal = document.getElementById("success-modal");
  DOM.modalSummary = document.getElementById("modal-summary");
  DOM.modalNewPuzzle = document.getElementById("modal-new-puzzle");
  DOM.modalClose = document.getElementById("modal-close");
  DOM.confetti = document.getElementById("confetti-canvas");

  DOM.buttons = {
    generate: document.getElementById("generate-btn"),
    example: document.getElementById("example-btn"),
    reset: document.getElementById("reset-btn"),
    clear: document.getElementById("clear-btn"),
    solve: document.getElementById("solve-btn"),
    visual: document.getElementById("visual-btn"),
    pause: document.getElementById("pause-btn"),
    resume: document.getElementById("resume-btn"),
    next: document.getElementById("next-btn"),
    stop: document.getElementById("stop-btn"),
    hint: document.getElementById("hint-btn"),
    check: document.getElementById("check-btn")
  };

  DOM.stats = {
    totalSteps: document.getElementById("stat-total-steps"),
    tried: document.getElementById("stat-tried"),
    backtracks: document.getElementById("stat-backtracks"),
    empty: document.getElementById("stat-empty"),
    time: document.getElementById("stat-time"),
    depth: document.getElementById("stat-depth"),
    status: document.getElementById("stat-status")
  };
}

function initEventListeners() {
  DOM.themeToggle.addEventListener("click", toggleTheme);
  DOM.speedSlider.addEventListener("input", (event) => {
    STATE.speed = Number(event.target.value);
    updateSpeedLabel();
    if (STATE.solvingInterval && !STATE.paused) {
      restartVisualizationInterval();
    }
  });

  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (STATE.status === "Solving") {
        showToast("Stop current solve before changing difficulty.");
        return;
      }
      STATE.difficulty = btn.dataset.difficulty;
      updateDifficultyButtons();
      saveState();
    });
  });

  DOM.buttons.generate.addEventListener("click", () => {
    if (!stopIfBusy()) return;
    generateAndLoadPuzzle(STATE.difficulty);
  });

  DOM.buttons.example.addEventListener("click", () => {
    if (!stopIfBusy()) return;
    loadExamplePuzzle();
  });

  DOM.buttons.reset.addEventListener("click", () => {
    if (!stopIfBusy()) return;
    resetPuzzle();
  });

  DOM.buttons.clear.addEventListener("click", () => {
    if (!stopIfBusy()) return;
    clearBoard();
  });

  DOM.buttons.solve.addEventListener("click", solveInstantly);
  DOM.buttons.visual.addEventListener("click", startVisualSolve);
  DOM.buttons.pause.addEventListener("click", pauseVisualization);
  DOM.buttons.resume.addEventListener("click", resumeVisualization);
  DOM.buttons.next.addEventListener("click", nextVisualizationStep);
  DOM.buttons.stop.addEventListener("click", stopVisualization);
  DOM.buttons.hint.addEventListener("click", placeHint);
  DOM.buttons.check.addEventListener("click", checkSolution);

  DOM.educationToggle.addEventListener("click", () => {
    const isOpen = DOM.educationContent.classList.toggle("open");
    DOM.educationToggle.setAttribute("aria-expanded", String(isOpen));
  });

  DOM.modalClose.addEventListener("click", () => DOM.modal.classList.remove("show"));
  DOM.modalNewPuzzle.addEventListener("click", () => {
    DOM.modal.classList.remove("show");
    generateAndLoadPuzzle(STATE.difficulty);
  });

  document.addEventListener("keydown", handleKeyboardInput);
}

function createBoardCells() {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      if ((col + 1) % 3 === 0 && col !== 8) cell.classList.add("box-right");
      if ((row + 1) % 3 === 0 && row !== 8) cell.classList.add("box-bottom");
      cell.addEventListener("click", () => handleCellClick(row, col));
      fragment.appendChild(cell);
    }
  }
  DOM.board.appendChild(fragment);
}

function renderBoard() {
  const conflictCells = findConflicts(STATE.board);
  const selected = STATE.selectedCell;

  getAllCellElements().forEach((cellEl) => {
    const row = Number(cellEl.dataset.row);
    const col = Number(cellEl.dataset.col);
    const value = STATE.board[row][col];
    const key = cellKey(row, col);
    const isGiven = STATE.givenCells.has(key);
    const isSelected = selected && selected.row === row && selected.col === col;
    const inSelectionZone = selected && (selected.row === row || selected.col === col || isInSameBox(selected.row, selected.col, row, col));

    cellEl.textContent = value === 0 ? "" : String(value);
    cellEl.classList.toggle("given", isGiven && value !== 0);
    cellEl.classList.toggle("user", !isGiven && value !== 0 && !STATE.solverPlacedCells.has(key));
    cellEl.classList.toggle("solver", STATE.solverPlacedCells.has(key) && value !== 0);
    cellEl.classList.toggle("selected", Boolean(isSelected));
    cellEl.classList.toggle("highlight", Boolean(inSelectionZone) && !isSelected);
    cellEl.classList.toggle("invalid", conflictCells.has(key));
  });

  STATE.stats.emptyCells = countEmptyCells(STATE.board);
  refreshStatsPanel();
}

function handleCellClick(row, col) {
  const key = cellKey(row, col);
  if (STATE.givenCells.has(key)) {
    const cellEl = getCellElement(row, col);
    pulseClass(cellEl, "locked-shake", 260);
    showToast("Given cells are locked.");
    return;
  }
  STATE.selectedCell = { row, col };
  renderBoard();
}

function handleKeyboardInput(event) {
  if (!STATE.selectedCell || STATE.status === "Solving") return;
  const { row, col } = STATE.selectedCell;
  const key = cellKey(row, col);
  if (STATE.givenCells.has(key)) return;

  const moveMap = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1]
  };

  if (event.key in moveMap) {
    event.preventDefault();
    const [dr, dc] = moveMap[event.key];
    const nr = (row + dr + 9) % 9;
    const nc = (col + dc + 9) % 9;
    STATE.selectedCell = { row: nr, col: nc };
    renderBoard();
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    setCellFromUser(row, col, Number(event.key));
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    setCellFromUser(row, col, 0);
  }
}

function setCellFromUser(row, col, value) {
  STATE.board[row][col] = value;
  STATE.solverPlacedCells.delete(cellKey(row, col));
  const conflicts = findConflicts(STATE.board);
  const cellEl = getCellElement(row, col);
  if (value !== 0 && conflicts.has(cellKey(row, col))) {
    pulseClass(cellEl, "invalid", 300);
  } else if (value !== 0) {
    pulseClass(cellEl, "valid-flash", 330);
  }
  renderBoard();
  saveState();
}

function updateDifficultyButtons() {
  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === STATE.difficulty);
  });
}

function setControlState(mode) {
  const solving = mode === "solving";
  const paused = mode === "paused";

  DOM.buttons.pause.disabled = !solving;
  DOM.buttons.resume.disabled = !paused;
  DOM.buttons.next.disabled = !paused;
  DOM.buttons.stop.disabled = !(solving || paused);
  DOM.buttons.visual.disabled = solving;
  DOM.buttons.solve.disabled = solving;
}

function updateSpeedLabel() {
  let label = "Medium";
  if (STATE.speed <= 30) label = "Slow";
  if (STATE.speed >= 71) label = "Fast";
  DOM.speedLabel.textContent = label;
}

function getSpeedDelay() {
  if (STATE.speed <= 30) return 300;
  if (STATE.speed <= 70) return 80;
  return 10;
}

function refreshStatsPanel() {
  setStat(DOM.stats.totalSteps, STATE.stats.totalSteps);
  setStat(DOM.stats.tried, STATE.stats.numbersTried);
  setStat(DOM.stats.backtracks, STATE.stats.backtracks);
  setStat(DOM.stats.empty, STATE.stats.emptyCells);
  DOM.stats.time.textContent = formatElapsed(STATE.elapsedMs);
  setStat(DOM.stats.depth, STATE.maxDepth);
  DOM.stats.status.textContent = STATE.status;
}

function setStat(node, value) {
  const newValue = String(value);
  if (node.textContent !== newValue) {
    node.textContent = newValue;
    pulseClass(node.parentElement, "pop", 260);
  }
}

function resetStats() {
  STATE.stats.totalSteps = 0;
  STATE.stats.numbersTried = 0;
  STATE.stats.backtracks = 0;
  STATE.stats.emptyCells = countEmptyCells(STATE.board);
  STATE.elapsedMs = 0;
  STATE.maxDepth = 0;
}

function setStatus(status) {
  STATE.status = status;
  refreshStatsPanel();
}

function solveInstantly() {
  if (STATE.status === "Solving") return;
  const boardCopy = cloneBoard(STATE.board);
  const start = performance.now();
  const solved = solveSudoku(boardCopy);
  const elapsed = performance.now() - start;
  if (!solved) {
    showToast("No valid solution exists for this board.");
    return;
  }

  STATE.board = boardCopy;
  markNonGivenAsSolver();
  setStatus("Solved");
  STATE.elapsedMs = elapsed;
  STATE.stats.emptyCells = 0;
  saveState();
  renderBoard();
  triggerSuccessSequence();
}

function startVisualSolve() {
  if (STATE.status === "Solving") return;
  clearInvalidClasses();

  const boardSnapshot = cloneBoard(STATE.board);
  const solverBoard = cloneBoard(STATE.board);
  const steps = solveSudokuSteps(solverBoard);
  if (!steps.solved) {
    showToast("Puzzle cannot be solved from current state.");
    return;
  }

  STATE.solvingSnapshot = boardSnapshot;
  STATE.solveSteps = steps;
  STATE.stepIndex = 0;
  STATE.paused = false;
  STATE.solverPlacedCells.clear();
  resetStats();
  STATE.maxDepth = steps.maxDepth;
  STATE.solveStart = performance.now();
  setStatus("Solving");
  setControlState("solving");
  runVisualizationInterval();
}

function runVisualizationInterval() {
  clearInterval(STATE.solvingInterval);
  STATE.solvingInterval = setInterval(() => {
    if (!runOneStep()) {
      clearInterval(STATE.solvingInterval);
    }
  }, getSpeedDelay());
}

function restartVisualizationInterval() {
  if (STATE.paused || STATE.status !== "Solving") return;
  runVisualizationInterval();
}

function runOneStep() {
  const step = STATE.solveSteps[STATE.stepIndex];
  if (!step) {
    finishVisualizationSolve();
    return false;
  }

  STATE.stats.totalSteps += 1;
  STATE.elapsedMs = performance.now() - STATE.solveStart;
  applySolveStep(step);
  STATE.stepIndex += 1;
  refreshStatsPanel();
  saveState();
  return true;
}

function applySolveStep(step) {
  const { row, col, num, action } = step;
  if (action === "solved") {
    STATE.board = cloneBoard(step.boardSnapshot);
    markNonGivenAsSolver();
    renderBoard();
    return;
  }

  const key = cellKey(row, col);
  const cellEl = getCellElement(row, col);
  STATE.selectedCell = { row, col };

  if (action === "try") {
    STATE.stats.numbersTried += 1;
    pulseClass(cellEl, "trying", 420);
  } else if (action === "place") {
    STATE.board[row][col] = num;
    if (!STATE.givenCells.has(key)) STATE.solverPlacedCells.add(key);
    pulseClass(cellEl, "valid-flash", 330);
  } else if (action === "backtrack") {
    STATE.stats.backtracks += 1;
    STATE.board[row][col] = 0;
    STATE.solverPlacedCells.delete(key);
    pulseClass(cellEl, "backtracking", 420);
  }
  renderBoard();
}

function pauseVisualization() {
  if (STATE.status !== "Solving") return;
  STATE.paused = true;
  clearInterval(STATE.solvingInterval);
  setStatus("Paused");
  setControlState("paused");
}

function resumeVisualization() {
  if (!STATE.paused) return;
  STATE.paused = false;
  setStatus("Solving");
  setControlState("solving");
  runVisualizationInterval();
}

function nextVisualizationStep() {
  if (!STATE.paused) return;
  if (!runOneStep()) {
    finishVisualizationSolve();
  }
}

function stopVisualization() {
  clearInterval(STATE.solvingInterval);
  STATE.solvingInterval = null;
  STATE.paused = false;
  if (STATE.solvingSnapshot) {
    STATE.board = cloneBoard(STATE.solvingSnapshot);
    STATE.solverPlacedCells.clear();
    STATE.stepIndex = 0;
    STATE.solveSteps = [];
    STATE.solvingSnapshot = null;
    setStatus("Idle");
    setControlState("idle");
    renderBoard();
    saveState();
    showToast("Visualization stopped and board restored.");
  }
}

function finishVisualizationSolve() {
  clearInterval(STATE.solvingInterval);
  STATE.solvingInterval = null;
  STATE.paused = false;
  STATE.stats.emptyCells = 0;
  setStatus("Solved");
  setControlState("idle");
  renderBoard();
  saveState();
  triggerSuccessSequence();
}

function placeHint() {
  if (STATE.status === "Solving") {
    showToast("Pause or stop visualization before requesting a hint.");
    return;
  }
  const empties = listEmptyCells(STATE.board);
  if (!empties.length) {
    showToast("Board is already complete.");
    return;
  }
  const solved = cloneBoard(STATE.board);
  if (!solveSudoku(solved)) {
    showToast("Current puzzle state has no valid completion.");
    return;
  }
  const pick = empties[Math.floor(Math.random() * empties.length)];
  const value = solved[pick.row][pick.col];
  STATE.board[pick.row][pick.col] = value;
  STATE.solverPlacedCells.add(cellKey(pick.row, pick.col));
  renderBoard();
  pulseClass(getCellElement(pick.row, pick.col), "hint-pop", 420);
  saveState();
  showToast(`💡 Hint placed at row ${pick.row + 1}, col ${pick.col + 1}`);
}

function checkSolution() {
  const conflicts = findConflicts(STATE.board);
  if (conflicts.size > 0) {
    conflicts.forEach((key) => {
      const [row, col] = key.split("-").map(Number);
      pulseClass(getCellElement(row, col), "invalid", 300);
    });
    renderBoard();
    showToast("❌ Conflicts found!");
    return;
  }

  if (countEmptyCells(STATE.board) > 0) {
    showToast("✅ No conflicts so far! Keep going.");
    return;
  }

  setStatus("Solved");
  renderBoard();
  triggerSuccessSequence();
}

function triggerSuccessSequence() {
  waveBoardAnimation();
  launchConfetti();
  const summary = `Time: ${formatElapsed(STATE.elapsedMs)} | Steps: ${STATE.stats.totalSteps} | Backtracks: ${STATE.stats.backtracks}`;
  DOM.modalSummary.textContent = summary;
  DOM.modal.classList.add("show");
  showToast(`✨ Solved in ${STATE.stats.totalSteps} steps with ${STATE.stats.backtracks} backtracks!`);
}

function waveBoardAnimation() {
  getAllCellElements().forEach((cell, index) => {
    setTimeout(() => {
      pulseClass(cell, "wave", 560);
    }, index * 14);
  });
}

function launchConfetti() {
  const canvas = DOM.confetti;
  const ctx = canvas.getContext("2d");
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  const particles = Array.from({ length: 180 }, () => ({
    x: Math.random() * width,
    y: -Math.random() * height,
    size: 4 + Math.random() * 8,
    shape: Math.random() > 0.5 ? "square" : "circle",
    speedY: 1.8 + Math.random() * 3.4,
    speedX: -1 + Math.random() * 2,
    rotation: Math.random() * Math.PI,
    spin: -0.16 + Math.random() * 0.32,
    color: ["#3ec8ff", "#3ef7a3", "#ffca3a", "#ff5f7a", "#7f8cff"][Math.floor(Math.random() * 5)]
  }));

  const duration = 2200;
  const start = performance.now();

  function drawParticle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === "square") {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function frame(now) {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.spin;
      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      drawParticle(p);
    });

    if (now - start < duration) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  requestAnimationFrame(frame);
}

function resetPuzzle() {
  STATE.board = cloneBoard(STATE.initialBoard);
  STATE.solverPlacedCells.clear();
  STATE.selectedCell = null;
  resetStats();
  setStatus("Idle");
  renderBoard();
  saveState();
  showToast("Puzzle reset to initial state.");
}

function clearBoard() {
  STATE.board = createEmptyBoard();
  STATE.initialBoard = createEmptyBoard();
  STATE.givenCells = new Set();
  STATE.solverPlacedCells.clear();
  STATE.selectedCell = null;
  resetStats();
  setStatus("Idle");
  renderBoard();
  saveState();
  showToast("Board cleared.");
}

function generateAndLoadPuzzle(difficulty) {
  setStatus("Generating...");
  const puzzle = generatePuzzle(difficulty);
  loadBoardState(puzzle.board, buildGivenSet(puzzle.board), `Generated ${capitalize(difficulty)}`);
  showToast(`🎲 ${capitalize(difficulty)} puzzle generated.`);
}

function loadExamplePuzzle() {
  const item = EXAMPLE_PUZZLES[STATE.exampleIndex % EXAMPLE_PUZZLES.length];
  STATE.exampleIndex += 1;
  loadBoardState(item.board, buildGivenSet(item.board), item.label);
  showToast(`Loaded ${item.label}`);
}

function loadBoardState(board, givenCells, label) {
  STATE.board = cloneBoard(board);
  STATE.initialBoard = cloneBoard(board);
  STATE.givenCells = new Set(givenCells);
  STATE.solverPlacedCells.clear();
  STATE.selectedCell = null;
  STATE.solveSteps = [];
  STATE.stepIndex = 0;
  STATE.solvingSnapshot = null;
  resetStats();
  setStatus("Idle");
  setControlState("idle");
  DOM.exampleLabel.textContent = `Puzzle: ${label}`;
  renderBoard();
  saveState();
}

function restoreOrCreatePuzzle() {
  updateDifficultyButtons();
  const raw = localStorage.getItem(STORAGE_KEYS.state);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      const ageMs = Date.now() - saved.timestamp;
      if (ageMs < 24 * 60 * 60 * 1000 && Array.isArray(saved.board) && Array.isArray(saved.givenCells)) {
        STATE.difficulty = saved.difficulty || "easy";
        updateDifficultyButtons();
        STATE.board = cloneBoard(saved.board);
        STATE.initialBoard = cloneBoard(saved.board);
        STATE.givenCells = new Set(saved.givenCells);
        STATE.solverPlacedCells.clear();
        resetStats();
        setStatus("Idle");
        renderBoard();
        showToast("♻️ Previous session restored");
        return;
      }
    } catch (error) {
      console.warn("State restore failed:", error);
    }
  }
  generateAndLoadPuzzle("easy");
}

function saveState() {
  const payload = {
    board: STATE.board,
    givenCells: Array.from(STATE.givenCells),
    difficulty: STATE.difficulty,
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(payload));
}

function toggleTheme() {
  const current = DOM.body.dataset.theme;
  const next = current === "dark" ? "light" : "dark";
  DOM.body.dataset.theme = next;
  localStorage.setItem(STORAGE_KEYS.theme, next);
}

function applyThemeFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved === "light" || saved === "dark") {
    DOM.body.dataset.theme = saved;
  } else {
    DOM.body.dataset.theme = "dark";
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
  }, 2600);
  setTimeout(() => toast.remove(), 3000);
}

function stopIfBusy() {
  if (STATE.status === "Solving") {
    showToast("Stop current visualization first.");
    return false;
  }
  return true;
}

function clearInvalidClasses() {
  getAllCellElements().forEach((cell) => cell.classList.remove("invalid"));
}

function pulseClass(element, className, duration) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  setTimeout(() => element.classList.remove(className), duration);
}

function getAllCellElements() {
  return Array.from(DOM.board.querySelectorAll(".cell"));
}

function getCellElement(row, col) {
  return DOM.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function createEmptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function cellKey(row, col) {
  return `${row}-${col}`;
}

function buildGivenSet(board) {
  const set = new Set();
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) set.add(cellKey(row, col));
    }
  }
  return set;
}

function countEmptyCells(board) {
  let count = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) count += 1;
    }
  }
  return count;
}

function listEmptyCells(board) {
  const empties = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) empties.push({ row, col });
    }
  }
  return empties;
}

function isInSameBox(r1, c1, r2, c2) {
  return Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3);
}

function findConflicts(board) {
  const conflicts = new Set();
  const track = new Map();

  function register(type, index, value, position) {
    const key = `${type}-${index}-${value}`;
    if (!track.has(key)) {
      track.set(key, [position]);
      return;
    }
    track.get(key).push(position);
  }

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board[row][col];
      if (value === 0) continue;
      register("r", row, value, cellKey(row, col));
      register("c", col, value, cellKey(row, col));
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      register("b", box, value, cellKey(row, col));
    }
  }

  track.forEach((positions) => {
    if (positions.length > 1) {
      positions.forEach((pos) => conflicts.add(pos));
    }
  });
  return conflicts;
}

function markNonGivenAsSolver() {
  STATE.solverPlacedCells.clear();
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (STATE.board[row][col] !== 0 && !STATE.givenCells.has(cellKey(row, col))) {
        STATE.solverPlacedCells.add(cellKey(row, col));
      }
    }
  }
}

function formatElapsed(ms) {
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shuffledNumbers() {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = nums.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

function isValidPlacement(board, row, col, num) {
  for (let i = 0; i < 9; i += 1) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;
  for (let r = boxRowStart; r < boxRowStart + 3; r += 1) {
    for (let c = boxColStart; c < boxColStart + 3; c += 1) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function findEmptyCell(board) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) return [row, col];
    }
  }
  return null;
}

function solveSudoku(board) {
  const empty = findEmptyCell(board);
  if (!empty) return true;
  const [row, col] = empty;
  for (let num = 1; num <= 9; num += 1) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num;
      if (solveSudoku(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function solveSudokuSteps(board) {
  const steps = [];
  let solved = false;
  let maxDepth = 0;

  function walk(depth) {
    maxDepth = Math.max(maxDepth, depth);
    const empty = findEmptyCell(board);
    if (!empty) {
      steps.push({ row: -1, col: -1, num: 0, action: "solved", boardSnapshot: cloneBoard(board), depth });
      return true;
    }

    const [row, col] = empty;
    for (let num = 1; num <= 9; num += 1) {
      steps.push({ row, col, num, action: "try", depth });
      if (isValidPlacement(board, row, col, num)) {
        board[row][col] = num;
        steps.push({ row, col, num, action: "place", depth });
        if (walk(depth + 1)) return true;
        board[row][col] = 0;
        steps.push({ row, col, num, action: "backtrack", depth });
      }
    }
    return false;
  }

  solved = walk(1);
  steps.solved = solved;
  steps.maxDepth = maxDepth;
  return steps;
}

function generateSolvedBoard() {
  const board = createEmptyBoard();
  function fill() {
    const empty = findEmptyCell(board);
    if (!empty) return true;
    const [row, col] = empty;
    const nums = shuffledNumbers();
    for (const num of nums) {
      if (isValidPlacement(board, row, col, num)) {
        board[row][col] = num;
        if (fill()) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }
  fill();
  return board;
}

function countSolutions(board, limit = 2) {
  const empty = findEmptyCell(board);
  if (!empty) return 1;
  const [row, col] = empty;
  let count = 0;
  for (let num = 1; num <= 9; num += 1) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board, limit);
      board[row][col] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

function generatePuzzle(difficulty) {
  const clueTargets = {
    easy: 36,
    medium: 27,
    hard: 22
  };
  const targetClues = clueTargets[difficulty] || clueTargets.easy;
  let puzzle = null;
  let solvedBoard = null;
  let attempts = 0;

  while (attempts < 30) {
    attempts += 1;
    solvedBoard = generateSolvedBoard();
    puzzle = cloneBoard(solvedBoard);
    const positions = [];
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        positions.push([row, col]);
      }
    }
    for (let i = positions.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    let clues = 81;
    for (const [row, col] of positions) {
      if (clues <= targetClues) break;
      const backup = puzzle[row][col];
      puzzle[row][col] = 0;
      const boardCopy = cloneBoard(puzzle);
      const solutions = countSolutions(boardCopy, 2);
      if (solutions !== 1) {
        puzzle[row][col] = backup;
      } else {
        clues -= 1;
      }
    }

    if (clues <= targetClues) {
      return { board: puzzle, solution: solvedBoard };
    }
  }

  return { board: puzzle || generateSolvedBoard(), solution: solvedBoard || generateSolvedBoard() };
}

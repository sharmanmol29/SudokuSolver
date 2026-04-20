# SudokuViz - Backtracking Algorithm Visualizer

SudokuViz is a fully client-side Sudoku Solver and backtracking visualizer designed for algorithm demos, coursework, and portfolio presentation. It combines an interactive Sudoku board with a step-by-step playback engine, real-time metrics, and educational explanations of recursion and constraint solving.

## Features

- 9x9 interactive Sudoku board rendered dynamically with JavaScript.
- Visual highlighting for selected cell, row, column, and 3x3 box.
- Dark mode by default with light mode toggle (persisted in `localStorage`).
- Glassmorphism UI with premium shadows, animations, and responsive layout.
- Puzzle generation by difficulty:
  - Easy (~36 clues)
  - Medium (~27 clues)
  - Hard (~22 clues)
- Unique-solution puzzle validation using solution counting.
- Full recursive backtracking Sudoku solver.
- Backtracking visualizer with color-coded actions:
  - `try` (blue pulse)
  - `place` (green)
  - `backtrack` (yellow/red flash)
  - `solved` (board-wide success wave)
- Playback controls:
  - Visual Solve
  - Pause
  - Resume
  - Next Step
  - Stop and restore
- Speed slider with levels: Slow, Medium, Fast.
- Live stats panel:
  - Total steps
  - Numbers tried
  - Backtracks
  - Empty cells
  - Solve time
  - Recursion depth
  - Solver status
- Instant solve mode.
- Hint system (fills a random valid empty cell from solved state).
- Solution checker with conflict highlighting.
- Win sequence:
  - Wave animation
  - JavaScript canvas confetti
  - Success modal with final stats
  - Completion toast
- Toast notifications for all major actions.
- Auto-save and session restore (< 24 hours).
- Example puzzle loader cycling:
  - Classic #1
  - Classic #2
  - World's Hardest
- Keyboard support:
  - Digits 1-9 to enter
  - Backspace/Delete to erase
  - Arrow keys to move selection

## Tech Stack

- HTML5 (semantic structure)
- CSS3 (custom properties, grid/flex, animation, responsive design)
- Vanilla JavaScript (ES6+)
- Google Fonts:
  - Syne
  - Space Mono

## How to Run

1. Download or clone this folder.
2. Open `index.html` in any modern browser.
3. Start solving or visualize the algorithm immediately.

No build tools, package manager, or backend are required.

## Project Structure

```text
SudokuSolver/
  index.html     # App layout and semantic structure
  style.css      # Theme, components, animations, responsive design
  script.js      # Board engine, solver, generator, visualization, persistence
  README.md      # Documentation
```

## Algorithm Explanation

The solver uses recursive backtracking:

1. Find the next empty cell.
2. Try numbers 1..9.
3. Place a number only if it satisfies row, column, and box constraints.
4. Recurse to solve the remaining board.
5. If recursion fails, undo the placement (backtrack) and try the next number.

### Pseudocode

```text
function solve(board):
  empty = findEmptyCell(board)
  if empty == null:
    return true

  row, col = empty
  for num from 1 to 9:
    if isValidPlacement(board, row, col, num):
      board[row][col] = num
      if solve(board):
        return true
      board[row][col] = 0

  return false
```

For visualization, the same recursion collects action steps (`try`, `place`, `backtrack`, `solved`) and then replays them with timed intervals.

## Complexity Analysis

- **Time Complexity:** `O(9^m)` where `m` is the number of empty cells.
  - Worst case explores a large branching tree.
  - Average case is significantly reduced by constraint pruning.
  - Best case occurs with highly constrained puzzles.
- **Space Complexity:** `O(m)` due to recursion stack depth.

## Color Legend

- **Given cell:** dimmed locked style
- **User-entered value:** cyan accent
- **Solver-placed value:** green tint
- **Try step:** blue pulse
- **Backtrack step:** yellow/red flash
- **Conflict cells:** red border + underline + shake
- **Solved sequence:** green ripple/wave across board

## Future Enhancements

- MRV/heuristic-based solving mode for faster branch selection.
- Candidate pencil marks and note-taking mode.
- Import/export puzzle strings.
- Solve replay timeline scrubber.
- Accessibility presets for color-blind modes.
- Performance benchmarking panel across puzzle difficulties.

## Author / License

Author: Anmol Sharma
License: MIT

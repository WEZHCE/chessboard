/* ==================== Scoreboard System ==================== */
class Scoreboard {
    constructor() {
        this.data = {
            tic: { wins: 0, losses: 0, draws: 0 },
            gomoku: { wins: 0, losses: 0, draws: 0 },
            go: { wins: 0, losses: 0, draws: 0 },
            chess: { wins: 0, losses: 0, draws: 0 }
        };
        // 重复度追踪：记录每个游戏的落子序列
        this.moveHistory = {
            tic: [],
            gomoku: [],
            go: [],
            chess: []
        };
        this.load();
        this.render();
    }

    load() {
        try {
            const saved = localStorage.getItem('chess_scoreboard_v4') || localStorage.getItem('chess_scoreboard_v3');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = parsed.data || this.data;
                // v3 只记录玩家自己的棋子，无法可靠表示完整棋面，直接丢弃旧重复度历史。
                const history = parsed.moveHistory || {};
                for (const game of Object.keys(this.moveHistory)) {
                    const records = Array.isArray(history[game]) ? history[game] : [];
                    this.moveHistory[game] = records.filter(record => this.isBoardSnapshot(record));
                }
            }
        } catch (e) { /* ignore */ }
    }

    save() {
        try {
            localStorage.setItem('chess_scoreboard_v4', JSON.stringify({
                data: this.data,
                moveHistory: this.moveHistory
            }));
        } catch (e) { /* ignore */ }
    }

    // 记录一局游戏的落子
    recordGameMoves(game, moves) {
        if (!this.moveHistory[game]) this.moveHistory[game] = [];
        if (!this.isBoardSnapshot(moves)) return;
        const snapshot = {
            rows: moves.rows,
            cols: moves.cols,
            cells: moves.cells.slice()
        };
        const history = this.moveHistory[game];
        if (history.length > 0 && this.snapshotKey(history[history.length - 1]) === this.snapshotKey(snapshot)) return;
        history.push(snapshot);
        // 只保留最近50局的记录
        if (this.moveHistory[game].length > 50) {
            this.moveHistory[game] = this.moveHistory[game].slice(-50);
        }
        this.save();
        // 更新所有游戏的棋面重复度显示
        this.renderAllRepetitions();
    }

    // 更新所有游戏的棋面重复度显示
    renderAllRepetitions() {
        const games = ['tic', 'gomoku', 'go', 'chess'];
        for (const game of games) {
            this.renderRepetition(game);
        }
    }

    isBoardSnapshot(record) {
        return !!record && Number.isInteger(record.rows) && Number.isInteger(record.cols) &&
            Array.isArray(record.cells) && record.cells.length === record.rows * record.cols;
    }

    snapshotKey(snapshot) {
        return `${snapshot.rows}x${snapshot.cols}:${snapshot.cells.join(',')}`;
    }

    // 计算棋面重复度：比较完整棋盘，而不是只比较玩家自己的棋子。
    calculateRepetition(game) {
        const games = this.moveHistory[game];
        if (!games || games.length < 2) return 0;

        const lastBoard = games[games.length - 1];
        if (!this.isBoardSnapshot(lastBoard)) return 0;

        // 以历史局中最相似的一局作为当前重复度，避免被很早的无关对局稀释。
        let maxSimilarity = 0;
        for (let i = 0; i < games.length - 1; i++) {
            const similarity = this.boardSimilarity(lastBoard, games[i]);
            if (similarity > maxSimilarity) maxSimilarity = similarity;
        }

        return Math.round(maxSimilarity * 100);
    }

    // 计算两个棋面的相似度。
    // 评分重点：同色/同类棋子是否在同一位置，其次才认可相邻位置和棋子数量相近。
    boardSimilarity(board1, board2) {
        if (!this.isBoardSnapshot(board1) || !this.isBoardSnapshot(board2) ||
            board1.rows !== board2.rows || board1.cols !== board2.cols) return 0;

        const occupied1 = [];
        const occupied2 = [];
        const counts1 = {};
        const counts2 = {};
        for (let i = 0; i < board1.cells.length; i++) {
            const a = board1.cells[i];
            const b = board2.cells[i];
            if (a !== 0 && a !== '.' && a !== null && a !== undefined) {
                occupied1.push({ index: i, value: a });
                counts1[a] = (counts1[a] || 0) + 1;
            }
            if (b !== 0 && b !== '.' && b !== null && b !== undefined) {
                occupied2.push({ index: i, value: b });
                counts2[b] = (counts2[b] || 0) + 1;
            }
        }
        if (occupied1.length === 0 || occupied2.length === 0) return 0;

        const exact = occupied1.reduce((score, piece) =>
            score + (board2.cells[piece.index] === piece.value ? 1 : 0), 0);
        const union = occupied1.length + occupied2.length - exact;
        const exactSimilarity = exact / Math.max(1, union);

        // 同类棋子相邻时给少量分数，避免“整体挪一格”被误判为完全无关。
        const unmatched = occupied2.slice();
        let nearbyScore = 0;
        for (const piece of occupied1) {
            const row = Math.floor(piece.index / board1.cols);
            const col = piece.index % board1.cols;
            let bestIndex = -1;
            let bestScore = 0;
            for (let i = 0; i < unmatched.length; i++) {
                if (unmatched[i].value !== piece.value) continue;
                const otherRow = Math.floor(unmatched[i].index / board1.cols);
                const otherCol = unmatched[i].index % board1.cols;
                const distance = Math.max(Math.abs(row - otherRow), Math.abs(col - otherCol));
                const score = distance === 0 ? 1 : distance === 1 ? 0.45 : distance === 2 ? 0.15 : 0;
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = i;
                }
            }
            if (bestIndex >= 0) {
                nearbyScore += bestScore;
                unmatched.splice(bestIndex, 1);
            }
        }
        const nearbySimilarity = nearbyScore / Math.max(occupied1.length, occupied2.length);

        let sharedKinds = 0;
        let totalKinds = 0;
        for (const kind of new Set([...Object.keys(counts1), ...Object.keys(counts2)])) {
            sharedKinds += Math.min(counts1[kind] || 0, counts2[kind] || 0);
            totalKinds += Math.max(counts1[kind] || 0, counts2[kind] || 0);
        }
        const countSimilarity = totalKinds ? sharedKinds / totalKinds : 0;

        return exactSimilarity * 0.7 + nearbySimilarity * 0.15 + countSimilarity * 0.15;
    }

    recordResult(game, result) {
        if (!this.data[game]) return;
        if (result === 'win') this.data[game].wins++;
        else if (result === 'lose') this.data[game].losses++;
        else if (result === 'draw') this.data[game].draws++;
        this.save();
        this.render();
        this.animateValue(game, result);
    }

    reset() {
        this.data = {
            tic: { wins: 0, losses: 0, draws: 0 },
            gomoku: { wins: 0, losses: 0, draws: 0 },
            go: { wins: 0, losses: 0, draws: 0 },
            chess: { wins: 0, losses: 0, draws: 0 }
        };
        this.moveHistory = {
            tic: [],
            gomoku: [],
            go: [],
            chess: []
        };
        this.save();
        this.render();
    }

    getWinRate(game) {
        const d = this.data[game];
        const total = d.wins + d.losses + d.draws;
        if (total === 0) return 0;
        return (d.wins / total) * 100;
    }

    render() {
        const games = ['tic', 'gomoku', 'go', 'chess'];
        for (const game of games) {
            const elWins = document.getElementById(game + 'Wins');
            const elLosses = document.getElementById(game + 'Losses');
            const elDraws = document.getElementById(game + 'Draws');
            if (elWins) elWins.textContent = this.data[game].wins;
            if (elLosses) elLosses.textContent = this.data[game].losses;
            if (elDraws) elDraws.textContent = this.data[game].draws;
            const rate = this.getWinRate(game);
            const elFill = document.getElementById(game + 'RateFill');
            const elRate = document.getElementById(game + 'Rate');
            if (elFill) elFill.style.width = rate + '%';
            if (elRate) elRate.textContent = rate.toFixed(1) + '%';
            this.renderRepetition(game);
        }
    }

    renderRepetition(game) {
        const el = document.getElementById(game + 'Repetition');
        if (el) {
            const repetition = this.calculateRepetition(game);
            el.textContent = repetition + '%';
        }
    }

    animateValue(game, result) {
        const id = result === 'win' ? 'Wins' : result === 'lose' ? 'Losses' : 'Draws';
        const el = document.getElementById(game + id);
        if (el) {
            el.classList.remove('pop');
            void el.offsetWidth;
            el.classList.add('pop');
        }
    }
}

/* ==================== Cursor Glow Effect ==================== */
class CursorGlow {
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'cursor-glow';
        document.body.appendChild(this.el);
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.visible = false;

        document.addEventListener('mousemove', (e) => {
            this.targetX = e.clientX;
            this.targetY = e.clientY;
            if (!this.visible) {
                this.el.style.opacity = '1';
                this.visible = true;
            }
        });

        document.addEventListener('mouseleave', () => {
            this.el.style.opacity = '0';
            this.visible = false;
        });

        this.animate();
    }

    animate() {
        this.x += (this.targetX - this.x) * 0.12;
        this.y += (this.targetY - this.y) * 0.12;
        this.el.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        requestAnimationFrame(() => this.animate());
    }
}

/* ==================== Segmented Control ==================== */
class SegmentedControl {
    constructor(container, onChange) {
        this.container = container;
        this.onChange = onChange;
        this.buttons = container.querySelectorAll('.seg-btn');
        this.indicator = container.querySelector('.seg-indicator');
        this.init();
        // 延迟到下一帧计算位置，确保 DOM 已布局
        requestAnimationFrame(() => this.updateIndicator());
    }

    init() {
        this.buttons.forEach((btn, i) => {
            btn.addEventListener('click', () => {
                this.buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateIndicator();
                if (this.onChange) this.onChange(btn, i);
            });
        });
    }

    updateIndicator() {
        const active = this.container.querySelector('.seg-btn.active');
        if (active && this.indicator) {
            const containerRect = this.container.getBoundingClientRect();
            const activeRect = active.getBoundingClientRect();
            if (containerRect.width === 0 || activeRect.width === 0) return;
            const width = activeRect.width;
            const left = activeRect.left - containerRect.left - 2;
            this.indicator.style.width = width + 'px';
            this.indicator.style.transform = `translateX(${left}px)`;
        }
    }
}

/* ==================== App Initialization ==================== */
let ticGame = null;
let gomokuGame = null;
let goGame = null;
let chessGame = null;

document.addEventListener('DOMContentLoaded', () => {
    // Cursor glow
    new CursorGlow();

    // Scoreboard
    window.appScoreboard = new Scoreboard();

    // Games
    ticGame = new TicTacToeGame();
    gomokuGame = new GomokuGame();
    goGame = new GoGame();
    chessGame = new ChessGame();

    // Tab switching
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const game = btn.dataset.game;
            ['tic', 'gomoku', 'go', 'chess'].forEach(g => {
                const section = document.getElementById(g + 'Section');
                if (section) {
                    section.classList.toggle('hidden', g !== game);
                }
            });
            // 切换标签后重新计算分段控件指示器
            setTimeout(() => initSegmentedControls(), 50);
        });
    });

    // Reset scoreboard
    document.getElementById('resetScoreBtn').addEventListener('click', () => {
        if (confirm('确定要重置所有战绩吗？')) {
            window.appScoreboard.reset();
        }
    });

    // Modal restart
    document.getElementById('modalRestartBtn').addEventListener('click', () => {
        const modal = document.getElementById('gameOverModal');
        modal.classList.remove('active');

        const activeBtn = document.querySelector('.nav-btn.active');
        if (activeBtn) {
            const game = activeBtn.dataset.game;
            if (game === 'tic') ticGame.restart();
            else if (game === 'gomoku') gomokuGame.restart();
            else if (game === 'go') goGame.restart();
            else if (game === 'chess') chessGame.restart();
        }
    });

    // Segmented controls
    initSegmentedControls();
});

function initSegmentedControls() {
    // Tic difficulty
    const ticDiff = document.querySelector('.tic-diff-control');
    if (ticDiff) {
        new SegmentedControl(ticDiff, (btn) => {
            if (ticGame) ticGame.ai.setDifficulty(parseInt(btn.dataset.diff));
        });
    }
    // Tic first move
    const ticFirst = document.querySelector('.tic-first-control');
    if (ticFirst) {
        new SegmentedControl(ticFirst, (btn) => {
            if (ticGame) {
                ticGame.playerFirst = parseInt(btn.dataset.first);
                ticGame.restart();
            }
        });
    }

    // Gomoku difficulty
    const gomokuDiff = document.querySelector('#gomokuSection .seg-control');
    if (gomokuDiff) {
        new SegmentedControl(gomokuDiff, (btn) => {
            if (gomokuGame) gomokuGame.ai.setDifficulty(parseInt(btn.dataset.diff));
        });
    }
    // Gomoku first move
    const gomokuFirst = document.querySelector('.gomoku-first-control');
    if (gomokuFirst) {
        new SegmentedControl(gomokuFirst, (btn) => {
            if (gomokuGame) {
                gomokuGame.playerFirst = parseInt(btn.dataset.first);
                gomokuGame.restart();
            }
        });
    }

    // Go size
    const goSize = document.querySelector('.go-size-control');
    if (goSize) {
        new SegmentedControl(goSize, (btn) => {
            const size = parseInt(btn.dataset.size);
            if (goGame) {
                goGame.boardSize = size;
                goGame.ai.setBoardSize(size);
                goGame.calculateDimensions();
                goGame.init();
                goGame.draw();
            }
        });
    }
    // Go first move
    const goFirst = document.querySelector('.go-first-control');
    if (goFirst) {
        new SegmentedControl(goFirst, (btn) => {
            if (goGame) {
                goGame.playerFirst = parseInt(btn.dataset.first);
                goGame.restart();
            }
        });
    }

    // Go difficulty
    const goDiff = document.querySelector('.go-diff-control');
    if (goDiff) {
        new SegmentedControl(goDiff, (btn) => {
            if (goGame) goGame.ai.setDifficulty(parseInt(btn.dataset.diff));
        });
    }

    // Chess difficulty
    const chessDiff = document.querySelector('.chess-diff-control');
    if (chessDiff) {
        new SegmentedControl(chessDiff, (btn) => {
            if (chessGame) chessGame.ai.setDifficulty(parseInt(btn.dataset.diff));
        });
    }
    // Chess first move
    const chessFirst = document.querySelector('.chess-first-control');
    if (chessFirst) {
        new SegmentedControl(chessFirst, (btn) => {
            if (chessGame) {
                chessGame.playerFirst = parseInt(btn.dataset.first);
                chessGame.restart();
            }
        });
    }
}

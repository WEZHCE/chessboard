/* ==================== Tic-Tac-Toe AI ==================== */
class TicTacToeAI {
    constructor(difficulty = 2) {
        this.difficulty = difficulty;
        this.lastThinkingTime = 0;
    }

    setDifficulty(level) {
        this.difficulty = level;
    }

    getBestMove(board, player) {
        const opponent = player === 1 ? 2 : 1;

        // 简单模式：随机落子
        if (this.difficulty === 1) {
            const empty = [];
            for (let i = 0; i < 9; i++) if (board[i] === 0) empty.push(i);
            return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : -1;
        }

        // 中等/困难：Minimax
        const result = this.minimax(board, player, player, this.difficulty === 3 ? 9 : 3);
        return result.move;
    }

    minimax(board, currentPlayer, aiPlayer, depth) {
        const opponent = aiPlayer === 1 ? 2 : 1;
        const winner = this.checkWinner(board);

        if (winner === aiPlayer) return { score: 10 + depth };
        if (winner === opponent) return { score: -10 - depth };
        if (!board.includes(0)) return { score: 0 };
        if (depth <= 0) return { score: 0 };

        const isMaximizing = currentPlayer === aiPlayer;
        let bestScore = isMaximizing ? -Infinity : Infinity;
        let bestMove = -1;

        for (let i = 0; i < 9; i++) {
            if (board[i] === 0) {
                board[i] = currentPlayer;
                const result = this.minimax(board, currentPlayer === 1 ? 2 : 1, aiPlayer, depth - 1);
                board[i] = 0;

                if (isMaximizing) {
                    if (result.score > bestScore) {
                        bestScore = result.score;
                        bestMove = i;
                    }
                } else {
                    if (result.score < bestScore) {
                        bestScore = result.score;
                        bestMove = i;
                    }
                }
            }
        }

        return { score: bestScore, move: bestMove };
    }

    checkWinner(board) {
        const lines = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        for (const [a,b,c] of lines) {
            if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return 0;
    }

    getWinLine(board) {
        const lines = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        for (const line of lines) {
            const [a,b,c] = line;
            if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
                return line;
            }
        }
        return null;
    }
}

/* ==================== Tic-Tac-Toe Game ==================== */
class TicTacToeGame {
    constructor() {
        this.canvas = document.getElementById('ticCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.board = [];
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.ai = new TicTacToeAI(2);
        this.hoverCell = -1;
        this.cellSize = 120;
        this.padding = 20;

        this.init();
        this.bindEvents();
        this.draw();
    }

    init() {
        this.board = Array(9).fill(0);
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.hoverCell = -1;
        this._gameRecorded = false;
        this.playerStartTime = 0;
        // 同步分段控件选中状态
        const firstBtn = document.querySelector('.tic-first-btn.active');
        this.playerFirst = firstBtn ? parseInt(firstBtn.dataset.first) : 1;
        this.updateStatus('你的回合');
        this.updateInfo();
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleHover(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoverCell = -1; this.draw(); });

        document.getElementById('ticRestartBtn').addEventListener('click', () => this.restart());
        document.getElementById('ticUndoBtn').addEventListener('click', () => this.undo());
        document.getElementById('ticSurrenderBtn').addEventListener('click', () => this.surrender());
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleClick(e) {
        if (this.gameOver || this.currentPlayer !== 1) return;
        // 记录玩家思考时间
        const thinkingTime = Date.now() - this.playerStartTime;
        this.updatePlayerThinkingTime(thinkingTime);
        const pos = this.getMousePos(e);
        const col = Math.floor((pos.x - this.padding) / this.cellSize);
        const row = Math.floor((pos.y - this.padding) / this.cellSize);
        if (col < 0 || col > 2 || row < 0 || row > 2) return;
        const idx = row * 3 + col;
        if (this.board[idx] !== 0) {
            this.shakeBoard();
            return;
        }
        this.makeMove(idx);
        if (!this.gameOver) {
            this.currentPlayer = 2;
            this.updateStatus('AI 思考中...');
            this.canvas.style.cursor = 'wait';
            setTimeout(() => {
                this.canvas.style.cursor = 'pointer';
                const startTime = Date.now();
                const move = this.ai.getBestMove(this.board, 2);
                this.ai.lastThinkingTime = Date.now() - startTime;
                this.updateThinkingTime();
                if (move >= 0) this.makeMove(move);
                if (!this.gameOver) {
                    this.currentPlayer = 1;
                    this.playerStartTime = Date.now();
                    this.updateStatus('你的回合');
                }
            }, 200);
        }
    }

    handleHover(e) {
        if (this.gameOver || this.currentPlayer !== 1) return;
        const pos = this.getMousePos(e);
        const col = Math.floor((pos.x - this.padding) / this.cellSize);
        const row = Math.floor((pos.y - this.padding) / this.cellSize);
        if (col >= 0 && col <= 2 && row >= 0 && row <= 2) {
            const idx = row * 3 + col;
            if (idx !== this.hoverCell) {
                this.hoverCell = idx;
                this.draw();
            }
        } else {
            if (this.hoverCell !== -1) {
                this.hoverCell = -1;
                this.draw();
            }
        }
    }

    makeMove(idx) {
        this.board[idx] = this.currentPlayer;
        this.moveHistory.push({ idx, player: this.currentPlayer });
        this.updateInfo();
        this.draw();

        const winner = this.ai.checkWinner(this.board);
        if (winner !== 0) {
            this.gameOver = true;
            const result = winner === 1 ? 'player' : 'ai';
            this.handleGameOver(result);
            this.drawWinLine();
        } else if (!this.board.includes(0)) {
            this.gameOver = true;
            this.handleGameOver('draw');
        }
    }

    handleGameOver(result) {
        let title, subtitle;
        if (result === 'player') {
            title = '胜利';
            subtitle = '你击败了 AI';
            window.appScoreboard.recordResult('tic', 'win');
        } else if (result === 'ai') {
            title = '失败';
            subtitle = 'AI 赢得了比赛';
            window.appScoreboard.recordResult('tic', 'lose');
        } else {
            title = '平局';
            subtitle = '棋盘已满，不分胜负';
            window.appScoreboard.recordResult('tic', 'draw');
        }
        this.recordMoves();
        this.updateStatus('对局结束');
        this.showModal(title, subtitle);
    }

    // 记录完整最终棋面，供跨局重复度比较使用
    recordMoves() {
        if (this._gameRecorded) return;
        const snapshot = { rows: 3, cols: 3, cells: this.board.slice() };
        const history = window.appScoreboard.moveHistory['tic'];
        if (history && history.length > 0) {
            const last = history[history.length - 1];
            if (window.appScoreboard.snapshotKey(last) === window.appScoreboard.snapshotKey(snapshot)) return;
        }
        this._gameRecorded = true;
        window.appScoreboard.recordGameMoves('tic', snapshot);
    }

    showModal(title, subtitle) {
        const modal = document.getElementById('gameOverModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalSubtitle').textContent = subtitle;
        setTimeout(() => modal.classList.add('active'), 300);
    }

    shakeBoard() {
        const frame = this.canvas.parentElement;
        frame.classList.remove('shake');
        void frame.offsetWidth;
        frame.classList.add('shake');
    }

    draw() {
        // Background - 白底
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        this.ctx.strokeStyle = '#5a3e1b';
        this.ctx.lineWidth = 3;
        for (let i = 1; i < 3; i++) {
            const pos = this.padding + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, pos);
            this.ctx.lineTo(this.padding + 3 * this.cellSize, pos);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(pos, this.padding);
            this.ctx.lineTo(pos, this.padding + 3 * this.cellSize);
            this.ctx.stroke();
        }

        // Border
        this.ctx.strokeRect(this.padding, this.padding, this.cellSize * 3, this.cellSize * 3);

        // Hover
        if (this.hoverCell >= 0 && this.board[this.hoverCell] === 0) {
            const col = this.hoverCell % 3;
            const row = Math.floor(this.hoverCell / 3);
            const x = this.padding + col * this.cellSize;
            const y = this.padding + row * this.cellSize;
            this.ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }

        // Pieces
        for (let i = 0; i < 9; i++) {
            if (this.board[i] !== 0) {
                this.drawPiece(i);
            }
        }
    }

    drawPiece(idx) {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cx = this.padding + col * this.cellSize + this.cellSize / 2;
        const cy = this.padding + row * this.cellSize + this.cellSize / 2;
        const size = this.cellSize * 0.35;

        if (this.board[idx] === 1) {
            // X - dark brown
            this.ctx.strokeStyle = '#3a2510';
            this.ctx.lineWidth = 5;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(cx - size, cy - size);
            this.ctx.lineTo(cx + size, cy + size);
            this.ctx.moveTo(cx + size, cy - size);
            this.ctx.lineTo(cx - size, cy + size);
            this.ctx.stroke();
        } else {
            // O - red
            this.ctx.strokeStyle = '#ff3300';
            this.ctx.lineWidth = 5;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, size, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    drawWinLine() {
        const line = this.ai.getWinLine(this.board);
        if (!line) return;

        const idx1 = line[0];
        const idx2 = line[2];
        const col1 = idx1 % 3, row1 = Math.floor(idx1 / 3);
        const col2 = idx2 % 3, row2 = Math.floor(idx2 / 3);
        const x1 = this.padding + col1 * this.cellSize + this.cellSize / 2;
        const y1 = this.padding + row1 * this.cellSize + this.cellSize / 2;
        const x2 = this.padding + col2 * this.cellSize + this.cellSize / 2;
        const y2 = this.padding + row2 * this.cellSize + this.cellSize / 2;

        this.ctx.strokeStyle = '#ff3300';
        this.ctx.lineWidth = 5;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    updateStatus(text) {
        document.getElementById('ticStatusText').textContent = text;
    }

    updateInfo() {
        const moves = this.moveHistory.length;
        document.getElementById('ticMoveCount').textContent = moves;
        document.getElementById('ticRemaining').textContent = 9 - moves;
    }

    updateThinkingTime() {
        const el = document.getElementById('ticThinkingTime');
        if (el) el.textContent = `${this.ai.lastThinkingTime}ms`;
    }

    updatePlayerThinkingTime(time) {
        const el = document.getElementById('ticPlayerThinkingTime');
        if (el) el.textContent = `${time}ms`;
    }

    restart() {
        document.getElementById('gameOverModal').classList.remove('active');
        this.recordMoves(); // 记录当前局再重开
        this.init();
        this.draw();
        // 如果选择后手，AI先落子
        if (this.playerFirst === 0) {
            this.currentPlayer = 2;
            this.updateStatus('AI 思考中...');
            this.canvas.style.cursor = 'wait';
            setTimeout(() => {
                this.canvas.style.cursor = 'pointer';
                const startTime = Date.now();
                const move = this.ai.getBestMove(this.board, 2);
                this.ai.lastThinkingTime = Date.now() - startTime;
                this.updateThinkingTime();
                if (move >= 0) this.makeMove(move);
                if (!this.gameOver) {
                    this.currentPlayer = 1;
                    this.playerStartTime = Date.now();
                    this.updateStatus('你的回合');
                }
            }, 200);
        }
        // 先手时也开始计时
        if (this.playerFirst === 1) {
            this.playerStartTime = Date.now();
        }
    }

    undo() {
        if (this.gameOver || this.moveHistory.length === 0) return;
        const steps = this.moveHistory.length >= 2 && this.moveHistory[this.moveHistory.length - 1].player === 2 ? 2 : 1;
        for (let i = 0; i < steps && this.moveHistory.length > 0; i++) {
            const last = this.moveHistory.pop();
            this.board[last.idx] = 0;
        }
        this.currentPlayer = this.playerFirst === 1 ? 1 : 2;
        this.updateStatus(this.currentPlayer === 1 ? '你的回合' : 'AI 思考中...');
        this.updateInfo();
        this.draw();
    }

    surrender() {
        if (this.gameOver) return;
        this.gameOver = true;
        window.appScoreboard.recordResult('tic', 'lose');
        this.updateStatus('对局结束');
        this.showModal('失败', '你选择了认输');
    }
}

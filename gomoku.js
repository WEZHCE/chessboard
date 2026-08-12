/* ==================== Gomoku AI Engine ==================== */
class GomokuAI {
    constructor(difficulty = 2) {
        this.difficulty = difficulty;
        this.boardSize = 15;
        this.maxDepth = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4;
    }

    setDifficulty(level) {
        this.difficulty = level;
        this.maxDepth = level === 1 ? 2 : level === 2 ? 3 : 4;
    }

    evaluatePosition(board, row, col, player) {
        let score = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            const line = this.getLine(board, row, col, dr, dc, player);
            score += this.evaluateLine(line);
        }
        return score;
    }

    getLine(board, row, col, dr, dc, player) {
        let count = 1, openEnds = 0;
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && board[r][c] === player) {
            count++; r += dr; c += dc;
        }
        if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && board[r][c] === 0) openEnds++;
        r = row - dr; c = col - dc;
        while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && board[r][c] === player) {
            count++; r -= dr; c -= dc;
        }
        if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && board[r][c] === 0) openEnds++;
        return { count, openEnds };
    }

    evaluateLine(line) {
        const { count, openEnds } = line;
        if (count >= 5) return 100000;
        if (openEnds === 0) return 0;
        switch (count) {
            case 4: return openEnds === 2 ? 50000 : 5000;
            case 3: return openEnds === 2 ? 2000 : 200;
            case 2: return openEnds === 2 ? 100 : 10;
            case 1: return openEnds === 2 ? 5 : 1;
            default: return 0;
        }
    }

    getCandidateMoves(board) {
        const candidates = new Set();
        const range = this.difficulty >= 3 ? 2 : 1;
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (board[r][c] !== 0) {
                    for (let dr = -range; dr <= range; dr++) {
                        for (let dc = -range; dc <= range; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize && board[nr][nc] === 0) {
                                candidates.add(nr * this.boardSize + nc);
                            }
                        }
                    }
                }
            }
        }
        if (candidates.size === 0) {
            const center = Math.floor(this.boardSize / 2);
            candidates.add(center * this.boardSize + center);
        }
        return Array.from(candidates).map(v => ({
            row: Math.floor(v / this.boardSize),
            col: v % this.boardSize
        }));
    }

    orderMoves(board, moves, player) {
        return moves.map(move => ({
            ...move,
            score: this.evaluatePosition(board, move.row, move.col, player) +
                   this.evaluatePosition(board, move.row, move.col, player === 1 ? 2 : 1) * 0.9
        })).sort((a, b) => b.score - a.score);
    }

    minimax(board, depth, alpha, beta, isMaximizing, player) {
        const opponent = player === 1 ? 2 : 1;
        if (depth === 0) return this.evaluateBoard(board, player);
        let moves = this.getCandidateMoves(board);
        moves = this.orderMoves(board, moves, isMaximizing ? player : opponent);
        const maxMoves = this.difficulty === 1 ? 8 : this.difficulty === 2 ? 12 : 16;
        moves = moves.slice(0, maxMoves);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                board[move.row][move.col] = player;
                if (this.checkWin(board, move.row, move.col, player)) {
                    board[move.row][move.col] = 0;
                    return 1000000 + depth;
                }
                const val = this.minimax(board, depth - 1, alpha, beta, false, player);
                board[move.row][move.col] = 0;
                maxEval = Math.max(maxEval, val);
                alpha = Math.max(alpha, val);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                board[move.row][move.col] = opponent;
                if (this.checkWin(board, move.row, move.col, opponent)) {
                    board[move.row][move.col] = 0;
                    return -1000000 - depth;
                }
                const val = this.minimax(board, depth - 1, alpha, beta, true, player);
                board[move.row][move.col] = 0;
                minEval = Math.min(minEval, val);
                beta = Math.min(beta, val);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    evaluateBoard(board, player) {
        let score = 0;
        const opponent = player === 1 ? 2 : 1;
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (board[r][c] === player) score += this.evaluatePosition(board, r, c, player);
                else if (board[r][c] === opponent) score -= this.evaluatePosition(board, r, c, opponent);
            }
        }
        return score;
    }

    checkWin(board, row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            let count = 1;
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && board[r][c] === player) {
                count++; r += dr; c += dc;
            }
            r = row - dr; c = col - dc;
            while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && board[r][c] === player) {
                count++; r -= dr; c -= dc;
            }
            if (count >= 5) return true;
        }
        return false;
    }

    getBestMove(board) {
        const player = 2, opponent = 1;
        let moves = this.getCandidateMoves(board);

        for (const move of moves) {
            board[move.row][move.col] = player;
            if (this.checkWin(board, move.row, move.col, player)) {
                board[move.row][move.col] = 0;
                return move;
            }
            board[move.row][move.col] = 0;
        }

        for (const move of moves) {
            board[move.row][move.col] = opponent;
            if (this.checkWin(board, move.row, move.col, opponent)) {
                board[move.row][move.col] = 0;
                return move;
            }
            board[move.row][move.col] = 0;
        }

        moves = this.orderMoves(board, moves, player);
        const maxMoves = this.difficulty === 1 ? 8 : this.difficulty === 2 ? 12 : 16;
        moves = moves.slice(0, maxMoves);

        let bestMove = moves[0], bestScore = -Infinity;
        for (const move of moves) {
            board[move.row][move.col] = player;
            const score = this.minimax(board, this.maxDepth - 1, -Infinity, Infinity, false, player);
            board[move.row][move.col] = 0;
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    }
}

/* ==================== Gomoku Game Controller ==================== */
class GomokuGame {
    constructor() {
        this.canvas = document.getElementById('gomokuCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 15;
        this.cellSize = 36;
        this.padding = 22;
        this.board = [];
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.ai = new GomokuAI(2);

        this.init();
        this.bindEvents();
        this.draw();
    }

    init() {
        this.board = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.updateStatus('你的回合');
        this.updateMoveList();
        this.updateCounts();
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleHover(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoverPos = null; this.draw(); });

        document.getElementById('gomokuRestartBtn').addEventListener('click', () => this.restart());
        document.getElementById('gomokuUndoBtn').addEventListener('click', () => this.undo());
        document.getElementById('gomokuSurrenderBtn').addEventListener('click', () => this.surrender());
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
        const pos = this.getMousePos(e);
        const col = Math.round((pos.x - this.padding) / this.cellSize);
        const row = Math.round((pos.y - this.padding) / this.cellSize);
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) return;
        if (this.board[row][col] !== 0) {
            this.shakeBoard();
            return;
        }
        this.makeMove(row, col);
        if (!this.gameOver) {
            this.currentPlayer = 2;
            this.updateStatus('AI 思考中...');
            this.canvas.style.cursor = 'wait';
            setTimeout(() => {
                const move = this.ai.getBestMove(this.board);
                this.canvas.style.cursor = 'pointer';
                if (move) {
                    this.makeMove(move.row, move.col);
                    if (!this.gameOver) {
                        this.currentPlayer = 1;
                        this.updateStatus('你的回合');
                    }
                }
            }, 120);
        }
    }

    handleHover(e) {
        if (this.gameOver || this.currentPlayer !== 1) return;
        const pos = this.getMousePos(e);
        const col = Math.round((pos.x - this.padding) / this.cellSize);
        const row = Math.round((pos.y - this.padding) / this.cellSize);
        if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize) {
            if (!this.hoverPos || this.hoverPos.row !== row || this.hoverPos.col !== col) {
                this.hoverPos = { row, col };
                this.draw();
            }
        } else {
            if (this.hoverPos) {
                this.hoverPos = null;
                this.draw();
            }
        }
    }

    makeMove(row, col) {
        this.board[row][col] = this.currentPlayer;
        this.moveHistory.push({ row, col, player: this.currentPlayer });
        this.updateMoveList();
        this.updateCounts();
        this.draw();
        this.drawLastMove();

        if (this.ai.checkWin(this.board, row, col, this.currentPlayer)) {
            this.gameOver = true;
            const winner = this.currentPlayer === 1 ? 'player' : 'ai';
            this.handleGameOver(winner);
            this.drawWinLine(row, col, this.currentPlayer);
        } else if (this.moveHistory.length === this.boardSize * this.boardSize) {
            this.gameOver = true;
            this.handleGameOver('draw');
        }
    }

    handleGameOver(result) {
        let title, subtitle;
        if (result === 'player') {
            title = '胜利';
            subtitle = '你击败了 AI 对手';
            window.appScoreboard.recordResult('gomoku', 'win');
        } else if (result === 'ai') {
            title = '失败';
            subtitle = 'AI 赢得了这局比赛';
            window.appScoreboard.recordResult('gomoku', 'lose');
        } else {
            title = '平局';
            subtitle = '双方不分胜负';
            window.appScoreboard.recordResult('gomoku', 'draw');
        }
        this.updateStatus('对局结束');
        this.showModal(title, subtitle);
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
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#d4a855');
        gradient.addColorStop(1, '#c4963c');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Subtle grain
        this.ctx.strokeStyle = 'rgba(139, 90, 43, 0.06)';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < 20; i++) {
            const y = (i / 20) * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y + (Math.random() - 0.5) * 4);
            this.ctx.stroke();
        }

        // Grid
        this.ctx.strokeStyle = '#5a3e1b';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.boardSize; i++) {
            const pos = this.padding + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, pos);
            this.ctx.lineTo(this.padding + (this.boardSize - 1) * this.cellSize, pos);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(pos, this.padding);
            this.ctx.lineTo(pos, this.padding + (this.boardSize - 1) * this.cellSize);
            this.ctx.stroke();
        }

        // Stars
        const stars = [3, 7, 11];
        this.ctx.fillStyle = '#5a3e1b';
        for (const r of stars) {
            for (const c of stars) {
                this.ctx.beginPath();
                this.ctx.arc(this.padding + c * this.cellSize, this.padding + r * this.cellSize, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Hover preview
        if (this.hoverPos && this.board[this.hoverPos.row][this.hoverPos.col] === 0) {
            const hx = this.padding + this.hoverPos.col * this.cellSize;
            const hy = this.padding + this.hoverPos.row * this.cellSize;
            const hr = this.cellSize * 0.43;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            this.ctx.beginPath();
            this.ctx.arc(hx, hy, hr, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Stones
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] !== 0) {
                    this.drawStone(r, c, this.board[r][c]);
                }
            }
        }
    }

    drawStone(row, col, player) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        const radius = this.cellSize * 0.43;

        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        const gradient = this.ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, radius * 0.1,
            x, y, radius
        );

        if (player === 1) {
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(0.4, '#222');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.4, '#eee');
            gradient.addColorStop(1, '#bbb');
        }

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        const hl = this.ctx.createRadialGradient(
            x - radius * 0.25, y - radius * 0.25, 0,
            x - radius * 0.25, y - radius * 0.25, radius * 0.5
        );
        hl.addColorStop(0, player === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        this.ctx.fillStyle = hl;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLastMove() {
        if (this.moveHistory.length === 0) return;
        const last = this.moveHistory[this.moveHistory.length - 1];
        const x = this.padding + last.col * this.cellSize;
        const y = this.padding + last.row * this.cellSize;

        this.ctx.strokeStyle = '#ff3300';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize * 0.43 + 3, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fillStyle = '#ff3300';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawWinLine(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            let stones = [{ row, col }];
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && this.board[r][c] === player) {
                stones.push({ row: r, col: c }); r += dr; c += dc;
            }
            r = row - dr; c = col - dc;
            while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && this.board[r][c] === player) {
                stones.unshift({ row: r, col: c }); r -= dr; c -= dc;
            }
            if (stones.length >= 5) {
                const first = stones[0];
                const last = stones[stones.length - 1];
                const x1 = this.padding + first.col * this.cellSize;
                const y1 = this.padding + first.row * this.cellSize;
                const x2 = this.padding + last.col * this.cellSize;
                const y2 = this.padding + last.row * this.cellSize;
                this.ctx.strokeStyle = 'rgba(255, 51, 0, 0.7)';
                this.ctx.lineWidth = 4;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
                break;
            }
        }
    }

    updateStatus(text) {
        document.getElementById('gomokuStatusText').textContent = text;
    }

    updateMoveList() {
        const list = document.getElementById('gomokuMoveList');
        if (this.moveHistory.length === 0) {
            list.innerHTML = '<div class="move-empty">NO MOVES</div>';
            return;
        }
        const letters = 'ABCDEFGHIJKLMNO';
        const moves = this.moveHistory.slice(-8).map((move, idx) => {
            const num = this.moveHistory.length - Math.min(8, this.moveHistory.length) + idx + 1;
            const stone = move.player === 1 ? '●' : '○';
            const pos = `${letters[move.col]}${move.row + 1}`;
            return `<div>${num}. ${stone} ${pos}</div>`;
        });
        list.innerHTML = moves.join('');
        list.scrollTop = list.scrollHeight;
    }

    updateCounts() {
        let black = 0, white = 0;
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] === 1) black++;
                else if (this.board[r][c] === 2) white++;
            }
        }
        document.getElementById('gomokuBlackCount').textContent = black;
        document.getElementById('gomokuWhiteCount').textContent = white;
    }

    restart() {
        document.getElementById('gameOverModal').classList.remove('active');
        this.hoverPos = null;
        this.init();
        this.draw();
    }

    undo() {
        if (this.gameOver || this.moveHistory.length === 0) return;
        const steps = this.moveHistory.length >= 2 && this.moveHistory[this.moveHistory.length - 1].player === 2 ? 2 : 1;
        for (let i = 0; i < steps && this.moveHistory.length > 0; i++) {
            const last = this.moveHistory.pop();
            this.board[last.row][last.col] = 0;
        }
        this.currentPlayer = 1;
        this.updateStatus('你的回合');
        this.updateMoveList();
        this.updateCounts();
        this.draw();
        if (this.moveHistory.length > 0) this.drawLastMove();
    }

    surrender() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.handleGameOver('ai');
    }
}

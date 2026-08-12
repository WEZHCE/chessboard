/* ==================== Go (围棋) AI Engine ==================== */
class GoAI {
    constructor(difficulty = 2) {
        this.difficulty = difficulty;
        this.maxDepth = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
        this.boardSize = 9;
    }

    setDifficulty(level) {
        this.difficulty = level;
        this.maxDepth = level === 1 ? 1 : level === 2 ? 2 : 3;
    }

    setBoardSize(size) {
        this.boardSize = size;
    }

    getNeighbors(row, col) {
        const n = [];
        if (row > 0) n.push({ row: row - 1, col });
        if (row < this.boardSize - 1) n.push({ row: row + 1, col });
        if (col > 0) n.push({ row, col: col - 1 });
        if (col < this.boardSize - 1) n.push({ row, col: col + 1 });
        return n;
    }

    getGroup(board, row, col) {
        const player = board[row][col];
        if (player === 0) return { stones: [], liberties: new Set() };
        const visited = new Set();
        const stones = [];
        const liberties = new Set();
        const stack = [{ row, col }];

        while (stack.length > 0) {
            const pos = stack.pop();
            const key = pos.row * this.boardSize + pos.col;
            if (visited.has(key)) continue;
            visited.add(key);
            if (board[pos.row][pos.col] === player) {
                stones.push(pos);
                for (const n of this.getNeighbors(pos.row, pos.col)) {
                    const nk = n.row * this.boardSize + n.col;
                    if (!visited.has(nk)) {
                        if (board[n.row][n.col] === 0) liberties.add(nk);
                        else if (board[n.row][n.col] === player) stack.push(n);
                    }
                }
            }
        }
        return { stones, liberties };
    }

    countCaptures(board, row, col, player) {
        const opponent = player === 1 ? 2 : 1;
        let captured = 0;
        for (const n of this.getNeighbors(row, col)) {
            if (board[n.row][n.col] === opponent) {
                const group = this.getGroup(board, n.row, n.col);
                if (group.liberties.size === 0) captured += group.stones.length;
            }
        }
        return captured;
    }

    isValidMove(board, row, col, player, previousBoard) {
        if (board[row][col] !== 0) return false;
        const testBoard = board.map(r => [...r]);
        testBoard[row][col] = player;
        const captures = this.countCaptures(testBoard, row, col, player);
        if (captures === 0) {
            const group = this.getGroup(testBoard, row, col);
            if (group.liberties.size === 0) return false;
        }
        if (previousBoard) {
            let same = true;
            for (let r = 0; r < this.boardSize && same; r++) {
                for (let c = 0; c < this.boardSize && same; c++) {
                    if (testBoard[r][c] !== previousBoard[r][c]) same = false;
                }
            }
            if (same) return false;
        }
        return true;
    }

    playStone(board, row, col, player) {
        board[row][col] = player;
        const opponent = player === 1 ? 2 : 1;
        const captured = [];
        for (const n of this.getNeighbors(row, col)) {
            if (board[n.row][n.col] === opponent) {
                const group = this.getGroup(board, n.row, n.col);
                if (group.liberties.size === 0) {
                    for (const stone of group.stones) {
                        board[stone.row][stone.col] = 0;
                        captured.push(stone);
                    }
                }
            }
        }
        return captured;
    }

    evaluateBoard(board, player) {
        const opponent = player === 1 ? 2 : 1;
        let score = 0;
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (board[r][c] === player) score += 10;
                else if (board[r][c] === opponent) score -= 10;
            }
        }
        const visited = new Set();
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (board[r][c] !== 0 && !visited.has(r * this.boardSize + c)) {
                    const group = this.getGroup(board, r, c);
                    for (const s of group.stones) visited.add(s.row * this.boardSize + s.col);
                    const lv = group.liberties.size;
                    if (board[r][c] === player) {
                        score += lv * 3;
                        if (lv === 1) score -= 15;
                    } else {
                        score -= lv * 3;
                        if (lv === 1) score += 15;
                    }
                }
            }
        }
        const corners = [[0, 0], [0, this.boardSize - 1], [this.boardSize - 1, 0], [this.boardSize - 1, this.boardSize - 1]];
        for (const [cr, cc] of corners) {
            if (board[cr][cc] === player) score += 20;
            else if (board[cr][cc] === opponent) score -= 20;
        }
        return score;
    }

    getValidMoves(board, player, previousBoard) {
        const moves = [];
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.isValidMove(board, r, c, player, previousBoard)) {
                    moves.push({ row: r, col: c });
                }
            }
        }
        return moves;
    }

    evaluateMove(board, row, col, player) {
        const testBoard = board.map(r => [...r]);
        const captures = this.playStone(testBoard, row, col, player);
        let score = captures.length * 50;
        const group = this.getGroup(testBoard, row, col);
        score += group.liberties.size * 10;
        const center = (this.boardSize - 1) / 2;
        const dist = Math.abs(row - center) + Math.abs(col - center);
        score -= dist * 2;
        const opponent = player === 1 ? 2 : 1;
        for (const n of this.getNeighbors(row, col)) {
            if (board[n.row][n.col] === opponent) {
                const og = this.getGroup(board, n.row, n.col);
                if (og.liberties.size === 1) score += 30;
                else if (og.liberties.size === 2) score += 10;
            }
        }
        return score;
    }

    getBestMove(board, player, previousBoard) {
        const opponent = player === 1 ? 2 : 1;
        let validMoves = this.getValidMoves(board, player, previousBoard);
        if (validMoves.length === 0) return null;

        const scoredMoves = validMoves.map(move => ({
            ...move,
            score: this.evaluateMove(board, move.row, move.col, player)
        })).sort((a, b) => b.score - a.score);

        const maxMoves = this.difficulty === 1 ? 5 : this.difficulty === 2 ? 8 : 12;
        const topMoves = scoredMoves.slice(0, maxMoves);

        if (this.difficulty === 1) return topMoves[0];

        let bestMove = topMoves[0], bestScore = -Infinity;
        for (const move of topMoves) {
            const testBoard = board.map(r => [...r]);
            this.playStone(testBoard, move.row, move.col, player);
            let score;
            if (this.maxDepth <= 1) {
                score = this.evaluateBoard(testBoard, player);
            } else {
                score = this.minimax(testBoard, this.maxDepth - 1, -Infinity, Infinity, false, player, board);
            }
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    }

    minimax(board, depth, alpha, beta, isMaximizing, player, previousBoard) {
        const opponent = player === 1 ? 2 : 1;
        const currentPlayer = isMaximizing ? player : opponent;
        if (depth === 0) return this.evaluateBoard(board, player);
        const moves = this.getValidMoves(board, currentPlayer, previousBoard);
        const limitedMoves = moves.slice(0, 6);
        if (limitedMoves.length === 0) return this.evaluateBoard(board, player);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of limitedMoves) {
                const testBoard = board.map(r => [...r]);
                this.playStone(testBoard, move.row, move.col, currentPlayer);
                const val = this.minimax(testBoard, depth - 1, alpha, beta, false, player, board);
                maxEval = Math.max(maxEval, val);
                alpha = Math.max(alpha, val);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of limitedMoves) {
                const testBoard = board.map(r => [...r]);
                this.playStone(testBoard, move.row, move.col, currentPlayer);
                const val = this.minimax(testBoard, depth - 1, alpha, beta, true, player, board);
                minEval = Math.min(minEval, val);
                beta = Math.min(beta, val);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    calculateTerritory(board) {
        const territory = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
        const visited = new Set();
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (board[r][c] === 0 && !visited.has(r * this.boardSize + c)) {
                    const region = [];
                    const borders = new Set();
                    const stack = [{ row: r, col: c }];
                    while (stack.length > 0) {
                        const pos = stack.pop();
                        const key = pos.row * this.boardSize + pos.col;
                        if (visited.has(key)) continue;
                        if (board[pos.row][pos.col] === 0) {
                            visited.add(key);
                            region.push(pos);
                            for (const n of this.getNeighbors(pos.row, pos.col)) stack.push(n);
                        } else {
                            borders.add(board[pos.row][pos.col]);
                        }
                    }
                    let owner = 0;
                    if (borders.size === 1) owner = borders.values().next().value;
                    for (const pos of region) territory[pos.row][pos.col] = owner;
                }
            }
        }
        return territory;
    }

    calculateScore(board, captures) {
        const territory = this.calculateTerritory(board);
        let blackTerritory = 0, whiteTerritory = 0;
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (territory[r][c] === 1) blackTerritory++;
                else if (territory[r][c] === 2) whiteTerritory++;
            }
        }
        const komi = 3.75;
        return {
            blackTerritory, whiteTerritory,
            blackScore: blackTerritory,
            whiteScore: whiteTerritory + komi
        };
    }
}

/* ==================== Go Game Controller ==================== */
class GoGame {
    constructor() {
        this.canvas = document.getElementById('goCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 9;
        this.cellSize = 0;
        this.padding = 30;
        this.board = [];
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.captures = { black: 0, white: 0 };
        this.previousBoard = null;
        this.consecutivePasses = 0;
        this.ai = new GoAI(2);
        this.hoverPos = null;

        this.calculateDimensions();
        this.init();
        this.bindEvents();
        this.draw();
    }

    calculateDimensions() {
        const canvasSize = 560;
        this.padding = this.boardSize <= 9 ? 30 : 25;
        this.cellSize = (canvasSize - this.padding * 2) / (this.boardSize - 1);
    }

    init() {
        this.board = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.captures = { black: 0, white: 0 };
        this.previousBoard = null;
        this.consecutivePasses = 0;
        this.hoverPos = null;
        this.updateStatus('黑棋落子');
        this.updateInfo();
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleHover(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoverPos = null; this.draw(); });

        document.getElementById('goRestartBtn').addEventListener('click', () => this.restart());
        document.getElementById('goSurrenderBtn').addEventListener('click', () => this.surrender());
        document.getElementById('goPassBtn').addEventListener('click', () => this.pass());
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
        this.tryMove(row, col);
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

    tryMove(row, col) {
        if (!this.ai.isValidMove(this.board, row, col, this.currentPlayer, this.previousBoard)) {
            this.showInvalidMove(row, col);
            return;
        }
        this.makeMove(row, col);
        if (!this.gameOver) {
            this.currentPlayer = 2;
            this.updateStatus('AI 思考中...');
            this.canvas.style.cursor = 'wait';
            setTimeout(() => {
                const move = this.ai.getBestMove(this.board, 2, this.previousBoard);
                this.canvas.style.cursor = 'pointer';
                if (move) {
                    this.makeMove(move.row, move.col);
                } else {
                    this.consecutivePasses++;
                    this.moveHistory.push({ pass: true, player: 2 });
                    if (this.consecutivePasses >= 2) { this.endGame(); return; }
                }
                if (!this.gameOver) {
                    this.currentPlayer = 1;
                    this.updateStatus('黑棋落子');
                }
            }, 150);
        }
    }

    makeMove(row, col) {
        this.previousBoard = this.board.map(r => [...r]);
        const captured = this.ai.playStone(this.board, row, col, this.currentPlayer);
        if (this.currentPlayer === 1) this.captures.black += captured.length;
        else this.captures.white += captured.length;
        this.consecutivePasses = 0;
        this.moveHistory.push({ row, col, player: this.currentPlayer, captured: captured.length });
        this.updateInfo();
        this.draw();
        this.drawLastMove();
    }

    pass() {
        if (this.gameOver || this.currentPlayer !== 1) return;
        this.consecutivePasses++;
        this.moveHistory.push({ pass: true, player: 1 });
        this.previousBoard = this.board.map(r => [...r]);
        if (this.consecutivePasses >= 2) { this.endGame(); return; }

        this.currentPlayer = 2;
        this.updateStatus('AI 思考中...');
        this.canvas.style.cursor = 'wait';
        setTimeout(() => {
            const move = this.ai.getBestMove(this.board, 2, this.previousBoard);
            this.canvas.style.cursor = 'pointer';
            if (move) {
                this.makeMove(move.row, move.col);
            } else {
                this.consecutivePasses++;
                this.moveHistory.push({ pass: true, player: 2 });
            }
            if (this.consecutivePasses >= 2) { this.endGame(); return; }
            if (!this.gameOver) {
                this.currentPlayer = 1;
                this.updateStatus('黑棋落子');
            }
        }, 150);
    }

    endGame() {
        this.gameOver = true;
        const score = this.ai.calculateScore(this.board, this.captures);
        let result, subtitle;
        if (score.blackScore > score.whiteScore) {
            result = 'player';
            subtitle = `黑 ${score.blackScore.toFixed(1)} - ${score.whiteScore.toFixed(1)} 白（含贴目）`;
        } else if (score.whiteScore > score.blackScore) {
            result = 'ai';
            subtitle = `黑 ${score.blackScore.toFixed(1)} - ${score.whiteScore.toFixed(1)} 白（含贴目）`;
        } else {
            result = 'draw';
            subtitle = '双方得分相同';
        }
        this.updateStatus('对局结束');
        if (result === 'player') window.appScoreboard.recordResult('go', 'win');
        else if (result === 'ai') window.appScoreboard.recordResult('go', 'lose');
        else window.appScoreboard.recordResult('go', 'draw');
        this.drawTerritory();
        let title = result === 'player' ? '胜利' : result === 'ai' ? '失败' : '平局';
        this.showModal(title, subtitle);
    }

    showInvalidMove(row, col) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        this.draw();
        this.ctx.strokeStyle = '#ff3300';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 7, y - 7);
        this.ctx.lineTo(x + 7, y + 7);
        this.ctx.moveTo(x + 7, y - 7);
        this.ctx.lineTo(x - 7, y + 7);
        this.ctx.stroke();
        const frame = this.canvas.parentElement;
        frame.classList.remove('shake');
        void frame.offsetWidth;
        frame.classList.add('shake');
    }

    showModal(title, subtitle) {
        const modal = document.getElementById('gameOverModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalSubtitle').textContent = subtitle;
        setTimeout(() => modal.classList.add('active'), 300);
    }

    draw() {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#d4a855');
        gradient.addColorStop(1, '#c4963c');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = 'rgba(139, 90, 43, 0.06)';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < 18; i++) {
            const y = (i / 18) * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y + (Math.random() - 0.5) * 4);
            this.ctx.stroke();
        }

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

        this.ctx.fillStyle = '#5a3e1b';
        const starPoints = this.getStarPoints();
        for (const [r, c] of starPoints) {
            this.ctx.beginPath();
            this.ctx.arc(this.padding + c * this.cellSize, this.padding + r * this.cellSize, 3.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Hover
        if (this.hoverPos && this.board[this.hoverPos.row][this.hoverPos.col] === 0) {
            const hx = this.padding + this.hoverPos.col * this.cellSize;
            const hy = this.padding + this.hoverPos.row * this.cellSize;
            const hr = this.cellSize * 0.44;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            this.ctx.beginPath();
            this.ctx.arc(hx, hy, hr, 0, Math.PI * 2);
            this.ctx.fill();
        }

        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] !== 0) this.drawStone(r, c, this.board[r][c]);
            }
        }
    }

    getStarPoints() {
        if (this.boardSize === 7) return [[3, 3]];
        if (this.boardSize === 9) return [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
        if (this.boardSize === 13) return [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]];
        return [];
    }

    drawStone(row, col, player) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        const radius = this.cellSize * 0.44;

        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 1;
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
        hl.addColorStop(0, player === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.45)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        this.ctx.fillStyle = hl;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLastMove() {
        if (this.moveHistory.length === 0) return;
        const last = this.moveHistory[this.moveHistory.length - 1];
        if (last.pass) return;
        const x = this.padding + last.col * this.cellSize;
        const y = this.padding + last.row * this.cellSize;
        this.ctx.fillStyle = '#ff3300';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawTerritory() {
        const territory = this.ai.calculateTerritory(this.board);
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (territory[r][c] !== 0 && this.board[r][c] === 0) {
                    const x = this.padding + c * this.cellSize;
                    const y = this.padding + r * this.cellSize;
                    this.ctx.fillStyle = territory[r][c] === 1 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)';
                    this.ctx.fillRect(x - 4, y - 4, 8, 8);
                }
            }
        }
    }

    updateStatus(text) {
        document.getElementById('goStatusText').textContent = text;
    }

    updateInfo() {
        document.getElementById('goBlackCaptures').textContent = this.captures.black;
        document.getElementById('goWhiteCaptures').textContent = this.captures.white;
        document.getElementById('goMoveCount').textContent = this.moveHistory.length;
        const score = this.ai.calculateScore(this.board, this.captures);
        document.getElementById('goBlackTerritory').textContent = score.blackTerritory;
        document.getElementById('goWhiteTerritory').textContent = score.whiteTerritory;
    }

    restart() {
        document.getElementById('gameOverModal').classList.remove('active');
        this.init();
        this.draw();
    }

    surrender() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.updateStatus('对局结束');
        window.appScoreboard.recordResult('go', 'lose');
        this.showModal('失败', '你选择了认输');
    }
}

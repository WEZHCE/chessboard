/* ==================== Chess (中国象棋) Engine ==================== */
class ChessAI {
    constructor(difficulty = 2) {
        this.difficulty = difficulty;
        this.maxDepth = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4;
        this.timeLimit = 3000; // 思考时间限制（毫秒）
        this.startTime = 0;
        this.lastThinkingTime = 0;
    }

    setDifficulty(level) {
        this.difficulty = level;
        this.maxDepth = level === 1 ? 2 : level === 2 ? 3 : 4;
    }

    // 棋子类型
    static PIECES = {
        R_KING: 'k', R_ADVISOR: 'a', R_BISHOP: 'b', R_KNIGHT: 'n', R_ROOK: 'r', R_CANNON: 'c', R_PAWN: 'p',
        B_KING: 'K', B_ADVISOR: 'A', B_BISHOP: 'B', B_KNIGHT: 'N', B_ROOK: 'R', B_CANNON: 'C', B_PAWN: 'P'
    };

    // 棋子价值
    static VALUES = {
        'k': 10000, 'a': 20, 'b': 20, 'n': 90, 'r': 450, 'c': 225, 'p': 50,
        'K': 10000, 'A': 20, 'B': 20, 'N': 90, 'R': 450, 'C': 225, 'P': 50
    };

    isRed(piece) {
        return piece === piece.toLowerCase() && piece !== '.';
    }

    isBlack(piece) {
        return piece === piece.toUpperCase() && piece !== '.';
    }

    isSameSide(p1, p2) {
        if (p1 === '.' || p2 === '.') return false;
        return (this.isRed(p1) && this.isRed(p2)) || (this.isBlack(p1) && this.isBlack(p2));
    }

    isOpponent(p1, p2) {
        if (p1 === '.' || p2 === '.') return false;
        return (this.isRed(p1) && this.isBlack(p2)) || (this.isBlack(p1) && this.isRed(p2));
    }

    // 生成所有合法走法
    generateMoves(board, isRedTurn) {
        const moves = [];
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = board[r][c];
                if (piece === '.') continue;
                if (isRedTurn && !this.isRed(piece)) continue;
                if (!isRedTurn && !this.isBlack(piece)) continue;

                const pieceType = piece.toLowerCase();
                switch (pieceType) {
                    case 'k': this.getKingMoves(board, r, c, piece, moves); break;
                    case 'a': this.getAdvisorMoves(board, r, c, piece, moves); break;
                    case 'b': this.getBishopMoves(board, r, c, piece, moves); break;
                    case 'n': this.getKnightMoves(board, r, c, piece, moves); break;
                    case 'r': this.getRookMoves(board, r, c, piece, moves); break;
                    case 'c': this.getCannonMoves(board, r, c, piece, moves); break;
                    case 'p': this.getPawnMoves(board, r, c, piece, moves); break;
                }
            }
        }
        return moves;
    }

    getKingMoves(board, r, c, piece, moves) {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        const isRed = this.isRed(piece);
        const minR = isRed ? 7 : 0;
        const maxR = isRed ? 9 : 2;
        const minC = 3, maxC = 5;

        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= minR && nr <= maxR && nc >= minC && nc <= maxC) {
                if (!this.isSameSide(piece, board[nr][nc])) {
                    moves.push({ from: [r,c], to: [nr,nc], piece, captured: board[nr][nc] });
                }
            }
        }

        // 将帅对面（飞将）
        const dir = isRed ? -1 : 1;
        for (let nr = r + dir; nr >= 0 && nr <= 9; nr += dir) {
            if (board[nr][c] !== '.') {
                if (this.isOpponent(piece, board[nr][c]) && board[nr][c].toLowerCase() === 'k') {
                    moves.push({ from: [r,c], to: [nr,nc], piece, captured: board[nr][c] });
                }
                break;
            }
        }
    }

    getAdvisorMoves(board, r, c, piece, moves) {
        const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
        const isRed = this.isRed(piece);
        const minR = isRed ? 7 : 0;
        const maxR = isRed ? 9 : 2;
        const minC = 3, maxC = 5;

        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= minR && nr <= maxR && nc >= minC && nc <= maxC) {
                if (!this.isSameSide(piece, board[nr][nc])) {
                    moves.push({ from: [r,c], to: [nr,nc], piece, captured: board[nr][nc] });
                }
            }
        }
    }

    getBishopMoves(board, r, c, piece, moves) {
        const dirs = [[2,2],[2,-2],[-2,2],[-2,-2]];
        const isRed = this.isRed(piece);
        const minR = isRed ? 5 : 0;
        const maxR = isRed ? 9 : 4;

        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            const blockR = r + dr/2, blockC = c + dc/2;
            if (nr >= minR && nr <= maxR && nc >= 0 && nc <= 8) {
                if (board[blockR][blockC] === '.') {
                    if (!this.isSameSide(piece, board[nr][nc])) {
                        moves.push({ from: [r,c], to: [nr,nc], piece, captured: board[nr][nc] });
                    }
                }
            }
        }
    }

    getKnightMoves(board, r, c, piece, moves) {
        const jumps = [
            [-2,1,-1,0],[-2,-1,-1,0],[2,1,1,0],[2,-1,1,0],
            [1,2,0,1],[1,-2,0,-1],[-1,2,0,1],[-1,-2,0,-1]
        ];

        for (const [dr, dc, br, bc] of jumps) {
            const nr = r + dr, nc = c + dc;
            const blockR = r + br, blockC = c + bc;
            if (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                if (board[blockR][blockC] === '.') {
                    if (!this.isSameSide(piece, board[nr][nc])) {
                        moves.push({ from: [r,c], to: [nr,nc], piece, captured: board[nr][nc] });
                    }
                }
            }
        }
    }

    getRookMoves(board, r, c, piece, moves) {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                if (board[nr][nc] === '.') {
                    moves.push({ from: [r,c], to: [nr,nc], piece, captured: '.' });
                } else {
                    if (this.isOpponent(piece, board[nr][nc])) {
                        moves.push({ from: [r,c], to: [nr,nc], piece, captured: board[nr][nc] });
                    }
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }
    }

    getCannonMoves(board, r, c, piece, moves) {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            let jumped = false;
            while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                if (!jumped) {
                    if (board[nr][nc] === '.') {
                        moves.push({ from: [r,c], to: [nr,nc], piece, captured: '.' });
                    } else {
                        jumped = true;
                    }
                } else {
                    if (board[nr][nc] !== '.') {
                        if (this.isOpponent(piece, board[nr][nc])) {
                            moves.push({ from: [r,c], to: [nr,nc], piece, captured: board[nr][nc] });
                        }
                        break;
                    }
                }
                nr += dr;
                nc += dc;
            }
        }
    }

    getPawnMoves(board, r, c, piece, moves) {
        const isRed = this.isRed(piece);
        const forward = isRed ? -1 : 1;
        const crossed = isRed ? r <= 4 : r >= 5;

        // 前进
        const nr = r + forward;
        if (nr >= 0 && nr <= 9) {
            if (!this.isSameSide(piece, board[nr][c])) {
                moves.push({ from: [r,c], to: [nr,c], piece, captured: board[nr][c] });
            }
        }

        // 过河后可以横走
        if (crossed) {
            for (const dc of [-1, 1]) {
                const nc = c + dc;
                if (nc >= 0 && nc <= 8) {
                    if (!this.isSameSide(piece, board[r][nc])) {
                        moves.push({ from: [r,c], to: [r,nc], piece, captured: board[r][nc] });
                    }
                }
            }
        }
    }

    // 评估局面
    evaluateBoard(board) {
        let score = 0;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = board[r][c];
                if (piece === '.') continue;
                const value = ChessAI.VALUES[piece] || 0;
                if (this.isRed(piece)) {
                    score += value;
                    // 位置加成
                    const pieceType = piece.toLowerCase();
                    if (pieceType === 'p') {
                        if (r <= 4) score += 10; // 过河兵加分
                        score += (4 - Math.abs(c - 4)) * 2;
                    } else if (pieceType === 'n' || pieceType === 'r') {
                        score += (4 - Math.abs(c - 4)) * 3;
                    }
                } else {
                    score -= value;
                    const pieceType = piece.toLowerCase();
                    if (pieceType === 'p') {
                        if (r >= 5) score -= 10;
                        score -= (4 - Math.abs(c - 4)) * 2;
                    } else if (pieceType === 'n' || pieceType === 'r') {
                        score -= (4 - Math.abs(c - 4)) * 3;
                    }
                }
            }
        }
        return score;
    }

    // 执行走法
    makeMove(board, move) {
        const newBoard = board.map(r => [...r]);
        newBoard[move.to[0]][move.to[1]] = move.piece;
        newBoard[move.from[0]][move.from[1]] = '.';
        return newBoard;
    }

    // 检查将帅是否存活
    isKingAlive(board, isRed) {
        const king = isRed ? 'k' : 'K';
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === king) return true;
            }
        }
        return false;
    }

    // Minimax搜索
    minimax(board, depth, alpha, beta, isMaximizing) {
        // 时间检查：超时则返回评估值
        if (Date.now() - this.startTime > this.timeLimit) {
            return this.evaluateBoard(board);
        }

        if (depth === 0) return this.evaluateBoard(board);

        const isRedTurn = isMaximizing;
        const moves = this.generateMoves(board, isRedTurn);

        if (moves.length === 0) {
            return isMaximizing ? -100000 : 100000;
        }

        // 排序走法（优先吃子）
        moves.sort((a, b) => {
            const va = a.captured !== '.' ? (ChessAI.VALUES[a.captured] || 0) : 0;
            const vb = b.captured !== '.' ? (ChessAI.VALUES[b.captured] || 0) : 0;
            return vb - va;
        });

        const maxMoves = 12;
        const limitedMoves = moves.slice(0, maxMoves);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of limitedMoves) {
                const newBoard = this.makeMove(board, move);
                const val = this.minimax(newBoard, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, val);
                alpha = Math.max(alpha, val);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of limitedMoves) {
                const newBoard = this.makeMove(board, move);
                const val = this.minimax(newBoard, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, val);
                beta = Math.min(beta, val);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    getBestMove(board, isRedTurn) {
        const moves = this.generateMoves(board, isRedTurn);
        if (moves.length === 0) return null;

        // 记录开始时间
        this.startTime = Date.now();

        if (this.difficulty === 1) {
            // 简单：随机 + 优先吃子
            const captures = moves.filter(m => m.captured !== '.');
            let move;
            if (captures.length > 0) move = captures[Math.floor(Math.random() * captures.length)];
            else move = moves[Math.floor(Math.random() * moves.length)];
            this.lastThinkingTime = Date.now() - this.startTime;
            return move;
        }

        let bestMove = moves[0];
        let bestScore = isRedTurn ? -Infinity : Infinity;

        // 排序
        moves.sort((a, b) => {
            const va = a.captured !== '.' ? (ChessAI.VALUES[a.captured] || 0) : 0;
            const vb = b.captured !== '.' ? (ChessAI.VALUES[b.captured] || 0) : 0;
            return vb - va;
        });

        const limitedMoves = moves.slice(0, 15);

        for (const move of limitedMoves) {
            const newBoard = this.makeMove(board, move);
            const score = this.minimax(newBoard, this.maxDepth - 1, -Infinity, Infinity, !isRedTurn);

            if (isRedTurn) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        // 记录思考时间
        this.lastThinkingTime = Date.now() - this.startTime;
        return bestMove;
    }
}

/* ==================== Chess Game Controller ==================== */
class ChessGame {
    constructor() {
        this.canvas = document.getElementById('chessCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ai = new ChessAI(2);
        this.cellSize = 54;
        this.padding = 32;
        this.board = [];
        this.currentTurn = true; // true=红方, false=黑方
        this.selected = null;
        this.validMoves = [];
        this.gameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { red: [], black: [] };
        this.hoverPos = null;

        this.pieceNames = {
            'k': '帅', 'a': '仕', 'b': '相', 'n': '马', 'r': '车', 'c': '炮', 'p': '兵',
            'K': '将', 'A': '士', 'B': '象', 'N': '馬', 'R': '車', 'C': '砲', 'P': '卒'
        };

        // 计算居中偏移
        const boardWidth = 8 * this.cellSize;
        const boardHeight = 9 * this.cellSize;
        this.offsetX = (this.canvas.width - boardWidth) / 2;
        this.offsetY = (this.canvas.height - boardHeight) / 2;

        this.init();
        this.bindEvents();
        this.draw();
    }

    init() {
        const firstBtn = document.querySelector('.chess-first-btn.active');
        this.playerFirst = firstBtn ? parseInt(firstBtn.dataset.first) : 1;
        // 初始棋盘 (大写=黑方, 小写=红方)
        this.board = [
            ['R','N','B','A','K','A','B','N','R'],
            ['.','.','.','.','.','.','.','.','.'],
            ['.','C','.','.','.','.','.','C','.'],
            ['P','.','P','.','P','.','P','.','P'],
            ['.','.','.','.','.','.','.','.','.'],
            ['.','.','.','.','.','.','.','.','.'],
            ['p','.','p','.','p','.','p','.','p'],
            ['.','c','.','.','.','.','.','c','.'],
            ['.','.','.','.','.','.','.','.','.'],
            ['r','n','b','a','k','a','b','n','r']
        ];
        this.currentTurn = true;
        this.selected = null;
        this.validMoves = [];
        this.gameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { red: [], black: [] };
        this.hoverPos = null;
        this._gameRecorded = false;
        this.playerStartTime = 0;
        this.updateStatus('红方走棋');
        this.updateInfo();
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleHover(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoverPos = null; this.draw(); });

        document.getElementById('chessRestartBtn').addEventListener('click', () => this.restart());
        document.getElementById('chessUndoBtn').addEventListener('click', () => this.undo());
        document.getElementById('chessSurrenderBtn').addEventListener('click', () => this.surrender());
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

    posToCell(x, y) {
        const col = Math.round((x - this.offsetX) / this.cellSize);
        const row = Math.round((y - this.offsetY) / this.cellSize);
        if (col < 0 || col > 8 || row < 0 || row > 9) return null;
        return { row, col };
    }

    handleClick(e) {
        if (this.gameOver || !this.currentTurn) return;
        const pos = this.getMousePos(e);
        const cell = this.posToCell(pos.x, pos.y);
        if (!cell) return;

        const piece = this.board[cell.row][cell.col];

        if (this.selected) {
            // 检查是否点击了合法走法
            const move = this.validMoves.find(m => m.to[0] === cell.row && m.to[1] === cell.col);
            if (move) {
                // 记录玩家思考时间（落子时）
                const thinkingTime = Date.now() - this.playerStartTime;
                this.updatePlayerThinkingTime(thinkingTime);
                this.executeMove(move);
                return;
            }
            // 选择己方棋子
            if (piece !== '.' && this.ai.isRed(piece)) {
                this.selected = cell;
                this.validMoves = this.ai.generateMoves(this.board, true)
                    .filter(m => m.from[0] === cell.row && m.from[1] === cell.col);
                this.draw();
                return;
            }
            // 取消选择
            this.selected = null;
            this.validMoves = [];
            this.draw();
        } else {
            if (piece !== '.' && this.ai.isRed(piece)) {
                this.selected = cell;
                this.validMoves = this.ai.generateMoves(this.board, true)
                    .filter(m => m.from[0] === cell.row && m.from[1] === cell.col);
                this.draw();
            }
        }
    }

    handleHover(e) {
        if (this.gameOver || !this.currentTurn) return;
        const pos = this.getMousePos(e);
        const cell = this.posToCell(pos.x, pos.y);
        if (cell) {
            if (!this.hoverPos || this.hoverPos.row !== cell.row || this.hoverPos.col !== cell.col) {
                this.hoverPos = cell;
                this.draw();
            }
        } else {
            if (this.hoverPos) {
                this.hoverPos = null;
                this.draw();
            }
        }
    }

    executeMove(move) {
        // 记录被吃的子
        if (move.captured !== '.') {
            if (this.ai.isRed(move.captured)) {
                this.capturedPieces.red.push(move.captured);
            } else {
                this.capturedPieces.black.push(move.captured);
            }
        }

        this.board[move.to[0]][move.to[1]] = move.piece;
        this.board[move.from[0]][move.from[1]] = '.';
        this.moveHistory.push(move);
        this.selected = null;
        this.validMoves = [];

        // 检查胜负
        if (!this.ai.isKingAlive(this.board, false)) {
            this.gameOver = true;
            this.handleGameOver('player');
            this.draw();
            return;
        }

        this.currentTurn = false;
        this.updateStatus('电脑思考中...');
        this.canvas.style.cursor = 'wait';

        setTimeout(() => {
            this.canvas.style.cursor = 'pointer';
            const aiMove = this.ai.getBestMove(this.board, false);
            if (aiMove) {
                if (aiMove.captured !== '.') {
                    if (this.ai.isRed(aiMove.captured)) {
                        this.capturedPieces.red.push(aiMove.captured);
                    } else {
                        this.capturedPieces.black.push(aiMove.captured);
                    }
                }
                this.board[aiMove.to[0]][aiMove.to[1]] = aiMove.piece;
                this.board[aiMove.from[0]][aiMove.from[1]] = '.';
                this.moveHistory.push(aiMove);

                if (!this.ai.isKingAlive(this.board, true)) {
                    this.gameOver = true;
                    this.handleGameOver('ai');
                    this.draw();
                    return;
                }
            }

            this.currentTurn = true;
            this.playerStartTime = Date.now();
            this.updateStatus('红方走棋');
            this.updateInfo();
            // 显示思考时间
            if (this.ai.lastThinkingTime > 0) {
                const el = document.getElementById('chessThinkingTime');
                if (el) el.textContent = `${this.ai.lastThinkingTime}ms`;
            }
            this.draw();
        }, 200);
    }

    handleGameOver(result) {
        let title, subtitle;
        if (result === 'player') {
            title = '胜利';
            subtitle = '你击败了电脑';
            window.appScoreboard.recordResult('chess', 'win');
        } else {
            title = '失败';
            subtitle = '电脑赢得了比赛';
            window.appScoreboard.recordResult('chess', 'lose');
        }
        this.recordMoves();
        this.updateStatus('对局结束');
        this.showModal(title, subtitle);
    }

    // 记录完整最终棋面，供跨局重复度比较使用
    recordMoves() {
        if (this._gameRecorded) return;
        const snapshot = { rows: 10, cols: 9, cells: this.board.flat() };
        const history = window.appScoreboard.moveHistory['chess'];
        if (history && history.length > 0) {
            const last = history[history.length - 1];
            if (window.appScoreboard.snapshotKey(last) === window.appScoreboard.snapshotKey(snapshot)) return;
        }
        this._gameRecorded = true;
        window.appScoreboard.recordGameMoves('chess', snapshot);
    }

    showModal(title, subtitle) {
        const modal = document.getElementById('gameOverModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalSubtitle').textContent = subtitle;
        setTimeout(() => modal.classList.add('active'), 300);
    }

    draw() {
        // 背景
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#d4a855');
        gradient.addColorStop(1, '#c4963c');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const ox = this.offsetX;
        const oy = this.offsetY;

        // 网格
        this.ctx.strokeStyle = '#5a3e1b';
        this.ctx.lineWidth = 1;

        // 横线
        for (let r = 0; r < 10; r++) {
            const y = oy + r * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(ox, y);
            this.ctx.lineTo(ox + 8 * this.cellSize, y);
            this.ctx.stroke();
        }

        // 竖线（上下断开）
        for (let c = 0; c < 9; c++) {
            const x = ox + c * this.cellSize;
            // 上半
            this.ctx.beginPath();
            this.ctx.moveTo(x, oy);
            this.ctx.lineTo(x, oy + 4 * this.cellSize);
            this.ctx.stroke();
            // 下半
            this.ctx.beginPath();
            this.ctx.moveTo(x, oy + 5 * this.cellSize);
            this.ctx.lineTo(x, oy + 9 * this.cellSize);
            this.ctx.stroke();
        }
        // 边框线
        this.ctx.beginPath();
        this.ctx.moveTo(ox, oy + 4 * this.cellSize);
        this.ctx.lineTo(ox, oy + 5 * this.cellSize);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(ox + 8 * this.cellSize, oy + 4 * this.cellSize);
        this.ctx.lineTo(ox + 8 * this.cellSize, oy + 5 * this.cellSize);
        this.ctx.stroke();

        // 九宫格斜线
        this.ctx.beginPath();
        this.ctx.moveTo(ox + 3 * this.cellSize, oy);
        this.ctx.lineTo(ox + 5 * this.cellSize, oy + 2 * this.cellSize);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(ox + 5 * this.cellSize, oy);
        this.ctx.lineTo(ox + 3 * this.cellSize, oy + 2 * this.cellSize);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(ox + 3 * this.cellSize, oy + 7 * this.cellSize);
        this.ctx.lineTo(ox + 5 * this.cellSize, oy + 9 * this.cellSize);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(ox + 5 * this.cellSize, oy + 7 * this.cellSize);
        this.ctx.lineTo(ox + 3 * this.cellSize, oy + 9 * this.cellSize);
        this.ctx.stroke();

        // 楚河汉界
        this.ctx.font = 'bold 20px "KaiTi", "STKaiti", "SimSun", serif';
        this.ctx.fillStyle = '#5a3e1b';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const riverY = oy + 4.5 * this.cellSize;
        this.ctx.fillText('楚 河', ox + 2 * this.cellSize, riverY);
        this.ctx.fillText('漢 界', ox + 6 * this.cellSize, riverY);

        // Hover
        if (this.hoverPos) {
            const x = ox + this.hoverPos.col * this.cellSize;
            const y = oy + this.hoverPos.row * this.cellSize;
            this.ctx.fillStyle = 'rgba(90, 62, 27, 0.1)';
            this.ctx.fillRect(x - this.cellSize/2, y - this.cellSize/2, this.cellSize, this.cellSize);
        }

        // 选中高亮
        if (this.selected) {
            const x = ox + this.selected.col * this.cellSize;
            const y = oy + this.selected.row * this.cellSize;
            this.ctx.strokeStyle = '#ff3300';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x - this.cellSize/2 + 3, y - this.cellSize/2 + 3, this.cellSize - 6, this.cellSize - 6);
        }

        // 合法走法指示
        for (const move of this.validMoves) {
            const x = ox + move.to[1] * this.cellSize;
            const y = oy + move.to[0] * this.cellSize;
            if (move.captured !== '.') {
                this.ctx.strokeStyle = '#ff3300';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.cellSize * 0.42, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = 'rgba(90, 62, 27, 0.2)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // 棋子
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] !== '.') {
                    this.drawPiece(r, c, this.board[r][c]);
                }
            }
        }

        // 红点标记最后一步（AI落子）
        this.drawLastMove();
    }

    // 绘制最后一步红点
    drawLastMove() {
        if (this.moveHistory.length === 0) return;
        const last = this.moveHistory[this.moveHistory.length - 1];
        // 只标记AI（黑方）的落子
        if (this.ai.isRed(last.piece)) return;
        const x = this.offsetX + last.to[1] * this.cellSize;
        const y = this.offsetY + last.to[0] * this.cellSize;
        this.ctx.fillStyle = '#ff3300';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPiece(row, col, piece) {
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;
        const radius = this.cellSize * 0.38;

        // 阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetY = 2;

        // 棋子底色
        const isRed = this.ai.isRed(piece);
        this.ctx.fillStyle = '#f5e6c8';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius - 3, 0, Math.PI * 2);
        this.ctx.fill();

        // 棋子边框
        this.ctx.shadowColor = 'transparent';
        this.ctx.strokeStyle = isRed ? '#cc0000' : '#1a1a1a';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // 内圈装饰线
        this.ctx.strokeStyle = isRed ? '#cc0000' : '#1a1a1a';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
        this.ctx.stroke();

        // 文字
        this.ctx.fillStyle = isRed ? '#cc0000' : '#1a1a1a';
        this.ctx.font = `bold ${radius * 0.85}px "KaiTi", "STKaiti", "SimSun", serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.pieceNames[piece] || piece, x, y + 2);
    }

    updateStatus(text) {
        document.getElementById('chessStatusText').textContent = text;
    }

    updatePlayerThinkingTime(time) {
        const el = document.getElementById('chessPlayerThinkingTime');
        if (el) el.textContent = `${time}ms`;
    }

    updateInfo() {
        document.getElementById('chessMoveCount').textContent = this.moveHistory.length;
        document.getElementById('chessTurn').textContent = this.currentTurn ? '红方' : '黑方';

        // 被吃棋子
        const captured = document.getElementById('chessCaptured');
        let html = '';
        if (this.capturedPieces.black.length > 0) {
            html += '<div class="captured-row"><span class="captured-side">吃黑:</span>';
            for (const p of this.capturedPieces.black) {
                html += `<span class="captured-piece black">${this.pieceNames[p]}</span>`;
            }
            html += '</div>';
        }
        if (this.capturedPieces.red.length > 0) {
            html += '<div class="captured-row"><span class="captured-side">吃红:</span>';
            for (const p of this.capturedPieces.red) {
                html += `<span class="captured-piece red">${this.pieceNames[p]}</span>`;
            }
            html += '</div>';
        }
        captured.innerHTML = html || '<span class="move-empty">无</span>';

        // 走棋记录
        const moveList = document.getElementById('chessMoveList');
        if (this.moveHistory.length === 0) {
            moveList.innerHTML = '<div class="move-empty">暂无记录</div>';
        } else {
            const records = this.moveHistory.slice(-8).map((m, i) => {
                const num = this.moveHistory.length - Math.min(8, this.moveHistory.length) + i + 1;
                const side = this.ai.isRed(m.piece) ? '红' : '黑';
                const pieceName = this.pieceNames[m.piece] || m.piece;
                const fromCol = m.from[1] + 1;
                const toCol = m.to[1] + 1;
                return `<div>${num}. ${side}${pieceName} ${fromCol}→${toCol}${m.captured !== '.' ? '×' : ''}</div>`;
            });
            moveList.innerHTML = records.join('');
            moveList.scrollTop = moveList.scrollHeight;
        }
    }

    restart() {
        document.getElementById('gameOverModal').classList.remove('active');
        this.recordMoves();
        this.init();
        this.draw();
        // 选择后手则 AI 执红先行
        if (this.playerFirst === 0) {
            this.currentTurn = false;
            this.updateStatus('电脑思考中...');
            this.canvas.style.cursor = 'wait';
            setTimeout(() => {
                this.canvas.style.cursor = 'pointer';
                const aiMove = this.ai.getBestMove(this.board, true);
                if (aiMove) {
                    if (aiMove.captured !== '.') {
                        if (this.ai.isRed(aiMove.captured)) {
                            this.capturedPieces.red.push(aiMove.captured);
                        } else {
                            this.capturedPieces.black.push(aiMove.captured);
                        }
                    }
                    this.board[aiMove.to[0]][aiMove.to[1]] = aiMove.piece;
                    this.board[aiMove.from[0]][aiMove.from[1]] = '.';
                    this.moveHistory.push(aiMove);
                    if (!this.ai.isKingAlive(this.board, false)) {
                        this.gameOver = true;
                        this.handleGameOver('ai');
                        this.draw();
                        return;
                    }
                }
                this.currentTurn = true;
                this.playerStartTime = Date.now();
                this.updateStatus('红方走棋');
                this.updateInfo();
                this.draw();
            }, 200);
        }
        // 先手时也开始计时
        if (this.playerFirst === 1) {
            this.playerStartTime = Date.now();
        }
    }

    undo() {
        if (this.gameOver || this.moveHistory.length === 0) return;
        // 悔两步
        const steps = this.moveHistory.length >= 2 ? 2 : 1;
        for (let i = 0; i < steps && this.moveHistory.length > 0; i++) {
            const last = this.moveHistory.pop();
            this.board[last.from[0]][last.from[1]] = last.piece;
            this.board[last.to[0]][last.to[1]] = last.captured;
        }
        this.currentTurn = this.playerFirst === 1;
        this.selected = null;
        this.validMoves = [];
        this.capturedPieces = { red: [], black: [] };
        // 重新计算被吃棋子
        for (const move of this.moveHistory) {
            if (move.captured !== '.') {
                if (this.ai.isRed(move.captured)) {
                    this.capturedPieces.red.push(move.captured);
                } else {
                    this.capturedPieces.black.push(move.captured);
                }
            }
        }
        this.updateStatus(this.currentTurn ? '红方走棋' : '电脑思考中...');
        this.updateInfo();
        this.draw();
    }

    surrender() {
        if (this.gameOver) return;
        this.gameOver = true;
        window.appScoreboard.recordResult('chess', 'lose');
        this.updateStatus('对局结束');
        this.showModal('失败', '你选择了认输');
    }
}

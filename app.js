/* ==================== Scoreboard System ==================== */
class Scoreboard {
    constructor() {
        this.data = {
            gomoku: { wins: 0, losses: 0, draws: 0 },
            go: { wins: 0, losses: 0, draws: 0 }
        };
        this.load();
        this.render();
    }

    load() {
        try {
            const saved = localStorage.getItem('chess_scoreboard_v2');
            if (saved) {
                this.data = JSON.parse(saved);
            }
        } catch (e) { /* ignore */ }
    }

    save() {
        try {
            localStorage.setItem('chess_scoreboard_v2', JSON.stringify(this.data));
        } catch (e) { /* ignore */ }
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
            gomoku: { wins: 0, losses: 0, draws: 0 },
            go: { wins: 0, losses: 0, draws: 0 }
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
        // Gomoku
        document.getElementById('gomokuWins').textContent = this.data.gomoku.wins;
        document.getElementById('gomokuLosses').textContent = this.data.gomoku.losses;
        document.getElementById('gomokuDraws').textContent = this.data.gomoku.draws;
        const gRate = this.getWinRate('gomoku');
        document.getElementById('gomokuRateFill').style.width = gRate + '%';
        document.getElementById('gomokuRate').textContent = gRate.toFixed(1) + '%';

        // Go
        document.getElementById('goWins').textContent = this.data.go.wins;
        document.getElementById('goLosses').textContent = this.data.go.losses;
        document.getElementById('goDraws').textContent = this.data.go.draws;
        const goRate = this.getWinRate('go');
        document.getElementById('goRateFill').style.width = goRate + '%';
        document.getElementById('goRate').textContent = goRate.toFixed(1) + '%';
    }

    animateValue(game, result) {
        const id = result === 'win' ? 'Wins' : result === 'lose' ? 'Losses' : 'Draws';
        const el = document.getElementById(game + id);
        if (el) {
            el.classList.remove('pop');
            void el.offsetWidth; // trigger reflow
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
        this.x += (this.targetX - this.x) * 0.15;
        this.y += (this.targetY - this.y) * 0.15;
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
        this.updateIndicator();
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
            const width = activeRect.width;
            const left = activeRect.left - containerRect.left - 2;
            this.indicator.style.width = width + 'px';
            this.indicator.style.transform = `translateX(${left}px)`;
        }
    }
}

/* ==================== App Initialization ==================== */
let gomokuGame = null;
let goGame = null;

document.addEventListener('DOMContentLoaded', () => {
    // Grid decoration
    const grid = document.createElement('div');
    grid.className = 'grid-decoration';
    document.body.appendChild(grid);

    // Cursor glow
    new CursorGlow();

    // Scoreboard
    window.appScoreboard = new Scoreboard();

    // Games
    gomokuGame = new GomokuGame();
    goGame = new GoGame();

    // Tab switching
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const game = btn.dataset.game;
            if (game === 'gomoku') {
                document.getElementById('gomokuSection').classList.remove('hidden');
                document.getElementById('goSection').classList.add('hidden');
            } else {
                document.getElementById('gomokuSection').classList.add('hidden');
                document.getElementById('goSection').classList.remove('hidden');
            }
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
        if (!document.getElementById('gomokuSection').classList.contains('hidden')) {
            gomokuGame.restart();
        } else {
            goGame.restart();
        }
    });

    // Initialize segmented controls
    initSegmentedControls();
});

function initSegmentedControls() {
    // Gomoku difficulty
    const gomokuDiff = document.querySelector('#gomokuSection .seg-control');
    if (gomokuDiff) {
        new SegmentedControl(gomokuDiff, (btn) => {
            if (gomokuGame) gomokuGame.ai.setDifficulty(parseInt(btn.dataset.diff));
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

    // Go difficulty
    const goDiff = document.querySelector('.go-diff-control');
    if (goDiff) {
        new SegmentedControl(goDiff, (btn) => {
            if (goGame) goGame.ai.setDifficulty(parseInt(btn.dataset.diff));
        });
    }
}

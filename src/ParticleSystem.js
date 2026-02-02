export class ParticleSystem {
    constructor(canvasId, imagePath) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.particles = [];
        this.imagePath = imagePath;
        this.image = null;
        this.gap = 3; // Small gap for high resolution "cell" look
        this.state = 'IDLE_PARTICLES'; // Start as living particles, not static image
        this.golGrid = [];
        this.cols = 0;
        this.rows = 0;
        this.cellSize = 4;
        this.isGolRunning = false;
        this.frameCount = 0;

        // Heart animation vars
        this.heartScale = 1;
        this.heartBeatSpeed = 0.05;
        this.heartBaseScale = 18;

        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            // Re-init if resizing in early states to keep image centered
            if (this.state === 'IDLE_PARTICLES' && this.image) {
                this.processImageAndCreateParticles();
            } else if (this.state === 'GOL') {
                this.initGoL();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => this.handleGolInteraction(e));
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) this.handleGolInteraction(e);
        });

        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    async init() {
        return new Promise((resolve) => {
            this.image = new Image();
            this.image.src = this.imagePath;
            this.image.onload = () => {
                this.processImageAndCreateParticles();
                this.animate(); // Start loop immediately
                resolve();
            };
        });
    }

    processImageAndCreateParticles() {
        if (!this.image) return;

        // 1. Draw image momentarily to get data
        this.ctx.clearRect(0, 0, this.width, this.height);
        const aspectRatio = this.image.width / this.image.height;
        let drawWidth = Math.min(this.width, 800);
        let drawHeight = drawWidth / aspectRatio;
        const startX = (this.width - drawWidth) / 2;
        const startY = (this.height - drawHeight) / 2;
        this.imageRect = { x: startX, y: startY, w: drawWidth, h: drawHeight };
        this.ctx.drawImage(this.image, startX, startY, drawWidth, drawHeight);

        // 2. Read data
        const { x, y, w, h } = this.imageRect;
        const imgData = this.ctx.getImageData(x, y, w, h).data;

        // 3. Clear canvas (we will only render particles now)
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 4. Create particles
        this.particles = [];
        for (let iy = 0; iy < h; iy += this.gap) {
            for (let ix = 0; ix < w; ix += this.gap) {
                const index = (iy * w + ix) * 4;
                if (imgData[index + 3] > 128) {
                    const r = imgData[index];
                    const g = imgData[index + 1];
                    const b = imgData[index + 2];
                    const color = `rgb(${r},${g},${b})`;

                    this.particles.push({
                        x: x + ix,
                        y: y + iy,
                        originX: x + ix, // Home position for IDLE state
                        originY: y + iy,
                        color: color,
                        originColor: color,
                        size: Math.max(1, this.gap - 1),
                        targetX: x + ix,
                        targetY: y + iy,
                        vx: 0,
                        vy: 0,
                        ease: 0.1,
                        heartX: 0,
                        heartY: 0,
                        // Breath offset
                        breathOffset: Math.random() * Math.PI * 2
                    });
                }
            }
        }
    }

    shatterAndMorphToLine() {
        // No need to create particles, they exist.
        // Just switch state and assign new targets.
        this.state = 'PARTICLE_ANIMATION';
        this.morphToLine();
    }

    morphToLine() {
        const totalParticles = this.particles.length;
        const lineWidth = this.width * 0.8;
        const startX = (this.width - lineWidth) / 2;
        const step = lineWidth / totalParticles;
        const centerY = this.height / 2;
        this.particles.forEach((p, index) => {
            p.targetX = startX + (index * step);
            p.targetY = centerY + (Math.sin(index * 0.1) * 20);
            p.ease = 0.05 + Math.random() * 0.05;
        });
    }

    morphToText(text) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.font = '50px "Cinzel"';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, this.width / 2, this.height / 2);
        const textData = this.ctx.getImageData(0, 0, this.width, this.height).data;
        const textPoints = [];
        const textGap = 3;
        for (let y = 0; y < this.height; y += textGap) {
            for (let x = 0; x < this.width; x += textGap) {
                const index = (y * this.width + x) * 4;
                if (textData[index + 3] > 128) {
                    textPoints.push({ x, y });
                }
            }
        }
        const shuffledParticles = [...this.particles].sort(() => Math.random() - 0.5);
        shuffledParticles.forEach((p, i) => {
            if (i < textPoints.length) {
                p.targetX = textPoints[i].x;
                p.targetY = textPoints[i].y;
                p.color = 'white';
                p.ease = 0.1;
            } else {
                p.targetX = Math.random() * this.width;
                p.targetY = this.height + 100;
                p.color = `rgba(255,255,255,0)`;
            }
        });
    }

    morphToHeart() {
        this.state = 'HEART';
        this.heartStartFrame = this.frameCount;

        const heartPoints = [];
        const r = this.heartBaseScale;

        const count = this.particles.length;
        for (let i = 0; i < count; i++) {
            const t = Math.random() * Math.PI * 2;
            const d = Math.sqrt(Math.random());

            // Heart equation
            // x = 16sin^3(t)
            // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

            heartPoints.push({
                hx: hx * d,
                hy: hy * d
            });
        }

        this.particles.forEach((p, i) => {
            p.heartX = heartPoints[i].hx;
            p.heartY = heartPoints[i].hy;
            p.color = '#ff3366'; // Heart color
            p.vx = 0;
            p.vy = 0;
            p.ease = 0.05;
        });
    }

    updateHeart() {
        const time = (this.frameCount - this.heartStartFrame) * this.heartBeatSpeed;
        const scale = this.heartBaseScale * (1 + 0.15 * Math.sin(time * 3));

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        this.particles.forEach(p => {
            p.targetX = centerX + p.heartX * scale;
            p.targetY = centerY + p.heartY * scale;

            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            p.x += dx * 0.1;
            p.y += dy * 0.1;
        });
    }

    disintegrateToGoL() {
        this.state = 'GOL';
        this.initGoL();
    }

    startGameOfLife() {
        this.state = 'GOL';
        this.initGoL();
    }

    initGoL() {
        this.cols = Math.floor(this.width / this.cellSize);
        this.rows = Math.floor(this.height / this.cellSize);
        this.golGrid = new Array(this.cols).fill(null).map(() => new Array(this.rows).fill(0));

        // 1. Seed from particles (The Heart) - Guaranteed alive
        this.particles.forEach(p => {
            const col = Math.floor(p.x / this.cellSize);
            const row = Math.floor(p.y / this.cellSize);
            if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                this.golGrid[col][row] = 1;
            }
        });

        // 2. High density background soup to fill the screen
        // "Screen full of cells" -> ~30-40% fill rate for interesting mechanics
        for (let i = 0; i < this.cols; i++) {
            for (let j = 0; j < this.rows; j++) {
                // Don't overwrite heart seeds, but fill empty space
                if (this.golGrid[i][j] === 0 && Math.random() < 0.35) {
                    this.golGrid[i][j] = 1;
                }
            }
        }

        this.isGolRunning = true;
    }

    updateGoL() {
        if (!this.isGolRunning) return;
        let next = new Array(this.cols).fill(null).map(() => new Array(this.rows).fill(0));
        for (let i = 0; i < this.cols; i++) {
            for (let j = 0; j < this.rows; j++) {
                let state = this.golGrid[i][j];
                let neighbors = 0;
                // Optimization: toroidal wrap-around for endless feel
                for (let x = -1; x <= 1; x++) {
                    for (let y = -1; y <= 1; y++) {
                        if (x === 0 && y === 0) continue;
                        let col = (i + x + this.cols) % this.cols;
                        let row = (j + y + this.rows) % this.rows;
                        neighbors += this.golGrid[col][row];
                    }
                }

                // Classic Rules
                if (state === 0 && neighbors === 3) {
                    next[i][j] = 1;
                } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                    next[i][j] = 0;
                } else {
                    next[i][j] = state;
                }
            }
        }
        this.golGrid = next;
    }

    handleGolInteraction(e) {
        if (this.state !== 'GOL') return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const i = Math.floor(x / this.cellSize);
        const j = Math.floor(y / this.cellSize);
        // Paint brush effect
        if (i >= 0 && i < this.cols && j >= 0 && j < this.rows) {
            this.golGrid[i][j] = 1;
            // Add a little splash around the cursor
            if (i + 1 < this.cols) this.golGrid[i + 1][j] = 1;
            if (j + 1 < this.rows) this.golGrid[i][j + 1] = 1;
        }
    }

    drawGoL() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Add Glow for beauty
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ff3366';
        this.ctx.fillStyle = '#ff3366';

        for (let i = 0; i < this.cols; i++) {
            for (let j = 0; j < this.rows; j++) {
                if (this.golGrid[i][j] === 1) {
                    this.ctx.fillRect(i * this.cellSize, j * this.cellSize, this.cellSize - 1, this.cellSize - 1);
                }
            }
        }

        this.ctx.shadowBlur = 0;
    }

    updateIdle() {
        // "Living" static state
        const time = this.frameCount * 0.02;
        this.particles.forEach(p => {
            // Gentle breathing/floating using noise-like sin/cos
            const driftX = Math.sin(time + p.breathOffset) * 2;
            const driftY = Math.cos(time + p.breathOffset * 0.5) * 2;

            p.x = p.originX + driftX;
            p.y = p.originY + driftY;

            // Ensure no velocity buildup if we switch states
            p.vx = 0;
            p.vy = 0;
        });
    }

    update() {
        this.particles.forEach(p => {
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            p.vx = dx * p.ease;
            p.vy = dy * p.ease;
            p.x += p.vx;
            p.y += p.vy;
        });
    }

    draw(useGlow = false) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        if (useGlow) {
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = 'rgba(255,255,255,0.5)';
        }

        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        this.ctx.shadowBlur = 0;
    }

    animate() {
        this.frameCount++;

        if (this.state === 'IDLE_PARTICLES') {
            this.updateIdle();
            this.draw(true); // Add slight glow to image particles for beauty
        } else if (this.state === 'HEART') {
            this.updateHeart();
            this.draw();
        } else if (this.state === 'GOL') {
            if (this.frameCount % 10 === 0) this.updateGoL();
            this.drawGoL();
        } else {
            this.update();
            this.draw();
        }

        requestAnimationFrame(() => this.animate());
    }
}

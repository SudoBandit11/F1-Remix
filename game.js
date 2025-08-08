const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

if (window.innerWidth < 768) {
    const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT) * 0.9;
    canvas.style.width = (GAME_WIDTH * scale) + 'px';
    canvas.style.height = (GAME_HEIGHT * scale) + 'px';
}

const game = {
    running: false,
    startTime: 0,
    currentLap: 1,
    totalLaps: 3,
    bestLapTime: null,
    currentLapStart: 0,
    boostCharges: 3,
    checkpointsPassed: []
};

class Car {
    constructor(x, y, color = '#ff0000', isPlayer = true) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.color = color;
        this.angle = -Math.PI / 2;
        this.speed = 0;
        this.maxSpeed = 8;
        this.acceleration = 0.15;
        this.deceleration = 0.1;
        this.brakeForce = 0.3;
        this.turnSpeed = 0.05;
        this.friction = 0.05;
        this.isPlayer = isPlayer;
        this.boostActive = false;
        this.boostTimer = 0;
        this.trail = [];
        this.maxTrailLength = 20;
        
        this.driftFactor = 0;
        this.driftAngle = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        
        if (!isPlayer) {
            this.aiTarget = 0;
            this.aiSpeed = 0.7;
        }
    }
    
    update(keys) {
        if (this.isPlayer) {
            this.handleInput(keys);
        } else {
            this.updateAI();
        }
        
        const targetVelocityX = Math.cos(this.angle) * this.speed;
        const targetVelocityY = Math.sin(this.angle) * this.speed;
        
        const driftAmount = Math.min(this.speed / this.maxSpeed, 1) * 0.85;
        this.velocityX = this.velocityX * (1 - driftAmount) + targetVelocityX * driftAmount;
        this.velocityY = this.velocityY * (1 - driftAmount) + targetVelocityY * driftAmount;
        
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        if (this.speed > 0) {
            this.speed -= this.friction;
            if (this.speed < 0) this.speed = 0;
        }
        
        if (this.boostActive) {
            this.boostTimer--;
            if (this.boostTimer <= 0) {
                this.boostActive = false;
                this.maxSpeed = 8;
            }
        }
        
        this.trail.push({ x: this.x, y: this.y, angle: this.angle });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        this.driftFactor *= 0.95;
    }
    
    handleInput(keys) {
        if (keys.ArrowUp || keys.KeyW) {
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        }
        
        if (keys.ArrowDown || keys.KeyS || keys.Brake) {
            this.speed -= this.brakeForce;
            if (this.speed < 0) this.speed = 0;
        }
        
        const turnMultiplier = 1 - (this.speed / this.maxSpeed) * 0.3;
        
        if (keys.ArrowLeft || keys.KeyA || keys.Left) {
            this.angle -= this.turnSpeed * turnMultiplier * Math.min(this.speed / 2, 1);
            if (this.speed > 4) {
                this.driftFactor = Math.min(this.driftFactor + 0.1, 1);
            }
        }
        
        if (keys.ArrowRight || keys.KeyD || keys.Right) {
            this.angle += this.turnSpeed * turnMultiplier * Math.min(this.speed / 2, 1);
            if (this.speed > 4) {
                this.driftFactor = Math.min(this.driftFactor + 0.1, 1);
            }
        }
        
        if ((keys.Space || keys.Boost) && game.boostCharges > 0 && !this.boostActive) {
            this.activateBoost();
        }
    }
    
    updateAI() {
        const waypoints = track.waypoints;
        const target = waypoints[this.aiTarget];
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) {
            this.aiTarget = (this.aiTarget + 1) % waypoints.length;
        }
        
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        if (angleDiff > 0.1) {
            this.angle += this.turnSpeed * 0.8;
        } else if (angleDiff < -0.1) {
            this.angle -= this.turnSpeed * 0.8;
        }
        
        this.speed += this.acceleration * this.aiSpeed;
        if (this.speed > this.maxSpeed * 0.85) {
            this.speed = this.maxSpeed * 0.85;
        }
    }
    
    activateBoost() {
        if (game.boostCharges > 0) {
            this.boostActive = true;
            this.boostTimer = 60;
            this.maxSpeed = 12;
            this.speed = Math.min(this.speed + 3, this.maxSpeed);
            game.boostCharges--;
            updateUI();
        }
    }
    
    draw(ctx) {
        this.trail.forEach((point, index) => {
            const alpha = index / this.trail.length * 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
        });
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        
        if (this.boostActive) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff6400';
        }
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 5, this.width - 10, 15);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width / 2 - 5, -this.height / 2 + 5, 5, 10);
        ctx.fillRect(this.width / 2, -this.height / 2 + 5, 5, 10);
        ctx.fillRect(-this.width / 2 - 5, this.height / 2 - 15, 5, 10);
        ctx.fillRect(this.width / 2, this.height / 2 - 15, 5, 10);
        
        if (this.boostActive) {
            ctx.fillStyle = '#ff6400';
            for (let i = 0; i < 3; i++) {
                ctx.globalAlpha = 0.5 - i * 0.15;
                ctx.fillRect(-8, this.height / 2 + i * 10, 6, 8);
                ctx.fillRect(2, this.height / 2 + i * 10, 6, 8);
            }
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
    
    checkCollision(track) {
        const corners = [
            { x: this.x - this.width / 2, y: this.y - this.height / 2 },
            { x: this.x + this.width / 2, y: this.y - this.height / 2 },
            { x: this.x - this.width / 2, y: this.y + this.height / 2 },
            { x: this.x + this.width / 2, y: this.y + this.height / 2 }
        ];
        
        for (let corner of corners) {
            const rotatedX = Math.cos(this.angle) * (corner.x - this.x) - Math.sin(this.angle) * (corner.y - this.y) + this.x;
            const rotatedY = Math.sin(this.angle) * (corner.x - this.x) + Math.cos(this.angle) * (corner.y - this.y) + this.y;
            
            if (!track.isOnTrack(rotatedX, rotatedY)) {
                this.speed *= 0.5;
                return true;
            }
        }
        return false;
    }
}

class Track {
    constructor() {
        this.outerBoundary = [];
        this.innerBoundary = [];
        this.waypoints = [];
        this.checkpoints = [];
        this.startLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
        this.generateTrack();
    }
    
    generateTrack() {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        const points = 12;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radiusOuter = 350 + Math.sin(angle * 3) * 50;
            const radiusInner = 200 + Math.sin(angle * 3) * 30;
            const radiusWaypoint = 275 + Math.sin(angle * 3) * 40;
            
            this.outerBoundary.push({
                x: centerX + Math.cos(angle) * radiusOuter,
                y: centerY + Math.sin(angle) * radiusOuter
            });
            
            this.innerBoundary.push({
                x: centerX + Math.cos(angle) * radiusInner,
                y: centerY + Math.sin(angle) * radiusInner
            });
            
            this.waypoints.push({
                x: centerX + Math.cos(angle) * radiusWaypoint,
                y: centerY + Math.sin(angle) * radiusWaypoint
            });
        }
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const radius = 275;
            this.checkpoints.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                angle: angle,
                passed: false,
                id: i
            });
        }
        
        this.startLine = {
            x1: this.outerBoundary[0].x,
            y1: this.outerBoundary[0].y,
            x2: this.innerBoundary[0].x,
            y2: this.innerBoundary[0].y
        };
    }
    
    draw(ctx) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(this.outerBoundary[0].x, this.outerBoundary[0].y);
        for (let i = 1; i < this.outerBoundary.length; i++) {
            ctx.lineTo(this.outerBoundary[i].x, this.outerBoundary[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(this.innerBoundary[0].x, this.innerBoundary[0].y);
        for (let i = 1; i < this.innerBoundary.length; i++) {
            ctx.lineTo(this.innerBoundary[i].x, this.innerBoundary[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 10]);
        for (let i = 0; i < this.outerBoundary.length; i++) {
            const outerPoint = this.outerBoundary[i];
            const innerPoint = this.innerBoundary[i];
            const midX = (outerPoint.x + innerPoint.x) / 2;
            const midY = (outerPoint.y + innerPoint.y) / 2;
            
            ctx.beginPath();
            ctx.moveTo(midX - 5, midY - 5);
            ctx.lineTo(midX + 5, midY + 5);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(this.startLine.x1, this.startLine.y1);
        ctx.lineTo(this.startLine.x2, this.startLine.y2);
        ctx.stroke();
        
        ctx.fillStyle = '#ffff00';
        ctx.lineWidth = 2;
        for (let checkpoint of this.checkpoints) {
            if (checkpoint.id !== 0) {
                ctx.globalAlpha = checkpoint.passed ? 0.3 : 0.6;
                ctx.beginPath();
                ctx.arc(checkpoint.x, checkpoint.y, 20, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
    
    isOnTrack(x, y) {
        let insideOuter = false;
        let insideInner = false;
        
        for (let i = 0, j = this.outerBoundary.length - 1; i < this.outerBoundary.length; j = i++) {
            const xi = this.outerBoundary[i].x, yi = this.outerBoundary[i].y;
            const xj = this.outerBoundary[j].x, yj = this.outerBoundary[j].y;
            
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                insideOuter = !insideOuter;
            }
        }
        
        for (let i = 0, j = this.innerBoundary.length - 1; i < this.innerBoundary.length; j = i++) {
            const xi = this.innerBoundary[i].x, yi = this.innerBoundary[i].y;
            const xj = this.innerBoundary[j].x, yj = this.innerBoundary[j].y;
            
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                insideInner = !insideInner;
            }
        }
        
        return insideOuter && !insideInner;
    }
    
    checkCheckpoint(car) {
        for (let checkpoint of this.checkpoints) {
            const distance = Math.sqrt(
                Math.pow(car.x - checkpoint.x, 2) + 
                Math.pow(car.y - checkpoint.y, 2)
            );
            
            if (distance < 40 && !checkpoint.passed) {
                checkpoint.passed = true;
                
                if (checkpoint.id === 0 && this.checkpoints.filter(c => c.id !== 0).every(c => c.passed)) {
                    this.checkpoints.forEach(c => c.passed = false);
                    return 'lap';
                }
                return 'checkpoint';
            }
        }
        return null;
    }
}

const track = new Track();
const playerCar = new Car(track.waypoints[0].x, track.waypoints[0].y, '#0080ff', true);
const aiCar = new Car(track.waypoints[0].x - 40, track.waypoints[0].y, '#ff0000', false);

const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const brakeBtn = document.getElementById('brakeBtn');
const boostBtn = document.getElementById('boostBtn');

if (leftBtn) {
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.Left = true;
    });
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.Left = false;
    });
    leftBtn.addEventListener('mousedown', () => keys.Left = true);
    leftBtn.addEventListener('mouseup', () => keys.Left = false);
}

if (rightBtn) {
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.Right = true;
    });
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.Right = false;
    });
    rightBtn.addEventListener('mousedown', () => keys.Right = true);
    rightBtn.addEventListener('mouseup', () => keys.Right = false);
}

if (brakeBtn) {
    brakeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.Brake = true;
    });
    brakeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.Brake = false;
    });
    brakeBtn.addEventListener('mousedown', () => keys.Brake = true);
    brakeBtn.addEventListener('mouseup', () => keys.Brake = false);
}

if (boostBtn) {
    boostBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.Boost = true;
    });
    boostBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.Boost = false;
    });
    boostBtn.addEventListener('mousedown', () => keys.Boost = true);
    boostBtn.addEventListener('mouseup', () => keys.Boost = false);
    boostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        keys.Boost = false;
    });
}

function updateUI() {
    document.getElementById('speed').textContent = Math.floor(playerCar.speed * 15);
    document.getElementById('lap').textContent = game.currentLap;
    document.getElementById('boostCount').textContent = game.boostCharges;
    
    if (game.running) {
        const currentTime = Date.now() - game.currentLapStart;
        const minutes = Math.floor(currentTime / 60000);
        const seconds = Math.floor((currentTime % 60000) / 1000);
        const milliseconds = Math.floor((currentTime % 1000) / 100);
        document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
    }
    
    if (game.bestLapTime !== null) {
        const minutes = Math.floor(game.bestLapTime / 60000);
        const seconds = Math.floor((game.bestLapTime % 60000) / 1000);
        const milliseconds = Math.floor((game.bestLapTime % 1000) / 100);
        document.getElementById('bestTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    track.draw(ctx);
    
    if (game.running) {
        playerCar.update(keys);
        aiCar.update(keys);
        
        playerCar.checkCollision(track);
        aiCar.checkCollision(track);
        
        const checkpointResult = track.checkCheckpoint(playerCar);
        if (checkpointResult === 'lap') {
            const lapTime = Date.now() - game.currentLapStart;
            
            if (game.currentLap > 1) {
                if (game.bestLapTime === null || lapTime < game.bestLapTime) {
                    game.bestLapTime = lapTime;
                }
            }
            
            if (game.currentLap >= game.totalLaps) {
                game.running = false;
                alert(`Race Complete! Best Lap: ${(game.bestLapTime / 1000).toFixed(1)}s`);
                startScreen.style.display = 'flex';
            } else {
                game.currentLap++;
                game.currentLapStart = Date.now();
                game.boostCharges = Math.min(game.boostCharges + 2, 5);
            }
        }
        
        updateUI();
    }
    
    aiCar.draw(ctx);
    playerCar.draw(ctx);
    
    requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    game.running = true;
    game.startTime = Date.now();
    game.currentLapStart = Date.now();
    game.currentLap = 1;
    game.boostCharges = 3;
    game.bestLapTime = null;
    
    playerCar.x = track.waypoints[0].x;
    playerCar.y = track.waypoints[0].y;
    playerCar.angle = -Math.PI / 2;
    playerCar.speed = 0;
    
    aiCar.x = track.waypoints[0].x - 40;
    aiCar.y = track.waypoints[0].y;
    aiCar.angle = -Math.PI / 2;
    aiCar.speed = 0;
    
    track.checkpoints.forEach(c => c.passed = false);
});

gameLoop();
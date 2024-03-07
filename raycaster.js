const TILE_SIZE=64;
const NUM_COLS=15;
const NUM_ROWS=11;

const SCREEN_WIDTH=NUM_COLS*TILE_SIZE;
const SCREEN_HEIGHT=NUM_ROWS*TILE_SIZE;

const SCALE_FACTOR = 0.25;

const FOV_ANGLE = 60 * (Math.PI / 180);

const WALL_STRIP_WIDTH = 1; 
const NUM_RAYS = SCREEN_WIDTH / WALL_STRIP_WIDTH;

class Map {
	constructor() {
		this.grid=[
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
			[1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
			[1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
			[1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1],
			[1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
			[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		]
	}

	hasWallAt(x, y) {
		if (x < 0 || x > SCREEN_WIDTH || y < 0 || y > SCREEN_HEIGHT) {
			return true;
		}
		var gridIndexX = Math.floor(x / TILE_SIZE);
		var gridIndexY = Math.floor(y / TILE_SIZE);
		return this.grid[gridIndexY][gridIndexX] == 1;
	}

	render() {
		for (let i=0; i<NUM_ROWS; i++) {
			for (let j=0; j<NUM_COLS; j++) {
				let tileX = j * TILE_SIZE;
				let tileY = i * TILE_SIZE;
				let tileColor = this.hasWallAt(tileX, tileY) ? "#222" : "#fff";
				stroke("#222");
				fill(tileColor);
				rect(
					SCALE_FACTOR * tileX,
					SCALE_FACTOR * tileY,
					SCALE_FACTOR * TILE_SIZE,
					SCALE_FACTOR * TILE_SIZE
					)
			}
		}
	}
}

class Player {
	constructor() {
		this.x = SCREEN_WIDTH / 2;
		this.y = SCREEN_HEIGHT / 2;
		this.movementDirection = 0;
		this.walkSpeed = 2.5;
		this.turnDirection = 0;
		this.turnSpeed = 3 * (Math.PI / 180);
		this.radius = 20;
		this.rotationAngle = Math.PI / 2;
	}

	render() {
		noStroke();
		fill("blue");
		circle(SCALE_FACTOR * this.x,
			SCALE_FACTOR * this.y,
			SCALE_FACTOR * this.radius);

		stroke("blue");
		line(SCALE_FACTOR * this.x,
			SCALE_FACTOR * this.y,
			SCALE_FACTOR * this.x + Math.cos(this.rotationAngle) * 30,
			SCALE_FACTOR * this.y + Math.sin(this.rotationAngle) * 30);
	}

	update() {
		this.rotationAngle += this.turnDirection * this.turnSpeed;

		let moveStep = this.movementDirection * this.walkSpeed;

		let newPlayerX = this.x + Math.cos(this.rotationAngle) * moveStep;
		let newPlayerY = this.y + Math.sin(this.rotationAngle) * moveStep;

		// Only move player if no wall is at new position
		if (!grid.hasWallAt(newPlayerX, newPlayerY)) {
			this.x = newPlayerX;
			this.y = newPlayerY;
		}
	}
}

class Ray {
	constructor(rayAngle) {
		this.rayAngle = normaliseAngle(rayAngle);
		this.wallHitX = 0;
		this.wallHitY = 0;
		this.distance = 0;
	}

	cast() {
		let x = 0;
		let y = 0;
		// Move incrementally along the ray until we hit a wall
		for (let c=0; c<1000; c+=0.5) {
			x = player.x + c * Math.cos(this.rayAngle);
			y = player.y + c * Math.sin(this.rayAngle);
			if (grid.hasWallAt(x, y)) {
				break;
			}
		}
		this.wallHitX = x;
		this.wallHitY = y;
		// Distance is used later to find the height of the wall strip we want to render
		this.distance = computeDistance(player.x, player.y, this.wallHitX, this.wallHitY);
	}

	render() {
		stroke("rgba(255, 0, 0, 1.0)");
        line(
            SCALE_FACTOR * player.x,
            SCALE_FACTOR * player.y,
            SCALE_FACTOR * this.wallHitX,
            SCALE_FACTOR * this.wallHitY
        );
	}
}

function normaliseAngle(angle) {
	angle = angle % (2 * Math.PI);
	if (angle < 0) {
		angle = (2 * Math.PI) + angle;
	}
	return angle;
}

var grid = new Map();
var player = new Player();
var rays = [];

function castAllRays() {
	var rayAngle = player.rotationAngle - (FOV_ANGLE / 2);

	rays = [];

	for (let i = 0; i < NUM_RAYS; i++) {
		var ray = new Ray(rayAngle);
		ray.cast();
		rays.push(ray);
		rayAngle += FOV_ANGLE / NUM_RAYS;
	}
}

function draw3DProjection() {
	for (let i = 0; i < NUM_RAYS; i++) {
		ray = rays[i];
		// Remove fishbowl distortion effect
		let correctedDistance = ray.distance * Math.cos(ray.rayAngle - player.rotationAngle);
		let columnHeight = (SCREEN_HEIGHT / correctedDistance) * TILE_SIZE;
		// Use alpha to create old-school "fog" effect when walls are further away
		let alpha = 200 / correctedDistance;
		fill("rgba(225, 225, 225," + alpha + ")");
		noStroke();
		rect(i * WALL_STRIP_WIDTH,
			(SCREEN_HEIGHT / 2) - (columnHeight / 2),
			WALL_STRIP_WIDTH,
			columnHeight
			)
	}
}

function computeDistance(x1, y1, x2, y2) {
	return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function keyPressed() {
	if (keyCode == LEFT_ARROW) {
		player.turnDirection = -1;
	}
	else if (keyCode == RIGHT_ARROW) {
		player.turnDirection = 1;
	} 
	else if (keyCode == UP_ARROW) {
		player.movementDirection = 1;
	}
	else if (keyCode == DOWN_ARROW) {
		player.movementDirection = -1;
	}
}

function keyReleased() {
	if (keyCode == LEFT_ARROW) {
		player.turnDirection = 0;
	}
	else if (keyCode == RIGHT_ARROW) {
		player.turnDirection = 0;
	} 
	else if (keyCode == UP_ARROW) {
		player.movementDirection = 0;
	}
	else if (keyCode == DOWN_ARROW) {
		player.movementDirection = 0;
	}
	return false;
}

function setup() {
	createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
}

function draw() {
	clear("#f3f5f9");
	update();
	draw3DProjection();
	grid.render();
	for (ray of rays) {
		ray.render();
	}
	player.render();
}

function update() {
	player.update();
	castAllRays();
}
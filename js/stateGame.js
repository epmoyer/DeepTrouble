//--------------------------------------------
// StateGame class
//    Core gameplay
//--------------------------------------------

var Gravity = 0.005;
var AtmosphericFriction = 0.02;
var ShipThrustUpVelocity = -1.0;
var ShipThrustDiveVelocity = 0.04;
var ShipThrustSideVelocity = 0.35;

var ShipThrust = 0.20;
var ShipStartAngle = 0;
var ShipExhaustRate = 10;
var ShipExhaustVelocity = 0.6;
var ShipExhaustSpread = Math.PI/7;

var ShipShotVelocity=2.0;
var ShipShotLife=450;
var ShipShotSize=3.0;

var ShipWidth = 36;
var shipRadius = 20;

var ShipNumExplosionParticles = 60;
var ShipExplosionMaxVelocity = 4.0;
var ShipRespawnDelayGameStartTicks = 60 * 1.25; // Respawn delay at inital start
var ShipRespawnAnimationTicks = 60 * 1.8;
var ShipRespawnDelayTicks = 60 * 3;

var PopUpTextLife = 3 * 60;
var PopUpCancelTime = 15; // Ticks to remove a pop-up when canceled

var soundSideThrustTicks = 20;
var soundAscentThrustTicks = 20;


var StateGame = FlynnState.extend({

	init: function(mcp) {
		this._super(mcp);
		
		this.canvasWidth = mcp.canvas.ctx.width;
		this.canvasHeight = mcp.canvas.ctx.height;
		this.center_x = this.canvasWidth/2;
		this.center_y = this.canvasHeight/2;

		this.ship = new Ship(Points.SUB, 2.5,
			this.center_x,
			this.center_y,
			ShipStartAngle, FlynnColors.DODGERBLUE);

		this.ship.visible = true;

		this.gameOver = false;
		this.lives = 3;
		this.lifepolygon = new FlynnPolygon(Points.SUB, FlynnColors.DODGERBLUE);
		this.lifepolygon.setScale(1.2);
        this.lifepolygon.setAngle(0);

		this.score = 0;
		this.highscore = this.mcp.highscores[0][1];

		this.particles = new Particles(this);
		this.projectiles = new FlynnProjectiles(
				new Victor(0,0),                    // Min projectile bounds
			new Victor(this.canvasWidth, this.canvasHeight) // Max projectile bounds
		);

		this.soundSonarPing = new Howl({
            src: ['sounds/sonar_ping.mp3'],
            volume: 0.5
        });
        this.soundBubblesLow = new Howl({
            src: ['sounds/bubbles_low.mp3'],
            volume: 0.5,
            loop: true
        });
        this.soundBubblesHigh = new Howl({
            src: ['sounds/bubbles_high.mp3'],
            volume: 0.5
        });
        this.soundBubblesFast = new Howl({
            src: ['sounds/bubbles_fast.mp3'],
            volume: 0.5,
            loop: true
        });
        this.soundTorpedo = new Howl({
            src: ['sounds/torpedo.mp3'],
            volume: 0.5
        });
        this.playingSoundBubblesFast = false;
        this.playingSoundBubblesSide = false;
        this.playingSoundBubblesAscent = false;

        this.viewport_v = new Victor(0,0);

        this.buttonHandler = [null, null];
        this.buttonHandler[0] = new TwoButton('P1 left', 'P1 right');
        this.buttonHandler[1] = new TwoButton('P2 left', 'P2 right');

        // Timers
		this.mcp.timers.add('soundSideThrust', 0, null);
		this.mcp.timers.add('soundAscentThrust', 0, null);
	
		// Game Clock
		this.gameClock = 0;

		this.sonar_timer = 1.0;

		// Timers
		//this.mcp.timers.add('shipRespawnDelay', ShipRespawnDelayGameStartTicks, null);  // Start game with a delay (for start sound to finish)

		// Set initial ship position (hidden; will respawn into world)
		//this.resetShip();
		//this.hideShip();
	},

	addPoints: function(points, unconditional){
		// Points only count when not visible, unless unconditional
		// Unconditional is used for bonuses,etc. Which may be applied when not visible.
		if(this.ship.visible || unconditional){
			if(Math.floor(this.score / ExtraLifeScore) !== Math.floor((this.score + points) / ExtraLifeScore)){
				// Extra life
				this.lives++;
				this.soundExtraLife.play();
			}
			this.score += points;
		}

		// Update highscore if exceeded
		if (this.score > this.highscore){
			this.highscore = this.score;
		}
	},

	showPopUp: function(popUpText, popUpText2){
		if(typeof(popUpText2)==='undefined'){
			popUpText2 = null;
		}

		this.popUpText = popUpText;
		this.popUpText2 = popUpText2;
		this.popUpLife = PopUpTextLife;
	},

	resetShip: function(){
		this.ship.world_x = ShipStartX;
		this.ship.world_y = ShipStartY;
		this.ship.angle = ShipStartAngle;
		this.ship.vel.x = 0;
		this.ship.vel.y = 0;
		this.ship.visible = true;
	},

	hideShip: function(){
		// Hide (but don't kill) the ship.
		// Used for idle time during level advancement.
		this.engine_sound.stop();
		this.engine_is_thrusting = false;
		this.ship.visible = false;
	},

	doShipDie: function(){
		// Visibility
		this.ship.visible = false;

		// Lives
		this.lives--;
		if(this.lives <= 0){
			this.gameOver = true;
			this.mcp.timers.set('levelCompleteMessage', 0);
			this.mcp.timers.set('levelBonusDelay', 0);
			this.mcp.timers.set('levelBonus', 0);

		}

		// Sounds
		this.engine_sound.stop();
		this.soundPlayerDie.play();

		// Explosion
		this.particles.explosion(
			this.ship.world_x,
			this.ship.world_y,
			this.ship.vel.x,
			this.ship.vel.y,
			ShipNumExplosionParticles,
			ShipExplosionMaxVelocity,
			FlynnColors.YELLOW,
			ParticleTypes.PLAIN);
		this.particles.explosion(
			this.ship.world_x,
			this.ship.world_y,
			this.ship.vel.x,
			this.ship.vel.y,
			ShipNumExplosionParticles / 2,
			ShipExplosionMaxVelocity,
			FlynnColors.YELLOW,
			ParticleTypes.EXHAUST);
		
		// Timers
		this.mcp.timers.set('shipRespawnDelay', ShipRespawnDelayTicks);
		this.mcp.timers.set('shipRespawnAnimation', 0); // Set to zero to deactivate it

		// State flags
		this.ship.human_on_board = false; // Kill the passenger
		this.ship.is_landed = false;
	},

	handleInputs: function(input, paceFactor) {

		if(this.mcp.developerModeEnabled){
			// Metrics toggle
			if (input.virtualButtonIsPressed("dev_metrics")){
				this.mcp.canvas.showMetrics = !this.mcp.canvas.showMetrics;
			}

			// Toggle DEV pacing mode slow mo
			if (input.virtualButtonIsPressed("dev_slow_mo")){
				this.mcp.toggleDevPacingSlowMo();
			}

			// Toggle DEV pacing mode fps 20
			if (input.virtualButtonIsPressed("dev_fps_20")){
				this.mcp.toggleDevPacingFps20();
			}

			// Points
			if (input.virtualButtonIsPressed("dev_add_points")){
				this.addPoints(100);
			}

			// Die
			if (input.virtualButtonIsPressed("dev_die") && this.ship.visible){
				this.doShipDie();
			}

		}
		
		if(!this.ship.visible){
			if (input.virtualButtonIsPressed("UI_enter")){
				if (this.gameOver){
					if(this.mcp.browserSupportsTouch){
						// On touch devices just update high score and go back to menu
						this.mcp.updateHighScores("NONAME", this.score);

						this.mcp.nextState = States.MENU;
					} else {
						this.mcp.nextState = States.END;
					}
					this.mcp.custom.score = this.score;
					return;
				}
			}
			return;
		}

		var player = 0;

		var bEvent = this.buttonHandler[player].update(input, paceFactor);
		// if(bEvent !== null){
		// 	console.log(bEvent);
		// }

		switch(bEvent){
			case ButtonEvent.HoldTapLeft:
				this.soundTorpedo.play();
				this.projectiles.add(
					new Victor(
						this.ship.world_x - ShipWidth/2,
						this.ship.world_y),
					new Victor(-ShipShotVelocity, 0),
					ShipShotLife,
					ShipShotSize,
					FlynnColors.LIGHTSKYBLUE
					);
				break;
			case ButtonEvent.HoldTapRight:
				this.soundTorpedo.play();
				this.projectiles.add(
					new Victor(
						this.ship.world_x + ShipWidth/2,
						this.ship.world_y),
					new Victor(ShipShotVelocity, 0),
					ShipShotLife,
					ShipShotSize,
					FlynnColors.LIGHTSKYBLUE
					);
				break;
			case ButtonEvent.DoubleTap:
				this.mcp.timers.set('soundAscentThrust', soundAscentThrustTicks);
				if(!this.playingSoundBubblesAscent){
					this.soundBubblesHigh.play();
					this.playingSoundBubblesAscent = true;
				}
				this.ship.vel.y += ShipThrustUpVelocity;
				this.particles.exhaust(
					this.ship.world_x,
					this.ship.world_y + shipRadius,
					this.ship.vel.x,
					this.ship.vel.y,
					ShipExhaustRate*4,
					ShipExhaustVelocity*1.4,
					Math.PI/2, // Angle
					ShipExhaustSpread,
					paceFactor
				);
				break;
			case ButtonEvent.TapLeft:
				this.mcp.timers.set('soundSideThrust', soundSideThrustTicks);
				if(!this.playingSoundBubblesSide){
					this.soundBubblesLow.play();
					this.playingSoundBubblesSide = true;
				}
				this.ship.vel.x -= ShipThrustSideVelocity;
				this.particles.exhaust(
					this.ship.world_x + ShipWidth/2,
					this.ship.world_y,
					this.ship.vel.x,
					this.ship.vel.y,
					ShipExhaustRate,
					ShipExhaustVelocity,
					0, // Angle
					ShipExhaustSpread,
					paceFactor
				);
				break;
			case ButtonEvent.TapRight:
				this.mcp.timers.set('soundSideThrust', soundSideThrustTicks);
				if(!this.playingSoundBubblesSide){
					this.soundBubblesLow.play();
					this.playingSoundBubblesSide = true;
				}
				this.ship.vel.x += ShipThrustSideVelocity;
				this.particles.exhaust(
					this.ship.world_x - ShipWidth/2,
					this.ship.world_y,
					this.ship.vel.x,
					this.ship.vel.y,
					ShipExhaustRate,
					ShipExhaustVelocity,
					Math.PI, // Angle
					ShipExhaustSpread,
					paceFactor
				);
				break;
			case ButtonEvent.DoubleHold:
				if (!this.playingSoundBubblesFast) {
					this.soundBubblesFast.play();
					this.playingSoundBubblesFast = true;
				}
				this.ship.vel.y += ShipThrustDiveVelocity;
				var openingWidth = 25;
				this.particles.exhaust(
					this.ship.world_x + Math.random() * openingWidth - openingWidth/2,
					this.ship.world_y + shipRadius,
					this.ship.vel.x,
					this.ship.vel.y,
					1, // Rate
					0,
					Math.PI, // Angle
					ShipExhaustSpread,
					paceFactor
				);
				break;
			default:
				if(this.playingSoundBubblesFast){
					this.playingSoundBubblesFast = false;
					this.soundBubblesFast.stop();
				}
		}

		if(!this.mcp.timers.isRunning('soundSideThrust') && this.playingSoundBubblesSide){
			this.soundBubblesLow.stop();
			this.playingSoundBubblesSide = false;
		}
		if(!this.mcp.timers.isRunning('soundAscentThrust') && this.playingSoundBubblesAscent){
			this.soundBubblesHigh.stop();
			this.playingSoundBubblesAscent = false;
		}
	},

	update: function(paceFactor) {
		var i, len, b, numOusideEnemies, outsideEnemyAngles;

		this.gameClock += paceFactor;

		this.sonar_timer -= (1/60.0) * paceFactor;
        if (this.sonar_timer<0){
            this.sonar_timer = SonarPingIntervalSec;
            this.soundSonarPing.play();
        }

		if (this.ship.visible){
			// Update ship
			this.ship.vel.y += Gravity * paceFactor;
			this.ship.vel.x *= Math.pow((1-AtmosphericFriction), paceFactor);
			this.ship.vel.y *= Math.pow((1-AtmosphericFriction), paceFactor);
			this.ship.world_x += this.ship.vel.x * paceFactor;
			this.ship.world_y += this.ship.vel.y * paceFactor;
		}
		else{
			// Ship is not visible
			if(!this.gameOver){
				if(this.mcp.timers.hasExpired('shipRespawnDelay')){
					// Start the respawn animation timer (which also triggers the animation)
					this.mcp.timers.set('shipRespawnAnimation', ShipRespawnAnimationTicks);
					this.soundShipRespawn.play();
				}
				if(this.mcp.timers.hasExpired('shipRespawnAnimation')){
					// Respawn the ship
					this.resetShip();
				}
			}
		}
		
		var fudgeFactor = 4; //TODO:fix
		if(this.ship.world_y > this.canvasHeight - (shipRadius+fudgeFactor)){
			this.ship.world_y = this.canvasHeight - (shipRadius+fudgeFactor);
			this.ship.vel.y = 0;
		}
		if(this.ship.world_y < shipRadius){
			this.ship.world_y = shipRadius;
			this.ship.vel.y = 0;
		}
		if(this.ship.world_x > this.canvasWidth - shipRadius){
			this.ship.world_x = this.canvasWidth - shipRadius;
			this.ship.vel.x = 0;
		}
		if(this.ship.world_x < shipRadius){
			this.ship.world_x = shipRadius;
			this.ship.vel.x = 0;
		}

		//-------------------
		// Projectiles
		//-------------------
		this.projectiles.update(paceFactor);
		for(i=0, len=this.projectiles.projectiles.length; i<len; i++){
			if(Math.random()< 0.10){
				this.particles.bubble(
					this.projectiles.projectiles[i].world_position_v.x,
					this.projectiles.projectiles[i].world_position_v.y,
					this.projectiles.projectiles[i].velocity_v.x * 0.5,
					this.projectiles.projectiles[i].velocity_v.y * 0.5
					);
			}
		}
		// // Collision detect
		// for(i=0, len=this.projectiles.projectiles.length; i<len; i++){
		// 	if(this.ship.visible && this.ship.hasPoint(
		// 								this.projectiles.projectiles[i].world_position_v.x,
		// 								this.projectiles.projectiles[i].world_position_v.y)){
		// 		this.doShipDie();
		// 		// Remove projectile
		// 		this.projectiles.projectiles.splice(i, 1);
		// 		len--;
		// 		i--;
		// 	}
		// }

		//-------------------
		// PopUps
		//-------------------
		// Life
		// var oldPopUpLife = this.popUpLife;
		// this.popUpLife -= paceFactor;

		// // Expiration
		// if ((this.popUpLife <= 0) && (oldPopUpLife > 0)){
		// 	// PopUp Expired
		// 	this.popUpThrustActive = false;
		// 	this.popUpFireActive = false;
		// }


		// Particles
		this.particles.update(paceFactor);
	},

	render: function(ctx){
		ctx.clearAll();

		// PopUp Text
		// if(this.popUpLife > 0){
		// 	   ctx.vectorText();
		// 	   if(this.popUpText2){
		//	       ctx.vectorText()
		//     }
		// }

		// Player
		this.ship.draw(ctx, this.viewport_v.x, this.viewport_v.y);

		// Particles
		this.particles.draw(ctx, this.viewport_v.x, this.viewport_v.y);

		// Projectiles
		this.projectiles.draw(ctx, this.viewport_v);


		// Scores
		//ctx.vectorText(this.score, 3, 15, 15, null, FlynnColors.GREEN);
		//ctx.vectorText(this.highscore, 3, this.canvasWidth - 6	, 15, 0 , FlynnColors.GREEN);

		// Remaining Lives
		//for(var i=0; i<this.lives; i++){
		//	ctx.drawPolygon(this.lifepolygon, 20+20*i, 55);
		//}

		ctx.vectorStart(FlynnColors.BLUE);
		ctx.vectorMoveTo(0, this.canvasHeight-2);
		ctx.vectorLineTo(this.canvasWidth, this.canvasHeight-2);
		ctx.vectorEnd();


		//------------
		// Text
		//------------

		// Game Over
		if(this.gameOver){
			ctx.vectorText("GAME OVER", 6, null, 200, null, FlynnColors.ORANGE);
			ctx.vectorText("PRESS <ENTER>", 2, null, 250, null, FlynnColors.ORANGE);
		}
	}
});
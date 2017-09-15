//--------------------------------------------
// StateGame class
//    Core gameplay
//--------------------------------------------
var Game = Game || {}; // Create namespace

(function () { "use strict";

Game.StateGame = Flynn.State.extend({

    GRAVITY: 0.005,
    ATMOSPHERIC_FRICTION: 0.02,
    SHIP_THRUST_UP_VELOCITY: -1.0,
    SHIP_THRUST_DIVE_VELOCITY: 0.04,
    SHIP_THRUST_SIDE_VELOCITY: 0.35,

    SHIP_THRUST: 0.20,
    SHIP_START_ANGLE: 0,
    SHIP_EXHAUST_RATE: 10,
    SHIP_EXHAUST_VELOCITY: 0.6,
    SHIP_EXHAUST_SPREAD: Math.PI/7,

    SHIP_SHOT_VELOCITY:2.0,
    SHIP_SHOT_LIFE: 450,
    SHIP_SHOT_SIZE: 3.0,

    SHIP_WIDTH: 36,
    SHIP_RADIUS: 20,

    SHIP_NUM_EXPLOSION_PARTICLES: 60,
    SHIP_EXPLOSION_MAX_VELOCITY: 4.0,
    SHIP_RESPAWN_DELAY_GAME_START_TICKS: 60 * 1.25, // Respawn delay at inital start
    SHIP_RESPAWN_ANIMATION_TICKS: 60 * 1.8,
    SHIP_RESPAWN_DELAY_TICKS: 60 * 3,

    POP_UP_TEXT_LIFE: 3 * 60,
    POP_UP_CANCEL_TIME: 15, // Ticks to remove a pop-up when canceled

    SOUND_SIDE_THRUST_TICKS: 20,
    SOUND_ASCENT_THRUST_TICKS: 20,
    SOUND_DESCENT_THRUST_TICKS: 20,

    NUM_PLAYERS: 2,

    init: function() {
        
        this.center = new Victor(Game.CANVAS_WIDTH/2, Game.CANVAS_HEIGHT/2);

        this.ships = [];
        for(var i =0; i<this.NUM_PLAYERS; i++){
            this.ships[i] = new Game.Ship(
                Game.Points.SUB,
                i === 0 ? Flynn.Colors.DODGERBLUE : '#a00000',
                2.5, // scale
                new Victor(
                    this.center.x + (i===0 ? -200 : 200),
                    this.center.y)
                );
            this.ships[i].setAngle(this.SHIP_START_ANGLE);
        }

        this.gameOver = false;
        this.lives = 3;
        this.lifepolygon = new Flynn.Polygon(
            Game.Points.SUB,
            Flynn.Colors.DODGERBLUE,
            1.2, // scale
            new Victor(0,0),
            false, // constrained
            true   // is_world
            );
        this.lifepolygon.setAngle(0);

        Game.config.score = [0, 0];

        this.particles = new Game.Particles(this);
        this.projectiles = new Flynn.Projectiles(
            new Flynn.Rect(0, 0, Game.CANVAS_WIDTH, Game.CANVAS_HEIGHT), 
            false // is_world
            );


        this.playingSoundSideThrust = false;
        this.playingSoundAscentThrust = false;
        this.playingSoundDescentThrust = false;

        this.buttonHandler = [null, null];
        this.buttonHandler[0] = new Game.TwoButton('P1 left', 'P1 right');
        this.buttonHandler[1] = new Game.TwoButton('P2 left', 'P2 right');

        // Timers
        Flynn.mcp.timers.add('soundSideThrust', 0, null);
        Flynn.mcp.timers.add('soundAscentThrust', 0, null);
        Flynn.mcp.timers.add('soundDescentThrust', 0, null);
    
        // Game Clock
        this.game_clock = 0;

        this.sonar_timer = 1.0;

        // Timers
        //Flynn.mcp.timers.add('shipRespawnDelay', this.SHIP_RESPAWN_DELAY_GAME_START_TICKS, null);  // Start game with a delay (for start sound to finish)

        // Set initial ship position (hidden; will respawn into world)
        //this.resetShip();
        //this.hideShip();

        this.controlsMenu = new Game.ControlsMenu(
            {x:10, y:10}, 
            2, //scale
            Flynn.Colors.GRAY);
    },

    addPoints: function(points, player_index, unconditional){
        // Points only count when not visible, unless unconditional
        // Unconditional is used for bonuses,etc. Which may be applied when not visible.
        if(this.ships[player_index].visible || unconditional){
            // if(Math.floor(Game.config.score / ExtraLifeScore) !== Math.floor((Game.config.score + points) / ExtraLifeScore)){
            //     // Extra life
            //     this.lives++;
            //     Game.sounds.extra_life.play();
            // }
            Game.config.score[player_index] += points;
        }

        // Update highscore if exceeded
        // if (Game.config.score > this.highscore){
        //     this.highscore = Game.config.score;
        // }
    },

    showPopUp: function(pop_up_text, pop_up_text2){
        if(typeof(pop_up_text2)==='undefined'){
            pop_up_text2 = null;
        }

        this.pop_up_text = pop_up_text;
        this.pop_up_text2 = pop_up_text2;
        this.popUpLife = this.POP_UP_TEXT_LIFE;
    },

    resetShip: function(player_index){
        this.ships[player_index].position.x = ShipStartX;
        this.ships[player_index].position.y = ShipStartY;
        this.ships[player_index].angle = this.SHIP_START_ANGLE;
        this.ships[player_index].vel.x = 0;
        this.ships[player_index].vel.y = 0;
        this.ships[player_index].visible = true;
    },

    doShipDie: function(){
        // Visibility
        this.ship.visible = false;

        // Lives
        this.lives--;
        if(this.lives <= 0){
            this.gameOver = true;
            Flynn.mcp.timers.set('levelCompleteMessage', 0);
            Flynn.mcp.timers.set('levelBonusDelay', 0);
            Flynn.mcp.timers.set('levelBonus', 0);
        }

        // Sounds
        this.engine_sound.stop();
        Game.sounds.player_die.play();

        // Explosion
        this.particles.explosion(
            this.ship.position.x,
            this.ship.position.y,
            this.ship.vel.x,
            this.ship.vel.y,
            this.SHIP_NUM_EXPLOSION_PARTICLES,
            this.SHIP_EXPLOSION_MAX_VELOCITY,
            Flynn.Colors.YELLOW,
            Game.ParticleTypes.PLAIN);
        this.particles.explosion(
            this.ship.position.x,
            this.ship.position.y,
            this.ship.vel.x,
            this.ship.vel.y,
            this.SHIP_NUM_EXPLOSION_PARTICLES / 2,
            this.SHIP_EXPLOSION_MAX_VELOCITY,
            Flynn.Colors.YELLOW,
            Game.ParticleTypes.EXHAUST);
        
        // Timers
        Flynn.mcp.timers.set('shipRespawnDelay', this.SHIP_RESPAWN_DELAY_TICKS);
        Flynn.mcp.timers.set('shipRespawnAnimation', 0); // Set to zero to deactivate it
    },

    handleInputs: function(input, pace_factor) {

        if(Flynn.mcp.developerModeEnabled){
            // Metrics toggle
            if (input.virtualButtonWasPressed("dev_metrics")){
                Flynn.mcp.canvas.showMetrics = !Flynn.mcp.canvas.showMetrics;
            }

            // Toggle DEV pacing mode slow mo
            if (input.virtualButtonWasPressed("dev_slow_mo")){
                Flynn.mcp.toggleDevPacingSlowMo();
            }

            // Toggle DEV pacing mode fps 20
            if (input.virtualButtonWasPressed("dev_fps_20")){
                Flynn.mcp.toggleDevPacingFps20();
            }

            // Points
            if (input.virtualButtonWasPressed("dev_add_points")){
                //this.addPoints(100);
            }

            // Die
            if (input.virtualButtonWasPressed("dev_die") && this.ship.visible){
                this.doShipDie();
            }

        }

        // Config
        if (input.virtualButtonWasPressed("UI_escape")){
            Flynn.mcp.changeState(Game.States.CONFIG);
        }
        
        // if(!this.ship.visible){
        //  if (input.virtualButtonWasPressed("UI_enter")){
        //      if (this.gameOver){
        //          if(Flynn.mcp.browserSupportsTouch){
        //              // On touch devices just update high score and go back to menu
        //              Flynn.mcp.updateHighScores("NONAME", Game.config.score);

        //              Flynn.mcp.changnStae(States.MENU);
        //          } else {
        //              Flynn.mcp.changnStae(States.END);
        //          }
        //          Game.config.score = Game.config.score;
        //          return;
        //      }
        //  }
        //  return;
        // }


        for(var player_index=0; player_index<this.NUM_PLAYERS; ++player_index){
            var bEvent = this.buttonHandler[player_index].update(input, pace_factor);

            switch(bEvent){
                case Game.ButtonEvent.HoldTapLeft:
                    Game.sounds.torpedo.play();
                    this.projectiles.add(
                        new Victor(
                            this.ships[player_index].position.x - this.SHIP_WIDTH/2,
                            this.ships[player_index].position.y),
                        new Victor(-this.SHIP_SHOT_VELOCITY, 0),
                        this.SHIP_SHOT_LIFE,
                        this.SHIP_SHOT_SIZE,
                        Flynn.Colors.LIGHTSKYBLUE
                        );
                    break;
                case Game.ButtonEvent.HoldTapRight:
                    Game.sounds.torpedo.play();
                    this.projectiles.add(
                        new Victor(
                            this.ships[player_index].position.x + this.SHIP_WIDTH/2,
                            this.ships[player_index].position.y),
                        new Victor(this.SHIP_SHOT_VELOCITY, 0),
                        this.SHIP_SHOT_LIFE,
                        this.SHIP_SHOT_SIZE,
                        Flynn.Colors.LIGHTSKYBLUE
                        );
                    break;
                case Game.ButtonEvent.DoubleTap:
                    Flynn.mcp.timers.set('soundAscentThrust', this.SOUND_ASCENT_THRUST_TICKS);
                    if(!Game.sounds.ascent_thrust.playing()){
                        Game.sounds.ascent_thrust.play();
                    }
                    this.ships[player_index].vel.y += this.SHIP_THRUST_UP_VELOCITY;
                    this.particles.exhaust(
                        this.ships[player_index].position.x,
                        this.ships[player_index].position.y + this.SHIP_RADIUS,
                        this.ships[player_index].vel.x,
                        this.ships[player_index].vel.y,
                        this.SHIP_EXHAUST_RATE*4,
                        this.SHIP_EXHAUST_VELOCITY*1.4,
                        Math.PI/2, // Angle
                        this.SHIP_EXHAUST_SPREAD,
                        pace_factor
                    );
                    break;
                case Game.ButtonEvent.TapLeft:
                    Flynn.mcp.timers.set('soundSideThrust', this.SOUND_SIDE_THRUST_TICKS);
                    if(!Game.sounds.side_thrust.playing()){
                        Game.sounds.side_thrust.play();
                    }
                    this.ships[player_index].vel.x -= this.SHIP_THRUST_SIDE_VELOCITY;
                    this.particles.exhaust(
                        this.ships[player_index].position.x + this.SHIP_WIDTH/2,
                        this.ships[player_index].position.y,
                        this.ships[player_index].vel.x,
                        this.ships[player_index].vel.y,
                        this.SHIP_EXHAUST_RATE,
                        this.SHIP_EXHAUST_VELOCITY,
                        0, // Angle
                        this.SHIP_EXHAUST_SPREAD,
                        pace_factor
                    );
                    break;
                case Game.ButtonEvent.TapRight:
                    Flynn.mcp.timers.set('soundSideThrust', this.SOUND_SIDE_THRUST_TICKS);
                    if(!Game.sounds.side_thrust.playing()){
                        Game.sounds.side_thrust.play();
                    }
                    this.ships[player_index].vel.x += this.SHIP_THRUST_SIDE_VELOCITY;
                    this.particles.exhaust(
                        this.ships[player_index].position.x - this.SHIP_WIDTH/2,
                        this.ships[player_index].position.y,
                        this.ships[player_index].vel.x,
                        this.ships[player_index].vel.y,
                        this.SHIP_EXHAUST_RATE,
                        this.SHIP_EXHAUST_VELOCITY,
                        Math.PI, // Angle
                        this.SHIP_EXHAUST_SPREAD,
                        pace_factor
                    );
                    break;
                case Game.ButtonEvent.DoubleHold:
                    Flynn.mcp.timers.set('soundDescentThrust', this.SOUND_DESCENT_THRUST_TICKS);
                    if (!Game.sounds.descent_thrust.playing()) {
                        Game.sounds.descent_thrust.play();
                    }
                    this.ships[player_index].vel.y += this.SHIP_THRUST_DIVE_VELOCITY;
                    var openingWidth = 25;
                    this.particles.exhaust(
                        this.ships[player_index].position.x + Math.random() * openingWidth - openingWidth/2,
                        this.ships[player_index].position.y + this.SHIP_RADIUS,
                        this.ships[player_index].vel.x,
                        this.ships[player_index].vel.y,
                        1, // Rate
                        0,
                        Math.PI, // Angle
                        this.SHIP_EXHAUST_SPREAD,
                        pace_factor
                    );
                    break;
            }

            if(!Flynn.mcp.timers.isRunning('soundSideThrust') && Game.sounds.side_thrust.playing()){
                Game.sounds.side_thrust.stop();
            }
            if(!Flynn.mcp.timers.isRunning('soundAscentThrust') && Game.sounds.ascent_thrust.playing()){
                Game.sounds.ascent_thrust.stop();
            }
            if(!Flynn.mcp.timers.isRunning('soundDescentThrust') && Game.sounds.descent_thrust.playing()){
                Game.sounds.descent_thrust.stop();
            }
        }
    },

    update: function(pace_factor) {
        var i, len, b, numOusideEnemies, outsideEnemyAngles;

        this.game_clock += pace_factor;

        this.sonar_timer -= (1/60.0) * pace_factor;
        if (this.sonar_timer<0 && Flynn.mcp.optionManager.getOption('musicEnabled')){
            this.sonar_timer = Game.config.SONAR_PING_INTERVAL_SEC;
            Game.sounds.sonar_ping.play();
        }

        for(var player_index=0; player_index<this.NUM_PLAYERS; ++player_index){
            if (this.ships[player_index].visible){
                // Update ship
                this.ships[player_index].vel.y += this.GRAVITY * pace_factor;
                this.ships[player_index].vel.x *= Math.pow((1-this.ATMOSPHERIC_FRICTION), pace_factor);
                this.ships[player_index].vel.y *= Math.pow((1-this.ATMOSPHERIC_FRICTION), pace_factor);
                this.ships[player_index].position.x += this.ships[player_index].vel.x * pace_factor;
                this.ships[player_index].position.y += this.ships[player_index].vel.y * pace_factor;
            }
            else{
                // Ship is not visible
                if(!this.gameOver){
                    if(Flynn.mcp.timers.hasExpired('shipRespawnDelay')){
                        // Start the respawn animation timer (which also triggers the animation)
                        Flynn.mcp.timers.set('shipRespawnAnimation', this.SHIP_RESPAWN_ANIMATION_TICKS);
                        Game.sounds.ship_respawn.play();
                    }
                    if(Flynn.mcp.timers.hasExpired('shipRespawnAnimation')){
                        // Respawn the ship
                        this.resetShip();
                    }
                }
            }
            
            var fudgeFactor = 4; //TODO:fix
            if(this.ships[player_index].position.y > Game.CANVAS_HEIGHT - (this.SHIP_RADIUS+fudgeFactor)){
                this.ships[player_index].position.y = Game.CANVAS_HEIGHT - (this.SHIP_RADIUS+fudgeFactor);
                this.ships[player_index].vel.y = 0;
            }
            if(this.ships[player_index].position.y < this.SHIP_RADIUS){
                this.ships[player_index].position.y = this.SHIP_RADIUS;
                this.ships[player_index].vel.y = 0;
            }
            if(this.ships[player_index].position.x > Game.CANVAS_WIDTH - this.SHIP_RADIUS){
                this.ships[player_index].position.x = Game.CANVAS_WIDTH - this.SHIP_RADIUS;
                this.ships[player_index].vel.x = 0;
            }
            if(this.ships[player_index].position.x < this.SHIP_RADIUS){
                this.ships[player_index].position.x = this.SHIP_RADIUS;
                this.ships[player_index].vel.x = 0;
            }
        }

        //-------------------
        // Projectiles
        //-------------------
        this.projectiles.update(pace_factor);
        for(i=0, len=this.projectiles.projectiles.length; i<len; i++){
            if(Math.random()< 0.10){
                this.particles.bubble(
                    this.projectiles.projectiles[i].position.x,
                    this.projectiles.projectiles[i].position.y,
                    this.projectiles.projectiles[i].velocity.x * 0.5,
                    this.projectiles.projectiles[i].velocity.y * 0.5
                    );
            }
        }
        // // Collision detect
        // for(i=0, len=this.projectiles.projectiles.length; i<len; i++){
        //  if(this.ship.visible && this.ship.hasPoint(
        //                              this.projectiles.projectiles[i].position.x,
        //                              this.projectiles.projectiles[i].position.y)){
        //      this.doShipDie();
        //      // Remove projectile
        //      this.projectiles.projectiles.splice(i, 1);
        //      len--;
        //      i--;
        //  }
        // }

        //-------------------
        // PopUps
        //-------------------
        // Life
        // var oldPopUpLife = this.popUpLife;
        // this.popUpLife -= pace_factor;

        // // Expiration
        // if ((this.popUpLife <= 0) && (oldPopUpLife > 0)){
        //  // PopUp Expired
        //  this.popUpThrustActive = false;
        //  this.popUpFireActive = false;
        // }


        // Particles
        this.particles.update(pace_factor);
    },

    render: function(ctx){
        this.controlsMenu.render(ctx);

        // PopUp Text
        // if(this.popUpLife > 0){
        //     ctx.vectorText();
        //     if(this.popUpText2){
        //         ctx.vectorText()
        //     }
        // }

        // Player
        for(var player_index=0; player_index<this.NUM_PLAYERS; ++player_index){
            this.ships[player_index].render(ctx);
            this.ships[player_index].render(ctx);
        }

        // Particles
        this.particles.render(ctx);

        // Projectiles
        this.projectiles.render(ctx);


        // Scores
        //ctx.vectorText(Game.config.score, 3, 15, 15, null, Flynn.Colors.GREEN);
        //ctx.vectorText(this.highscore, 3, Game.CANVAS_WIDTH - 6    , 15, 0 , Flynn.Colors.GREEN);

        // Remaining Lives
        //for(var i=0; i<this.lives; i++){
        //  ctx.drawPolygon(this.lifepolygon, 20+20*i, 55);
        //}

        ctx.vectorStart(Flynn.Colors.BLUE);
        ctx.vectorMoveTo(0, Game.CANVAS_HEIGHT-2);
        ctx.vectorLineTo(Game.CANVAS_WIDTH, Game.CANVAS_HEIGHT-2);
        ctx.vectorEnd();


        //------------
        // Text
        //------------

        // Game Over
        if(this.gameOver){
            ctx.vectorText("GAME OVER", 6, null, 200, null, Flynn.Colors.ORANGE);
            ctx.vectorText("PRESS <ENTER>", 2, null, 250, null, Flynn.Colors.ORANGE);
        }
    }
});

}()); // "use strict" wrapper
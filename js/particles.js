var Game = Game || {}; // Create namespace

(function () { "use strict";

Game.ParticleTypes = {
    DEBRIS:    1,
    BUBBLE:    2,
    PLAIN:     3,
};

Game.Particle = Class.extend({
    PARTICLE_LIFE: 150,
    PARTICLE_LIFE_VARIATION: 20,
    PARTICLE_FRICTION: 0.99,
    PARTICLE_GRAVITY: 0.06,
    BUBBLE_GRAVITY: -0.01,
    BUBBLE_LIFE: 500,
    BUBBLE_LIFE_VARIATION: 250,

    init: function(particles, x, y, dx, dy, color, type, gameState){
        this.particles = particles;
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.color = color;
        this.type = type;
        this.gameState = gameState;

        if(type == Game.ParticleTypes.BUBBLE){
            this.life = this.BUBBLE_LIFE + (Math.random()-0.5) * this.BUBBLE_LIFE_VARIATION;
        } else {
            this.life = this.PARTICLE_LIFE + (Math.random()-0.5) * this.PARTICLE_LIFE_VARIATION;
        }
    },

    update: function(pace_factor) {
        var isAlive = true;
        // Decay and die
        this.life -= pace_factor;
        if(this.life <= 0){
            // Kill particle
            isAlive = false;
        }
        else{
            // Gravity
            if(this.type == Game.ParticleTypes.BUBBLE){
                this.dy += this.BUBBLE_GRAVITY * pace_factor;
            }
            else{
                this.dy += this.PARTICLE_GRAVITY * pace_factor;
            }
            // Add impulse
            this.x += this.dx * pace_factor;
            this.y += this.dy * pace_factor;
            // Decay impulse
            this.dx *= Math.pow(this.PARTICLE_FRICTION, pace_factor);
            this.dy *= Math.pow(this.PARTICLE_FRICTION, pace_factor);
        }
        return isAlive;
    },

    render: function(ctx) {
        if(this.type == Game.ParticleTypes.PLAIN){
            ctx.fillStyle=this.color;
        } else {
            //ctx.fillStyle=FlynnColors.RED;
            var brightness = 128 * (this.life / this.BUBBLE_LIFE);
            brightness = Math.max(Math.floor(brightness), 0);
            var dim_brightness = Math.max(brightness - 20, 0);
            ctx.fillStyle = Flynn.Util.rgbToHex(dim_brightness, dim_brightness, brightness);
        }
        //console.log(this.x, this.y);
        ctx.fillRect(this.x, this.y, 2, 2);
    }

});

Game.Particles = Class.extend({

    EXHAUST_VELOCITY_VARIATION_FACTOR: 0.9,

    init: function(gameState){
        this.particles=[];
        this.gameState = gameState;
        this.fractionalExhaustParticles = 0;
    },

    reset: function(){
        this.init(this.gameState);
    },

    bubble: function(x, y, dx, dy){
        this.particles.push(new Game.Particle(
                this,
                x,
                y,
                dx,
                dy,
                Flynn.Colors.RED, // color (Ignored for bubbles)
                Game.ParticleTypes.BUBBLE,
                this.gameState
            ));
    },

    explosion: function(x, y, dx, dy, quantity, max_velocity, color, particle_type) {
        for(var i=0; i<quantity; i++){
            theta = Math.random() * Math.PI * 2;
            velocity = Math.random() * max_velocity;
            this.particles.push(new Particle(
                this,
                x,
                y,
                Math.cos(theta) * velocity + dx,
                Math.sin(theta) * velocity + dy,
                color,
                particle_type,
                this.gameState
            ));
        }
    },

    exhaust: function(x, y, dx, dy, particle_rate, velocity, angle, spread, pace_factor){

        // Determine fractional (float) number of particles to spawn.  Remeber remainder (decimal portion)..
        // ..for next call.  Spawn the integer portion.
        var num_particles_float = particle_rate * pace_factor + this.fractionalExhaustParticles;
        var num_particles_int = Math.floor(num_particles_float);
        this.fractionalExhaustParticles = num_particles_float - num_particles_int;

        for(var i=0; i<num_particles_int; i++){
            var theta = angle - (spread/2) + Math.random() * spread;
            var exit_velocity =
                velocity - (velocity * this.EXHAUST_VELOCITY_VARIATION_FACTOR / 2) +
                Math.random() * velocity * this.EXHAUST_VELOCITY_VARIATION_FACTOR;
            var exhaust_dx = Math.cos(theta) * exit_velocity + dx;
            var exhaust_dy = Math.sin(theta) * exit_velocity + dy;
            this.particles.push(new Game.Particle(
                this,
                x - (dx * Math.random() * pace_factor) + (Math.random() * exhaust_dx * pace_factor), // Advance by 1 source frame and jitter by 1 tick in exhaust direction
                y - (dy * Math.random() * pace_factor) + (Math.random() * exhaust_dy * pace_factor), // Advance by 1 source frame and jitter by 1 tick in exhaust direction
                exhaust_dx,
                exhaust_dy,
                null,
                Game.ParticleTypes.BUBBLE,
                this.gameState
            ));
        }
    },

    update: function(pace_factor) {
        for(var i=0, len=this.particles.length; i<len; i+=1){
            if(!this.particles[i].update(pace_factor)){
                // Particle has died.  Remove it
                this.particles.splice(i, 1);
                len--;
                i--;
            }
        }
    },

    render: function(ctx) {
        for(var i=0, len=this.particles.length; i<len; i+=1){
            this.particles[i].render(ctx);
        }
    }
});

}()); // "use strict" wrapper
var ParticleLife = 150;
var ParticleLifeVariation = 20;
var ExhaustVelocityVariationFactor = 0.9;
var ParticleFriction = 0.99;
var ParticleGravity = 0.06;
var BubbleGravity = -0.01;
var BubbleLife = 500;
var BubbleLifeVariation = 30;

var ParticleTypes = {
    DEBRIS:    1,
    BUBBLE:    2,
};

var Particle = Class.extend({
    init: function(particles, x, y, dx, dy, color, type, gameState){
        this.particles = particles;
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.color = color;
        this.type = type;
        this.gameState = gameState;

        if(type == ParticleTypes.BUBBLE){
            this.life = BubbleLife + (Math.random()-0.5) * BubbleLifeVariation;
        } else {
            this.life = ParticleLife + (Math.random()-0.5) * ParticleLifeVariation;
        }
    },

    update: function(paceFactor) {
        var isAlive = true;
        // Decay and die
        this.life -= paceFactor;
        if(this.life <= 0){
            // Kill particle
            isAlive = false;
        }
        else{
            // Gravity
            if(this.type == ParticleTypes.BUBBLE){
                this.dy += BubbleGravity * paceFactor;
            }
            else{
                this.dy += ParticleGravity * paceFactor;
            }
            // Add impulse
            this.x += this.dx * paceFactor;
            this.y += this.dy * paceFactor;
            // Decay impulse
            this.dx *= Math.pow(ParticleFriction, paceFactor);
            this.dy *= Math.pow(ParticleFriction, paceFactor);
        }
        return isAlive;
    },

    draw: function(ctx, viewport_x, viewport_y) {
        if(this.type == ParticleTypes.PLAIN){
            ctx.fillStyle=this.color;
        } else {
            //ctx.fillStyle=FlynnColors.RED;
            var brightness = 128 * (this.life / BubbleLife);
            brightness = Math.floor(brightness);
            if(brightness<0){
                brightness = 0;
            }
            ctx.fillStyle = flynnRgbToHex(brightness, brightness, brightness);
        }
        //console.log(this.x, this.y);
        ctx.fillRect(this.x - viewport_x,this.y - viewport_y,2,2);
    }

});

var Particles = Class.extend({

    init: function(gameState){
        this.particles=[];
        this.gameState = gameState;
        this.fractionalExhaustParticles = 0;
    },

    reset: function(){
        this.init(this.gameState);
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

    exhaust: function(x, y, dx, dy, particle_rate, velocity, angle, spread, paceFactor){

        // Determine fractional (float) number of particles to spawn.  Remeber remainder (decimal portion)..
        // ..for next call.  Spawn the integer portion.
        var num_particles_float = particle_rate * paceFactor + this.fractionalExhaustParticles;
        var num_particles_int = Math.floor(num_particles_float);
        this.fractionalExhaustParticles = num_particles_float - num_particles_int;

        for(var i=0; i<num_particles_int; i++){
            var theta = angle - (spread/2) + Math.random() * spread;
            var exit_velocity =
                velocity - (velocity * ExhaustVelocityVariationFactor / 2) +
                Math.random() * velocity * ExhaustVelocityVariationFactor;
            var exhaust_dx = Math.cos(theta) * exit_velocity + dx;
            var exhaust_dy = Math.sin(theta) * exit_velocity + dy;
            this.particles.push(new Particle(
                this,
                x - (dx * Math.random() * paceFactor) + (Math.random() * exhaust_dx * paceFactor), // Advance by 1 source frame and jitter by 1 tick in exhaust direction
                y - (dy * Math.random() * paceFactor) + (Math.random() * exhaust_dy * paceFactor), // Advance by 1 source frame and jitter by 1 tick in exhaust direction
                exhaust_dx,
                exhaust_dy,
                null,
                ParticleTypes.BUBBLE,
                this.gameState
            ));
        }
    },

    update: function(paceFactor) {
        for(var i=0, len=this.particles.length; i<len; i+=1){
            if(!this.particles[i].update(paceFactor)){
                // Particle has died.  Remove it
                this.particles.splice(i, 1);
                len--;
                i--;
            }
        }
    },

    draw: function(ctx, viewport_x, viewport_y) {
        for(var i=0, len=this.particles.length; i<len; i+=1){
            this.particles[i].draw(ctx, viewport_x, viewport_y);
        }
    }
});
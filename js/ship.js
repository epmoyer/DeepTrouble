var Game = Game || {}; // Create namespace

(function () { "use strict";

Game.Ship = Flynn.Polygon.extend({

    init: function(points, color, scale, position){
        this._super(
            points,
            color,
            scale,
            position,
            false, // constrained
            true //is_world
            );

        this.dead = false;

        this.vel = {
            x: 0,
            y: 0
        };
    },
    
    // render() is performed in super class
});

}()); // "use strict" wrapper
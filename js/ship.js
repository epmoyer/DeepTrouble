Game.Ship = Flynn.Polygon.extend({


    init: function(points, color, scale, position){
        this._super(
            points,
            color,
            scale,
            position);

        this.dead = false;

        this.vel = {
            x: 0,
            y: 0
        };
    },

    // render() is performed in super class
});
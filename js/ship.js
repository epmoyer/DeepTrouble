var Ship = FlynnPolygon.extend({

	maxX: null,
	maxY: null,

	init: function(p, s, world_x, world_y, angle, color){
		this._super(p, color);

		this.angle = angle;
		this.scale = s;

		this.world_x = world_x;
		this.world_y = world_y;

		this.visible = true;
		this.dead = false;

		this.setScale(s);

		this.vel = {
			x: 0,
			y: 0
		};
	},

	rotate_by: function(angle){
		this.angle += angle;
		this.setAngle(this.angle);
	},

	collide: function(polygon){
		if (!this.visible){
			return false;
		}
		for(i=0, len=this.points.length -2; i<len; i+=2){
			var x = this.points[i] + this.world_y;
			var y = this.points[i+1] + this.world_y;

			if (polygon.hasPoint(x,y)){
				return true;
			}
		}
		return false;
	},

	hasPoint: function(world_x, world_y) {
		return this._super(this.world_x, this.world_y, world_x, world_y);
	},

	update: function(paceFactor) {
		// All operations handled in gameState
	},

	draw: function(ctx, viewport_x, viewport_y){
		if(this.visible){
			ctx.drawPolygon(this, this.world_x - viewport_x, this.world_y - viewport_y);
		}
	}
});
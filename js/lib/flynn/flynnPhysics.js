//-----------------------------------
// flynnPhysics
//
//    Physics using the Box2D engine with cusom (Flynn vector) rendering
//
//-----------------------------------

//-----------------------------------
// Add helper functions to Box2D.Dynamics.b2Body
//-----------------------------------

(function () { "use strict"; 

Box2D.Dynamics.b2Body.prototype.ApplyAngularImpulse = function (impulse) {
      if (this.m_type != Box2D.Dynamics.b2Body.b2_dynamicBody) {
         return;
      }
      if (this.IsAwake() === false) {
         this.SetAwake(true);
      }
      this.m_angularVelocity += impulse;
};

Box2D.Dynamics.b2Body.prototype.setHome = function () {
    var pos = this.GetPosition();
    this.home_pos = new Box2D.Common.Math.b2Vec2(pos.x, pos.y);
};

Box2D.Dynamics.b2Body.prototype.resetToHome = function () {
    this.SetPosition(this.home_pos);
    this.SetAngle(0);
    this.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0,0));
    this.SetAngularVelocity(0);
};

Flynn.Physics= Class.extend({
    init: function(ctx, gravity_x, gravity_y, render_scale){

        var gravity = new Box2D.Common.Math.b2Vec2(gravity_x, gravity_y);
        this.world = new Box2D.Dynamics.b2World(gravity, true);
        this.context = ctx;
        this.scale = render_scale;
        this.dtRemaining = 0;
        this.stepAmount = 1/60;

        //this.enableDebugDraw();
    },

    enableDebugDraw: function() {
        this.debugDraw = new Box2D.Dynamics.b2DebugDraw();
        this.debugDraw.SetSprite(this.context);
        this.debugDraw.SetDrawScale(this.scale);
        this.debugDraw.SetFillAlpha(0.3);
        this.debugDraw.SetLineThickness(1.0);
        this.debugDraw.SetFlags(Box2D.Dynamics.b2DebugDraw.e_shapeBit | Box2D.Dynamics.b2DebugDraw.e_jointBit);
        this.world.SetDebugDraw(this.debugDraw);
    },

    update: function(paceFactor){
        this.dtRemaining += paceFactor * 1/60;
        while (this.dtRemaining > this.stepAmount) {
            this.dtRemaining -= this.stepAmount;
            this.world.Step(this.stepAmount,
                8, // velocity iterations
                3); // position iterations
        }
    },

    render: function(ctx){
        if (this.debugDraw) {
            this.world.DrawDebugData();
        } else{
            //ctx.clearAll();
        }

        var obj = this.world.GetBodyList();
 
        // this.context.save();
        while (obj) {
            var body = obj.GetUserData();
            if (body) {
                body.draw(this.context, this.scale);
            }
     
            obj = obj.GetNext();
        }
        // this.context.restore();
    },

    collision: function(){
        this.listener = new Box2D.Dynamics.b2ContactListener();
        this.listener.PostSolve = function (contact, impulse) {
            var bodyA = contact.GetFixtureA().GetBody().GetUserData(),
                bodyB = contact.GetFixtureB().GetBody().GetUserData();
     
            if (bodyA.contact) {
                bodyA.contact(contact, impulse, true);
            }
            if (bodyB.contact) {
                bodyB.contact(contact, impulse, false);
            }
     
        };
        this.world.SetContactListener(this.listener);
    },
});

Flynn.Body= Class.extend({

    defaults: {
        shape: "block",
        width: 0.4,
        height: 0.4,
        radius: 0.4,
    },

    fixtureDefaults: {
        density: 2,
        friction: 1,
        // restitution: 0.2
        restitution: 0.7,
    },
 
    definitionDefaults: {
        active: true,
        allowSleep: true,
        angle: 0,
        angularVelocity: 0,
        awake: true,
        bullet: false,
        fixedRotation: false,
    },

    init: function(physics, details) {
        this.details = details = details || {};
     
        // Create the definition
        this.definition = new Box2D.Dynamics.b2BodyDef();
     
        // Set up the definition
        for (var k in this.definitionDefaults) {
            this.definition[k] = details[k] || this.definitionDefaults[k];
        }
        this.definition.position = new Box2D.Common.Math.b2Vec2(details.x || 0, details.y || 0);
        this.definition.linearVelocity = new Box2D.Common.Math.b2Vec2(details.vx || 0, details.vy || 0);
        this.definition.userData = this;
        this.definition.type = details.type == "static" ? Box2D.Dynamics.b2Body.b2_staticBody : Box2D.Dynamics.b2Body.b2_dynamicBody;
     
        // Create the Body
        this.body = physics.world.CreateBody(this.definition);
     
        // Create the fixture
        this.fixtureDef = new Box2D.Dynamics.b2FixtureDef();
        for (var l in this.fixtureDefaults) {
            this.fixtureDef[l] = details[l] || this.fixtureDefaults[l];
        }
     
        details.shape = details.shape || this.defaults.shape;
        //details.color = details.color || this.defaults.color;
     
        switch (details.shape) {
            case "circle":
                details.radius = details.radius || this.defaults.radius;
                this.fixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(details.radius);
                break;
            case "polygon":
                this.fixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
                this.fixtureDef.shape.SetAsArray(details.points, details.points.length);
                break;
            case "block":
            default:
                details.width = details.width || this.defaults.width;
                details.height = details.height || this.defaults.height;
     
                this.fixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
                this.fixtureDef.shape.SetAsBox(
                    details.width  / 2,
                    details.height / 2);
                break;
        }
    
        this.body.CreateFixture(this.fixtureDef);
    },

    draw: function(context, scale){
        var points;
        var pos = this.body.GetPosition();
        var angle = this.body.GetAngle();
     
        // Draw the shape outline if the shape has a color
        if (this.details.color) {
            context.fillStyle = this.details.color;
     
            switch (this.details.shape) {
                case "circle":
                    var num_sides = 6;
                    if (typeof this.details.render_sides != "undefined") {
                       num_sides = this.details.render_sides;
                    }
                    context.vectorStart(this.details.color);
                    var first = true;
                    for(var a=0, stop=Math.PI*2.01, step = Math.PI*2/num_sides; a<=stop; a += step ){
                        if(first){
                            context.vectorMoveTo(
                                (pos.x + Math.cos(a + angle) * this.details.radius) * scale, 
                                (pos.y + Math.sin(a + angle) * this.details.radius) * scale);
                            first = false;
                        } else {
                            context.vectorLineTo(
                                (pos.x + Math.cos(a + angle) * this.details.radius) * scale,
                                (pos.y + Math.sin(a + angle) * this.details.radius) * scale);
                        }
                    }
                    context.vectorEnd();
                    break;
                case "polygon":
                    this.draw_points(context, this.details.points, angle, pos, scale);
                    break;
                case "block":
                    points = [
                        {x:-this.details.width/2, y: this.details.height/2},
                        {x: this.details.width/2, y: this.details.height/2},
                        {x: this.details.width/2, y:-this.details.height/2},
                        {x:-this.details.width/2, y:-this.details.height/2},
                    ];
                    this.draw_points(context, points, angle, pos, scale);
                    break;
                default:
                    break;
            }
        }
    },

    draw_points: function(context, points, angle, pos, scale){
        var i;
        var angle_cos = Math.cos(angle);
        var angle_sin = Math.sin(angle);
        var ctx_points = [];

        for(i=0; i<points.length; i++){
            ctx_points.push({
                x: ((points[i].x * angle_cos - points[i].y * angle_sin) + pos.x) * scale,
                y: ((points[i].x * angle_sin + points[i].y * angle_cos) + pos.y) * scale
            });
        }
        context.vectorStart(this.details.color);

        for (i = 0; i < ctx_points.length; i++) {
            if(i===0){
                context.vectorMoveTo(ctx_points[i].x, ctx_points[i].y);
            }
            else{
                context.vectorLineTo(ctx_points[i].x, ctx_points[i].y);
            }
        }
        context.vectorLineTo(ctx_points[0].x, ctx_points[0].y);
        context.vectorEnd();
    }

});

}()); // "use strict" wrapper
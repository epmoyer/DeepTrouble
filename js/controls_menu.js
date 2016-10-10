var Game = Game || {}; // Create namespace

(function () { "use strict";

Game.ControlsMenu = Class.extend({
    init: function(position, scale, color){
        this.position = position; // {x:<x>, y:<y>}
        this.scale = scale;
        this.color = color;

        this.textX = position.x + scale*8*Flynn.Font.Normal.CharacterSpacing;
        this.figLeftX = this.textX + scale*10;
        this.figBoxWidth = 7 * scale;
        this.figBoxHeight = 9 * scale;
        this.figRightX = this.figLeftX + 2*this.figBoxWidth + 15*scale;
        this.itemGap = 4*scale;
    },

    render: function(ctx){
        this.masterStart();
        
        this.title(ctx, "Ascend");
        this.box(ctx, 'L', 1);
        this.box(ctx, 'R', 1);
        this.next();

        this.title(ctx, "Descend");
        this.box(ctx, 'L', 3);
        this.box(ctx, 'R', 3);
        this.next();

        this.setMirror(true);
        this.title(ctx, "Move");
        this.box(ctx, 'L', 1);
        this.next();

        this.title(ctx, "Fire");
        this.box(ctx, 'L', 3);
        this.advance(1);
        this.box(ctx, 'R',1);
        this.next();
    },

    masterStart: function(){
        this.offsetY = this.position.y;
        this.setMirror(false);
        this.itemStart();
    },

    itemStart: function(){
        this.longestBox = 0;
        this.currentBoxLevel = 0;
    },

    setMirror: function(mirror){
        this.mirror = mirror;
    },

    title: function(ctx, titleText){
        ctx.vectorText(titleText + ':', this.scale, this.textX, this.offsetY, 'right', this.color);
    },

    box: function(ctx, type, length){
        this.longestBox = Math.max(this.longestBox, this.currentBoxLevel + length);
        var x = type == 'L' ? this.figLeftX : this.figLeftX + this.figBoxWidth;
        var y = this.offsetY-3 + this.figBoxHeight * this.currentBoxLevel;
        ctx.vectorRect(x-3, y, this.figBoxWidth, length*this.figBoxHeight, this.color);
        ctx.vectorText(type, this.scale, x, y+3, 'left', this.color);

        if(this.mirror){
            type = type == 'L' ? 'R' : 'L';
            x = type == 'L' ? this.figRightX : this.figRightX + this.figBoxWidth;
            ctx.vectorRect(x-3, y, this.figBoxWidth, length*this.figBoxHeight, this.color);
            ctx.vectorText(type, this.scale, x, y+3, 'left', this.color);
        }
    },

    advance: function(steps){
        this.currentBoxLevel += steps;
    },

    next: function(){
        this.offsetY += this.longestBox*this.figBoxHeight + this.itemGap;
        this.itemStart();
    }
});

}()); // "use strict" wrapper
var ControlsMenu = Class.extend({
    init: function(ctx, position_v, scale, color){
        this.ctx = ctx;
        this.position_v = position_v;
        this.scale = scale;
        this.color = color;

        this.textX = position_v.x + scale*8*FlynnCharacterSpacing;
        this.figLeftX = this.textX + scale*10;
        this.figBoxWidth = 7 * scale;
        this.figBoxHeight = 9 * scale;
        this.figRightX = this.figLeftX + 2*this.figBoxWidth + 15*scale;
        this.itemGap = 4*scale;
    },

    render: function(){
        this.masterStart();
        
        this.title("Ascend");
        this.box('L', 1);
        this.box('R', 1);
        this.next();

        this.title("Descend");
        this.box('L', 3);
        this.box('R', 3);
        this.next();

        this.setMirror(true);
        this.title("Move");
        this.box('L', 1);
        this.next();

        this.title("Fire");
        this.box('L', 3);
        this.advance(1);
        this.box('R',1);
        this.next();
    },

    masterStart: function(){
        this.offsetY = this.position_v.y;
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

    title: function(titleText){
        this.ctx.vectorText(titleText + ':', this.scale, this.textX, this.offsetY, 0, this.color);
    },

    box: function(type, length){
        this.longestBox = Math.max(this.longestBox, this.currentBoxLevel + length);
        var x = type == 'L' ? this.figLeftX : this.figLeftX + this.figBoxWidth;
        var y = this.offsetY-3 + this.figBoxHeight * this.currentBoxLevel;
        this.ctx.vectorRect(x-3, y, this.figBoxWidth, length*this.figBoxHeight, this.color);
        this.ctx.vectorText(type, this.scale, x, y+3, null, this.color);

        if(this.mirror){
            type = type == 'L' ? 'R' : 'L';
            x = type == 'L' ? this.figRightX : this.figRightX + this.figBoxWidth;
            this.ctx.vectorRect(x-3, y, this.figBoxWidth, length*this.figBoxHeight, this.color);
            this.ctx.vectorText(type, this.scale, x, y+3, null, this.color);
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
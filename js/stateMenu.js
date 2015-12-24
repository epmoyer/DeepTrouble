//--------------------------------------------
// StateMenu class
//    Startup screen
//--------------------------------------------

var SonarPingIntervalSec = 5.0;

var StateMenu = FlynnState.extend({

	init: function(mcp){
		this._super(mcp);

		this.canvasWidth = mcp.canvas.ctx.width;
		this.canvasHeight = mcp.canvas.ctx.height;

		this.soundStart = new Howl({
			src: ['sounds/Tripple_blip.ogg','sounds/Tripple_blip.mp3'],
			volume: 0.5
		});

        this.soundInsertCoin = new Howl({
            src: ['sounds/bubble_single.mp3'],
            volume: 1.0
        });

        this.soundSonarPing = new Howl({
            src: ['sounds/sonar_ping.mp3'],
            volume: 0.3
        });

        this.sonar_timer = 1.0;

        this.controlsMenu = new ControlsMenu(mcp.canvas.ctx, new Victor(10,240), 2, FlynnColors.GRAY);
	},

	handleInputs: function(input, paceFactor) {
		// Metrics toggle
        if(this.mcp.developerModeEnabled) {
            if (input.virtualButtonIsPressed("dev_metrics")) {
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
        }
        if(this.mcp.arcadeModeEnabled) {
            if (input.virtualButtonIsPressed("quarter")) {
                this.mcp.credits += 1;
                this.soundInsertCoin.play();
            }
        }

		if (  ( !this.mcp.arcadeModeEnabled && input.virtualButtonIsPressed("UI_enter")) ||
            ( this.mcp.arcadeModeEnabled && (this.mcp.credits > 0) && input.virtualButtonIsPressed("start_1")))
        {
            this.mcp.credits -= 1;
			this.mcp.nextState = States.GAME;
			this.soundStart.play();
		}

        if (input.virtualButtonIsPressed("UI_escape")) {
            this.mcp.nextState = States.CONFIG;
        }
	},

	update: function(paceFactor) {
        this.sonar_timer -= (1/60.0) * paceFactor;
        if (this.sonar_timer<0 && this.mcp.optionManager.getOption('musicEnabled')){
            this.sonar_timer = SonarPingIntervalSec;
            this.soundSonarPing.play();
        }
	},

	render: function(ctx) {
        ctx.clearAll();
        var title_x = 160;
        var title_y = 150;
        var title_step = 5;

        // Font Test
        //ctx.vectorText("!\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`",
        //	2.5, 30, 30, null, FlynnColors.MAGENTA);
        //ctx.vectorText("Unimplemented:{|}~",
        //	2.5, 30, 55, null, FlynnColors.MAGENTA);

        for (var angle = 0; angle < Math.PI + 0.1; angle += Math.PI) {
            x_pos = 160;
            y_pos = 50;
            ctx.vectorText("DEEP TROUBLE", 10, x_pos, y_pos, null, FlynnColors.DODGERBLUE);
            ctx.vectorText("DEEP TROUBLE", 10,  x_pos + 3, y_pos +3, null, FlynnColors.LIGHTSKYBLUE);
        }

        ctx.vectorText("VERSION 0.1", 1.5, null, 140, null, FlynnColors.DODGERBLUE);

        var startText='';
        var controlsText1='', controlsText2='';
        if (this.mcp.arcadeModeEnabled) {
            startText = "PRESS START";
            controlsText1 = "TWO WHITE BUTTONS CONTROL EVERYTHING";
            controlsText2 = " ";
            ctx.vectorText(this.mcp.credits + " Credits", 2, 10, this.canvasHeight - 20, null, FlynnColors.GREEN);
        }
        else {
            // Show all control keys
            var y = 180;
            var x = this.canvasWidth/2 + 50;
            var i, len;
            var names = this.mcp.input.getConfigurableVirtualButtonNames();
            for(i = 0, len = names.length; i<len; i++){
                ctx.vectorText(names[i]+":", 2, x, y, -1, FlynnColors.LIGHTBLUE);
                ctx.vectorText(this.mcp.input.getVirtualButtonBoundKeyName(names[i]), 2, x, y, null, FlynnColors.LIGHTBLUE);
                y += 20;
            }
        }

        // Show controls text (short text for arcade mode)
        ctx.vectorText(controlsText1, 2, null, 280, null, FlynnColors.LIGHTBLUE);
        ctx.vectorText(controlsText2, 2, null, 295, null, FlynnColors.LIGHTBLUE);


        // Start Text
        if(!this.mcp.arcadeModeEnabled || (this.mcp.arcadeModeEnabled && (this.mcp.credits > 0))) {
            if (Math.floor(this.mcp.clock / 40) % 2 == 1) {
                ctx.vectorText(startText, 2, null, 300, null, FlynnColors.LIGHTSKYBLUE);
            }
        }

        ctx.vectorText("A TWO-PLAYER TWO-BUTTON DEEP-SEA BATTLE", 1.8, null, 500, null, FlynnColors.DODGERBLUE);
        ctx.vectorText("DEAD MEN TELL NO TALES", 1.8, null, 520, null, FlynnColors.DODGERBLUE);

		ctx.vectorText("WRITTEN BY ERIC MOYER (FIENDFODDER)", 1.5, null, 700, null, FlynnColors.DODGERBLUE);
        ctx.vectorText('PRESS <ESCAPE> TO CONFIGURE CONTROLS', 1.5, null, 715, null, FlynnColors.DODGERBLUE);

        this.controlsMenu.render();
	}

});
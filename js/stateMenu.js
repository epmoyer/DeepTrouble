//--------------------------------------------
// StateMenu class
//    Startup screen
//--------------------------------------------
if (typeof Game == "undefined") {
   var Game = {};  // Create namespace
}
if (typeof Game.config == "undefined") {
   Game.config = {};  // Create namespace
}

Game.config.SONAR_PING_INTERVAL_SEC = 5.0;

Game.StateMenu = Flynn.State.extend({

    init: function(){
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

        this.controlsMenu = new Game.ControlsMenu(
            {x:10, y:240}, 
            2, //scale
            Flynn.Colors.GRAY);
    },

    handleInputs: function(input, paceFactor) {
        // Metrics toggle
        if(Flynn.mcp.developerModeEnabled) {
            if (input.virtualButtonWasPressed("dev_metrics")) {
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
        }
        if(Flynn.mcp.arcadeModeEnabled) {
            if (input.virtualButtonWasPressed("UI_quarter")) {
                Flynn.mcp.credits += 1;
                this.soundInsertCoin.play();
            }
        }

        if (  ( !Flynn.mcp.arcadeModeEnabled && input.virtualButtonWasPressed("UI_enter"))
           || (  Flynn.mcp.arcadeModeEnabled && (Flynn.mcp.credits > 0)
              && (  input.virtualButtonWasPressed("UI_start1") 
                 || input.virtualButtonWasPressed("UI_start2") )))
        {
            Flynn.mcp.credits -= 1;
            Flynn.mcp.changeState(Game.States.GAME);
            this.soundStart.play();
        }

        if (input.virtualButtonWasPressed("UI_escape")) {
            Flynn.mcp.changeState(Game.States.CONFIG);
        }

        if (input.virtualButtonWasPressed("UI_exit") && Flynn.mcp.backEnabled){
            window.history.back();
        }
    },

    update: function(pace_factor) {
        this.sonar_timer -= (1/60.0) * pace_factor;
        if (this.sonar_timer<0 && Flynn.mcp.optionManager.getOption('musicEnabled')){
            this.sonar_timer = Game.config.SONAR_PING_INTERVAL_SEC;
            this.soundSonarPing.play();
        }
    },

    render: function(ctx) {
        ctx.clearAll();

        var title = 'DEEP TROUBLE';
        var x_pos = Game.CANVAS_WIDTH /2;
        var y_pos = 14;
        var scale = 8.5;
        var is_world = false; // Use screen coordinates
        ctx.vectorText(title, scale, x_pos, y_pos, 'center', Flynn.Colors.DODGERBLUE, is_world, Flynn.Font.Block);
        ctx.vectorText(title, scale,  x_pos + 3, y_pos +3, 'center', Flynn.Colors.LIGHTSKYBLUE, is_world, Flynn.Font.Block);

        ctx.vectorText("VERSION " + Game.VERSION, 1.5, null, 120, null, Flynn.Colors.DODGERBLUE);

        var startText='';
        var controlsText1='', controlsText2='';
        if (Flynn.mcp.arcadeModeEnabled) {
            startText = "PRESS START";
            controlsText1 = "TWO WHITE BUTTONS CONTROL EVERYTHING";
            controlsText2 = " ";
            ctx.vectorText(Flynn.mcp.credits + " Credits", 2, 10, Game.CANVAS_HEIGHT - 20, 'left', Flynn.Colors.GREEN);
        }
        else {
            // Show all control keys
            var y = 180;
            var x = Game.CANVAS_WIDTH/2 + 50;
            var i, len;
            var names = Flynn.mcp.input.getConfigurableVirtualButtonNames();
            for(i = 0, len = names.length; i<len; i++){
                ctx.vectorText(names[i]+":", 2, x, y, 'right', Flynn.Colors.LIGHTBLUE);
                ctx.vectorText(Flynn.mcp.input.getVirtualButtonBoundKeyName(names[i]), 2, x, y, 'left', Flynn.Colors.LIGHTBLUE);
                y += 20;
            }
        }

        // Show controls text (short text for arcade mode)
        ctx.vectorText(controlsText1, 2, null, 280, null, Flynn.Colors.LIGHTBLUE);
        ctx.vectorText(controlsText2, 2, null, 295, null, Flynn.Colors.LIGHTBLUE);


        // Start Text
        if(!Flynn.mcp.arcadeModeEnabled || (Flynn.mcp.arcadeModeEnabled && (Flynn.mcp.credits > 0))) {
            if (Math.floor(Flynn.mcp.clock / 40) % 2 == 1) {
                ctx.vectorText(startText, 2, null, 300, null, Flynn.Colors.LIGHTSKYBLUE);
            }
        }

        ctx.vectorText("A TWO-PLAYER TWO-BUTTON DEEP-SEA BATTLE", 1.8, null, 500, null, Flynn.Colors.DODGERBLUE);
        ctx.vectorText("DEAD MEN TELL NO TALES", 1.8, null, 520, null, Flynn.Colors.DODGERBLUE);

        ctx.vectorText("WRITTEN BY ERIC MOYER (FIENDFODDER)", 1.5, null, 700, null, Flynn.Colors.DODGERBLUE);
        ctx.vectorText('PRESS <ESCAPE> TO CONFIGURE CONTROLS', 1.5, null, 715, null, Flynn.Colors.DODGERBLUE);
        if(Flynn.mcp.backEnabled){
            ctx.vectorText('PRESS <TAB> TO EXIT GAME', 1.5, null, 730, null, Flynn.Colors.DODGERBLUE);
        }

        Flynn.mcp.renderLogo(ctx);

        this.controlsMenu.render(ctx);
    }

});
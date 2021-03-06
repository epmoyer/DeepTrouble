// Master Control Program 

(function () { "use strict"; 

Flynn.Mcp = Class.extend({

    init: function(canvasWidth, canvasHeight, noChangeState, gameSpeedFactor, stateBuilderFunc, hideCanvas, hideVectorModeOption) {

        Flynn.mcp = this;

        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.noChangeState = noChangeState;
        this.gameSpeedFactor = gameSpeedFactor;
        this.stateBuilderFunc = stateBuilderFunc;
        if(typeof(hideCanvas)==='undefined'){
            this.hideCanvas = false;
        }
        else{
            this.hideCanvas = hideCanvas;
        }
        if(typeof(hideVectorModeOption)==='undefined'){
            hideVectorModeOption = false;
        }

        this.developerModeEnabled = Flynn.Util.getUrlFlag("develop");
        this.arcadeModeEnabled = Flynn.Util.getUrlFlag("arcade");
        this.iCadeModeEnabled = Flynn.Util.getUrlFlag("icade");
        this.backEnabled = Flynn.Util.getUrlFlag("back");
        this.mousetouchEnabled = Flynn.Util.getUrlFlag("mousetouch");
        this.optionNoscale = Flynn.Util.getUrlFlag("noscale");
        
        this.halted = false;
        this.audio_mute_enabled = false;

        this.credits = 0;
        this.next_state_id = noChangeState;
        this.current_state_id = null;
        this.current_state = null;

        this.devPacingMode = Flynn.DevPacingMode.NORMAL;

        this.viewport = {x:0, y:0};

        this.resizeFunc = null;
        this.slowMoDebug = false;
        this.clock = 0;
        this.timers = new Flynn.Timers();

        // Setup options
        this.options = {};
        this.optionManager = new Flynn.OptionManager(this);

        this.custom={}; // Container for custom game data which needs to be exchanged globally.

        this.canvas = new Flynn.Canvas(canvasWidth, canvasHeight);
        this.touch_control_canvas = this.canvas;
        this.input = new Flynn.InputHandler();

        if(this.iCadeModeEnabled){
            this.input.enableICade();
            this.arcadeModeEnabled = true; // iCade mode forces arcade mode
        }
        this.input.setupUIButtons();

        this.flynn_logo = new Flynn.Polygon(
            Flynn.Points.FLYNN_LOGO,
            Flynn.Colors.DODGERBLUE,
            2, // scale
            new Victor(
                Flynn.mcp.canvasWidth-55, 
                Flynn.mcp.canvasHeight-41),
            false, // constrained
            false  // is_world
            );

        //--------------------------
        // Browser/platform support
        //--------------------------

        // SUPPORT: performance.now()
        this.browserSupportsPerformance = true;
        try{
            // Call to test whether an exception is thrown (return value ignored).
            performance.now(); 
        }
        catch(err){
            this.browserSupportsPerformance = false;
        }

        // SUPPORT: iOS
        this.browserIsIos = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

        // SUPPORT: Touch
        this.browserSupportsTouch = (
            (Flynn.Util.is_mobile_or_tablet_browser() && ('ontouchstart' in document.documentElement)) ||
            this.mousetouchEnabled );

        if (this.developerModeEnabled){
            console.log('DEV: title=' + document.title);
            console.log('DEV: browserSupportsPeformance=' + this.browserSupportsPerformance);
            console.log('DEV: browserIsIos=' + this.browserIsIos);
            console.log('DEV: browserSupportsTouch=' + this.browserSupportsTouch);
            console.log('DEV: Cookies: enabled=' + Cookies.enabled);
            console.log('DEV: arcadeModeEnabled=' + this.arcadeModeEnabled);
            console.log('DEV: iCadeModeEnabled=' + this.iCadeModeEnabled);
            console.log('DEV: backEnabled=' + this.backEnabled);
            console.log('DEV: optionNoscale=' + this.optionNoscale);
        }

        // Set Vector mode
        var vectorMode = null;
        var vectorModeFromUrl = Flynn.Util.getUrlValue("vector");
        for (var key in Flynn.VectorMode){
            if (vectorModeFromUrl === key){
                vectorMode = Flynn.VectorMode[key];
            }
        }
        if (vectorMode === null){
            // No vector mode specified on command line (or no match)
            if(this.browserSupportsTouch){
                // Default to plain lines on phones/pads for visibility and performance
                vectorMode = Flynn.VectorMode.V_THICK;
            }
            else{
                vectorMode = Flynn.VectorMode.V_THIN;
            }
        }
        if(!hideVectorModeOption){
            this.optionManager.addOption('vectorMode', Flynn.OptionType.MULTI, vectorMode, vectorMode, 'VECTOR DISPLAY EMULATION',
                [   ['NONE',     Flynn.VectorMode.PLAIN],
                    ['NORMAL',   Flynn.VectorMode.V_THIN],
                    ['THICK' ,   Flynn.VectorMode.V_THICK],
                    ['FLICKER' , Flynn.VectorMode.V_FLICKER]
                ],
                null);
        }

        //--------------------------
        // Resize handler
        //--------------------------
        var self = this;
        this.resize = function(){
            // Get the dimensions of the viewport
            var viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            // Determine game size
            var targetWidth = 1024;
            var targetHeight = 768;
            var multiplier = Math.min((viewport.height / targetHeight), (viewport.width / targetWidth));
            var actualCanvasWidth;
            var actualCanvasHeight;
            if(self.optionNoscale){
                actualCanvasWidth = targetWidth;
                actualCanvasHeight = targetHeight;
            }
            else{
                actualCanvasWidth = Math.floor(targetWidth * multiplier);
                actualCanvasHeight = Math.floor(targetHeight * multiplier);
            }
            var top = Math.floor(viewport.height/2 - actualCanvasHeight/2);
            var left = Math.floor(viewport.width/2 - actualCanvasWidth/2);

            var element = document.getElementById("gameCanvas");
            if(!self.hideCanvas){
                element.style.display = "block";
            }
            element.style.width = actualCanvasWidth + "px";
            element.style.height = actualCanvasHeight + "px";
            element.style.top = top + "px";
            element.style.left = left + "px";

            if(self.resizeFunc){
                self.resizeFunc(viewport.width, viewport.height);
            }

            // Update controls visibility.   Controls may have been redefined in resize function
            // and need to be made visible if configured as visible from the current state.
            self.input.updateVisibilityAllControls();
        };
        window.addEventListener("resize", this.resize);
    },

    setTouchControlCanvas: function(canvas){
        // Allows use of an alternate canvas for touch control rendering.
        // This allows (for instance) a 3D game to create a special 2D canvas onto which touch
        // controls will be drawn.
        this.touch_control_canvas = canvas;
    },

    setResizeFunc: function(resizeFunc){
        this.resizeFunc = resizeFunc;
    },

    changeState: function(next_state_id){
        this.next_state_id = next_state_id;
    },

    muteAudio: function(mute_enable){
        this.audio_mute_enabled = mute_enable;
        Howler.mute(mute_enable);
    },

    devHalt: function(){
        var ctx = this.canvas.ctx;
        var box_height = 60;
        var box_margin = 20;
        var box_width = this.canvasWidth - box_margin*2;
        var box_x = box_margin;
        var box_y = this.canvasHeight/2 - box_height/2;

        this.halted = true;
        console.log('DEV: Execution halted');
        ctx.vectorRect(box_x, box_y, box_width, box_height, 
            Flynn.Colors.CYAN,
            Flynn.Colors.BLACK);
        ctx.vectorText("MCP HALTED.  CLICK TO RESUME.", 4.0, null, null, null, Flynn.Colors.WHITE);

        Howler.mute(true);
    },

    devResume: function(){
        this.halted = false;
        console.log('DEV: Execution resumed');
        this.run();

        // Restore audio mute to its state before the halt
        Howler.mute(this.audio_mute_enabled);
    },

    cycleDevPacingMode: function(){
        switch(this.devPacingMode){
            case Flynn.DevPacingMode.NORMAL:
                this.devPacingMode = Flynn.DevPacingMode.SLOW_MO;
                break;
            case Flynn.DevPacingMode.SLOW_MO:
                this.devPacingMode = Flynn.DevPacingMode.FPS_20;
                break;
            case Flynn.DevPacingMode.FPS_20:
                this.devPacingMode = Flynn.DevPacingMode.NORMAL;
        }
    },

    toggleDevPacingSlowMo: function(){
        if(this.devPacingMode === Flynn.DevPacingMode.SLOW_MO){
            this.devPacingMode = Flynn.DevPacingMode.NORMAL;
        }
        else{
            this.devPacingMode = Flynn.DevPacingMode.SLOW_MO;
        }
    },

    toggleDevPacingFps20: function(){
        if(this.devPacingMode === Flynn.DevPacingMode.FPS_20){
            this.devPacingMode = Flynn.DevPacingMode.NORMAL;
        }
        else{
            this.devPacingMode = Flynn.DevPacingMode.FPS_20;
        }
    },

    renderLogo: function(ctx, position){
        if(typeof position !== 'undefined'){
            this.flynn_logo.position = position;
        }
        this.flynn_logo.render(ctx);
        ctx.vectorText(
            Flynn.VERSION,
            1.5,
            this.flynn_logo.position.x,
            this.flynn_logo.position.y + 23,
            'center',
            Flynn.Colors.GRAY
            );
    },

    run: function(){
        var self = this;

        this.canvas.animate( function(paceFactor) {  
            // Change state (if pending)
            if (self.next_state_id !== self.noChangeState) {
                if(self.current_state && self.current_state.destructor){
                    self.current_state.destructor();
                }
                self.current_state = self.stateBuilderFunc(self.next_state_id);
                self.current_state_id = self.next_state_id;
                self.next_state_id = self.noChangeState;

                // Update controls visibility to reflect new state
                self.input.updateVisibilityAllControls();
            }

            // Update clock and timers
            self.clock += paceFactor;
            self.timers.update(paceFactor);

            // Process state (if set)
            if(self.current_state){
                self.current_state.handleInputs(self.input, paceFactor);
                self.current_state.update(paceFactor);
                self.current_state.render(self.canvas.ctx);

                // Render any visible virtual controls
                self.input.renderTouchRegions(self.touch_control_canvas.ctx);
                self.input.renderVirtualJoysticks(self.touch_control_canvas.ctx);

                // Process halt
                if(   self.developerModeEnabled 
                   && self.input.virtualButtonWasPressed("UI_halt")){
                    self.devHalt();
                }
            }
        });
    },

});

}()); // "use strict" wrapper
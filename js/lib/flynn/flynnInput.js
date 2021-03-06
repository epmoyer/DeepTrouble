(function () { "use strict";

Flynn.BUTTON_CONFIGURABLE = true;
Flynn.BUTTON_NOT_CONFIGURABLE = false;

Flynn.TouchRegion = Class.extend({
    init: function(name, left, top, right, bottom, shape, visible_states) {
        if(!((shape=='round') || (shape=='rect'))){
            throw ("Parameter 'shape' must be 'round' or 'rect'");
        }
        this.name = name;
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.center_x = (this.right + this.left) / 2;
        this.center_y = (this.top + this.bottom) / 2;
        this.shape = shape;
        this.visible_states = visible_states;
        if(shape=='round'){
            if (Math.abs( (this.right - this.left) -  (this.bottom - this.top)) > 3){
                throw "Round touch regions must have matching width and height";
            }
            this.radius = (this.right - this.left) / 2;
        }
        else{
            this.radius = null;
        }

        this.show = false;
        this.touchStartIdentifier = 0; // Unique identifier of most recent touchstart event
    },

    updateVisibility: function(current_state){
        var i, len;
        if(!this.visible_states){
            this.show = true;
            return;
        }
        else{
            for(i=0, len=this.visible_states; i<len; i++){
                if(current_state == this.visible_states[i]){
                    this.show = true;
                    return;
                }
            }
        }
        // Button is not declared as visible in the current state.  Hide it.
        this.show = false;
    },
});

Flynn.VirtualButton = Class.extend({
    init: function(name, isConfigurable) {
        this.name = name;
        this.isConfigurable = isConfigurable;

        this.isDown = false;
        this.pressWasReported = false;
        this.boundKeyCode = null; // The ASCII code of the bound key.  Can be null if no key bound.
    }
});

Flynn.InputHandler = Class.extend({

    MOUSE_IDENTIFIER: 99999991,
    DIRECTIONS: ['up','down','left','right'],

    init: function() {

        this.iCadeModeEnabled = false;

        this.virtualButtons = {};
        this.touchRegions = {};
        this.keyCodeToVirtualButtonName = {};

        this.uiButtons = {};
        this.keyCodeToUiButtonName = {};

        this.virtualJoysticks = {};

        this.text_capture_enabled = false;
        this.captured_text = '';

        // Key Code capture support for user configuration of key assignments
        this.keyCodeCaptureArmed = false;
        this.capturedKeyCode = null;

        // iCade button mapping
        this.iCade = {
            keyDownCodes: [],
            keyUpCodes:   [],
            buttonNames:  [],
            buttonCodes:  [],
        };
        //                    Name          Down Up
        this.addiCadeMapping('icade_up',    'w', 'e'); // Joystick
        this.addiCadeMapping('icade_down',  'x', 'z');
        this.addiCadeMapping('icade_left',  'a', 'q');
        this.addiCadeMapping('icade_right', 'd', 'c');
        this.addiCadeMapping('icade_t1',    'y', 't'); // Top row buttons
        this.addiCadeMapping('icade_t2',    'u', 'f');
        this.addiCadeMapping('icade_t3',    'i', 'm');
        this.addiCadeMapping('icade_t4',    'o', 'g');
        this.addiCadeMapping('icade_b1',    'h', 'r'); // Bottom row buttons
        this.addiCadeMapping('icade_b2',    'j', 'n');
        this.addiCadeMapping('icade_b3',    'k', 'p');
        this.addiCadeMapping('icade_b4',    'l', 'v');

        this.touchable_elements = [];

        var self = this;
        this.keyDownHandler = function(evt){
            if(evt.keyCode == Flynn.KeyboardMap.escape || 
               evt.keyCode == Flynn.KeyboardMap.tab){
                // Prevent default for 'Escape'.  This keeps Safari
                // from exiting full-screen mode when escape is pressed.
                // Tab prevents accidental interaction with the URL bar.
                evt.preventDefault();
            }
            //console.log("KeyDown: Code:" + evt.keyCode);
            if(self.iCadeModeEnabled){
                var index = self.iCade.keyDownCodes.indexOf(evt.keyCode);
                var newEvt;
                if(index > -1){
                    // Re-throw event as an iCade button down event
                    newEvt = {keyCode: self.iCade.buttonCodes[index]};
                    self.keyDownHandler(newEvt);
                    return;
                }
                index = self.iCade.keyUpCodes.indexOf(evt.keyCode);
                if(index > -1){
                    // Re-throw event as an iCade button up event
                    newEvt = {keyCode: self.iCade.buttonCodes[index]};
                    self.keyUpHandler(newEvt);
                    return;
                }
            }

            // Capture key codes (for user configuration of virualButtons).  Ignore <escape>.
            if(self.keyCodeCaptureArmed && evt.keyCode != Flynn.KeyboardMap.escape){
                self.capturedKeyCode = evt.keyCode;
                self.keyCodeCaptureArmed = false;
                // Exit without recording any .isDown events
                return;
            }

            if(self.text_capture_enabled){
                return;
            }

            var name;
            if (self.keyCodeToVirtualButtonName[evt.keyCode]){
                name = self.keyCodeToVirtualButtonName[evt.keyCode];
                self.virtualButtons[name].isDown = true;
                //console.log("Set .isDown for: " + name);
            }
            if (self.keyCodeToUiButtonName[evt.keyCode]){
                name = self.keyCodeToUiButtonName[evt.keyCode];
                self.uiButtons[name].isDown = true;
            }
        };
        document.addEventListener("keydown", this.keyDownHandler);

        this.keyUpHandler = function(evt){
            //console.log("KeyUp: Code:" + evt.keyCode);
            var name;

            if (self.keyCodeToVirtualButtonName[evt.keyCode]){
                name = self.keyCodeToVirtualButtonName[evt.keyCode];
                self.virtualButtons[name].isDown = false;
                self.virtualButtons[name].pressWasReported = false;
                //console.log("Clear .isDown for: " + name);
            }
            if (self.keyCodeToUiButtonName[evt.keyCode]){
                name = self.keyCodeToUiButtonName[evt.keyCode];
                self.uiButtons[name].isDown = false;
                self.uiButtons[name].pressWasReported = false;
            }
        };
        document.addEventListener("keyup", this.keyUpHandler);

        this.keyPressHandler = function(evt){
            //console.log("keyPressHandler: Code:" + evt.keyCode);
            if(self.text_capture_enabled){
                self.processTextCapture(evt.keyCode);
            }
        };
        document.addEventListener("keypress", this.keyPressHandler);

        if(Flynn.mcp.mousetouchEnabled || Flynn.mcp.developerModeEnabled){
            try{
                document.addEventListener(
                    'mousedown',
                    function(event){
                        // event.preventDefault();
                        if(Flynn.mcp.halted){
                            Flynn.mcp.devResume();
                        }
                        if(Flynn.mcp.mousetouchEnabled){
                            var canvas = Flynn.mcp.touch_control_canvas.canvas;
                            var rect = canvas.getBoundingClientRect();
                            var x = (event.clientX - rect.left) * canvas.width / canvas.clientWidth;
                            var y = (event.clientY - rect.top) * canvas.height / canvas.clientHeight;
                            //console.log("DEV: mousedown ",x,y);
                            var event_caught = self.handleTouchStart(x, y, self.MOUSE_IDENTIFIER);
                            if(!event_caught){
                                console.log("mousedown not caught");
                            //     var i;
                            //     for(i=0; i<self.touchable_elements.length; i++){
                            //         var element = self.touchable_elements[i];
                            //         element = document.getElementById("info");
                            //         Flynn.Util.event_simulator.simulate(
                            //             element,
                            //             "mousedown",
                            //             { pointerX: event.clientX, pointerY: event.clientY }
                            //             );
                            //         Flynn.Util.event_simulator.simulate(
                            //             element,
                            //             "mouseup",
                            //             { pointerX: event.clientX, pointerY: event.clientY }
                            //             );
                            //     }
                            }
                            else {
                                event.preventDefault();
                            }
                        }
                    },
                    false
                );
            }
            catch(err){
                console.log('Warning: Could not register "mousedown" event.');
            }
        }

        if(Flynn.mcp.mousetouchEnabled){
            try{
                document.addEventListener(
                    'mouseup',
                    function(event){
                        // event.preventDefault();
                        var canvas = Flynn.mcp.touch_control_canvas.canvas;
                        var rect = canvas.getBoundingClientRect();
                        var x = (event.clientX - rect.left) * canvas.width / canvas.clientWidth;
                        var y = (event.clientY - rect.top) * canvas.height / canvas.clientHeight;
                        //console.log("DEV: mouseup ",x,y);
                        var event_caught = self.handleTouchEnd(x, y, self.MOUSE_IDENTIFIER);
                        if(!event_caught){
                            console.log("mouseup not caught");
                        }
                        else{
                            event.preventDefault();
                        }
                    },
                    false
                );
            }
            catch(err){
                console.log('Warning: Could not register "mouseup" event.');
            }

            try{
                document.addEventListener(
                    'mousemove',
                    function(event){
                        event.preventDefault();
                        // If a button is pressed
                        if(event.which){
                            var canvas = Flynn.mcp.touch_control_canvas.canvas;
                            var rect = canvas.getBoundingClientRect();
                            var x = (event.clientX - rect.left) * canvas.width / canvas.clientWidth;
                            var y = (event.clientY - rect.top) * canvas.height / canvas.clientHeight;
                            //console.log("DEV: mousemove ",x,y);
                            self.handleTouchMove(x, y, self.MOUSE_IDENTIFIER);
                        }
                    },
                    false
                );
            }
            catch(err){
                console.log('Warning: Could not register "mousemove" event.');
            }
        }

        try{
            document.addEventListener(
                'touchstart',
                function(event){
                    var i;
                    var event_caught = false;
                    for(i=0; i<event.changedTouches.length; i++){
                        var touch=event.changedTouches[i];

                        var canvas = Flynn.mcp.touch_control_canvas.canvas;
                        var rect = canvas.getBoundingClientRect();
                        var x = (touch.pageX - rect.left) * canvas.width / canvas.clientWidth;
                        var y = (touch.pageY - rect.top) * canvas.height / canvas.clientHeight;

                        //console.log("DEV: touchstart ",x,y,touch.identifier);
                        event_caught |= self.handleTouchStart(x, y, touch.identifier);
                    }
                    if(event_caught){
                        event.preventDefault();
                    }
                },
                false
            );
        }
        catch(err){
            console.log('Warning: Could not register "touchstart" event.');
        }

        try{
            document.addEventListener(
                'touchend',
                function(event){
                    var i;
                    var event_caught = false;
                    for(i=0; i<event.changedTouches.length; i++){
                        var touch=event.changedTouches[i];
                    
                        var canvas = Flynn.mcp.touch_control_canvas.canvas;
                        var rect = canvas.getBoundingClientRect();
                        var x = (touch.pageX - rect.left) * canvas.width / canvas.clientWidth;
                        var y = (touch.pageY - rect.top) * canvas.height / canvas.clientHeight;

                        //console.log("DEV: touchend ",x,y,touch.identifier);
                        event_caught |= self.handleTouchEnd(x, y, touch.identifier);
                    }
                    if(event_caught){
                        event.preventDefault();
                    }
                },
                false
            );
        }
        catch(err){
            console.log('Warning: Could not register "touchend" event.');
        }

        try{
            document.addEventListener(
                'touchmove',
                function(event){
                    event.preventDefault();
                    var touch=event.changedTouches[0];

                    var canvas = Flynn.mcp.touch_control_canvas.canvas;
                    var rect = canvas.getBoundingClientRect();
                    var x = (touch.pageX - rect.left) * canvas.width / canvas.clientWidth;
                    var y = (touch.pageY - rect.top) * canvas.height / canvas.clientHeight;

                    console.log("DEV: touchmove ",x,y);
                    self.handleTouchMove(x, y, touch.identifier);
                },
                false
            );
        }
        catch(err){
            console.log('Warning: Could not register "touchend" event.');
        }
    },

    startTextCapture: function(){
        this.text_capture_enabled = true;
        this.captured_text = '';
    },

    getTextCapture: function(){
        return this.captured_text;
    },

    setTextCapture: function(text){
        this.captured_text = text;
    },

    isTextCaptureDone: function(){
        return !this.text_capture_enabled;
    },

    processTextCapture: function(key_code){
        if(key_code == 13){
            // Enter
            this.text_capture_enabled = false;
        }
        else if(key_code == Flynn.KeyboardMap['delete'] && this.captured_text.length > 0){
            this.captured_text = this.captured_text.substring(0, this.captured_text.length-1);
        }
        else if( 
                (key_code == 32) ||                   // Space          
                (key_code >= 48 && key_code <= 57) || // 0-9
                (key_code >= 65 && key_code <= 90) || // A-Z
                (key_code >= 97 && key_code <= 122)   // a-z
            ){
            this.captured_text += String.fromCharCode(key_code);
        }
        console.log('processTextCapture():Key Code:'+key_code+' String:'+this.captured_text);
    },

    addTouchableElement: function(element){
        this.touchable_elements.push(element);
    },

    handleTouchStart: function(x,y,touch_identifier){
        // Process a "touchstart" event and apply it to the appropriate virtual control (button/joystick)
        // if one exists.  
        // Returns true if a control caught the event, else false.

        //console.log("DEV: handleTouchStart() ",x,y);
        var name, region, joystick, touched, event_caught;

        event_caught = false;
        for(name in this.touchRegions){
            region = this.touchRegions[name];
            if(region.shape == 'round'){
                touched = Math.pow(x-region.center_x,2) + Math.pow(y-region.center_y,2) < 
                   Math.pow(region.radius, 2);
            }
            else{
                touched = (x>region.left) && (x<region.right) && (y>region.top) && (y<region.bottom);
            }
            if (touched){
                // A touch event was detected in the region 'name'
                //console.log("DEV: Touch in region:", name);
                if(this.virtualButtons[name]){
                    this.virtualButtons[name].isDown = true;
                } else if (this.uiButtons[name]){
                    this.uiButtons[name].isDown = true;
                }
                else {
                    console.log('Flynn: Warning: touch detected in touch region "' + name +
                        '" but no virtual button exists with that name.  The touch will go unreported.');
                }
                region.touchStartIdentifier = touch_identifier;
                event_caught = true;
            }
        }
        for(name in this.virtualJoysticks){
            joystick = this.virtualJoysticks[name];
            event_caught |= joystick.handleTouchStart(x,y,touch_identifier);
            this.setButtonsFromJoystick(joystick);
        }
        return event_caught;
    },

    handleTouchEnd: function(x,y,touch_identifier){
        // Process a "touchend" event and apply it to the appropriate virtual control (button/joystick)
        // if one exists.  
        // Returns true if a control caught the event, else false.

        //console.log("DEV: handleTouchEnd() ",x,y);
        var name, region, joystick, direction, i, event_caught;

        event_caught = false;
        for(name in this.touchRegions){
            region = this.touchRegions[name];
            // If the unique identifier associated with this touchend event matches
            // the identifier associated with the most recent touchstart event
            // for this touchRegion.
            if (region.touchStartIdentifier == touch_identifier){
                if(this.virtualButtons[name]){
                    // Mark the associated virtual button as not down and clear its press reporting.
                    this.virtualButtons[name].isDown = false;
                    this.virtualButtons[name].pressWasReported = false;
                }
                else if (this.uiButtons[name]){
                    // Mark the associated UI button as not down and clear its press reporting.
                    this.uiButtons[name].isDown = false;
                    this.uiButtons[name].pressWasReported = false;
                }
                region.touchStartIdentifier = 0;
                event_caught = true;
            }
        }
        for(name in this.virtualJoysticks){
            joystick = this.virtualJoysticks[name];
            if(joystick.handleTouchEnd(x,y,touch_identifier)){
                // The joystick was released. Clear all associated button presses
                for(i=0; i<this.DIRECTIONS.length; i++){
                    direction = this.DIRECTIONS[i];
                    name = joystick.buttons[direction].name;
                    if(name){
                        if(this.virtualButtons[name]){
                            this.virtualButtons[name].isDown = false;
                        } else if (this.uiButtons[name]){
                            this.uiButtons[name].isDown = false;
                        }
                    }
                }
                event_caught = true;
            }
        }
        return event_caught;
    },

    handleTouchMove: function(x,y,touch_identifier){
        //console.log("DEV: handleTouchMove() ",x,y);
        var name, joystick;
        for(name in this.virtualJoysticks){
            joystick = this.virtualJoysticks[name];
            joystick.handleTouchMove(x,y,touch_identifier);
            this.setButtonsFromJoystick(joystick);
        }
    },

    setButtonsFromJoystick: function(joystick){
        var direction, name, i;
        if(joystick.in_use){
            // Joystick in use. Assign state of all associated buttons to match joystick
            for(i=0; i<this.DIRECTIONS.length; i++){
                direction = this.DIRECTIONS[i];
                name = joystick.buttons[direction].name;
                if(name){
                    if(this.virtualButtons[name]){
                        this.virtualButtons[name].isDown = joystick.buttons[direction].pressed;
                    } else if (this.uiButtons[name]){
                        this.uiButtons[name].isDown = joystick.buttons[direction].pressed;
                    }
                }
            }
        } 
    },

    setupUIButtons: function(){
        if(!this.iCadeModeEnabled){
            this.addUiButton('UI_enter',  Flynn.KeyboardMap.enter);
            this.addUiButton('UI_escape', Flynn.KeyboardMap.escape);
            this.addUiButton('UI_exit',   Flynn.KeyboardMap.tab);
            this.addUiButton('UI_quarter',Flynn.KeyboardMap.num_5);
            this.addUiButton('UI_start1', Flynn.KeyboardMap.num_1);
            this.addUiButton('UI_start2', Flynn.KeyboardMap.num_2);

            this.addUiButton('UI_up',     Flynn.KeyboardMap.up);
            this.addUiButton('UI_down',   Flynn.KeyboardMap.down);
            this.addUiButton('UI_right',  Flynn.KeyboardMap.right);
            this.addUiButton('UI_left',   Flynn.KeyboardMap.left);
            if(Flynn.mcp.developerModeEnabled){
                this.addUiButton('UI_halt',   Flynn.KeyboardMap.grave_accent);
            }
        }
        else{
            this.addUiButton('UI_enter',  Flynn.KeyboardMap.icade_t1);
            this.addUiButton('UI_escape', Flynn.KeyboardMap.icade_b1);
            this.addUiButton('UI_exit',   Flynn.KeyboardMap.icade_b2);
            this.addUiButton('UI_quarter',Flynn.KeyboardMap.icade_t3);
            this.addUiButton('UI_start1', Flynn.KeyboardMap.icade_t4);
            this.addUiButton('UI_start2', Flynn.KeyboardMap.icade_b4);

            this.addUiButton('UI_up',     Flynn.KeyboardMap.icade_up);
            this.addUiButton('UI_down',   Flynn.KeyboardMap.icade_down);
            this.addUiButton('UI_right',  Flynn.KeyboardMap.icade_right);
            this.addUiButton('UI_left',   Flynn.KeyboardMap.icade_left);

        }
    },

    enableICade: function(){
        this.iCadeModeEnabled = true;
    },

    addiCadeMapping: function(iCadeButtonName, keyDown, keyUp){
        this.iCade.buttonNames.push(iCadeButtonName);
        this.iCade.buttonCodes.push(Flynn.KeyboardMap[iCadeButtonName]);
        this.iCade.keyDownCodes.push(Flynn.KeyboardMap[keyDown]);
        this.iCade.keyUpCodes.push(Flynn.KeyboardMap[keyUp]);
    },

    addUiButton: function(name, keyCode){
        if (this.uiButtons[name]){
            console.log(
                'Flynn: Warning: addUiButton() was called for UI button  "' + name +
                '" but that UI button already exists. The old UI button will be removed first.');
            delete(this.uiButtons[name]);
        }
        this.uiButtons[name] = new Flynn.VirtualButton(
            name,
            Flynn.BUTTON_NOT_CONFIGURABLE
            );
        this.uiButtons[name].boundKeyCode = keyCode;
        this.keyCodeToUiButtonName[keyCode] = name;
    },

    addVirtualButton: function(name, keyCode, isConfigurable){
        if (this.virtualButtons[name]){
            console.log(
                'Flynn: Warning: addVirtualButton() was called for virtual button  "' + name +
                '" but that virtual button already exists. The old virtual button will be removed first.');
            delete(this.virtualButtons[name]);
        }
        this.virtualButtons[name] = new Flynn.VirtualButton(name, isConfigurable);
        this.bindVirtualButtonToKey(name, keyCode);
    },

    bindVirtualButtonToKey: function(name, keyCode){
        if (keyCode === undefined){
            console.log(
                'Flynn: Warning: bindVirtualButtonToKey() was called for virtual button  "' + name +
                '" with keyCode "undefined". Assuming "null" instead, but this may indicate a mistake.');
            keyCode = null;
        }
        if (this.virtualButtons[name]){
            // Remove old binding (if one exists)
            this.unbindVirtualButtonFromKey(name);

            // Add new binding (which may be null)
            this.virtualButtons[name].boundKeyCode = keyCode;
            if(keyCode){
                // Non-null bindings get added to keyCodeToVirtualButtonName
                this.keyCodeToVirtualButtonName[keyCode] = name;
            }
        } else{
            console.log(
                'Flynn: Warning: bindVirtualButtonToKey() was called for virtual button  "' + name +
                '", but that virtual button does not exist. Doing nothing.');
        }
    },

    getConfigurableVirtualButtonNames: function(){
        var names = [];
        for (var name in this.virtualButtons){
            if(this.virtualButtons[name].isConfigurable){
                names.push(name);
            }
        }
        return names;
    },

    getVirtualButtonBoundKeyName: function(name){
        var boundKeyCode, boundKeyName;

        if(this.virtualButtons[name]){
            boundKeyCode = this.virtualButtons[name].boundKeyCode;
            boundKeyName = this.keyCodeToKeyName(boundKeyCode);
            return(boundKeyName);
        }
        else if(this.uiButtons[name]){
            boundKeyCode = this.uiButtons[name].boundKeyCode;
            boundKeyName = this.keyCodeToKeyName(boundKeyCode);
            return(boundKeyName);
        }
        else{
            // Button does not exist
            console.log(
                'Flynn: Warning: getVirtualButtonBoundKeyName() was called for virtual button  "' + name +
                '", but that virtual button does not exist.');
            return("ERROR");
        }
    },

    getVirtualButtonBoundKeyCode: function(name){
        if(this.virtualButtons[name]){
            return(this.virtualButtons[name].boundKeyCode);
        }
        else{
            // Button does not exist
            console.log(
                'Flynn: Warning: getVirtualButtonBoundKeyCode() was called for virtual button  "' + name +
                '", but that virtual button does not exist. Returning null.');
            return(null);
        }
    },

    keyCodeToKeyName: function(keyCode){
        for(var keyName in Flynn.KeyboardMap){
            if(Flynn.KeyboardMap[keyName]===keyCode){
                return keyName;
            }
        }
        return("(Unknown)");
    },

    unbindVirtualButtonFromKey: function(name){
        if (this.virtualButtons[name]){
            // Remove binding from keyCodeToVirtualButtonName
            for (var keyCode in this.keyCodeToVirtualButtonName){
                if (this.keyCodeToVirtualButtonName[keyCode] === name){
                    delete(this.keyCodeToVirtualButtonName[keyCode]);
                }
            }
            // Remove binding from virtualButtons
            this.virtualButtons[name].boundKeyCode = null;
        } else{
            console.log(
                'Flynn: Warning: unbindVirtualButtonFromKey() was called for virtual button  "' + name +
                '", but that virtual button does not exist. Doing nothing.');
        }
    },

    addTouchRegion: function(name, left, top, right, bottom, shape, visible_states){
        // The 'name' must match a virtual button for touches to be reported.
        // All touches are reported as virtual buttons.
        // Touch regions can be bound to virtual buttons which are also bound to keys.
        
        //console.log("DEV: Added touch region ", name);

        if (typeof shape == 'undefined') {
           shape = 'rect';  
        }

        if (name in this.touchRegions){
            // Remove old region if it exists.  Regions can thus be 
            // redefined by calling addTouchRegion again with the 
            // same name
            console.log(
                'Flynn: Info: addTouchRegion() was called for region  "' + name +
                '" and that touch region already exists. The old touch region will be removed first.');
            delete this.touchRegions[name];
        }
        var touchRegion = new Flynn.TouchRegion(name, left, top, right, bottom, shape, visible_states);
        this.touchRegions[name] = touchRegion;
        if (!(name in this.virtualButtons) && !(name in this.uiButtons)){
            console.log('Flynn: Warning: touch region name "' + name +
                        '" does not match an existing virtual button name.  Touches to this region will be unreported' +
                        ' unless (until) a virtual button with the same name is created.');
        }
    },

    renderTouchRegions: function(ctx){
        var name, region;
        for(name in this.touchRegions){
            region = this.touchRegions[name];
            if(region.show){
                if(region.shape == 'round'){
                    // Draw circular touch region
                    ctx.graphics.lineStyle(2, 0xFFFFFF, 0.2);
                    if(this.virtualButtonIsDown(name)){
                        ctx.graphics.beginFill(0xffffff, 0.3);
                    }
                    else{
                        ctx.graphics.beginFill(0xffffff, 0.1);
                    }
                    ctx.graphics.drawCircle(
                        (region.left + region.right) / 2, 
                        (region.top + region.bottom) / 2,
                        (region.right - region.left) / 2);
                    ctx.graphics.endFill();
                }
                else{
                    // Draw rectangular touch region
                    ctx.graphics.lineStyle(2, 0xFFFFFF, 0.2);
                    if(this.virtualButtonIsDown(name)){
                        ctx.graphics.beginFill(0xffffff, 0.3);
                    }
                    else{
                        ctx.graphics.beginFill(0xffffff, 0.1);
                    }
                    ctx.graphics.drawRect(
                        region.left,
                        region.top,
                        (region.right - region.left),
                        (region.bottom - region.top));
                    ctx.graphics.endFill();
                }
            }
        }
    },

    virtualButtonIsDown: function(name) {
        // Reports the current "physical" state of the button.
        // Returns "true" if down, and will continue to return true if 
        // called in the future if the button is held down.
        if(this.virtualButtons[name]){
            return this.virtualButtons[name].isDown;
        }
        else if (this.uiButtons[name]){
            return this.uiButtons[name].isDown;
        }
        else {
            console.log('Flynn: Warning: isDown() was called for virtual button  "' + name +
                '" but no virtual button with that name exists.');
        }
    },

    virtualButtonWasPressed: function(name) {
        // Reports whether a "button down" event has occurred. 
        // Returns "true" if a button down event occurred since the last time
        // this function was called.
        // Returns "false" on subsequent calls until the button is released and 
        // pressed again.
        if(this.virtualButtons[name]){
            if (this.virtualButtons[name].pressWasReported){
                // The current press was already reported, so don't report it again.
                return false;
            } else if (this.virtualButtons[name].isDown){
                // The button is down and no press has (yet) been reported, so report this one.
                this.virtualButtons[name].pressWasReported = true;
                //console.log("Set .pressWasReported for: " + name);
                return true;
            }
            // Button is not down
            return false;
        }
        else if(this.uiButtons[name]){
            if (this.uiButtons[name].pressWasReported){
                // The current press was already reported, so don't report it again.
                return false;
            } else if (this.uiButtons[name].isDown){
                // The button is down and no press has (yet) been reported, so report this one.
                this.uiButtons[name].pressWasReported = true;
                return true;
            }
            // Button is not down
            return false;
        }
        else {
            console.log('Flynn: Warning: isDown() was called for virtual button  "' + name +
                '" but no virtual button with that name exists.');
        }
    },

    armKeyCodeCapture: function() {
        this.keyCodeCaptureArmed = true;
        this.capturedKeyCode = null;
    },

    getCapturedKeyCode: function() {
        return (this.capturedKeyCode);
    },

    isKeyCodeAssigned: function(keyCode){
        // Returns true if the keyCode is assigned to any virtual button
        for(var name in this.virtualButtons){
            if(this.virtualButtons[name].boundKeyCode == keyCode){
                return true;
            }
        }
        return false;
    },

    addVirtualJoystick: function(opts){
        opts = opts || {};
        var joystick = new Flynn.VirtualJoystick(opts);

        // Remove old joystick if it exists.  Joysticks can thus be 
        // redefined by calling addVirtualJoystick again with the same name
        if (this.virtualJoysticks[joystick.name]){
            console.log(
                'Flynn: Info: addVirtualJoystick() was called for virtual joystick  "' + joystick.name +
                '" and that virtual joystick already exists. The old virtual joystick will be removed first.');
            delete(this.virtualJoysticks[joystick.name]);
        }
        this.virtualJoysticks[joystick.name] = joystick;
    },

    getAnalogJoystickPosition: function(name){
        if (!this.virtualJoysticks[name]){
            return null;
        }
        return this.virtualJoysticks[name].analog_pos;
    },

    updateVisibilityAllControls: function() {
        var name;
        for(name in this.virtualJoysticks){
            this.virtualJoysticks[name].updateVisibility(Flynn.mcp.current_state_id);
        }
        for(name in this.touchRegions){
            this.touchRegions[name].updateVisibility(Flynn.mcp.current_state_id);
        }
    },

    renderVirtualJoysticks: function(ctx) {
        var name;
        for(name in this.virtualJoysticks){
            this.virtualJoysticks[name].render(ctx);
        }
    },

});

}()); // "use strict" wrapper
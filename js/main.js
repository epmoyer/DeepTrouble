var GameCanvasHeight = 768;
var GameCanvasWidth = 1024;
var GameSpeedFactor = 1.0;

var States = {
	NO_CHANGE: 0,
	MENU:      1,
	CONFIG:    2,
	GAME:      3,
	END:       4
};

var Game = Class.extend({
	
	init: function() {
		"use strict";

		var self = this;
        
        this.input = new FlynnInputHandler();

		this.mcp = new FlynnMcp(GameCanvasWidth, GameCanvasHeight, this.input, States.NO_CHANGE, GameSpeedFactor);
		this.mcp.setStateBuilderFunc(
			function(state){
				switch(state){
					case States.MENU:
						return new StateMenu(self.mcp);
					case States.GAME:
						return new StateGame(self.mcp);
					case States.END:
						return new FlynnStateEnd(
							self.mcp,
							self.mcp.custom.score,
							self.mcp.custom.leaderboard,
							FlynnColors.ORANGE,
							'HIGH SCORES',
							'YOU MADE IT TO THE HIGH SCORE LIST!');
					case States.CONFIG:
						return new FlynnStateConfig(self.mcp, FlynnColors.DODGERBLUE, FlynnColors.LIGHTBLUE, FlynnColors.GREEN, FlynnColors.MAGENTA);
				}
			}
		);
		this.mcp.nextState = States.MENU;
		this.mcp.custom.score = 0;
		this.mcp.custom.leaderboard = new FlynnLeaderboard(
			this.mcp,
			['name', 'score'],  // attributeList
			6,                  // maxItems
			true                // sortDescending
			);
		this.mcp.custom.leaderboard.setDefaultList(
			[
				{'name': 'FIENDFODDER', 'score': 2000},
				{'name': 'FLOATINHEAD', 'score': 1300},
				{'name': 'WILLIAMS',    'score': 1200},
				{'name': 'GORLIN',      'score': 1100},
				{'name': 'DELMAN',      'score': 600 },
				{'name': 'BURNESS',     'score': 500 },
			]);
		this.mcp.custom.leaderboard.loadFromCookies();
		this.mcp.custom.leaderboard.saveToCookies();

        // Setup inputs
        console.log("FNORD!");
        if(!this.mcp.iCadeModeEnabled){
			this.input.addVirtualButton('P1 left',  FlynnKeyboardMap['z'], FlynnConfigurable);
			this.input.addVirtualButton('P1 right', FlynnKeyboardMap['x'], FlynnConfigurable);
			this.input.addVirtualButton('P2 left',  FlynnKeyboardMap['n'], FlynnConfigurable);
			this.input.addVirtualButton('P2 right', FlynnKeyboardMap['m'], FlynnConfigurable);
		}
		else{
			console.log("FNORD2!!");
			this.input.addVirtualButton('P1 left',  FlynnKeyboardMap['ICADE_T1'], FlynnNotConfigurable);
			this.input.addVirtualButton('P1 right', FlynnKeyboardMap['ICADE_T2'], FlynnNotConfigurable);
			this.input.addVirtualButton('P2 left',  FlynnKeyboardMap['ICADE_T3'], FlynnNotConfigurable);
			this.input.addVirtualButton('P2 right', FlynnKeyboardMap['ICADE_T4'], FlynnNotConfigurable);
		}

		if(this.mcp.developerModeEnabled){
			this.input.addVirtualButton('dev_metrics', FlynnKeyboardMap['6'], FlynnNotConfigurable);
			this.input.addVirtualButton('dev_slow_mo', FlynnKeyboardMap['7'], FlynnNotConfigurable);
			this.input.addVirtualButton('dev_fps_20', FlynnKeyboardMap['\\'], FlynnNotConfigurable);
			this.input.addVirtualButton('dev_add_points', FlynnKeyboardMap['8'], FlynnNotConfigurable);
			this.input.addVirtualButton('dev_die', FlynnKeyboardMap['9'], FlynnNotConfigurable);
			this.input.addVirtualButton('dev_rescue', FlynnKeyboardMap['0'], FlynnNotConfigurable);
			this.input.addVirtualButton('dev_base', FlynnKeyboardMap['-'], FlynnNotConfigurable);
			this.input.addVirtualButton('dev_kill_human', FlynnKeyboardMap[']'], FlynnNotConfigurable);
		}
		if(this.mcp.arcadeModeEnabled){
			if(!this.mcp.iCadeModeEnabled){
				this.input.addVirtualButton('quarter', FlynnKeyboardMap['5'], FlynnConfigurable);
				this.input.addVirtualButton('start_1', FlynnKeyboardMap['1'], FlynnConfigurable);
			}
			else{
				this.input.addVirtualButton('quarter', FlynnKeyboardMap['ICADE_B3'], FlynnNotConfigurable);
				this.input.addVirtualButton('start_1', FlynnKeyboardMap['ICADE_B4'], FlynnNotConfigurable);
			}
		}

		// Options
		this.mcp.optionManager.addOptionFromVirtualButton('P1 left');
		this.mcp.optionManager.addOptionFromVirtualButton('P1 right');
		this.mcp.optionManager.addOptionFromVirtualButton('P2 left');
		this.mcp.optionManager.addOptionFromVirtualButton('P2 right');
		this.mcp.optionManager.addOption('musicEnabled', FlynnOptionType.BOOLEAN, true, true, 'MUSIC', null, null);
		this.mcp.optionManager.addOption('resetScores', FlynnOptionType.COMMAND, true, true, 'RESET HIGH SCORES', null,
			function(){self.resetScores();});

		// Restore user option settings from cookies
		this.mcp.optionManager.loadFromCookies();
		
		// Set resize handler and force a resize
		this.mcp.setResizeFunc( function(width, height){
			if(self.mcp.browserSupportsTouch){
				self.input.addTouchRegion("rotate left",0,0,width/4,height); // Left quarter
				self.input.addTouchRegion("rotate right",width/4+1,0,width/2,height); // Left second quarter
				self.input.addTouchRegion("thrust",width/2+1,0,width,height); // Right half
				self.input.addTouchRegion("UI_enter",0,0,width,height); // Whole screen
			}
		});
		this.mcp.resize();
	},

	resetScores: function(){
		this.mcp.custom.leaderboard.restoreDefaults();
	},

	run: function() {
		// Start the game
		this.mcp.run();
	}
});
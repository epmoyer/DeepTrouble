var Game = Game || {}; // Create namespace

(function () { "use strict";

Game.VERSION = '0.2';
Game.CANVAS_HEIGHT = 768;
Game.CANVAS_WIDTH = 1024;
Game.SPEED_FACTOR = 1.0;

Game.States = {
    NO_CHANGE: 0,
    MENU:      1,
    CONFIG:    2,
    GAME:      3,
    END:       4
};

Game.Main = Class.extend({
    
    init: function() {

        var self = this;

        Flynn.init(
            Game.CANVAS_WIDTH,
            Game.CANVAS_HEIGHT, 
            Game.States.NO_CHANGE,
            Game.SPEED_FACTOR,
            function(state){
                switch(state){
                    case Game.States.MENU:
                        return new Game.StateMenu();
                    case Game.States.GAME:
                        return new Game.StateGame();
                    case Game.States.END:
                        return new FlynnStateEnd(
                            Game.config.score,
                            Game.config.leaderboard,
                            Flynn.Colors.ORANGE,
                            'HIGH SCORES',
                            'YOU MADE IT TO THE HIGH SCORE LIST!',
                            Game.Staes.MENU
                            );
                    case Game.States.CONFIG:
                        return new Flynn.StateConfig(
                            Flynn.Colors.DODGERBLUE,
                            Flynn.Colors.LIGHTBLUE,
                            Flynn.Colors.GREEN,
                            Flynn.Colors.MAGENTA,
                            Game.States.MENU
                            );
                }
            }
        );
        Flynn.mcp.changeState(Game.States.MENU);

        if (typeof Game.config == "undefined") {
           Game.config = {};  // Create config object
        }
        Game.config.score = [0, 0];
        Game.config.leaderboard = new Flynn.Leaderboard(
            ['name', 'score'],  // attributeList
            6,                  // maxItems
            true                // sortDescending
            );
        Game.config.leaderboard.setDefaultList(
            [
                {'name': 'FIENDFODDER', 'score': 2000},
                {'name': 'FLOATINHEAD', 'score': 1300},
                {'name': 'WILLIAMS',    'score': 1200},
                {'name': 'GORLIN',      'score': 1100},
                {'name': 'DELMAN',      'score': 600 },
                {'name': 'BURNESS',     'score': 500 },
            ]);
        Game.config.leaderboard.loadFromCookies();
        Game.config.leaderboard.saveToCookies();

        // Setup inputs
        var input = Flynn.mcp.input;
        if(!Flynn.mcp.iCadeModeEnabled){
            input.addVirtualButton('P1 left',        Flynn.KeyboardMap.z,         Flynn.BUTTON_CONFIGURABLE);
            input.addVirtualButton('P1 right',       Flynn.KeyboardMap.x,         Flynn.BUTTON_CONFIGURABLE);
            input.addVirtualButton('P2 left',        Flynn.KeyboardMap.n,         Flynn.BUTTON_CONFIGURABLE);
            input.addVirtualButton('P2 right',       Flynn.KeyboardMap.m,         Flynn.BUTTON_CONFIGURABLE);
        }
        else{
            input.addVirtualButton('P1 left',        Flynn.KeyboardMap.icade_t1,  Flynn.BUTTON_NOT_CONFIGURABLE);
            input.addVirtualButton('P1 right',       Flynn.KeyboardMap.icade_t2,  Flynn.BUTTON_NOT_CONFIGURABLE);
            input.addVirtualButton('P2 left',        Flynn.KeyboardMap.icade_t3,  Flynn.BUTTON_NOT_CONFIGURABLE);
            input.addVirtualButton('P2 right',       Flynn.KeyboardMap.icade_t4,  Flynn.BUTTON_NOT_CONFIGURABLE);
        }

        if(Flynn.mcp.developerModeEnabled){
            input.addVirtualButton('dev_metrics',    Flynn.KeyboardMap.num_6,     Flynn.BUTTON_NOT_CONFIGURABLE);
            input.addVirtualButton('dev_slow_mo',    Flynn.KeyboardMap.num_7,     Flynn.BUTTON_NOT_CONFIGURABLE);
            input.addVirtualButton('dev_fps_20',     Flynn.KeyboardMap.backslash, Flynn.BUTTON_NOT_CONFIGURABLE);
            input.addVirtualButton('dev_add_points', Flynn.KeyboardMap.num_8,     Flynn.BUTTON_NOT_CONFIGURABLE);
            input.addVirtualButton('dev_die',        Flynn.KeyboardMap.num_9,     Flynn.BUTTON_NOT_CONFIGURABLE);
        }

        // Options
        Flynn.mcp.optionManager.addOptionFromVirtualButton('P1 left');
        Flynn.mcp.optionManager.addOptionFromVirtualButton('P1 right');
        Flynn.mcp.optionManager.addOptionFromVirtualButton('P2 left');
        Flynn.mcp.optionManager.addOptionFromVirtualButton('P2 right');
        Flynn.mcp.optionManager.addOption('musicEnabled', Flynn.OptionType.BOOLEAN, true, true, 'MUSIC', null, null);
        Flynn.mcp.optionManager.addOption('resetScores', Flynn.OptionType.COMMAND, true, true, 'RESET HIGH SCORES', null,
            function(){self.resetScores();});

        // Restore user option settings from cookies
        Flynn.mcp.optionManager.loadFromCookies();
        
        // Set resize handler and force a resize
        Flynn.mcp.setResizeFunc( function(width, height){
            // No action
        });
        Flynn.mcp.resize();
    },

    resetScores: function(){
        Game.config.leaderboard.restoreDefaults();
    },

    run: function() {
        // Start the game
        Flynn.mcp.run();
    }
});

}()); // "use strict" wrapper
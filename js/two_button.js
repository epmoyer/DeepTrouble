var Game = Game || {}; // Create namespace

(function () { "use strict";

Game.ButtonEvent = {
    TapLeft: 1,
    TapRight: 2,
    DoubleTap: 3,
    DoubleHold: 4,
    PullLeft: 5,
    PullRight: 6,
    RollLeft: 7,
    RollRight: 8,
    DoubleRollLeft: 9,
    DoubleRollRight: 10,
    BounceLeft: 11,
    BounceRight: 12,
    HoldTapLeft: 13,
    HoldTapRight: 14,
};

Game.ButtonStates = {
    IDLE: 0,
    L: 1,
    R: 2,
    LR: 3,
    L_R: 4,
    L_R_L: 5,
    R_L: 6,
    R_L_R: 7,
    LR_HOLD: 8,
    LR_CANCELING: 9,
};

Game.TwoButton = Class.extend({

    TIME_DEBOUNCE_SEC:    4/60.0,
    TIME_DOUBLE_HOLD_SEC: 8/60.0,
    
    init: function(leftButtonName, rightButtonName) {
        this.leftButtonName = leftButtonName;
        this.rightButtonName = rightButtonName;
        this.bState = Game.ButtonStates.IDLE;
        this.bStableTimeSec = 0;
        this.bStateHoldTimeSec = 0;
        this.bLeftPrevious = false;
        this.bRightPrevious = false;
    },

    update: function(input, paceFactor){

        var bStatePrevious = this.bState;
        this.bStateHoldTime += paceFactor/60.0;

        var bEvent = null; 
        var bLeft = input.virtualButtonIsDown(this.leftButtonName);
        var bRight = input.virtualButtonIsDown(this.rightButtonName);
        var bStable = false;
        if (bLeft == this.bLeftPrevious && bRight == this.bRightPrevious){
            this.bStableTimeSec += paceFactor/60.0;
            if (this.bStableTimeSec >= this.TIME_DEBOUNCE_SEC){
                bStable = true;
            } 
        } else{
            this.bStableTimeSec = 0.0;
        }
        
        switch(this.bState){
            case Game.ButtonStates.IDLE:
                if (bLeft && bRight) this.bState = Game.ButtonStates.LR;
                else if (bLeft && bStable) this.bState = Game.ButtonStates.L;
                else if (bRight && bStable) this.bState = Game.ButtonStates.R;
                // Support rapid TapLeft and TapRight events (i.e. without meeting bStable timeout)
                else if (!bLeft && this.bLeftPrevious) bEvent = Game.ButtonEvent.TapLeft;
                else if (!bRight && this.bRightPrevious) bEvent = Game.ButtonEvent.TapRight;
                break;

            case Game.ButtonStates.L:
                if (!bLeft){
                    this.bState  = Game.ButtonStates.IDLE;
                    bEvent = Game.ButtonEvent.TapLeft;
                }
                else if (bRight){
                    this.bState = Game.ButtonStates.L_R;
                }
                break;

            case Game.ButtonStates.L_R:
                if (bLeft && !bRight && bStable){
                    this.bState  = Game.ButtonStates.L_R_L;
                    bEvent = Game.ButtonEvent.HoldTapLeft;
                }
                else if (!bLeft && !bRight && bStable){
                    this.bState = Game.ButtonStates.IDLE;
                }
                break;

            case Game.ButtonStates.L_R_L:
                if (bLeft && bRight && bStable){
                    // Allow "TapRight" Chaining
                    this.bState  = Game.ButtonStates.L_R;
                }
                if (!bLeft && !bRight && bStable){
                    // Release
                    this.bState  = Game.ButtonStates.IDLE;
                }
                break;

            case Game.ButtonStates.R:
                if (!bRight){
                    this.bState  = Game.ButtonStates.IDLE;
                    bEvent = Game.ButtonEvent.TapRight;
                }
                else if (bLeft){
                    this.bState = Game.ButtonStates.R_L;
                }
                break;

            case Game.ButtonStates.R_L:
                if (!bLeft && bRight && bStable){
                    this.bState  = Game.ButtonStates.R_L_R;
                    bEvent = Game.ButtonEvent.HoldTapRight;
                }
                else if (!bLeft && !bRight && bStable){
                    this.bState = Game.ButtonStates.IDLE;
                }
                break;

            case Game.ButtonStates.R_L_R:
                if (bLeft && bRight && bStable){
                    // Allow "TapLeft" Chaining
                    this.bState  = Game.ButtonStates.R_L;
                }
                if (!bLeft && !bRight && bStable){
                    // Release
                    this.bState  = Game.ButtonStates.IDLE;
                }
                break;

            case Game.ButtonStates.LR:
                if (!bLeft && !bRight){
                    this.bState  = Game.ButtonStates.IDLE;
                    bEvent = Game.ButtonEvent.DoubleTap;
                }
                if(bLeft && bRight && (this.bStateHoldTimeSec >= this.TIME_DOUBLE_HOLD_SEC)){
                    this.bState = Game.ButtonStates.LR_HOLD;
                    bEvent = Game.ButtonEvent.DoubleHold;
                }
                break;

            case Game.ButtonStates.LR_HOLD:
                if (!bLeft && !bRight){
                    this.bState = Game.ButtonStates.IDLE;
                }
                else if ((bLeft && !bRight) || (!bLeft && bRight)){
                    this.bState = Game.ButtonStates.LR_CANCELING;
                }
                else{
                    bEvent = Game.ButtonEvent.DoubleHold;
                }

                break;

            case Game.ButtonStates.LR_CANCELING:
                if (!bLeft && !bRight){
                    this.bState = Game.ButtonStates.IDLE;
                }
                break;

        }

        if (this.bState != bStatePrevious){
            this.bStateHoldTimeSec = 0;
        }
        else{
            this.bStateHoldTimeSec += paceFactor / 60.0;
        }
        this.bLeftPrevious = bLeft;
        this.bRightPrevious = bRight;
        return(bEvent);
    },
});

}()); // "use strict" wrapper
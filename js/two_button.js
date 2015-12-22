var ButtonEvent = {
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

var ButtonStates = {
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

var TimeDebounceSec = 4/60.0;
var TimeDoubleHoldSec = 8/60.0;

var TwoButton = Class.extend({
    
    init: function(leftButtonName, rightButtonName) {
        this.leftButtonName = leftButtonName;
        this.rightButtonName = rightButtonName;
        this.bState = ButtonStates.IDLE;
        this.bStableTimeSec = 0;
        this.bStateHoldTimeSec = 0;
        this.bLeftPrevious = false;
        this.bRightPrevious = false;
    },

    update: function(input, paceFactor){

        bStatePrevious = this.bState;
        this.bStateHoldTime += paceFactor/60.0;

        bEvent = null; 
        bLeft = input.virtualButtonIsDown(this.leftButtonName);
        bRight = input.virtualButtonIsDown(this.rightButtonName);
        bStable = false;
        if (bLeft == this.bLeftPrevious && bRight == this.bRightPrevious){
            this.bStableTimeSec += paceFactor/60.0;
            if (this.bStableTimeSec >= TimeDebounceSec){
                bStable = true;
            } 
        } else{
            this.bStableTimeSec = 0.0;
        }
        
        switch(this.bState){
            case ButtonStates.IDLE:
                if (bLeft && bRight) this.bState = ButtonStates.LR;
                else if (bLeft && bStable) this.bState = ButtonStates.L;
                else if (bRight && bStable) this.bState = ButtonStates.R;
                // Support rapid TapLeft and TapRight events (i.e. without meeting bStable timeout)
                else if (!bLeft && this.bLeftPrevious) bEvent = ButtonEvent.TapLeft;
                else if (!bRight && this.bRightPrevious) bEvent = ButtonEvent.TapRight;
                break;

            case ButtonStates.L:
                if (!bLeft){
                    this.bState  = ButtonStates.IDLE;
                    bEvent = ButtonEvent.TapLeft;
                }
                else if (bRight){
                    this.bState = ButtonStates.L_R;
                }
                break;

            case ButtonStates.L_R:
                if (bLeft && !bRight && bStable){
                    this.bState  = ButtonStates.L_R_L;
                    bEvent = ButtonEvent.HoldTapRight;
                }
                else if (!bLeft && !bRight && bStable){
                    this.bState = ButtonStates.IDLE;
                }
                break;

            case ButtonStates.L_R_L:
                if (bLeft && bRight && bStable){
                    // Allow "TapRight" Chaining
                    this.bState  = ButtonStates.L_R;
                }
                if (!bLeft && !bRight && bStable){
                    // Release
                    this.bState  = ButtonStates.IDLE;
                }
                break;

            case ButtonStates.R:
                if (!bRight){
                    this.bState  = ButtonStates.IDLE;
                    bEvent = ButtonEvent.TapRight;
                }
                else if (bLeft){
                    this.bState = ButtonStates.R_L;
                }
                break;

            case ButtonStates.R_L:
                if (!bLeft && bRight && bStable){
                    this.bState  = ButtonStates.R_L_R;
                    bEvent = ButtonEvent.HoldTapLeft;
                }
                else if (!bLeft && !bRight && bStable){
                    this.bState = ButtonStates.IDLE;
                }
                break;

            case ButtonStates.R_L_R:
                if (bLeft && bRight && bStable){
                    // Allow "TapLeft" Chaining
                    this.bState  = ButtonStates.R_L;
                }
                if (!bLeft && !bRight && bStable){
                    // Release
                    this.bState  = ButtonStates.IDLE;
                }
                break;

            case ButtonStates.LR:
                if (!bLeft && !bRight){
                    this.bState  = ButtonStates.IDLE;
                    bEvent = ButtonEvent.DoubleTap;
                }
                if(bLeft && bRight && (this.bStateHoldTimeSec >= TimeDoubleHoldSec)){
                    this.bState = ButtonStates.LR_HOLD;
                    bEvent = ButtonEvent.DoubleHold;
                }
                break;

            case ButtonStates.LR_HOLD:
                if (!bLeft && !bRight){
                    this.bState = ButtonStates.IDLE;
                }
                else if ((bLeft && !bRight) || (!bLeft && bRight)){
                    this.bState = ButtonStates.LR_CANCELING;
                }
                else{
                    bEvent = ButtonEvent.DoubleHold;
                }

                break;

            case ButtonStates.LR_CANCELING:
                if (!bLeft && !bRight){
                    this.bState = ButtonStates.IDLE;
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
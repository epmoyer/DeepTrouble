var ButtonEvent = {
    TapLeft: 0,
    TapRight: 1,
    DoubleTap: 2,
    DoubleHold: 3,
    PullLeft: 4,
    PullRight: 5,
    RollLeft: 6,
    RollRight: 7,
    DoubleRollLeft: 8,
    DoubleRollRight: 9,
    BounceLeft: 10,
    BounceRight: 11,
    HoldTapLeft: 12,
    HoldTapRight: 13,
};

var ButtonStates = {
    STATE_IDLE: 0,
    STATE_L: 1,
    STATE_R: 2,
    STATE_LR: 3,
    STATE_L_R: 4,
    STATE_R_L: 5,
    STATE_LR_HOLD: 6,
    STATE_LR_CANCELING: 7,
};

TimeDebounceSec = 3/60.0;
TimeDoubleHoldSec = 6/60.0;

var TwoButton = Class.extend({
    
    init: function(leftButtonName, rightButtonName) {
        this.leftButtonName = leftButtonName;
        this.rightButtonName = rightButtonName;
        this.bState = ButtonStates.STATE_IDLE;
        this.bStable = true;
        this.bStateHoldTime = 0;
    },

    udpate: function(paceFactor){

        bStatePrevious = this.bState;
        this.bStateHoldTime += paceFactor * 1/60.0;

        bEvent = null; 
        bLeft = input.virtualButtonIsDown(this.leftButtonName);
        bRight = input.virtualButtonIsDown(this.rightButtonName);

        switch(this.bState){
            case ButtonStates.STATE_IDLE:
                if (bLeft && bRight) this.bState = ButtonStates.STATE_LR;
                else if (bLeft && bStable) this.bState = ButtonStates.STATE_L;
                else if (bRight && bStable) this.bState = ButtonStates.STATE_R;
                break;

            case ButtonStates.STATE_L:
                if (!bLeft){
                    this.bState  = ButtonStates.STATE_IDLE;
                    bEvent = ButtonEvent.TapLeft;
                }
                else if (bRight){
                    this.bState = ButtonStates.STATE_L_R;
                }
                break;

            case ButtonStates.STATE_L_R:
                if (bLeft && !bRight && bStable){
                    this.bState  = ButtonStates.STATE_L_R_L;
                    bEvent = ButtonEvent.HoldTapRight;
                }
                else if (!bleft && !bright && bStable){
                    this.bState = ButtonStates.STATE_IDLE;
                }
                break;

            case ButtonStates.STATE_R:
                if (!bRight){
                    this.bState  = ButtonStates.STATE_IDLE;
                    bEvent = ButtonEvent.TapRight;
                }
                else if (bLeft){
                    this.bState = ButtonStates.STATE_R_L;
                }
                break;

            case ButtonStates.STATE_LR:
                if (!bLeft && !bRight){
                    this.bState  = ButtonStates.STATE_IDLE;
                    bEvent = ButtonEvent.DoubleTap;
                }
                if(bLeft && bRight && (this.bStateHoldTime >= TimeDoubleHoldSec)){
                    this.bState = ButtonStates.STATE_LR_HOLD;
                    bEvent = ButtonEvent.DoubleHold;
                }
                break;

            case ButtonStates.STATE_LR_HOLD:
                if (!bLeft && !bRight){
                    this.bState = ButtonStates.STATE_IDLE;
                }
                else if (bLeft || bRight){
                    this.bState = ButtonStates.STATE_LR_CANCELING;
                }
                else{
                    bEvent = ButtonEvent.DoubleHold;
                }

                break;

            case ButtonStates.STATE_LR_CANCELING:
                if (!bLeft && !bRight){
                    this.bState = ButtonStates.STATE_IDLE;
                }
                break;

        }

        if (this.bState != bStatePrevious){
            this.bStateHoldTime = 0;
        }
    },

});
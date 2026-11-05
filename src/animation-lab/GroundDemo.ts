export const DEMO_DURATION=14;
/** Input script only. Acceleration, state transitions and bones remain shared. */
export function groundDemoCue(time:number):{speed:number;label:string} {
 const t=((time%DEMO_DURATION)+DEMO_DURATION)%DEMO_DURATION;
 if(t<2)return {speed:0,label:'待机'};
 if(t<5)return {speed:60,label:'向右走路'};
 if(t<8)return {speed:128,label:'向右加速跑步'};
 if(t<8.5)return {speed:0,label:'松键制动'};
 if(t<8.8)return {speed:-60,label:'向左转身'};
 if(t<11.8)return {speed:-128,label:'向左跑步'};
 return {speed:0,label:t<12.3?'停止恢复':'回到待机'};
}

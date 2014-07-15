import {Config} from "./Config"

var __laserRunning = false
var fails = 0

export function startLaser(callback){
  if( ! __laserRunning){
    getLasers(0, callback)
  }
  __laserRunning = true
}

export function stopLaser(){
  __laserRunning = false
}


function getLasers( iter=0 , callback= ()=>{}){

  function reqListener () {
    var obj = JSON.parse( this.responseText)
    //console.log(obj)
    fails = Math.max(0,fails-1)
    callback( obj )
    if( iter > 100 ){
      console.log('laser running')
      iter = 0
    }
    if( __laserRunning ){
          getLasers( iter+1,callback )
    }
  }

  function errorCall(){
    console.warn('error getting laser')
    fails = fails+1
    if( fails < 10){
        getLasers(0,callback)
    }
    else{
      console.error("Too many laser fails.")
      callback({"ERROR":"ERROR: too many failures in laser pointer finding"})

    }
  }

  var oReq = new XMLHttpRequest();
  var url = Config.brightestPointServer
  oReq.addEventListener("error", errorCall, false);
  oReq.onload = reqListener;
  oReq.open("get", url, true);
  oReq.send();
}

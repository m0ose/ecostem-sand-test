
export function showCanvas( canvasID="scanCanvas", x=0, y=0, width=window.innerWidth, height=window.innerHeight ){
  var can = document.getElementById(canvasID)
  if( !canvasID || !can){
      can = makeCanvas()
  }
  can.width = width
  can.height = height
  can.style.display = "inline"
  can.style['z-index']=2000;
  can.style.position =  'absolute';
  can.style.left = x+'px';
  can.style.top = y+'px';
  return can
}

export function hideCanvas( canvasID="scanCanvas"){
  var can = document.getElementById(canvasID)
  if( !canvasID || !can){
      can = makeCanvas()
  }
  can.style.display = "none"
  return can
}

function makeCanvas(){
  document.createElement('canvas')
  return canvas
}

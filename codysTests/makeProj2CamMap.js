export function makeProj2CamMap( data , width=128, height=128){
  var prj2Cam = new Array(width*height)
  var prj2Cam2 = new Array(width*height)//[new Float64Array(width*height), new Float64Array(width*height) ]
  var variance = new Float64Array(width*height)

  for (var i = 0; i < prj2Cam.length; i++) {
      prj2Cam[i] = []
  }

  //accumulate projector map. Note there probably will be more than one camera pixel per projector pixel.
  // hopefully
  var count =0
  for (var x = 0; x < data.width; x++) {
      for (var y = 0; y < data.height; y++) {
          var d = data.data[x][y]
          if (d.x > 0 && d.x < width && d.y > 0 && d.y < height) {
              var indx = d.y * width + d.x
              d.xc = x
              d.yc = y
              prj2Cam[indx].push(d)
              count++
          }
      }
  }

  // Find the average of the accumulated camera pixels
  //
  for( var i=0; i<prj2Cam.length; i++ ){
      var xavg = 0
      var yavg = 0
      var dp = prj2Cam[i]
      variance[i]=0
      var xp = 0
      var yp = 0
      for(var j=0; j < dp.length; j++){
          xavg += dp[j].xc
          yavg += dp[j].yc
          variance[i] += dp[j].variance
          xp = dp[j].x
          yp = dp[j].y
      }
      xavg = xavg/dp.length
      yavg = yavg/dp.length
      variance[i] = variance[i]/dp.length || 0

      prj2Cam2[i] = { 
        xc:xavg || 0,
        yc:yavg || 0,
        xp:xp,
        yp:yp,
        variance:variance[i]
      }
  }
  return{map:prj2Cam2, width:width, height:height}
}
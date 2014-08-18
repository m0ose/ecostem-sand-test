/*

this uses 
     <script src="../lib/Fundamental_Matrix/fundMatrix.js"></script>
        <script src="../lib/Fundamental_Matrix/arrayMod.js"></script>
        <script src="../lib/Fundamental_Matrix/plot.js"></script>

*/

import {
  makeProj2CamMap
}
from "makeProj2CamMap"

export class ransacFundMatrixEstimate {
  constructor(data, iterations = 100) {
    this.prj2Cam = makeProj2CamMap(data, 128, 128)
    this.data = data
    this.sample1size = 3000
    this.smallSampleSize = 400
    this.inlierThreshold = 0.01
    this.addNoise = false //this is just for testing whether it can handle noise
    this.iterations = iterations
    this.F = null
    this.epipoleRight = null
    this.epipoleLeft = null
    this.pointsP2C = null //projector to camera
    this.pointsC2P = null //camera to projector

    this.run(this.data)
  }

  //
  //  Main program
  //
  run(data) {
    var samp = []
    var xp2c = [
      [],
      [],
      []
    ]
    var xc2p = [
      [],
      [],
      []
    ]

    // sort in decending order in terms of variance 
    var sorted = this.prj2Cam.map.sort(function(a, b) {
      return b.variance - a.variance
    })

    //choose the many points with the most variance
    for (var i = 0; i < this.sample1size; i++) {
      var da = sorted[i]
      xc2p[0].push(da.xp)
      xc2p[1].push(da.yp)
      xc2p[2].push(1)
      xp2c[0].push(da.xc)
      xp2c[1].push(da.yc)
      xp2c[2].push(1)
    }

    if (this.addNoise) { //add noise. used for debugging
      for (var j = 0; j < 100; j++) {
        xc2p[0].push(Math.random() * 300)
        xc2p[1].push(Math.random() * 300)
        xc2p[2].push(1)
        xp2c[0].push(Math.random() * 1000)
        xp2c[1].push(Math.random() * 1000)
        xp2c[2].push(1)
      }
    }

    var F = this.iterativelyFindF2(xc2p, xp2c, this.iterations)
    var epipoles = fundmatrix.epipole(F)
    console.log(F, epipoles)
    this.F = F
    this.epipoleLeft = epipoles.e1
    this.epipoleRight = epipoles.e2
    this.pointsC2P = xc2p
    this.pointsP2C = xp2c

  }

  //
  // My attempt to implement the RANSAC algorithm to pick good points
  //
  // http://en.wikipedia.org/w/index.php?title=RANSAC&oldid=116358182
  //
  iterativelyFindF2(xc2p, xp2c, iters = this.iterations) {
    var minerror = Number.MAX_SAFE_INTEGER
    var minF = null
    var maxinliers = 0
    var fu = 0
    var minXc = null
    var minXp = null
    var xc2pt = numeric.transpose(xc2p)
    var xp2ct = numeric.transpose(xp2c)

    for (var i = 0; i < iters; i++) {
      var samp = this.sample(xc2p, xp2c, this.smallSampleSize)

      var F = fundmatrix.estimateF(samp.x1, samp.x2)
      var inliers = this.findInliers(F, xc2p, xp2c, this.inlierThreshold)
      var ge = this.geometricError(F, xc2p, xp2c)

      if (inliers.inliers > maxinliers) { //inliers.inliers/ge.error > fu){//inliers.inliers > maxinliers){//inliers.inliers/ge.error > fu){//ge.error < minerror){//inliers.inliers > maxinliers  ){//ge.error < minerror){
        fu = inliers.inliers / ge.error
        maxinliers = inliers.inliers
        minerror = ge.error
        minF = F
        minXc = inliers.x1
        minXp = inliers.x2
        console.log(ge.error, " inliers: ", maxinliers, F)
      }
    }
    //finally compute a fundamental matrix just with the inliers
    console.log('generating final F using ', maxinliers, " inliers")
    F = fundmatrix.estimateF(minXc, minXp)
    console.log("min error", minerror)
    console
    return minF
  }


  //
  // Randomly sample from the 2 arrays at the same time. ughh tougher than i thought
  //
  sample(x1in, x2in, n) {
    var x1 = numeric.transpose(x1in)
    var x2 = numeric.transpose(x2in)
    var indices = []
    for (var i = 0; i < x1.length; i++) {
      indices[i] = i
    }
    var indices2 = _.shuffle(indices)
    var x1r = []
    var x2r = []
    var notx1 = []
    var notx2 = []
    for (var i = 0; i < n; i++) {
      x1r.push(x1[indices2[i]])
      x2r.push(x2[indices2[i]])
    }
    for (var j = n; j < x1.length; j++) {
      notx1.push(x1[indices2[j]])
      notx2.push(x2[indices2[j]])
    }
    return ({
      x1: numeric.transpose(x1r),
      x2: numeric.transpose(x2r),
      notx1: numeric.transpose(notx1),
      notx2: numeric.transpose(notx2)
    })

  }

  //
  // Find inliers that are within a certain error threshold
  //
  findInliers(F, x1, x2, error = 0.1) {
    var inl1 = []
    var inl2 = []
    var x1t = numeric.transpose(x1)
    var x2t = numeric.transpose(x2)
    var sum = 0
    var inliers = 0
    var score = 0
    var notvertCount = 0
    for (var i = 0; i < x1t.length; i++) {
      var err = this.geoError(F, x1t[i], x2t[i]);
      sum += err
      if (err < error) {
        inl1.push(x1t[i])
        inl2.push(x2t[i])
        inliers++
      }
    }
    return {
      x1: x1,
      x2: x2,
      inliers: inliers
    }
  }

  //
  // calculate the geometric error for a whole array of points
  //   Sampson's error
  //
  geometricError(F, x1, x2) {
    var x1t = numeric.transpose(x1)
    var x2t = numeric.transpose(x2)
    var sum = 0
    var inliers = 0
    for (var i = 0; i < x1t.length; i++) {
      var err = this.geoError(F, x1t[i], x2t[i]);
      sum += err
    }
    sum = sum / x1t.length
    return {
      error: sum
    }
  }

  //
  // calculate the geometric error for one point
  //   Sampson cost function
  //
  geoError(F, x1, x2) {
    var numerator = numeric.dot(F, x1)
    numerator = Math.pow(numeric.dot(x2, numeric.dot(F, x1)), 2)
    var fx1 = numeric.dot(F, x1)
    var d1 = fx1[0] * fx1[0]
    var d2 = fx1[1] * fx1[1]
    var Ft = numeric.transpose(F)
    var ftx2 = numeric.dot(Ft, x2)
    var d3 = ftx2[0] * ftx2[0]
    var d4 = ftx2[1] * ftx2[1]
    var denom = d1 + d2 + d3 + d4
    var result = numerator / denom
    return result
  }

  draw(canvas) {
    var plot2 = function(x, xb, coef, canvas) {
      var context = canvas.getContext('2d');

      var A = coef[0]
      var B = coef[1]
      var C = coef[2]
      var m = -A / B
      var inter = -C / B

      var x0 = x[0]
      var y0 = x[0] * m + inter
      var x1 = x[0]
      var y1 = x1 * m + inter
      var x2 = xb[0] //x[0] + 5*m
      var y2 = x2 * m + inter

      context.strokeStyle = "rgba(0,0,0,0.1)"
      context.beginPath()
      context.moveTo(x1, y1)
      context.lineTo(x2, y2)
      context.stroke()
      context.fillStyle = "#50f"
      context.fillRect(x[0] - 2, x[1] - 2, 4, 4)
      context.fillStyle = "#5f5"
      context.fillRect(x0 - 1, y0 - 1, 2, 2)
    }

    var ctx = canvas.getContext('2d')

    var epipoles = fundmatrix.epipole(this.F)
    console.log(this.F, epipoles)

    var line = numeric.transpose(numeric.dot(this.F, this.pointsC2P))

    for (var i = 0; i < line.length; i++) {
      plot2([this.pointsP2C[0][i], this.pointsP2C[1][i]], [epipoles.e2[0], epipoles.e2[1]], line[i], canvas)
    }

    console.log(this.geometricError(this.F, this.pointsC2P, this.pointsP2C))
    ctx.fillStyle = "#f00"
    ctx.fillRect(epipoles.e2[0], epipoles.e2[1], 10, 10)
  }

}
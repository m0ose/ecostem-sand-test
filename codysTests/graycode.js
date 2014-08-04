/**
 * Created by JetBrains WebStorm.
 * User: cody
 * Date: 1/16/12
 * Time: 2:41 PM
 * To change this template use File | Settings | File Templates.
 */



//
//
// test the gray code
// function testGrayCodeWorking() {
//   for (var i=0; i < 64000; i++) {
//     var g = int2gray(i);
//     var b = gray2int(g);
//     if (b != i) {
//       console.log(b,i,"mismatch");
//     }
//   }
// }


function GreyCody() {

  var greycode = {};


  //note only works for 16 bit integers
  //anything bigger than 65535 or ( 2^16 -1) will throw an error
  greycode.int2gray = function(n) {
    // so much easier, written by Jerry Avins <jya@ieee.org>
    if (n >= 65536) {
      console.error("Graycode:int2gray: error: n is to big. It's biger than 2^16");
      return;
    }
    return ((n>>1) ^ n).toString(2);
  }


  greycode.binary2gray = function( n) {
    return greycode.int2gray( greycode.binary2int( n) );
  }


  greycode.gray2int  = function( n) {
    return greycode.binary2int( greycode.gray2binary(n) )
  }


  greycode.gray2binary = function ( g) {
    //this was hard, i tried the iteratiion teqnique.
    // i found this on the internet @ http://www.dspguru.com/comp.dsp/tricks/alg/grayconv.htm
    /*
      From: Jerry Avins <jya@ieee.org>
      Subject: Convering Between Binary and Gray Code
      Date: 28 Sep 2000
      Newsgroups: comp.dsp
      
      he also had
      unsigned short binaryToGray(unsigned short num)
      {
      return (num>>1) ^ num;
      }
    */
    var ga = greycode.binary2int( g )
    var temp = ga ^ ( ga>>8);
    temp ^= (temp>>4);
    temp ^= (temp>>2);
    temp ^= (temp>>1);
    return greycode.int2binary (temp) ;
  }


  greycode.int2binary = function ( n) {
    return n.toString(2);
  }


  greycode.int2hex = function( n ) {
    return n.toString(16).toUpperCase();
  }


  greycode.binary2int = function ( n ) {
    return parseInt(n, 2)
  }


  greycode.binary2hex = function ( n) {
    return greycode.int2hex( parseInt(n, 16) )
  }

  return greycode;

}

export var Config ={
    /* All the data will be 2^vertFrames x 2^horizFrames in size. This is in tight
       inter-dependence with the fact that StripeScan will project vertFrames
       vertical-striped frames and horizFrames horizontal-striped frames. */
    vertFrames : 7,
    horizFrames : 7,
    /* Any HTTP server serving a JPG of the scene will do */
    cameraServer: "http://127.0.0.1:8080/shot.jpg?shutter=10&gain=12",
    brightestPointServer : "http://127.0.0.1:8080/brightestpoint.json?shutter=4&gain=1",
    useDummyServer: true,
    dummyScanDir: "../img/scantest-sand"
}

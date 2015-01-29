/*
	Three.js "tutorials by example"
	Author: Lee Stemkoski
	Date: July 2013 (three.js v59dev)
*/
	
// MAIN

// standard global variables
var container, scene, camera, renderer, controls, stats;
var keyboard = new THREEx.KeyboardState();

// custom global variables
var video, videoImage, videoImageContext, videoTexture;
var rvideo, rvideoImage, rvideoImageContext, rvideoTexture;

init();
animate();

// FUNCTIONS 		
function init() 
{
	// SCENE
	scene = new THREE.Scene();
	// CAMERA
	var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	scene.add(camera);
	camera.position.set(0,150,400);
	camera.lookAt(scene.position);	
	// RENDERER
	if ( Detector.webgl )
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer(); 
	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	container = document.getElementById( 'ThreeJS' );
	container.appendChild( renderer.domElement );
	// CONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	// EVENTS
	THREEx.WindowResize(renderer, camera);
	THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
	// STATS
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );
	// LIGHT
	var light = new THREE.PointLight(0xffffff);
	light.position.set(0,250,0);
	scene.add(light);
	// FLOOR
	var floorTexture = new THREE.ImageUtils.loadTexture( 'images/checkerboard.jpg' );
	floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
	floorTexture.repeat.set( 10, 10 );
	var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
	var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
	var floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.position.y = -0.5;
	floor.rotation.x = Math.PI / 2;
	scene.add(floor);
	// SKYBOX/FOG
	scene.fog = new THREE.FogExp2( 0x9999ff, 0.00025 );
	
	///////////
	// VIDEO //
	///////////

	//local
	video = document.getElementById( 'localVideo' );
	
	videoImage = document.getElementById( 'localVideoImage' );
	videoImageContext = videoImage.getContext( '2d' );
	// background color if no video present
	videoImageContext.fillStyle = '#000000';
	videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height );

	videoTexture = new THREE.Texture( videoImage );
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
	
	var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
	// the geometry on which the movie will be displayed;
	// 		movie image will be scaled to fit these dimensions.
	var movieGeometry = new THREE.PlaneGeometry( 100, 100, 1, 1 );
	var movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
	movieScreen.position.set(100,50,0);
	movieScreen.rotation.y = -Math.PI / 4;
	scene.add(movieScreen);

	camera.position.set(0,150,300);
	camera.lookAt(movieScreen.position);
				

	//remote
	rvideo = document.getElementById( 'remoteVideo' );
	
	rvideoImage = document.getElementById( 'remoteVideoImage' );
	rvideoImageContext = rvideoImage.getContext( '2d' );
	// background color if no video present
	rvideoImageContext.fillStyle = '#000000';
	rvideoImageContext.fillRect( 0, 0, rvideoImage.width, rvideoImage.height );

	rvideoTexture = new THREE.Texture( rvideoImage );
	rvideoTexture.minFilter = THREE.LinearFilter;
	rvideoTexture.magFilter = THREE.LinearFilter;
	
	var rmovieMaterial = new THREE.MeshBasicMaterial( { map: rvideoTexture, overdraw: true, side:THREE.DoubleSide } );
	// the geometry on which the movie will be displayed;
	// 		movie image will be scaled to fit these dimensions.
	var rmovieGeometry = new THREE.PlaneGeometry( 100, 100, 1, 1 );
	var rmovieScreen = new THREE.Mesh( rmovieGeometry, rmovieMaterial );
	rmovieScreen.position.set(-100,50,0);
	rmovieScreen.rotation.y = Math.PI / 4;
	scene.add(rmovieScreen);
	
}

function animate() 
{
    requestAnimationFrame( animate );
	render();		
	update();
}

function update()
{		
	if ( keyboard.pressed("p") ) // pause
		video.pause();
	if ( keyboard.pressed("r") ) // resume
		video.play();
	controls.update();
	stats.update();
}

function render() 
{	
	if ( video.readyState === video.HAVE_ENOUGH_DATA ) 
	{
		videoImageContext.drawImage( video, 0, 0, videoImage.width, videoImage.height );
		if ( videoTexture ) 
			videoTexture.needsUpdate = true;
	}
	if ( rvideo.readyState === rvideo.HAVE_ENOUGH_DATA ) 
	{
		rvideoImageContext.drawImage( rvideo, 0, 0, rvideoImage.width, rvideoImage.height );
		if ( rvideoTexture ) 
			rvideoTexture.needsUpdate = true;
	}
	renderer.render( scene, camera );
}
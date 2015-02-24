/*
	Based on:
	Three.js "tutorials by example"
	Author: Lee Stemkoski
	Date: July 2013 (three.js v59dev)
*/
	
// MAIN

// standard global variables
var container, scene, camera, renderer, controls, stats;
var keyboard = new THREEx.KeyboardState();

// custom global variables
//video
var video, videoImage, videoImageContext, videoTexture, movieScreen;
var rvideo, rvideoImage, rvideoImageContext, rvideoTexture, rmovieScreen;

var gui, parameters;

var rotateLocal = false;
var rotateRemote = false;

//socket to get options from other user
var socket = io.connect();

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
	floor.position.y = -25;
	floor.rotation.x = Math.PI / 2;
	scene.add(floor);
	// SKYBOX/FOG
	scene.fog = new THREE.FogExp2( 0x9999ff, 0.00025 );
	//SPHERES
	// radius, segments along width, segments along height
	var sphereGeom =  new THREE.SphereGeometry( 75, 32, 16 );
		// translucent blue sphere with additive blending and phong shading
	// added ambient light and color for better results
	var ambientLight = new THREE.AmbientLight(0x444444);
	scene.add(ambientLight);
	
	var darkMaterial = new THREE.MeshPhongMaterial( { color: 0x00ff00, ambient: 0xff00ff, transparent: true, blending: THREE.AdditiveBlending } );
	var sphereLocal = new THREE.Mesh( sphereGeom.clone(), darkMaterial );
	sphereLocal.position.set(100, 50, 0);
	sphereLocal.visible = false;
	scene.add( sphereLocal );

	var darkMaterial3 = new THREE.MeshPhongMaterial( { color: 0x00ff00, ambient: 0xff00ff, transparent: true, blending: THREE.AdditiveBlending } );
	//var darkMaterial3 = new THREE.MeshPhongMaterial( { color: 0x0000ff, ambient: 0xffff00, transparent: true, blending: THREE.AdditiveBlending } );
	var sphereRemote = new THREE.Mesh( sphereGeom.clone(), darkMaterial3 );
	sphereRemote.position.set(-100, 50, 0);
	sphereRemote.visible = false;
	scene.add( sphereRemote );


	//gui
	gui = new dat.GUI();
	parameters = 
	{
		localColor: "#00ff00", // color (change "#" to "0x")
		localAmbient: "#ff00ff", 
		//remoteColor: "#0000ff", // color (change "#" to "0x")
		//remoteAmbient: "#ffff00", 
		localSpin: false, 
		//remoteSpin: false, 
		visible: true,
		localSphereVisible: false//,
		//remoteSphereVisible: false
	};
	var sphereLocalColor = gui.addColor( parameters, 'localColor' ).name('Your color').listen();
	sphereLocalColor.onChange(function(value) // onFinishChange
	{   
		sphereLocal.material.color.setHex( value.replace("#", "0x") );
		socket.emit('send sphere color', JSON.stringify({'remoteSphereColor': value}))   
	});

	var sphereLocalAmbient = gui.addColor( parameters, 'localAmbient' ).name('Your ambient').listen();
	sphereLocalAmbient.onChange(function(value) // onFinishChange
	{   
		sphereLocal.material.ambient.setHex( value.replace("#", "0x") );   
		socket.emit('send sphere ambient', JSON.stringify({'remoteSphereAmbient': value}))
	});

	/*var sphereRemoteColor = gui.addColor( parameters, 'remoteColor' ).name('Their color').listen();
	sphereRemoteColor.onChange(function(value) // onFinishChange
	{   sphereRemote.material.color.setHex( value.replace("#", "0x") );   });

	var sphereRemoteAmbient = gui.addColor( parameters, 'remoteAmbient' ).name('Their ambient').listen();
	sphereRemoteAmbient.onChange(function(value) // onFinishChange
	{   sphereRemote.material.ambient.setHex( value.replace("#", "0x") );   });
*/
	var floorVisible = gui.add( parameters, 'visible' ).name('Floor visible?').listen();
	floorVisible.onChange(function(value) 
	{   floor.visible = value;  	});

	var localSphereVisible = gui.add( parameters, 'localSphereVisible' ).name('Your sphere').listen();
	localSphereVisible.onChange(function(value) 
	{   
			sphereLocal.visible = value;  	
  		socket.emit('send sphere', JSON.stringify({'remoteSphereVisible': value}))
	});

	/*var remoteSphereVisible = gui.add( parameters, 'remoteSphereVisible' ).name('Their sphere').listen();
	remoteSphereVisible.onChange(function(value) 
	{   sphereRemote.visible = value;  	});
*/
	var localVideoSpin = gui.add( parameters, 'localSpin' ).name('You spin?').listen();
	localVideoSpin.onChange(function(value) 
	{   
			rotateLocal = !rotateLocal;  	
			//send as remoteSpin because local here is remote there.
			socket.emit('send spin', JSON.stringify({'remoteSpin': rotateLocal}))
	});
		
	/*var remoteVideoSpin = gui.add( parameters, 'remoteSpin' ).name('They spin?').listen();
	remoteVideoSpin.onChange(function(value) 
	{   rotateRemote = !rotateRemote;  	});
*/
	gui.open();

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
	movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
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
	rmovieScreen = new THREE.Mesh( rmovieGeometry, rmovieMaterial );
	rmovieScreen.position.set(-100,50,0);
	rmovieScreen.rotation.y = Math.PI / 4;
	scene.add(rmovieScreen);
	
		////////////
	// bubble //
	////////////
	/*
	this.refractSphereCamera = new THREE.CubeCamera( 0.1, 5000, 512 );
	scene.add( refractSphereCamera );

	var fShader = THREE.FresnelShader;
	
	var fresnelUniforms = 
	{
		"mRefractionRatio": { type: "f", value: 1.02 },
		"mFresnelBias": 	{ type: "f", value: 0.1 },
		"mFresnelPower": 	{ type: "f", value: 2.0 },
		"mFresnelScale": 	{ type: "f", value: 1.0 },
		"tCube": 			{ type: "t", value: refractSphereCamera.renderTarget } //  textureCube }
	};
	
	// create custom material for the shader
	var customMaterial = new THREE.ShaderMaterial( 
	{
	    uniforms: 		fresnelUniforms,
		vertexShader:   fShader.vertexShader,
		fragmentShader: fShader.fragmentShader
	}   );
	
	var sphereGeometry = new THREE.SphereGeometry( 70, 6, 3 );
	this.sphere = new THREE.Mesh( sphereGeometry, customMaterial );
	sphere.position.set(0, 75, -70);
	//sphere.rotation.x = -Math.PI / 2;
	scene.add(sphere);
	
	refractSphereCamera.position = sphere.position;*/

	  ///////////
	 //SOCKETS//
  ///////////

  socket.on('spin', function(data) {
  	rotateRemote = JSON.parse(data).remoteSpin;
  });
  socket.on('sphere', function(data) {
  	sphereRemote.visible = JSON.parse(data).remoteSphereVisible;
  });
  socket.on('sphere color', function(data) {
  	sphereRemote.material.color.setHex( JSON.parse(data).remoteSphereColor.replace("#", "0x") );   
  });
  socket.on('sphere ambient', function(data) {
  	sphereRemote.material.ambient.setHex( JSON.parse(data).remoteSphereAmbient.replace("#", "0x") );   
  });


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
	//Bubble
	/*sphere.visible = false;
	refractSphereCamera.updateCubeMap( renderer, scene );
	sphere.visible = true;*/
  //	sphere.rotation.y += 0.002*Math.PI / 2;
	//spin local & remote screens
	if( rotateLocal ){
  	movieScreen.rotation.y += 0.002*Math.PI / 2;
	}
	if( rotateRemote ){
  	rmovieScreen.rotation.y += 0.002*Math.PI / 2;
	}
	//update local video
	if ( video.readyState === video.HAVE_ENOUGH_DATA ) 
	{
		videoImageContext.drawImage( video, 0, 0, videoImage.width, videoImage.height );
		if ( videoTexture ) 
			videoTexture.needsUpdate = true;
	}
	//update remote video
	if ( rvideo.readyState === rvideo.HAVE_ENOUGH_DATA ) 
	{
		rvideoImageContext.drawImage( rvideo, 0, 0, rvideoImage.width, rvideoImage.height );
		if ( rvideoTexture ) 
			rvideoTexture.needsUpdate = true;
	}
	renderer.render( scene, camera );
}
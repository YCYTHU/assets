var scene, camera, renderer, controls, stats;
var points = [];
var values = [];
var meshArray = [];
var resolution = 50;
var isovalue = 0.0147152;
var axisMax = 5;
var axisMin = -5;
var pos_color = 0x9370DB;
var neg_color = 0xEEE9E9;
var NState, LState, MState;
var mode = 'real';
var clippingPlane = [];
var gui = new dat.GUI();
var controls = new function () {
	this.nState = 1;
	this.lState = 0;
	this.mState = 0;
	this.Isovalue = -1.0;
	this.Resolution = 60;
	this.Box_Size = 5;
	this.mode = 'real';
	//this.Camera_Radius = 10;
	//this.Camera_Azimuth = Math.PI / 4;
	//this.Camera_Elevation = Math.asin(1/Math.sqrt(3));
	this.clippingPlane = 1;
	this.R_x = false;
	this.R_y = false;
	this.R_z = false;
};

var State_gui = gui.addFolder('Quantum Number');
State_gui.open();
var nState_gui = State_gui.add(controls, 'nState', 1).step(1).name("Principal");
var lState_gui = State_gui.add(controls, 'lState', 0).step(1).name("Azimuthal");
var mState_gui = State_gui.add(controls, 'mState', 0).step(1).name("Magnetic");

var Options_gui = gui.addFolder('Options');
Options_gui.open();
var mode_gui = Options_gui.add(controls, 'mode', ['real', 'imaginary', 'modulus']).name("Mode");
var clipping_gui = Options_gui.add(controls, 'clippingPlane', {'None': 1, 'Half': 2, 'Quarter': 4, 'One eighth': 8}).name("Clipping")
var isovalue_gui = Options_gui.add(controls, 'Isovalue', -8.0, 0.0).step(0.1);
var resolution_gui = Options_gui.add(controls, 'Resolution', 20, 160).step(1);
var box_size_gui = Options_gui.add(controls, 'Box_Size', 5, 160).step(5).name("Box Size");

var Rotate_gui = gui.addFolder('Rotate');
Rotate_gui.open();
var R_x_gui = Rotate_gui.add(controls, 'R_x').name("Enable X-axis");
var R_y_gui = Rotate_gui.add(controls, 'R_y').name("Enable Y-axis");
var R_z_gui = Rotate_gui.add(controls, 'R_z').name("Enable Z-axis");

init();
setNLM();
animate();

var threeCanvas = document.getElementById("ThreeJS").querySelector("canvas");
threeCanvas.style.outline = "none";

nState_gui.onFinishChange(function(value) {
	new_box_size = Math.round((2 * value**2 - value + 2) / 5) * 5;
	axisMax = new_box_size;
	axisMin = -new_box_size;
	box_size_gui.setValue(new_box_size);
	setNLM();
});

lState_gui.onFinishChange(function(value) {
	setNLM();
});

mState_gui.onFinishChange(function(value) {
	setNLM();
});

mode_gui.onFinishChange(function(value) {
	mode = value;
	updateWfn();
});

clipping_gui.onFinishChange(function(value) {
	switch (value) {
	case '1': 
		clippingPlane = [];
		break;
	case '2':
		clippingPlane = [new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0 )];
		break;
	case '4':
		clippingPlane = [new THREE.Plane( new THREE.Vector3(-1, 0, 0 ), 0 ),
			new THREE.Plane( new THREE.Vector3( 0,-1, 0 ), 0 )];
		break;
	case '8':
		clippingPlane =  [new THREE.Plane( new THREE.Vector3(-1, 0, 0 ), 0 ),
			new THREE.Plane( new THREE.Vector3( 0,-1, 0 ), 0 ),
			new THREE.Plane( new THREE.Vector3( 0, 0,-1 ), 0 )];
		break;
	}
	delIso(meshArray);
	meshArray.push(Isosurface(points, values, isovalue, pos_color));
	meshArray.push(Isosurface(points, values,-isovalue, neg_color));
});

isovalue_gui.onFinishChange(function(value) {
	delIso(meshArray);
	isovalue = 0.04 * Math.exp(value);
	meshArray.push(Isosurface(points, values, isovalue, pos_color));
	meshArray.push(Isosurface(points, values,-isovalue, neg_color));
});

resolution_gui.onFinishChange(function(value) {
	resolution = value;
	updateWfn();
});

box_size_gui.onFinishChange(function(value) {
	axisMax = value;
	axisMin = -value;
	updateWfn();
});

//camera_radius_gui.onChange(function(value) {
//	phi = camera_azimuth_gui.getValue();
//	theta = camera_elevation_gui.getValue();
//	camera.position.set(value * Math.cos(theta) * Math.cos(phi), value * Math.cos(theta) * Math.sin(phi), value * Math.sin(theta));
//});

//camera_azimuth_gui.onFinishChange(function(value) {
//	radius = camera_radius_gui.getValue();
//	theta = camera_elevation_gui.getValue();
//	camera.position.set(radius * Math.cos(theta) * Math.cos(value), radius * Math.cos(theta) * Math.sin(value), radius * Math.sin(theta));
//});

//camera_elevation_gui.onFinishChange(function(value) {
//	radius = camera_radius_gui.getValue();
//	phi = camera_azimuth_gui.getValue();
//	camera.position.set(radius * Math.cos(value) * Math.cos(phi), radius * Math.cos(value) * Math.sin(phi), radius * Math.sin(value));
//});

function setIndicator(color) {
	var indicator = document.getElementById('indicator');
	if (color == 'red')
		indicator.className = 'red_light';
	else if (color = 'green')
		indicator.className = 'green_light';
	else
		return;
}

function genData() {
	points = [];
	values = [];
	var axisRange = axisMax - axisMin;

	for (var k = 0; k < resolution; k++)
		for (var j = 0; j < resolution; j++)
			for (var i = 0; i < resolution; i++) {
				var x = axisMin + axisRange * i / (resolution - 1);
				var y = axisMin + axisRange * j / (resolution - 1);
				var z = axisMin + axisRange * k / (resolution - 1);
				points.push(new THREE.Vector3(x, y, z));
				switch (mode) {
				case 'real':
					var value = calcWfn(x, y, z, NState, LState, MState, true);
					break;
				case 'imaginary':
					var value = calcWfn(x, y, z, NState, LState, MState, false);
					break;
				case 'modulus':
					var value = Math.sqrt(calcWfn(x, y, z, NState, LState, MState, true)**2 + calcWfn(x, y, z, NState, LState, MState, false)**2);
					break;
				default:
					var value = calcWfn(x, y, z, NState, LState, MState, true);
					break;
				}
				values.push(value);
			}
}

function setNLM() {
	var tmpNState = nState_gui.getValue();
	var tmpLState = lState_gui.getValue();
	var tmpMState = mState_gui.getValue();

	if (tmpLState >= tmpNState) {
		lState_gui.setValue(tmpNState - 1);
		return;
	}
	else if (Math.abs(tmpMState) > tmpLState) {
		lState_gui.setValue(Math.sign(tmpMState) * tmpLState);
		return;
	}
	else {
		NState = tmpNState;
		LState = tmpLState;
		MState = tmpMState;
		updateWfn();
	}
}

function updateWfn() {
	//setIndicator('red');
	delIso(meshArray);
	genData();
	meshArray.push(Isosurface(points, values, isovalue, pos_color));
	meshArray.push(Isosurface(points, values,-isovalue, neg_color));
	//setIndicator('green');
}

function Isosurface(points, values, isovalue, isocolor) {
	var geometry = MarchingCubes(points, values, isovalue);
	var colorMaterial =  new THREE.MeshPhongMaterial({color: isocolor, side: THREE.DoubleSide, clippingPlanes: clippingPlane, clipIntersection: true});//, clipShadows: true
	var mesh = new THREE.Mesh(geometry, colorMaterial);
	scene.add(mesh);
	return mesh
}

function delIso() {
	for (var index = 0; index < meshArray.length; index++)
		scene.remove(meshArray[index]);
	meshArray = [];
}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
	controls.update();
	stats.update();
	if (R_x_gui.getValue())
		for (var mesh of meshArray)
			mesh.rotation.x += 0.01;
	if (R_y_gui.getValue())
		for (var mesh of meshArray)
			mesh.rotation.y += 0.01;
	if (R_z_gui.getValue())
		for (var mesh of meshArray)
			mesh.rotation.z += 0.01;
}

function init() {

	// SCENE
	scene = new THREE.Scene();

	// CAMERA
	var CANVAS_WIDTH = window.innerWidth, CANVAS_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45, ASPECT = CANVAS_WIDTH / CANVAS_HEIGHT, NEAR = 0.1, FAR = 20000;
	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	scene.add(camera);
	camera.position.set(30,0,10);
	//camera.up.set([0,0,1]);
	camera.lookAt(scene.position);

	// RENDERER
	if (Detector.webgl)
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer();

	renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
	renderer.localClippingEnabled = true;
	renderer.setClearColor(0xe6e6e6, 1);
	//renderer.clippingPlanes = localPlane;
	document.getElementById('ThreeJS' ).appendChild( renderer.domElement );

	// EVENTS
	THREEx.WindowResize(renderer, camera);
	THREEx.FullScreen.bindKey({ charCode : 'f'.charCodeAt(0) });

	// CONTROLS
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enablePan = false;

	// STATS
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	document.getElementById('Stats').appendChild( stats.domElement );

	// LIGHT
	const ambientLight = new THREE.AmbientLight(0x404040); // Soft ambient light
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
	directionalLight.position.set(1, 1, 1);
	scene.add(directionalLight);
}
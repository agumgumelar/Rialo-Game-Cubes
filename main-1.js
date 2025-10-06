const animationEngine = ( () => {

  let uniqueID = 0;

  class AnimationEngine {

    constructor() {

      this.ids = [];
      this.animations = {};
      this.update = this.update.bind( this );
      this.raf = 0;
      this.time = 0;

    }

    update() {

      const now = performance.now();
      const delta = now - this.time;
      this.time = now;

      let i = this.ids.length;

      this.raf = i ? requestAnimationFrame( this.update ) : 0;

      while ( i-- )
        this.animations[ this.ids[ i ] ] && this.animations[ this.ids[ i ] ].update( delta );

    }

    add( animation ) {

      animation.id = uniqueID ++;

      this.ids.push( animation.id );
      this.animations[ animation.id ] = animation;

      if ( this.raf !== 0 ) return;

      this.time = performance.now();
      this.raf = requestAnimationFrame( this.update );

    }

    remove( animation ) {

      const index = this.ids.indexOf( animation.id );

      if ( index < 0 ) return;

      this.ids.splice( index, 1 );
      delete this.animations[ animation.id ];
      animation = null;

    }

  }

  return new AnimationEngine();

} )();

class Animation {

  constructor( start ) {

    if ( start === true ) this.start();

  }

  start() {

    animationEngine.add( this );

  }

  stop() {

    animationEngine.remove( this );

  }

  update( delta ) {}

}

class World extends Animation {

  constructor( game ) {

    super( true );

    this.game = game;

    this.container = this.game.dom.game;
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.container.appendChild( this.renderer.domElement );

    this.camera = new THREE.PerspectiveCamera( 2, 1, 0.1, 10000 );

    this.stage = { width: 2, height: 3 };
    this.fov = 10;

    this.createLights();

    this.onResize = [];

    this.resize();
    window.addEventListener( 'resize', () => this.resize(), false );

  }

  update() {

    this.renderer.render( this.scene, this.camera );

  }

  resize() {

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer.setSize( this.width, this.height );

    this.camera.fov = this.fov;
    this.camera.aspect = this.width / this.height;

    const aspect = this.stage.width / this.stage.height;
    const fovRad = this.fov * THREE.Math.DEG2RAD;

    let distance = ( aspect < this.camera.aspect )
      ? ( this.stage.height / 2 ) / Math.tan( fovRad / 2 )
      : ( this.stage.width / this.camera.aspect ) / ( 2 * Math.tan( fovRad / 2 ) );

    distance *= 0.5;

    this.camera.position.set( distance, distance, distance);
    this.camera.lookAt( this.scene.position );
    this.camera.updateProjectionMatrix();

    const docFontSize = ( aspect < this.camera.aspect )
      ? ( this.height / 100 ) * aspect
      : this.width / 100;

    document.documentElement.style.fontSize = docFontSize + 'px';

    if ( this.onResize ) this.onResize.forEach( cb => cb() );

  }

  createLights() {

    this.lights = {
      holder:  new THREE.Object3D,
      ambient: new THREE.AmbientLight( 0xffffff, 0.69 ),
      front:   new THREE.DirectionalLight( 0xffffff, 0.36 ),
      back:    new THREE.DirectionalLight( 0xffffff, 0.19 ),
    };

    this.lights.front.position.set( 1.5, 5, 3 );
    this.lights.back.position.set( -1.5, -5, -3 );

    this.lights.holder.add( this.lights.ambient );
    this.lights.holder.add( this.lights.front );
    this.lights.holder.add( this.lights.back );

    this.scene.add( this.lights.holder );

  }

  enableShadows() {

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.lights.front.castShadow = true;

    this.lights.front.shadow.mapSize.width = 512;
    this.lights.front.shadow.mapSize.height = 512;

    var d = 1.5;

    this.lights.front.shadow.camera.left = -d;
    this.lights.front.shadow.camera.right = d;
    this.lights.front.shadow.camera.top = d;
    this.lights.front.shadow.camera.bottom = -d;

    this.lights.front.shadow.camera.near = 1;
    this.lights.front.shadow.camera.far = 9;

    this.game.cube.holder.traverse( node => {

      if ( node instanceof THREE.Mesh ) {

        node.castShadow = true;
        node.receiveShadow = true;

      }

    } );

  }

}

function RoundedBoxGeometry( size, radius, radiusSegments ) {

  THREE.BufferGeometry.call( this );

  this.type = 'RoundedBoxGeometry';

  radiusSegments = ! isNaN( radiusSegments ) ? Math.max( 1, Math.floor( radiusSegments ) ) : 1;

  var width, height, depth;

  width = height = depth = size;
  radius = size * radius;

  radius = Math.min( radius, Math.min( width, Math.min( height, Math.min( depth ) ) ) / 2 );

  var edgeHalfWidth = width / 2 - radius;
  var edgeHalfHeight = height / 2 - radius;
  var edgeHalfDepth = depth / 2 - radius;

  this.parameters = {
    width: width,
    height: height,
    depth: depth,
    radius: radius,
    radiusSegments: radiusSegments
  };

  var rs1 = radiusSegments + 1; 
  var totalVertexCount = ( rs1 * radiusSegments + 1 ) << 3;

  var positions = new THREE.BufferAttribute( new Float32Array( totalVertexCount * 3 ), 3 );
  var normals = new THREE.BufferAttribute( new Float32Array( totalVertexCount * 3 ), 3 );

  var
    cornerVerts = [],
    cornerNormals = [],
    normal = new THREE.Vector3(),
    vertex = new THREE.Vector3(),
    vertexPool = [],
    normalPool = [],
    indices = []
  ;

  var
    lastVertex = rs1 * radiusSegments,
    cornerVertNumber = rs1 * radiusSegments + 1
  ;

  doVertices();
  doFaces();
  doCorners();
  doHeightEdges();
  doWidthEdges();
  doDepthEdges();

  function doVertices() {

    var cornerLayout = [
      new THREE.Vector3( 1, 1, 1 ),
      new THREE.Vector3( 1, 1, - 1 ),
      new THREE.Vector3( - 1, 1, - 1 ),
      new THREE.Vector3( - 1, 1, 1 ),
      new THREE.Vector3( 1, - 1, 1 ),
      new THREE.Vector3( 1, - 1, - 1 ),
      new THREE.Vector3( - 1, - 1, - 1 ),
      new THREE.Vector3( - 1, - 1, 1 )
    ];

    for ( var j = 0; j < 8; j ++ ) {

      cornerVerts.push( [] );
      cornerNormals.push( [] );

    }

    var PIhalf = Math.PI / 2;
    var cornerOffset = new THREE.Vector3( edgeHalfWidth, edgeHalfHeight, edgeHalfDepth );

    for ( var y = 0; y <= radiusSegments; y ++ ) {

      var v = y / radiusSegments;
      var va = v * PIhalf; 
      var cosVa = Math.cos( va ); 
      var sinVa = Math.sin( va );

      if ( y == radiusSegments ) {

        vertex.set( 0, 1, 0 );
        var vert = vertex.clone().multiplyScalar( radius ).add( cornerOffset );
        cornerVerts[ 0 ].push( vert );
        vertexPool.push( vert );
        var norm = vertex.clone();
        cornerNormals[ 0 ].push( norm );
        normalPool.push( norm );
        continue; 

      }

      for ( var x = 0; x <= radiusSegments; x ++ ) {

        var u = x / radiusSegments;
        var ha = u * PIhalf;
        vertex.x = cosVa * Math.cos( ha );
        vertex.y = sinVa;
        vertex.z = cosVa * Math.sin( ha );

        var vert = vertex.clone().multiplyScalar( radius ).add( cornerOffset );
        cornerVerts[ 0 ].push( vert );
        vertexPool.push( vert );

        var norm = vertex.clone().normalize();
        cornerNormals[ 0 ].push( norm );
        normalPool.push( norm );

      }

    }

    for ( var i = 1; i < 8; i ++ ) {

      for ( var j = 0; j < cornerVerts[ 0 ].length; j ++ ) {

        var vert = cornerVerts[ 0 ][ j ].clone().multiply( cornerLayout[ i ] );
        cornerVerts[ i ].push( vert );
        vertexPool.push( vert );

        var norm = cornerNormals[ 0 ][ j ].clone().multiply( cornerLayout[ i ] );
        cornerNormals[ i ].push( norm );
        normalPool.push( norm );

      }

    }

  }

  function doCorners() {

    var flips = [
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true
    ];

    var lastRowOffset = rs1 * ( radiusSegments - 1 );

    for ( var i = 0; i < 8; i ++ ) {

      var cornerOffset = cornerVertNumber * i;

      for ( var v = 0; v < radiusSegments - 1; v ++ ) {

        var r1 = v * rs1;
        var r2 = ( v + 1 ) * rs1;

        for ( var u = 0; u < radiusSegments; u ++ ) {

          var u1 = u + 1;
          var a = cornerOffset + r1 + u;
          var b = cornerOffset + r1 + u1;
          var c = cornerOffset + r2 + u;
          var d = cornerOffset + r2 + u1;

          if ( ! flips[ i ] ) {

            indices.push( a );
            indices.push( b );
            indices.push( c );

            indices.push( b );
            indices.push( d );
            indices.push( c );

          } else {

            indices.push( a );
            indices.push( c );
            indices.push( b );

            indices.push( b );
            indices.push( c );
            indices.push( d );

          }

        }

      }

      for ( var u = 0; u < radiusSegments; u ++ ) {

        var a = cornerOffset + lastRowOffset + u;
        var b = cornerOffset + lastRowOffset + u + 1;
        var c = cornerOffset + lastVertex;

        if ( ! flips[ i ] ) {

          indices.push( a );
          indices.push( b );
          indices.push( c );

        } else {

          indices.push( a );
          indices.push( c );
          indices.push( b );

        }

      }

    }

  }

  function doFaces() {

    var a = lastVertex;
    var b = lastVertex + cornerVertNumber;
    var c = lastVertex + cornerVertNumber * 2;
    var d = lastVertex + cornerVertNumber * 3;

    indices.push( a );
    indices.push( b );
    indices.push( c );
    indices.push( a );
    indices.push( c );
    indices.push( d );

    a = lastVertex + cornerVertNumber * 4;
    b = lastVertex + cornerVertNumber * 5;
    c = lastVertex + cornerVertNumber * 6;
    d = lastVertex + cornerVertNumber * 7;

    indices.push( a );
    indices.push( c );
    indices.push( b );
    indices.push( a );
    indices.push( d );
    indices.push( c );

    a = 0;
    b = cornerVertNumber;
    c = cornerVertNumber * 4;
    d = cornerVertNumber * 5;

    indices.push( a );
    indices.push( c );
    indices.push( b );
    indices.push( b );
    indices.push( c );
    indices.push( d );

    a = cornerVertNumber * 2;
    b = cornerVertNumber * 3;
    c = cornerVertNumber * 6;
    d = cornerVertNumber * 7;

    indices.push( a );
    indices.push( c );
    indices.push( b );
    indices.push( b );
    indices.push( c );
    indices.push( d );

    a = radiusSegments;
    b = radiusSegments + cornerVertNumber * 3;
    c = radiusSegments + cornerVertNumber * 4;
    d = radiusSegments + cornerVertNumber * 7;

    indices.push( a );
    indices.push( b );
    indices.push( c );
    indices.push( b );
    indices.push( d );
    indices.push( c );

    a = radiusSegments + cornerVertNumber;
    b = radiusSegments + cornerVertNumber * 2;
    c = radiusSegments + cornerVertNumber * 5;
    d = radiusSegments + cornerVertNumber * 6;

    indices.push( a );
    indices.push( c );
    indices.push( b );
    indices.push( b );
    indices.push( c );
    indices.push( d );

  }

  function doHeightEdges() {

    for ( var i = 0; i < 4; i ++ ) {

      var cOffset = i * cornerVertNumber;
      var cRowOffset = 4 * cornerVertNumber + cOffset;
      var needsFlip = i & 1 === 1;

      for ( var u = 0; u < radiusSegments; u ++ ) {

        var u1 = u + 1;
        var a = cOffset + u;
        var b = cOffset + u1;
        var c = cRowOffset + u;
        var d = cRowOffset + u1;

        if ( ! needsFlip ) {

          indices.push( a );
          indices.push( b );
          indices.push( c );
          indices.push( b );
          indices.push( d );
          indices.push( c );

        } else {

          indices.push( a );
          indices.push( c );
          indices.push( b );
          indices.push( b );
          indices.push( c );
          indices.push( d );

        }

      }

    }

  }

  function doDepthEdges() {

    var cStarts = [ 0, 2, 4, 6 ];
    var cEnds = [ 1, 3, 5, 7 ];

    for ( var i = 0; i < 4; i ++ ) {

      var cStart = cornerVertNumber * cStarts[ i ];
      var cEnd = cornerVertNumber * cEnds[ i ];

      var needsFlip = 1 >= i;

      for ( var u = 0; u < radiusSegments; u ++ ) {

        var urs1 = u * rs1;
        var u1rs1 = ( u + 1 ) * rs1;

        var a = cStart + urs1;
        var b = cStart + u1rs1;
        var c = cEnd + urs1;
        var d = cEnd + u1rs1;

        if ( needsFlip ) {

          indices.push( a );
          indices.push( c );
          indices.push( b );
          indices.push( b );
          indices.push( c );
          indices.push( d );

        } else {

          indices.push( a );
          indices.push( b );
          indices.push( c );
          indices.push( b );
          indices.push( d );
          indices.push( c );

        }

      }

    }

  }

  function doWidthEdges() {

    var end = radiusSegments - 1;

    var cStarts = [ 0, 1, 4, 5 ];
    var cEnds = [ 3, 2, 7, 6 ];
    var needsFlip = [ 0, 1, 1, 0 ];

    for ( var i = 0; i < 4; i ++ ) {

      var cStart = cStarts[ i ] * cornerVertNumber;
      var cEnd = cEnds[ i ] * cornerVertNumber;

      for ( var u = 0; u <= end; u ++ ) {

        var a = cStart + radiusSegments + u * rs1;
        var b = cStart + ( u != end ? radiusSegments + ( u + 1 ) * rs1 : cornerVertNumber - 1 );

        var c = cEnd + radiusSegments + u * rs1;
        var d = cEnd + ( u != end ? radiusSegments + ( u + 1 ) * rs1 : cornerVertNumber - 1 );

        if ( ! needsFlip[ i ] ) {

          indices.push( a );
          indices.push( b );
          indices.push( c );
          indices.push( b );
          indices.push( d );
          indices.push( c );

        } else {

          indices.push( a );
          indices.push( c );
          indices.push( b );
          indices.push( b );
          indices.push( c );
          indices.push( d );

        }

      }

    }

  }

  var index = 0;

  for ( var i = 0; i < vertexPool.length; i ++ ) {

    positions.setXYZ(
      index,
      vertexPool[ i ].x,
      vertexPool[ i ].y,
      vertexPool[ i ].z
    );

    normals.setXYZ(
      index,
      normalPool[ i ].x,
      normalPool[ i ].y,
      normalPool[ i ].z
    );

    index ++;

  }

  this.setIndex( new THREE.BufferAttribute( new Uint16Array( indices ), 1 ) );
  this.addAttribute( 'position', positions );
  this.addAttribute( 'normal', normals );

}

RoundedBoxGeometry.prototype = Object.create( THREE.BufferGeometry.prototype );
RoundedBoxGeometry.constructor = RoundedBoxGeometry;

function RoundedPlaneGeometry( size, radius, depth ) {

  var x, y, width, height;

  x = y = - size / 2;
  width = height = size;
  radius = size * radius;

  const shape = new THREE.Shape();

  shape.moveTo( x, y + radius );
  shape.lineTo( x, y + height - radius );
  shape.quadraticCurveTo( x, y + height, x + radius, y + height );
  shape.lineTo( x + width - radius, y + height );
  shape.quadraticCurveTo( x + width, y + height, x + width, y + height - radius );
  shape.lineTo( x + width, y + radius );
  shape.quadraticCurveTo( x + width, y, x + width - radius, y );
  shape.lineTo( x + radius, y );
  shape.quadraticCurveTo( x, y, x, y + radius );

  const geometry = new THREE.ExtrudeBufferGeometry(
    shape,
    { depth: depth, bevelEnabled: false, curveSegments: 3 }
  );

  return geometry;

}

class Cube {

  constructor( game ) {

    this.game = game;

    this.geometry = {
      pieceSize: 1 / 3,
      pieceCornerRadius: 0.12,
      edgeCornerRoundness: 0.15,
      edgeScale: 0.82,
      edgeDepth: 0.01,
    };

    this.holder = new THREE.Object3D();
    this.object = new THREE.Object3D();
    this.animator = new THREE.Object3D();
    this.holder.add( this.animator );
    this.animator.add( this.object );

    this.cubes = [];
    
    this.generatePositions();
    this.generateModel();

    this.pieces.forEach( piece => {

      this.cubes.push( piece.userData.cube );
      this.object.add( piece );

    } );

    this.holder.traverse( node => {

      if ( node.frustumCulled ) node.frustumCulled = false;

    } );

    this.game.world.scene.add( this.holder );

  }

  reset() {

    this.game.controls.edges.rotation.set( 0, 0, 0 );

    this.holder.rotation.set( 0, 0, 0 );
    this.object.rotation.set( 0, 0, 0 );
    this.animator.rotation.set( 0, 0, 0 );

    this.pieces.forEach( piece => {

      piece.position.copy( piece.userData.start.position );
      piece.rotation.copy( piece.userData.start.rotation );

    } );

  }

  generatePositions() {

    let x, y, z;

    this.positions = [];

    for ( x = 0; x < 3; x ++ ) {

      for ( y = 0; y < 3; y ++ ) {

        for ( z = 0; z < 3; z ++ ) {

          let position = new THREE.Vector3( x - 1, y - 1, z - 1 );
          let edges = [];

          if ( x == 0 ) edges.push(0);
          if ( x == 2 ) edges.push(1);
          if ( y == 0 ) edges.push(2);
          if ( y == 2 ) edges.push(3);
          if ( z == 0 ) edges.push(4);
          if ( z == 2 ) edges.push(5);

          position.edges = edges;

          this.positions.push( position );

        }

      }

    }

  }

  generateModel() {

    this.pieces = [];
    this.edges = [];

    const pieceSize = 1 / 3;

    const mainMaterial = new THREE.MeshLambertMaterial();

    const pieceMesh = new THREE.Mesh(
      new RoundedBoxGeometry( pieceSize, this.geometry.pieceCornerRadius, 3 ),
      mainMaterial.clone()
    );

    const edgeGeometry = RoundedPlaneGeometry(
      pieceSize,
      this.geometry.edgeCornerRoundness,
      this.geometry.edgeDepth );

    this.positions.forEach( ( position, index ) => {

      const piece = new THREE.Object3D();
      const pieceCube = pieceMesh.clone();
      const pieceEdges = [];

      piece.position.copy( position.clone().divideScalar( 3 ) );
      piece.add( pieceCube );
      piece.name = index;
      piece.edgesName = '';

      position.edges.forEach( position => {

        const edge = new THREE.Mesh( edgeGeometry, mainMaterial.clone() );
        const name = [ 'L', 'R', 'D', 'U', 'B', 'F' ][ position ];
        const distance = pieceSize / 2;

        edge.position.set(
          distance * [ - 1, 1, 0, 0, 0, 0 ][ position ],
          distance * [ 0, 0, - 1, 1, 0, 0 ][ position ],
          distance * [ 0, 0, 0, 0, - 1, 1 ][ position ]
        );

        edge.rotation.set(
          Math.PI / 2 * [ 0, 0, 1, - 1, 0, 0 ][ position ],
          Math.PI / 2 * [ - 1, 1, 0, 0, 2, 0 ][ position ],
          0
        );

        edge.scale.set(
          this.geometry.edgeScale,
          this.geometry.edgeScale,
          this.geometry.edgeScale
        );

        edge.name = name;

        piece.add( edge );
        pieceEdges.push( name );
        this.edges.push( edge );

      } );

      piece.userData.edges = pieceEdges;
      piece.userData.cube = pieceCube;

      piece.userData.start = {
        position: piece.position.clone(),
        rotation: piece.rotation.clone(),
      };

      this.pieces.push( piece );

    } );

  }

}

const Easing = {

  Power: {

    In: power => {

      power = Math.round( power || 1 );

      return t => Math.pow( t, power );

    },

    Out: power => {

      power = Math.round( power || 1 );

      return t => 1 - Math.abs( Math.pow( t - 1, power ) );

    },

    InOut: power => {

      power = Math.round( power || 1 );

      return t => ( t < 0.5 )
        ? Math.pow( t * 2, power ) / 2
        : ( 1 - Math.abs( Math.pow( ( t * 2 - 1 ) - 1, power ) ) ) / 2 + 0.5;

    },

  },

  Sine: {

    In: () => t => 1 + Math.sin( Math.PI / 2 * t - Math.PI / 2 ),

    Out: () => t => Math.sin( Math.PI / 2 * t ),

    InOut: () => t => ( 1 + Math.sin( Math.PI * t - Math.PI / 2 ) ) / 2,

  },

  Back: {

    Out: s => {

      s = s || 1.70158;

      return t => { return ( t -= 1 ) * t * ( ( s + 1 ) * t + s ) + 1; };

    },

    In: s => {

      s = s || 1.70158;

      return t => { return t * t * ( ( s + 1 ) * t - s ); };

    }

  },

  Elastic: {

    Out: ( amplitude, period ) => {

      let PI2 = Math.PI * 2;

      let p1 = ( amplitude >= 1 ) ? amplitude : 1;
      let p2 = ( period || 0.3 ) / ( amplitude < 1 ? amplitude : 1 );
      let p3 = p2 / PI2 * ( Math.asin( 1 / p1 ) || 0 );

      p2 = PI2 / p2;

      return t => { return p1 * Math.pow( 2, -10 * t ) * Math.sin( ( t - p3 ) * p2 ) + 1 }

    },

  },

};

class Tween extends Animation {

  constructor( options ) {

    super( false );

    this.duration = options.duration || 500;
    this.easing = options.easing || ( t => t );
    this.onUpdate = options.onUpdate || ( () => {} );
    this.onComplete = options.onComplete || ( () => {} );

    this.delay = options.delay || false;
    this.yoyo = options.yoyo ? false : null;

    this.progress = 0;
    this.value = 0;
    this.delta = 0;

    this.getFromTo( options );

    if ( this.delay ) setTimeout( () => super.start(), this.delay );
    else super.start();

    this.onUpdate( this );

  }

  update( delta ) {

    const old = this.value * 1;
    const direction = ( this.yoyo === true ) ? - 1 : 1;

    this.progress += ( delta / this.duration ) * direction;

    this.value = this.easing( this.progress );
    this.delta = this.value - old;

    if ( this.values !== null ) this.updateFromTo();

    if ( this.yoyo !== null ) this.updateYoyo();
    else if ( this.progress <= 1 ) this.onUpdate( this );
    else {

      this.progress = 1;
      this.value = 1;
      this.onUpdate( this );
      this.onComplete( this );
      super.stop();      

    }

  }

  updateYoyo() {

    if ( this.progress > 1 || this.progress < 0 ) {

      this.value = this.progress = ( this.progress > 1 ) ? 1 : 0;
      this.yoyo = ! this.yoyo;

    }

    this.onUpdate( this );

  }

  updateFromTo() {

    this.values.forEach( key => {

      this.target[ key ] = this.from[ key ] + ( this.to[ key ] - this.from[ key ] ) * this.value;

    } );

  }

  getFromTo( options ) {

    if ( ! options.target || ! options.to ) {

      this.values = null;
      return;

    }

    this.target = options.target || null;
    this.from = options.from || {};
    this.to = options.to || null;
    this.values = [];

    if ( Object.keys( this.from ).length < 1 )
      Object.keys( this.to ).forEach( key => { this.from[ key ] = this.target[ key ]; } );

    Object.keys( this.to ).forEach( key => { this.values.push( key ); } );

  }

}

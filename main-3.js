class Timer extends Animation {

  constructor( game ) {

    super( false );

    this.game = game;
    this.reset();
    
  }

  start( continueGame ) {

    this.startTime = continueGame ? ( Date.now() - this.deltaTime ) : Date.now();
    this.deltaTime = 0;
    this.converted = this.convert();

    super.start();

  }

  reset() {

    this.startTime = 0;
    this.currentTime = 0;
    this.deltaTime = 0;
    this.converted = '0:00';

  }

  stop() {

    this.currentTime = Date.now();
    this.deltaTime = this.currentTime - this.startTime;
    this.convert();

    super.stop();

    return { time: this.converted, millis: this.deltaTime };

  }

  update() {

    const old = this.converted;

    this.currentTime = Date.now();
    this.deltaTime = this.currentTime - this.startTime;
    this.convert();

    if ( this.converted != old ) {

      localStorage.setItem( 'theCube_time', this.deltaTime );
      this.setText();

    }

  }

  convert() {

    const seconds = parseInt( ( this.deltaTime / 1000 ) % 60 );
    const minutes = parseInt( ( this.deltaTime / ( 1000 * 60 ) ) );

    this.converted = minutes + ':' + ( seconds < 10 ? '0' : '' ) + seconds;

  }

  setText() {

    this.game.dom.texts.timer.innerHTML = this.converted;

  }

}

const RangeHTML = [

  '<div class="range">',
    '<div class="range__label"></div>',
    '<div class="range__track">',
      '<div class="range__track-line"></div>',
      '<div class="range__handle"><div></div></div>',
    '</div>',
    '<div class="range__list"></div>',
  '</div>',

].join( '\n' );

document.querySelectorAll( 'range' ).forEach( el => {

  const temp = document.createElement( 'div' );
  temp.innerHTML = RangeHTML;

  const range = temp.querySelector( '.range' );
  const rangeLabel = range.querySelector( '.range__label' );
  const rangeList = range.querySelector( '.range__list' );

  range.setAttribute( 'name', el.getAttribute( 'name' ) );
  rangeLabel.innerHTML = el.getAttribute( 'title' );

  el.getAttribute( 'list' ).split( ',' ).forEach( listItemText => {

    const listItem = document.createElement( 'div' );
    listItem.innerHTML = listItemText;
    rangeList.appendChild( listItem );

  } );

  el.parentNode.replaceChild( range, el );

} );

class Range {

  constructor( name, options ) {

    options = Object.assign( {
      range: [ 0, 1 ],
      value: 0,
      step: 0,
      onUpdate: () => {},
      onComplete: () => {},
    }, options || {} );

    this.element = document.querySelector( '.range[name="' + name + '"]' );
    this.track = this.element.querySelector( '.range__track' );
    this.handle = this.element.querySelector( '.range__handle' );

    this.value = options.value;
    this.min = options.range[0];
    this.max = options.range[1];
    this.step = options.step;

    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;

    this.value = this.round( this.limitValue( this.value ) );
    this.setHandlePosition();

    this.initDraggable();

  }

  initDraggable() {

    let current;

    this.draggable = new Draggable( this.handle, { calcDelta: true } );

    this.draggable.onDragStart = position => {

      current = this.positionFromValue( this.value );
      this.handle.style.left = current + 'px';

    };

    this.draggable.onDragMove = position => {

      current = this.limitPosition( current + position.delta.x );
      this.value = this.round( this.valueFromPosition( current ) );
      this.setHandlePosition();
      
      this.onUpdate( this.value );

    };

    this.draggable.onDragEnd = position => {

      this.onComplete( this.value );

    };

  }

  round( value ) {

    if ( this.step < 1 ) return value;

    return Math.round( ( value - this.min ) / this.step ) * this.step + this.min;

  }

  limitValue( value ) {

    const max = Math.max( this.max, this.min );
    const min = Math.min( this.max, this.min );

    return Math.min( Math.max( value, min ), max );

  }

  limitPosition( position ) {

    return Math.min( Math.max( position, 0 ), this.track.offsetWidth );

  }

  percentsFromValue( value ) {

    return ( value - this.min ) / ( this.max - this.min );

  }

  valueFromPosition( position ) {

    return this.min + ( this.max - this.min ) * ( position / this.track.offsetWidth );

  }

  positionFromValue( value ) {

    return this.percentsFromValue( value ) * this.track.offsetWidth;

  }

  setHandlePosition() {

    this.handle.style.left = this.percentsFromValue( this.value ) * 100 + '%';

  }

}

class Preferences {

  constructor( game ) {

    this.game = game;

  }

  init() {

    this.ranges = {

      flip: new Range( 'flip', {
        value: this.game.controls.flipConfig,
        range: [ 0, 2 ],
        step: 1,
        onUpdate: value => {

          this.game.controls.flipConfig = value;

        },
      } ),

      scramble: new Range( 'scramble', {
        value: this.game.scrambler.scrambleLength,
        range: [ 20, 30 ],
        step: 5,
        onUpdate: value => {

          this.game.scrambler.scrambleLength = value;

        },
      } ),

      fov: new Range( 'fov', {
        value: this.game.world.fov,
        range: [ 2, 45 ],
        onUpdate: value => {

          this.game.world.fov = value;
          this.game.world.resize();

        },
      } ),

      theme: new Range( 'theme', {
        value: { cube: 0, erno: 1, dust: 2, camo: 3, rain: 4 }[ this.game.themes.theme ],
        range: [ 0, 4 ],
        step: 1,
        onUpdate: value => {

          const theme = [ 'cube', 'erno', 'dust', 'camo', 'rain' ][ value ];
          this.game.themes.setTheme( theme );

        },
      } ),

    };
    
  }

}

class Confetti {

  constructor( game ) {

    this.game = game;
    this.started = 0;

    this.options = {
      speed: { min: 0.0011, max: 0.0022 },
      revolution: { min: 0.01, max: 0.05 },
      size: { min: 0.1, max: 0.15 },
      colors: [ 0x41aac8, 0x82ca38, 0xffef48, 0xef3923, 0xff8c0a ],
    };

    this.geometry = new THREE.PlaneGeometry( 1, 1 );
    this.material = new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } );

    this.holders = [
      new ConfettiStage( this.game, this, 1, 20 ),
      new ConfettiStage( this.game, this, -1, 30 ),
    ];

  }

  start() {

    if ( this.started > 0 ) return;

    this.holders.forEach( holder => {

      this.game.world.scene.add( holder.holder );
      holder.start();
      this.started ++;

    } );

  }

  stop() {

    if ( this.started == 0 ) return;

    this.holders.forEach( holder => {

      holder.stop( () => {

        this.game.world.scene.remove( holder.holder );
        this.started --;

      } );

    } );

  }

  updateColors( colors ) {

    this.holders.forEach( holder => {

      holder.options.colors.forEach( ( color, index ) => {

        holder.options.colors[ index ] = colors[ [ 'D', 'F', 'R', 'B', 'L' ][ index ] ];

      } );

    } );

  }

}

class ConfettiStage extends Animation {

  constructor( game, parent, distance, count ) {

    super( false );

    this.game = game;
    this.parent = parent;

    this.distanceFromCube = distance;

    this.count = count;
    this.particles = [];

    this.holder = new THREE.Object3D();
    this.holder.rotation.copy( this.game.world.camera.rotation );

    this.object = new THREE.Object3D();
    this.holder.add( this.object );

    this.resizeViewport = this.resizeViewport.bind( this );
    this.game.world.onResize.push( this.resizeViewport );
    this.resizeViewport();    

    this.geometry = this.parent.geometry;
    this.material = this.parent.material;

    this.options = this.parent.options;

    let i = this.count;
    while ( i-- ) this.particles.push( new Particle( this ) );

  }

  start() {

    this.time = performance.now();
    this.playing = true;

    let i = this.count;
    while ( i-- ) this.particles[ i ].reset();

    super.start();

  }

  stop( callback ) {

    this.playing = false;
    this.completed = 0;
    this.callback = callback;

  }

  reset() {

    super.stop();

    this.callback();

  }

  update() {

    const now = performance.now();
    const delta = now - this.time;
    this.time = now;

    let i = this.count;

    while ( i-- )
      if ( ! this.particles[ i ].completed ) this.particles[ i ].update( delta );

    if ( ! this.playing && this.completed == this.count ) this.reset();

  }

  resizeViewport() {

    const fovRad = this.game.world.camera.fov * THREE.Math.DEG2RAD;

    this.height = 2 * Math.tan( fovRad / 2 ) * ( this.game.world.camera.position.length() - this.distanceFromCube );
    this.width = this.height * this.game.world.camera.aspect;

    const scale = 1 / this.game.transition.data.cameraZoom;

    this.width *= scale;
    this.height *= scale;

    this.object.position.z = this.distanceFromCube;
    this.object.position.y = this.height / 2;

  }
  
}

class Particle {

  constructor( confetti ) {

    this.confetti = confetti;
    this.options = this.confetti.options;

    this.velocity = new THREE.Vector3();
    this.force = new THREE.Vector3();

    this.mesh = new THREE.Mesh( this.confetti.geometry, this.confetti.material.clone() );
    this.confetti.object.add( this.mesh );

    this.size = THREE.Math.randFloat( this.options.size.min, this.options.size.max );
    this.mesh.scale.set( this.size, this.size, this.size );

    return this;

  }

  reset( randomHeight = true ) {

    this.completed = false;

    this.color = new THREE.Color( this.options.colors[ Math.floor( Math.random() * this.options.colors.length ) ] );
    this.mesh.material.color.set( this.color );

    this.speed = THREE.Math.randFloat( this.options.speed.min, this.options.speed.max ) * - 1;
    this.mesh.position.x = THREE.Math.randFloat( - this.confetti.width / 2, this.confetti.width / 2 );
    this.mesh.position.y = ( randomHeight )
      ? THREE.Math.randFloat( this.size, this.confetti.height + this.size )
      : this.size;

    this.revolutionSpeed = THREE.Math.randFloat( this.options.revolution.min, this.options.revolution.max );
    this.revolutionAxis = [ 'x', 'y', 'z' ][ Math.floor( Math.random() * 3 ) ];
    this.mesh.rotation.set( Math.random() * Math.PI / 3, Math.random() * Math.PI / 3, Math.random() * Math.PI / 3 );

  }

  stop() {

    this.completed = true;
    this.confetti.completed ++;

  }

  update( delta ) {

    this.mesh.position.y += this.speed * delta;
    this.mesh.rotation[ this.revolutionAxis ] += this.revolutionSpeed;

    if ( this.mesh.position.y < - this.confetti.height - this.size )
      ( this.confetti.playing ) ? this.reset( false ) : this.stop();

  }

}

class Scores {

  constructor( game ) {

    this.game = game;

    this.scores = [];
    this.solves = 0;
    this.best = 0;
    this.worst = 0;

  }

  addScore( time ) {

    this.scores.push( time );
    this.solves++;

    if ( this.scores.lenght > 100 ) this.scores.shift();

    let bestTime = false;    

    if ( time < this.best || this.best === 0 ) {

      this.best = time;
      bestTime = true;

    }

    if ( time > this.worst ) this.worst = time;

    return bestTime;

  }

  calcStats() {

    this.setStat( 'total-solves', this.solves );
    this.setStat( 'best-time', this.convertTime( this.best ) );
    this.setStat( 'worst-time', this.convertTime( this.worst ) );
    this.setStat( 'average-5', this.getAverage( 5 ) );
    this.setStat( 'average-12', this.getAverage( 12 ) );
    this.setStat( 'average-25', this.getAverage( 25 ) );

  }

  setStat( name, value ) {

    if ( value === 0 ) return;

    this.game.dom.stats.querySelector( `.stats[name="${name}"] b` ).innerHTML = value;

  }

  getAverage( count ) {

    if ( this.scores.length < count ) return 0;

    return this.convertTime( this.scores.slice(-count).reduce( ( a, b ) => a + b, 0 ) / count );

  }

  convertTime( time ) {

    if ( time <= 0 ) return 0;

    const seconds = parseInt( ( time / 1000 ) % 60 );
    const minutes = parseInt( ( time / ( 1000 * 60 ) ) );

    return minutes + ':' + ( seconds < 10 ? '0' : '' ) + seconds;

  }

}

class Storage {

  constructor( game ) {

    this.game = game;

  }

  init() {

    this.loadGame();
    this.loadPreferences();

  }

  loadGame() {

    this.game.saved = false;

  }


  loadPreferences() {

    this.game.controls.flipConfig = 0;
    this.game.scrambler.scrambleLength = 20;

    this.game.world.fov = 10;
    this.game.world.resize();

    this.game.themes.setTheme( 'cube' );

    return false;

  }

}

class Themes {

  constructor( game ) {

    this.game = game;
    this.theme = null;

    this.colors = {
      cube: {
        U: 0xfff7ff,
        D: 0xffef48,
        F: 0xef3923,
        R: 0x41aac8,
        B: 0xff8c0a,
        L: 0x82ca38,
        P: 0x08101a,
        G: 0xd1d5db,
      },
      erno: {
        U: 0xffffff,
        D: 0xffd500,
        F: 0xc41e3a,
        R: 0x0051ba,
        B: 0xff5800,
        L: 0x009e60,
        P: 0x111111,
        G: 0x8abdff,
      },
      dust: {
        U: 0xfff6eb,
        D: 0xe7c48d,
        F: 0x8f253e,
        R: 0x607e69,
        B: 0xbe6f62,
        L: 0x849f5d,
        P: 0x111111,
        G: 0xE7C48D,
      },
      camo: {
        U: 0xfff6eb,
        D: 0xbfb672,
        F: 0x805831,
        R: 0x718456,
        B: 0x37241c,
        L: 0x37431d,
        P: 0x111111,
        G: 0xBFB672,
      },
      rain: {
        U: 0xfafaff,
        D: 0xedb92d,
        F: 0xce2135,
        R: 0x449a89,
        B: 0xec582f,
        L: 0xa3a947,
        P: 0x111111,
        G: 0x87b9ac,
      },
    };

  }

  setTheme( theme ) {

    if ( theme === this.theme ) return;

    this.theme = theme;

    const colors = this.colors[ this.theme ];

    this.game.cube.pieces.forEach( piece => {

      piece.userData.cube.material.color.setHex( colors.P );

    } );

    this.game.cube.edges.forEach( edge => {

      edge.material.color.setHex( colors[ edge.name ] );

    } );

    this.game.dom.rangeHandles.forEach( handle => {

      handle.style.background = '#' + colors.R.toString(16).padStart(6, '0');

    } );

    this.game.confetti.updateColors( colors );

    this.game.dom.back.style.background = '#' + colors.G.toString(16).padStart(6, '0');
    this.game.dom.buttons.pwa.style.color = '#' + colors.R.toString(16).padStart(6, '0');

  }

}

class IconsConverter {

  constructor( options ) {

    options = Object.assign( {
      tagName: 'icon',
      className: 'icon',
      styles: false,
      icons: {},
      observe: false,
      convert: false,
    }, options || {} );

    this.tagName = options.tagName;
    this.className = options.className;
    this.icons = options.icons;

    this.svgTag = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
    this.svgTag.setAttribute( 'class', this.className );

    if ( options.styles ) this.addStyles();
    if ( options.convert ) this.convertAllIcons();

    if ( options.observe ) {

      const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
      this.observer = new MutationObserver( mutations => { this.convertAllIcons(); } );
      this.observer.observe( document.documentElement, { childList: true, subtree: true } );

    }

    return this;

  }

  convertAllIcons() {

    document.querySelectorAll( this.tagName ).forEach( icon => { this.convertIcon( icon ); } );

  }

  convertIcon( icon ) {

    const svgData = this.icons[ icon.attributes[0].localName ];

    if ( typeof svgData === 'undefined' ) return;

    const svg = this.svgTag.cloneNode( true );
    const viewBox = svgData.viewbox.split( ' ' );

    svg.setAttributeNS( null, 'viewBox', svgData.viewbox );
    svg.style.width = viewBox[2] / viewBox[3] + 'em';
    svg.style.height = '1em';
    svg.innerHTML = svgData.content;

    icon.parentNode.replaceChild( svg, icon );

  }

  addStyles() {

    const style = document.createElement( 'style' );
    style.innerHTML = `.${this.className} { display: inline-block; font-size: inherit; overflow: visible; vertical-align: -0.125em; preserveAspectRatio: none; }`;
    document.head.appendChild( style );

  }

}

const Icons = new IconsConverter( {

  icons: {
    settings: {
      viewbox: '0 0 512 512',
      content: '<path fill="currentColor" d="M444.788 291.1l42.616 24.599c4.867 2.809 7.126 8.618 5.459 13.985-11.07 35.642-29.97 67.842-54.689 94.586a12.016 12.016 0 0 1-14.832 2.254l-42.584-24.595a191.577 191.577 0 0 1-60.759 35.13v49.182a12.01 12.01 0 0 1-9.377 11.718c-34.956 7.85-72.499 8.256-109.219.007-5.49-1.233-9.403-6.096-9.403-11.723v-49.184a191.555 191.555 0 0 1-60.759-35.13l-42.584 24.595a12.016 12.016 0 0 1-14.832-2.254c-24.718-26.744-43.619-58.944-54.689-94.586-1.667-5.366.592-11.175 5.459-13.985L67.212 291.1a193.48 193.48 0 0 1 0-70.199l-42.616-24.599c-4.867-2.809-7.126-8.618-5.459-13.985 11.07-35.642 29.97-67.842 54.689-94.586a12.016 12.016 0 0 1 14.832-2.254l42.584 24.595a191.577 191.577 0 0 1 60.759-35.13V25.759a12.01 12.01 0 0 1 9.377-11.718c34.956-7.85 72.499-8.256 109.219-.007 5.49 1.233 9.403 6.096 9.403 11.723v49.184a191.555 191.555 0 0 1 60.759 35.13l42.584-24.595a12.016 12.016 0 0 1 14.832 2.254c24.718 26.744 43.619 58.944 54.689 94.586 1.667 5.366-.592 11.175-5.459 13.985L444.788 220.9a193.485 193.485 0 0 1 0 70.2zM336 256c0-44.112-35.888-80-80-80s-80 35.888-80 80 35.888 80 80 80 80-35.888 80-80z" class=""></path>',
    },
    back: {
      viewbox: '0 0 512 512',
      content: '<path transform="translate(512, 0) scale(-1,1)" fill="currentColor" d="M503.691 189.836L327.687 37.851C312.281 24.546 288 35.347 288 56.015v80.053C127.371 137.907 0 170.1 0 322.326c0 61.441 39.581 122.309 83.333 154.132 13.653 9.931 33.111-2.533 28.077-18.631C66.066 312.814 132.917 274.316 288 272.085V360c0 20.7 24.3 31.453 39.687 18.164l176.004-152c11.071-9.562 11.086-26.753 0-36.328z" class=""></path>',
    },
    trophy: {
      viewbox: '0 0 576 512',
      content: '<path fill="currentColor" d="M552 64H448V24c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24v40H24C10.7 64 0 74.7 0 88v56c0 66.5 77.9 131.7 171.9 142.4C203.3 338.5 240 360 240 360v72h-48c-35.3 0-64 20.7-64 56v12c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12v-12c0-35.3-28.7-56-64-56h-48v-72s36.7-21.5 68.1-73.6C498.4 275.6 576 210.3 576 144V88c0-13.3-10.7-24-24-24zM64 144v-16h64.2c1 32.6 5.8 61.2 12.8 86.2-47.5-16.4-77-49.9-77-70.2zm448 0c0 20.2-29.4 53.8-77 70.2 7-25 11.8-53.6 12.8-86.2H512v16zm-127.3 4.7l-39.6 38.6 9.4 54.6c1.7 9.8-8.7 17.2-17.4 12.6l-49-25.8-49 25.8c-8.8 4.6-19.1-2.9-17.4-12.6l9.4-54.6-39.6-38.6c-7.1-6.9-3.2-19 6.7-20.5l54.8-8 24.5-49.6c4.4-8.9 17.1-8.9 21.5 0l24.5 49.6 54.8 8c9.6 1.5 13.5 13.6 6.4 20.5z" class=""></path>',
    },
    share: {
      viewbox: '0 0 36 50',
      content: '<path fill="currentColor" d="M19,4.414L19,32C19,32.552 18.552,33 18,33C17.448,33 17,32.552 17,32L17,4.414L10.707,10.707C10.317,11.098 9.683,11.098 9.293,10.707C8.902,10.317 8.902,9.683 9.293,9.293L18,0.586L26.707,9.293C27.098,9.683 27.098,10.317 26.707,10.707C26.317,11.098 25.683,11.098 25.293,10.707L19,4.414ZM34,18L26,18C25.448,18 25,17.552 25,17C25,16.448 25.448,16 26,16L36,16L36,50L0,50L0,16L10,16C10.552,16 11,16.448 11,17C11,17.552 10.552,18 10,18L2,18L2,48L34,48L34,18Z" />',
    },
    pwa: {
      viewbox: '0 0 740 280',
      content: '<path d="M544.62 229.7L565.998 175.641H627.722L598.43 93.6366L635.066 0.988922L740 279.601H662.615L644.683 229.7H544.62V229.7Z" fill="#3d3d3d"/><path d="M478.6 279.601L590.935 0.989288H516.461L439.618 181.035L384.974 0.989655H327.73L269.058 181.035L227.681 98.9917L190.236 214.352L228.254 279.601H301.545L354.565 118.139L405.116 279.601H478.6V279.601Z" fill="currentColor"/><path d="M70.6927 183.958H116.565C130.46 183.958 142.834 182.407 153.685 179.305L165.548 142.757L198.704 40.6105C196.177 36.6063 193.293 32.8203 190.051 29.2531C173.028 10.4101 148.121 0.988861 115.33 0.988861H0V279.601H70.6927V183.958V183.958ZM131.411 65.0863C138.061 71.7785 141.385 80.7339 141.385 91.9534C141.385 103.259 138.461 112.225 132.614 118.853C126.203 126.217 114.399 129.898 97.2023 129.898H70.6927V55.0474H97.3972C113.424 55.0474 124.762 58.3937 131.411 65.0863V65.0863Z" fill="#3d3d3d"/>',
    }
  },

  convert: true,

} );

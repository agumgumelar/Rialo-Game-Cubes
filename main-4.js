const MENU = 0;
const PLAYING = 1;
const COMPLETE = 2;
const STATS = 3;
const PREFS = 4;

const SHOW = true;
const HIDE = false;

class Game {

  constructor() {

    const qs = document.querySelector.bind( document );
    const qsa = document.querySelectorAll.bind( document );

    this.dom = {
      ui: qs( '.ui' ),
      game: qs( '.ui__game' ),
      back: qs( '.ui__background' ),
      texts: qs( '.ui__texts' ),
      prefs: qs( '.ui__prefs' ),
      stats: qs( '.ui__stats' ),
      texts: {
        title: qs( '.text--title' ),
        note: qs( '.text--note' ),
        timer: qs( '.text--timer' ),
        stats: qs( '.text--timer' ),
        complete: qs( '.text--complete' ),
        best: qs( '.text--best-time' ),
      },
      buttons: {
        prefs: qs( '.btn--prefs' ),
        back: qs( '.btn--back' ),
        stats: qs( '.btn--stats' ),
        pwa: qs( '.btn--pwa' ),
      },
      rangeHandles: qsa( '.range__handle div' ),
    };

    this.world = new World( this );
    this.cube = new Cube( this );
    this.controls = new Controls( this );
    this.scrambler = new Scrambler( this );
    this.transition = new Transition( this );
    this.timer = new Timer( this );
    this.preferences = new Preferences( this );
    this.scores = new Scores( this );
    this.storage = new Storage( this );
    this.confetti = new Confetti( this );
    this.themes = new Themes( this );

    this.initActions();

    this.state = MENU;
    this.saved = false;
    this.newGame = false;

    this.storage.init();
    this.preferences.init();
    this.transition.init();

    this.scores.calcStats();

    setTimeout( () => {

      this.transition.float();
      this.transition.cube( SHOW );

      setTimeout( () => this.transition.title( SHOW ), 700 );
      setTimeout( () => this.transition.buttons( [ 'prefs', 'pwa' ], [] ), 1000 );

    }, 500 );

  }

  initActions() {

    let tappedTwice = false;

    this.dom.game.onclick = event => {

      if ( this.transition.activeTransitions > 0 ) return;
      if ( this.state === PLAYING ) return;

      if ( this.state === MENU ) {

        if ( ! tappedTwice ) {

          tappedTwice = true;
          setTimeout( () => tappedTwice = false, 300 );
          return false;

        }

        if ( ! this.saved ) {

          this.scrambler.scramble();
          this.controls.scrambleCube();
          this.newGame = true;

        }

        const duration = this.saved ? 0 : this.scrambler.converted.length * this.controls.flipSpeeds[0];

        this.state = PLAYING;
        this.saved = true;

        this.transition.buttons( [], [ 'pwa', 'prefs' ] );

        this.transition.zoom( PLAYING, duration );
        this.transition.title( HIDE );

        setTimeout( () => {

          this.transition.timer( SHOW );
          this.transition.buttons( [ 'back' ], [] );

        }, this.transition.durations.zoom - 1000 );

        setTimeout( () => {

          this.controls.enable();
          if ( ! this.newGame ) this.timer.start( true );

        }, this.transition.durations.zoom );

      } else if ( this.state === COMPLETE ) {

        this.state = STATS;
        this.saved = false;

        this.transition.timer( HIDE );
        this.transition.complete( HIDE, this.bestTime );
        this.transition.cube( HIDE );
        this.timer.reset();

        setTimeout( () => {

          this.cube.reset();
          this.confetti.stop();

          this.transition.stats( SHOW );
          this.transition.elevate( 0 );

        }, 1000 );

        return false;

      } else if ( this.state === STATS ) {

        this.state = MENU;

        this.transition.buttons( [ 'pwa', 'prefs' ], [] );

        this.transition.stats( HIDE );

        setTimeout( () => this.transition.cube( SHOW ), 500 );
        setTimeout( () => this.transition.title( SHOW ), 1200 );

      }

    };

    this.controls.onMove = () => {

      if ( this.newGame ) {
        
        this.timer.start( true );
        this.newGame = false;

      }

    };

    this.dom.buttons.back.onclick = event => {

      if ( this.transition.activeTransitions > 0 ) return;

      if ( this.state === PREFS ) {

        this.state = MENU;

        this.transition.buttons( [ 'pwa', 'prefs' ], [ 'back' ] );

        this.transition.preferences( HIDE );

        setTimeout( () => this.transition.cube( SHOW ), 500 );
        setTimeout( () => this.transition.title( SHOW ), 1200 );

      } else if ( this.state === PLAYING ) {

        this.state = MENU;

        this.transition.buttons( [ 'pwa', 'prefs' ], [ 'back' ] );

        this.transition.zoom( MENU, 0 );

        this.controls.disable();
        if ( ! this.newGame ) this.timer.stop();
        this.transition.timer( HIDE );

        setTimeout( () => this.transition.title( SHOW ), this.transition.durations.zoom - 1000 );

        this.playing = false;
        this.controls.disable();

      }

    };

    this.dom.buttons.prefs.onclick = event => {

      if ( this.transition.activeTransitions > 0 ) return;

      this.state = PREFS;

      this.transition.buttons( [ 'back' ], [ 'pwa', 'prefs' ] );

      this.transition.title( HIDE );
      this.transition.cube( HIDE );

      setTimeout( () => this.transition.preferences( SHOW ), 1000 );

    };

    this.dom.buttons.stats.onclick = event => {

      if ( this.transition.activeTransitions > 0 ) return;

      this.state = STATS;

      this.transition.buttons( [], [ 'pwa', 'prefs' ] );

      this.transition.title( HIDE );
      this.transition.cube( HIDE );

      setTimeout( () => this.transition.stats( SHOW ), 1000 );

    };

    this.controls.onSolved = () => {

      this.transition.buttons( [], [ 'back' ] );

      this.state = COMPLETE;
      this.saved = false;

      this.controls.disable();
      this.timer.stop();

      this.bestTime = this.scores.addScore( this.timer.deltaTime );

      this.transition.zoom( MENU, 0 );
      this.transition.elevate( SHOW );

      setTimeout( () => {

        this.transition.complete( SHOW, this.bestTime );
        this.confetti.start();

      }, 1000 );

    };

  }

}

window.game = new Game();

// FILE: src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Howler } from 'howler';
import Scene from './components/Scene';
import MultiTrackLooper from './components/MultiTrackLooper';

// Performance preset configurations
const PERFORMANCE_PRESETS = {
  low: {
    particleCount: 100,
    maxSpheres: 10,
    postProcessing: false,
    bloomIntensity: 0.3,
    starCount: 200
  },
  medium: {
    particleCount: 300,
    maxSpheres: 20,
    postProcessing: false,
    bloomIntensity: 0.5,
    starCount: 500
  },
  high: {
    particleCount: 600,
    maxSpheres: 30,
    postProcessing: true,
    bloomIntensity: 0.8,
    starCount: 1000
  }
};

export default function App() {
  const [entered, setEntered] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showPerformancePopup, setShowPerformancePopup] = useState(false);
  const [cameraMode, setCameraMode] = useState('orbit');
  const [visualMode, setVisualMode] = useState('default');
  const [cameraSpeed, setCameraSpeed] = useState(0.5);
  const [soundIntensity, setSoundIntensity] = useState(0);
  const [performanceMode, setPerformanceMode] = useState('medium');
  const [fps, setFps] = useState(0);
  const [instrumentCategory, setInstrumentCategory] = useState('808');
  const [selectedSound, setSelectedSound] = useState('808 [100s]');

  const sceneRef = useRef(null);
  const looperRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  // Sound library (expand with all 100 sounds per category from your tree)
  const soundLibrary = {
    '808': [
      '808 [100s]', '808 [6God]', '808 [Aaliyah]', '808 [Alya]', '808 [Angry]', '808 [Attack]', '808 [Babyscum]', 
      '808 [BadHabbits]', '808 [Basic]', '808 [BigOlBass]', '808 [Blank]', '808 [Bounce]', '808 [Bull]', '808 [CCreese]', 
      '808 [CCretail]', '808 [Charles]', '808 [Chompy]', '808 [Classic]', '808 [Codeine]', '808 [ComeUp]', '808 [Convo]', 
      '808 [Cool]', '808 [CSLoG5]', '808 [CSLoG7]', '808 [Dark]', '808 [Different]', '808 [Disgust]', '808 [Distance]', 
      '808 [Disto]', '808 [DJScrew]', '808 [Downer]', '808 [Dro]', '808 [Drunk]', '808 [Fade]', '808 [Freq]', '808 [Gin6]', 
      '808 [GoBoom]', '808 [GodLevel]', '808 [Grammys]', '808 [Grey]', '808 [Gross]', '808 [Growth]', '808 [Guitar]', 
      '808 [Harmonic]', '808 [Heartless]', '808 [Hectic]', '808 [Humm]', '808 [Huncho]', '808 [Karden]', '808 [Kickback]', 
      '808 [Legend]', '808 [Lex]', '808 [Lucid]', '808 [Magnolia]', '808 [Milo]', '808 [Murda]', '808 [Nasty]', '808 [Neat]', 
      '808 [Off]', '808 [OZ]', '808 [Peep]', '808 [Pierre]', '808 [Pitcher]', '808 [Point]', '808 [Prod]', '808 [Purpp]', 
      '808 [Quick]', '808 [Raunchy]', '808 [Redlight]', '808 [Riley]', '808 [RoleModelz]', '808 [Rumham]', '808 [Shawty]', 
      '808 [Shotty]', '808 [Sicko]', '808 [Simple]', '808 [Sizzle]', '808 [Slow]', '808 [Smooth]', '808 [Southside]', 
      '808 [Spinz]', '808 [Stance]', '808 [Staples]', '808 [Strange]', '808 [Stubby]', '808 [Synth]', '808 [TaleOf2Citiez]', 
      '808 [Teck]', '808 [ThatOne]', '808 [Toliver]', '808 [Toven]', '808 [Trap]', '808 [Trunkshaker]', '808 [Unborn]', 
      '808 [Vinyl]', '808 [Vybe]', '808 [Wale]', '808 [Watch]', '808 [Weirdo]', '808 [Zbounce]'
    ],
    'Clap': [
      'Clap [14yeah]', 'Clap [2Bites]', 'Clap [6ixty]', 'Clap [707X]', 'Clap [707]', 'Clap [808X]', 'Clap [808]', 
      'Clap [909X]', 'Clap [909]', 'Clap [ABC]', 'Clap [AboutNow]', 'Clap [Afroshop]', 'Clap [Alien]', 'Clap [Alt]', 
      'Clap [Ame2]', 'Clap [Arena]', 'Clap [Astro]', 'Clap [ATL]', 'Clap [Basic]', 'Clap [Bazooka]', 'Clap [Beef]', 
      'Clap [Birthday]', 'Clap [Bitch]', 'Clap [Blap]', 'Clap [Boolin]', 'Clap [Boombap]', 'Clap [Boozer]', 'Clap [Brainchild]', 
      'Clap [Breath]', 'Clap [Bsquad]', 'Clap [Chewy]', 'Clap [Cold]', 'Clap [Cripple]', 'Clap [Dark]', 'Clap [Ding]', 
      'Clap [Driven]', 'Clap [DW]', 'Clap [Eagle]', 'Clap [Edro]', 'Clap [Effect]', 'Clap [Felonious]', 'Clap [Focus]', 
      'Clap [Fuck12]', 'Clap [Fuxion]', 'Clap [Glass]', 'Clap [Heavy]', 'Clap [HighEnd]', 'Clap [Houston]', 'Clap [Juice]', 
      'Clap [Karnaval]', 'Clap [Kingdom]', 'Clap [Kisses]', 'Clap [Kygo]', 'Clap [Lantern]', 'Clap [Luger]', 'Clap [Meek]', 
      'Clap [NextWeek]', 'Clap [Nobody]', 'Clap [Noisey]', 'Clap [OG]', 'Clap [Paco]', 'Clap [Palace]', 'Clap [Party]', 
      'Clap [Pedro]', 'Clap [Pierre]', 'Clap [Punch]', 'Clap [Quick]', 'Clap [Raw]', 'Clap [Rezzo]', 'Clap [Ringer]', 
      'Clap [Roth]', 'Clap [Sharp]', 'Clap [Shutup]', 'Clap [Slap]', 'Clap [Slimmy]', 'Clap [SlowG]', 'Clap [Slumpgod]', 
      'Clap [Smack]', 'Clap [Snarish]', 'Clap [SNC]', 'Clap [Spirits]', 'Clap [Spread]', 'Clap [Steppa]', 'Clap [Stereo]', 
      'Clap [Strex]', 'Clap [Stucco]', 'Clap [Talky]', 'Clap [TheLife]', 'Clap [Trippie]', 'Clap [Uzi]', 'Clap [Vertical]', 
      'Clap [Virgil]', 'Clap [WakeUp]', 'Clap [Wavy]', 'Clap [Weak]', 'Clap [Xperious]', 'Clap [ZayClean]', 'Clap [ZayDirty]', 
      'Clap [Zooka2]', 'Clap [ZZZ]'
    ],
    'Cymbal': [
      'Crash [808Dist]', 'Crash [8bit]', 'Crash [909Dirty]', 'Crash [909High]', 'Crash [Airy]', 'Crash [Arcocen]', 
      'Crash [Arena]', 'Crash [Asian]', 'Crash [BigSmoke]', 'Crash [Bodies]', 'Crash [Clean]', 'Crash [Cluedo]', 
      'Crash [CMAP]', 'Crash [Codeine]', 'Crash [Constant]', 'Crash [CrazyEyez]', 'Crash [Decker]', 'Crash [Delay]', 
      'Crash [Different]', 'Crash [Dub1]', 'Crash [Dub2]', 'Crash [Eest]', 'Crash [Flush]', 'Crash [Gazing]', 
      'Crash [Ghost]', 'Crash [Gong1]', 'Crash [Gong2]', 'Crash [Gong3]', 'Crash [Gorgeous]', 'Crash [Grammik]', 
      'Crash [H20]', 'Crash [Infected]', 'Crash [Junk]', 'Crash [Luger]', 'Crash [Mashdown]', 'Crash [Nahdude]', 
      'Crash [NewAge]', 'Crash [OG]', 'Crash [OldPhotos]', 'Crash [Ouch]', 'Crash [Panned]', 'Crash [Phased]', 
      'Crash [Pizzagate]', 'Crash [Screech]', 'Crash [Session1]', 'Crash [Session2]', 'Crash [Session3]', 'Crash [SideEffect]', 
      'Crash [SimpleRev.]', 'Crash [Slam1]', 'Crash [Slam2]', 'Crash [Soulfly]', 'Crash [Splash]', 'Crash [Swift]', 
      'Crash [Swisher]', 'Crash [Talky]', 'Crash [ThatCrash]', 'Crash [Thin]', 'Crash [Tinker]', 'Crash [Trap]', 
      'Crash [VHS]', 'Crash [Vybe]', 'Crash [Weird]', 'Crash [WhoDat]', 'Crash [Xanny]', 'Crash [Zay]', 'Ride [17]', 
      'Ride [Alonso]', 'Ride [AstroThunder]', 'Ride [Bouncer]', 'Ride [Chapo]', 'Ride [Compakt]', 'Ride [Copy]', 
      'Ride [DMT]', 'Ride [Elektro1]', 'Ride [Elektro2]', 'Ride [Fidelity]', 'Ride [Gazing]', 'Ride [Grumpy]', 
      'Ride [HipHop]', 'Ride [Humble]', 'Ride [Infected]', 'Ride [Kunta]', 'Ride [Lee]', 'Ride [LuckyFool]', 'Ride [MC]', 
      'Ride [Meek]', 'Ride [Need]', 'Ride [Sizz1]', 'Ride [Sizz2]', 'Ride [Slay]', 'Ride [Splashy]', 'Ride [Splosion]', 
      'Ride [Uzi]', 'Ride [Vertical]', 'Ride [Vintage]', 'Ride [Wake]', 'Ride [Weak]', 'Ride [WhoWhat]', 'Ride [XXX]'
    ],
    'FX': [
      'FX [80\'s]', 'FX [Arcade]', 'FX [AyeFill]', 'FX [BubblePop]', 'FX [Camel1]', 'FX [Camel2]', 'FX [Camel3]', 
      'FX [Car Crash]', 'FX [Cartoon]', 'FX [Chain Thing]', 'FX [CockGun]', 'FX [CockShoot]', 'FX [Coin Up]', 'FX [Copper]', 
      'FX [DieLit]', 'FX [DooDooDoo]', 'FX [Downwards]', 'FX [DreamHarp]', 'FX [DrumFill]', 'FX [EggShake1]', 'FX [EggShake2]', 
      'FX [Foley]', 'FX [Game1]', 'FX [Game2]', 'FX [Game3]', 'FX [Game4]', 'FX [GameOver]', 'FX [GetTheBag Impact]', 
      'FX [Glass Hit]', 'FX [Hard Vinyl]', 'FX [HatFill]', 'FX [Impact 10]', 'FX [Impact 1]', 'FX [Impact 2]', 'FX [Impact 3]', 
      'FX [Impact 4]', 'FX [Impact 5]', 'FX [Impact 6]', 'FX [Impact 7]', 'FX [Impact 8]', 'FX [Impact 9]', 'FX [Jump]', 
      'FX [Keychain]', 'FX [Kling]', 'FX [KRSbreak]', 'FX [MachineGun]', 'FX [Magnum]', 'FX [Minigun]', 'FX [Moan]', 
      'FX [Pistol]', 'FX [Predator]', 'FX [Rev. Glass]', 'FX [Rev.1]', 'FX [Rev.2]', 'FX [Rev.3]', 'FX [Rev.4]', 
      'FX [Reverse Bass]', 'FX [Riser 10]', 'FX [Riser 1]', 'FX [Riser 2]', 'FX [Riser 3]', 'FX [Riser 4]', 'FX [Riser 5]', 
      'FX [Riser 6]', 'FX [Riser 7]', 'FX [Riser 8]', 'FX [Riser 9]', 'FX [Saiyan]', 'FX [Scary Hit]', 'FX [Scratch]', 
      'FX [Shots]', 'FX [Siren]', 'FX [SmokeHit]', 'FX [Sniper]', 'FX [Spinstop]', 'FX [Spiraldown]', 'FX [Stabber]', 
      'FX [Sweep1]', 'FX [Sweep2]', 'FX [Sweep3]', 'FX [Sweep4]', 'FX [Sweep5]', 'FX [Sweep6]', 'FX [Sweep7]', 'FX [Sweep8]', 
      'FX [Synth Dive]', 'FX [Tapestart]', 'FX [Terminator]', 'FX [Thunder]', 'FX [Trans. Cell]', 'FX [Trans. Wind]', 
      'FX [Travis Chain]', 'FX [UFO]', 'FX [Vintage]', 'FX [Vinyl]', 'FX [Vox1]', 'FX [Vox2]', 'FX [WahGuitar]', 
      'FX [Washboard]', 'FX [Zipper]'
    ],
    'Hi Hat': [
      'Hi Hat [1da]', 'Hi Hat [2in2]', 'Hi Hat [Abraxis]', 'Hi Hat [Africa]', 'Hi Hat [Alonso]', 'Hi Hat [Analog]', 
      'Hi Hat [Andreena]', 'Hi Hat [Aqua]', 'Hi Hat [Ashyknee]', 'Hi Hat [Aux]', 'Hi Hat [BanBan]', 'Hi Hat [Beamer]', 
      'Hi Hat [Beatboard]', 'Hi Hat [BillGates]', 'Hi Hat [Blackpool]', 'Hi Hat [Blocker]', 'Hi Hat [Bombard]', 
      'Hi Hat [Bouncer]', 'Hi Hat [Brighton]', 'Hi Hat [C3P0]', 'Hi Hat [Caldwell]', 'Hi Hat [City]', 'Hi Hat [Controlla]', 
      'Hi Hat [Coop]', 'Hi Hat [Crazy]', 'Hi Hat [Crunch]', 'Hi Hat [Cypress]', 'Hi Hat [Different]', 'Hi Hat [Dim]', 
      'Hi Hat [Dreams]', 'Hi Hat [DS2]', 'Hi Hat [Dumby]', 'Hi Hat [Evolution]', 'Hi Hat [Facts]', 'Hi Hat [Fearless]', 
      'Hi Hat [FeelGood]', 'Hi Hat [Filter]', 'Hi Hat [Gang]', 'Hi Hat [Gary]', 'Hi Hat [Georgia]', 'Hi Hat [Governor]', 
      'Hi Hat [Greenwich]', 'Hi Hat [Grind]', 'Hi Hat [Hacked My IG]', 'Hi Hat [Homie]', 'Hi Hat [Hype]', 'Hi Hat [Ice Tray]', 
      'Hi Hat [iknow]', 'Hi Hat [Joey]', 'Hi Hat [Juul]', 'Hi Hat [Keller]', 'Hi Hat [Lakey]', 'Hi Hat [Lana]', 'Hi Hat [Layer]', 
      'Hi Hat [Maine]', 'Hi Hat [Metro]', 'Hi Hat [MissMe]', 'Hi Hat [MoMilli]', 'Hi Hat [Night]', 'Hi Hat [NoNeed]', 
      'Hi Hat [OG]', 'Hi Hat [OneMore]', 'Hi Hat [Ontop]', 'Hi Hat [Orange]', 'Hi Hat [Ping]', 'Hi Hat [Plink]', 
      'Hi Hat [Plopper]', 'Hi Hat [Potion]', 'Hi Hat [Preston]', 'Hi Hat [Pull Up]', 'Hi Hat [Punksta]', 'Hi Hat [PuttinOn]', 
      'Hi Hat [Rambo]', 'Hi Hat [Rando]', 'Hi Hat [RDR2]', 'Hi Hat [Revolution]', 'Hi Hat [Roshi]', 'Hi Hat [Skrrrat]', 
      'Hi Hat [Smacky]', 'Hi Hat [Smooth]', 'Hi Hat [Star]', 'Hi Hat [Stoopid]', 'Hi Hat [Stressed]', 'Hi Hat [Swifty]', 
      'Hi Hat [Teck]', 'Hi Hat [Tiller]', 'Hi Hat [TimeOut]', 'Hi Hat [Too Late]', 'Hi Hat [Trash]', 'Hi Hat [Trill]', 
      'Hi Hat [Turtle]', 'Hi Hat [VG]', 'Hi Hat [Vinyl]', 'Hi Hat [Water]', 'Hi Hat [Whitepool]', 'Hi Hat [Work]', 
      'Hi Hat [XO]', 'Hi Hat [Z1]', 'Hi Hat [Z2]', 'Hi Hat [Z3]'
    ],
    'Kick': [
      'Kick [80\'s]', 'Kick [808Fall]', 'Kick [909Long]', 'Kick [909Short]', 'Kick [Abalone]', 'Kick [Agio]', 'Kick [Airy]', 
      'Kick [Alien808]', 'Kick [Ball]', 'Kick [Bamby]', 'Kick [Barbarians]', 'Kick [Basement]', 'Kick [BigA]', 'Kick [BlackIce]', 
      'Kick [Body]', 'Kick [Boomy]', 'Kick [Boom]', 'Kick [Boulder]', 'Kick [Brutus]', 'Kick [Bustdown]', 'Kick [CityLights]', 
      'Kick [Clean]', 'Kick [Clicky]', 'Kick [Coldwire]', 'Kick [Coliseum]', 'Kick [Creeks]', 'Kick [Darklight]', 'Kick [Dark]', 
      'Kick [Deep]', 'Kick [Door]', 'Kick [Dope]', 'Kick [Drum]', 'Kick [Ekali]', 'Kick [Energy]', 'Kick [FaceTime]', 
      'Kick [Faction]', 'Kick [Filter]', 'Kick [Fluxion]', 'Kick [Flux]', 'Kick [Good]', 'Kick [Gucci]', 'Kick [Halo]', 
      'Kick [Hatty]', 'Kick [High]', 'Kick [Hipster]', 'Kick [House]', 'Kick [Huge]', 'Kick [Jungle]', 'Kick [Jury]', 
      'Kick [Kanye]', 'Kick [KFC]', 'Kick [Knock]', 'Kick [Lazy]', 'Kick [Lex]', 'Kick [Linndrum]', 'Kick [Magnolia]', 
      'Kick [Metalgear]', 'Kick [Meteor]', 'Kick [Nick]', 'Kick [Nightly]', 'Kick [OB1]', 'Kick [Oldie]', 'Kick [OldSchool]', 
      'Kick [Orleans]', 'Kick [Panic]', 'Kick [Panther]', 'Kick [Pop]', 'Kick [Puny]', 'Kick [Rack1]', 'Kick [Rack2]', 
      'Kick [Rack3]', 'Kick [Raw]', 'Kick [Roomy]', 'Kick [Savior]', 'Kick [Sexbot]', 'Kick [Shake]', 'Kick [Sketchy]', 
      'Kick [Slaggy]', 'Kick [Slutty]', 'Kick [Small]', 'Kick [Smooth]', 'Kick [Solid]', 'Kick [Stereo1]', 'Kick [Stereo2]', 
      'Kick [Subby]', 'Kick [Synth]', 'Kick [Tape]', 'Kick [Throttle]', 'Kick [Timbo]', 'Kick [Titan]', 'Kick [TM88]', 
      'Kick [Tony]', 'Kick [Toronto]', 'Kick [Trap]', 'Kick [Uno]', 'Kick [Vinyl]', 'Kick [Vybe]', 'Kick [WaxDoc]', 
      'Kick [Weft]', 'Kick [Wonda]'
    ],
  'Loops': [
    'Drum Loop 1', 'Drum Loop 10', 'Drum Loop 11', 'Drum Loop 12', 'Drum Loop 13', 'Drum Loop 14', 'Drum Loop 15', 
    'Drum Loop 16', 'Drum Loop 17', 'Drum Loop 18', 'Drum Loop 19', 'Drum Loop 2', 'Drum Loop 20', 'Drum Loop 21', 
    'Drum Loop 22', 'Drum Loop 23', 'Drum Loop 24', 'Drum Loop 25', 'Drum Loop 3', 'Drum Loop 4', 'Drum Loop 5', 
    'Drum Loop 6', 'Drum Loop 7', 'Drum Loop 8', 'Drum Loop 9', 'Hi Hat Loop [8AM]', 'Hi Hat Loop [90\'s]', 
    'Hi Hat Loop [999]', 'Hi Hat Loop [Bouncy154]', 'Hi Hat Loop [Breaks]', 'Hi Hat Loop [Broke]', 'Hi Hat Loop [Cheesy]', 
    'Hi Hat Loop [City]', 'Hi Hat Loop [Clappy]', 'Hi Hat Loop [Country]', 'Hi Hat Loop [Croop]', 'Hi Hat Loop [Darrell]', 
    'Hi Hat Loop [Dot]', 'Hi Hat Loop [Drugs]', 'Hi Hat Loop [Eestbound]', 'Hi Hat Loop [Fire]', 'Hi Hat Loop [Genius]', 
    'Hi Hat Loop [Gross]', 'Hi Hat Loop [Hardo]', 'Hi Hat Loop [Humble]', 'Hi Hat Loop [Jennifer]', 'Hi Hat Loop [Kendrick]', 
    'Hi Hat Loop [Luv]', 'Hi Hat Loop [Metallic]', 'Hi Hat Loop [MZ1]', 'Hi Hat Loop [MZ2]', 'Hi Hat Loop [MZ3]', 
    'Hi Hat Loop [MZ4]', 'Hi Hat Loop [MZ5]', 'Hi Hat Loop [Rage]', 'Hi Hat Loop [Reverb]', 'Hi Hat Loop [Ride]', 
    'Hi Hat Loop [Sundays]', 'Hi Hat Loop [Swung]', 'Hi Hat Loop [Town]', 'Hi Hat Loop [Vertical]', 'Hi Hat Loop [Wavy]', 
    'Hi Hat Loop [Wonda]', 'Hi Hat Loop [Xchange]', 'Perc Loop [Kanye]', 'Perc Loop [Moog]', 'Top Loop [Adequate]', 
    'Top Loop [Bands]', 'Top Loop [Butterfly]', 'Top Loop [Can\'t Say]', 'Top Loop [Cash]', 'Top Loop [Correct]', 
    'Top Loop [Drumroll]', 'Top Loop [Freedom]', 'Top Loop [Gazing]', 'Top Loop [GetTheBag]', 'Top Loop [Institution]', 
    'Top Loop [Kunta]', 'Top Loop [Loyal]', 'Top Loop [Mode]', 'Top Loop [Mojave]', 'Top Loop [Patek]', 'Top Loop [Phase]', 
    'Top Loop [Sauce]', 'Top Loop [Sicko]', 'Top Loop [Sit Down]', 'Top Loop [Social]', 'Top Loop [Theory]', 
    'Top Loop [Thirst]', 'Top Loop [Timeless]', 'Top Loop [Tired]', 'Top Loop [Vacation]', 'Top Loop [Wonda]', 
    'Top Loop [XO]', 'Top Loop [You]'
  ],
  'Open Hat': [
    'Open Hat [1400]', 'Open Hat [808one]', 'Open Hat [808two]', 'Open Hat [909High]', 'Open Hat [909]', 'Open Hat [Accent]', 
    'Open Hat [Alien]', 'Open Hat [Apple]', 'Open Hat [Astral]', 'Open Hat [Blondie]', 'Open Hat [CallingMeHome]', 
    'Open Hat [Capsize]', 'Open Hat [ClearSky]', 'Open Hat [Coasting]', 'Open Hat [Concrete]', 'Open Hat [Crackles]', 
    'Open Hat [Crispy]', 'Open Hat [Cymb]', 'Open Hat [Dark]', 'Open Hat [DC]', 'Open Hat [Diamonds]', 'Open Hat [Ding]', 
    'Open Hat [Disregard]', 'Open Hat [Doctor]', 'Open Hat [Easy]', 'Open Hat [Elixir]', 'Open Hat [Enemies]', 
    'Open Hat [Faces]', 'Open Hat [Favorite]', 'Open Hat [Flashing]', 'Open Hat [Flexx]', 'Open Hat [Funky]', 
    'Open Hat [Garb]', 'Open Hat [Golddust]', 'Open Hat [Gripes]', 'Open Hat [Gym]', 'Open Hat [Heartbeat]', 
    'Open Hat [HitALick]', 'Open Hat [Icey]', 'Open Hat [JP]', 'Open Hat [Kicky]', 'Open Hat [Kush&OJ]', 'Open Hat [Lazer]', 
    'Open Hat [LA]', 'Open Hat [Lectricity]', 'Open Hat [Liditron]', 'Open Hat [London]', 'Open Hat [Long]', 
    'Open Hat [Lowlife]', 'Open Hat [LowLow]', 'Open Hat [Maker]', 'Open Hat [Messed1]', 'Open Hat [Messed2]', 
    'Open Hat [MikeWill]', 'Open Hat [Mudiron]', 'Open Hat [Murda]', 'Open Hat [Neon Lights]', 'Open Hat [Nice]', 
    'Open Hat [Nimrod]', 'Open Hat [Nokia]', 'Open Hat [NoLand]', 'Open Hat [Oldy]', 'Open Hat [Pitch]', 'Open Hat [Poach]', 
    'Open Hat [Pocket]', 'Open Hat [Punksta]', 'Open Hat [Rando]', 'Open Hat [Real]', 'Open Hat [Redd]', 'Open Hat [Reso]', 
    'Open Hat [Reverb]', 'Open Hat [Roshi]', 'Open Hat [Sharp]', 'Open Hat [Short]', 'Open Hat [Shotcaller]', 
    'Open Hat [Shots]', 'Open Hat [Silverdust]', 'Open Hat [Socal]', 'Open Hat [Solid]', 'Open Hat [South]', 
    'Open Hat [Spacey]', 'Open Hat [Sparkly]', 'Open Hat [Splash]', 'Open Hat [StoleYou]', 'Open Hat [Swimmer]', 
    'Open Hat [Sxpply]', 'Open Hat [Synth]', 'Open Hat [TaylorGang]', 'Open Hat [Taze]', 'Open Hat [Tinny]', 
    'Open Hat [Trouble]', 'Open Hat [Trucci]', 'Open Hat [Twat]', 'Open Hat [Twirl]', 'Open Hat [VG]', 'Open Hat [Wait]', 
    'Open Hat [WCG]', 'Open Hat [Weak]', 'Open Hat [Yellow]', 'Open Hat [Zip]'
  ],
  'Perc': [
    'Perc [1Night]', 'Perc [Accented]', 'Perc [AlmostaSnare]', 'Perc [Ava]', 'Perc [Belly]', 'Perc [Bleep]', 'Perc [Bloop]', 
    'Perc [Booty]', 'Perc [Bright]', 'Perc [Camera]', 'Perc [Cavern]', 'Perc [Cbell]', 'Perc [Chill]', 'Perc [Chimeroll]', 
    'Perc [Chimey]', 'Perc [Clappy]', 'Perc [Clashy]', 'Perc [Conga1]', 'Perc [Conga2]', 'Perc [Conga3]', 'Perc [Conga4]', 
    'Perc [Conga5]', 'Perc [Cow]', 'Perc [Dogg]', 'Perc [Drippy]', 'Perc [Element]', 'Perc [Found]', 'Perc [Future]', 
    'Perc [GateTom1]', 'Perc [GateTom2]', 'Perc [GateTom3]', 'Perc [GateTom4]', 'Perc [Gear]', 'Perc [Gnar]', 
    'Perc [HallTom1]', 'Perc [HallTom2]', 'Perc [HallTom3]', 'Perc [HallTom4]', 'Perc [Juicy]', 'Perc [LikeARim]', 
    'Perc [Lilboi]', 'Perc [Marty]', 'Perc [Metro]', 'Perc [Minecraft]', 'Perc [Mud Shaker]', 'Perc [NextUp]', 'Perc [Pans]', 
    'Perc [Patrol]', 'Perc [Punchit]', 'Perc [Reload]', 'Perc [Shaka]', 'Perc [Slash]', 'Perc [Slit]', 'Perc [Sn. 10]', 
    'Perc [Sn. 1]', 'Perc [Sn. 2]', 'Perc [Sn. 3]', 'Perc [Sn. 4]', 'Perc [Sn. 5]', 'Perc [Sn. 6]', 'Perc [Sn. 7]', 
    'Perc [Sn. 8]', 'Perc [Sn. 9]', 'Perc [Snap1]', 'Perc [Snap2]', 'Perc [Snap3]', 'Perc [Snap4]', 'Perc [Snap5]', 
    'Perc [Spacetom]', 'Perc [Stomp]', 'Perc [Swiper]', 'Perc [Swoosh]', 'Perc [Tambo1]', 'Perc [Tambo2]', 'Perc [Tambo3]', 
    'Perc [Tambo4]', 'Perc [Tambo5]', 'Perc [Tarzan]', 'Perc [Thow]', 'Perc [Tom1]', 'Perc [Tom2]', 'Perc [Tom3]', 
    'Perc [Tonal]', 'Perc [TonedHit]', 'Perc [Tribal]', 'Perc [Twist]', 'Perc [Whack]', 'Perc [Windchime]', 'Perc [Windy]', 
    'Perc [Wooden]', 'Perc [XSquare]', 'Rim [808]', 'Rim [ATL]', 'Rim [Basic]', 'Rim [Beat]', 'Rim [Dancehall]', 
    'Rim [Fat]', 'Rim [Front]', 'Rim [Hard]', 'Rim [Stutter]'
  ],
  'Snares': [
    'Snare [1499]', 'Snare [4X]', 'Snare [6ix]', 'Snare [90210]', 'Snare [909]', 'Snare [Aggressive]', 'Snare [Almost]', 
    'Snare [Anytime]', 'Snare [Astral]', 'Snare [Athome]', 'Snare [Attack]', 'Snare [Batista]', 'Snare [BBL1]', 
    'Snare [BBL2]', 'Snare [BBL3]', 'Snare [BBL4]', 'Snare [BBL5]', 'Snare [BigRim]', 'Snare [BigRoom]', 'Snare [Big]', 
    'Snare [Bleeper]', 'Snare [Blink]', 'Snare [Border]', 'Snare [Boulder]', 'Snare [Buddy]', 'Snare [Built]', 'Snare [Bwah]', 
    'Snare [Cadillac]', 'Snare [CaliNights]', 'Snare [Cali]', 'Snare [CallingMe]', 'Snare [Cheap]', 'Snare [Choppy]', 
    'Snare [Chop]', 'Snare [Classic]', 'Snare [Clean]', 'Snare [Compakt]', 'Snare [Comp]', 'Snare [Crack]', 'Snare [Crash]', 
    'Snare [Creeks]', 'Snare [Crisp]', 'Snare [Dancehall]', 'Snare [Deadly]', 'Snare [Deep]', 'Snare [Designer]', 
    'Snare [Dirty]', 'Snare [Disco]', 'Snare [Drunk]', 'Snare [Electric]', 'Snare [Facts]', 'Snare [Fancy]', 'Snare [Fatigue]', 
    'Snare [Fatso]', 'Snare [Felonious]', 'Snare [Flamm]', 'Snare [Flutter]', 'Snare [Focus]', 'Snare [Goosebumps]', 
    'Snare [Grammik]', 'Snare [Hatty]', 'Snare [Hologram]', 'Snare [Jumpman]', 'Snare [Kanye]', 'Snare [Kunt]', 'Snare [Lazy]', 
    'Snare [LugerLofi]', 'Snare [Luger]', 'Snare [Messy]', 'Snare [Money]', 'Snare [Moon]', 'Snare [Noir]', 'Snare [Philly]', 
    'Snare [Pierce]', 'Snare [Pitch]', 'Snare [Pow]', 'Snare [Punchy]', 'Snare [Quick]', 'Snare [RawRim]', 'Snare [Real]', 
    'Snare [Reso]', 'Snare [Rich]', 'Snare [Roll]', 'Snare [Roshi]', 'Snare [SleptOn]', 'Snare [Slumpzilla]', 'Snare [Smacky]', 
    'Snare [Snarf]', 'Snare [Spiral]', 'Snare [Sprinkle]', 'Snare [Theory]', 'Snare [Tminus]', 'Snare [Trap]', 'Snare [Uzi]', 
    'Snare [Vegas]', 'Snare [Vinyl]', 'Snare [Weak]', 'Snare [Wow]', 'Snare [Wu-Tang]', 'Snare [Yachts]'
  ]
};

useEffect(() => {
  let frameId;
  const updateFps = () => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    if (delta > 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / delta));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
    frameCountRef.current++;
    frameId = requestAnimationFrame(updateFps);
  };
  frameId = requestAnimationFrame(updateFps);
  return () => cancelAnimationFrame(frameId);
}, []);

useEffect(() => {
  const resetTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!showControls) {
      setShowControls(true);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };
  window.addEventListener('mousemove', resetTimeout);
  window.addEventListener('click', resetTimeout);
  window.addEventListener('keydown', resetTimeout);
  resetTimeout();
  return () => {
    window.removeEventListener('mousemove', resetTimeout);
    window.removeEventListener('click', resetTimeout);
    window.removeEventListener('keydown', resetTimeout);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };
}, [showControls]);

useEffect(() => {
  if (!sceneRef.current) return;
  const updateInterval = setInterval(() => {
    if (sceneRef.current.getSoundIntensity) {
      setSoundIntensity(sceneRef.current.getSoundIntensity());
    }
    if (sceneRef.current.getCurrentCameraMode) {
      setCameraMode(sceneRef.current.getCurrentCameraMode());
    }
  }, 100);
  return () => clearInterval(updateInterval);
}, [sceneRef.current]);

const handleKeyPress = (key) => {
  if (looperRef.current?.recordKeyPress) {
    looperRef.current.recordKeyPress(key);
  }
};

const handleCameraModeToggle = () => {
  if (sceneRef.current?.toggleCameraMode) {
    sceneRef.current.toggleCameraMode();
  }
};

const handleCameraSpeedChange = (e) => {
  const newSpeed = parseFloat(e.target.value);
  setCameraSpeed(newSpeed);
  if (sceneRef.current?.setCameraSpeed) {
    sceneRef.current.setCameraSpeed(newSpeed / 10);
  }
};

const handleVisualModeToggle = () => {
  const modes = ['default', 'neon', 'dream', 'monochrome'];
  const currentIndex = modes.indexOf(visualMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  setVisualMode(modes[nextIndex]);
};

const toggleHelpPopup = () => {
  setShowHelpPopup(!showHelpPopup);
  setShowPerformancePopup(false);
};

const togglePerformancePopup = () => {
  setShowPerformancePopup(!showPerformancePopup);
  setShowHelpPopup(false);
};

const changePerformanceMode = (mode) => {
  setPerformanceMode(mode);
  if (sceneRef.current?.setPerformanceMode) {
    sceneRef.current.setPerformanceMode(PERFORMANCE_PRESETS[mode]);
  }
};

const handleInstrumentChange = (e) => {
  const newCategory = e.target.value;
  setInstrumentCategory(newCategory);
  setSelectedSound(soundLibrary[newCategory][0]); // Reset to first sound
};

const handleSoundChange = (e) => {
  setSelectedSound(e.target.value);
};

function handleEnterClick() {
  if (Howler.usingWebAudio && Howler.ctx) {
    Howler.ctx.resume().then(() => {
      console.log('Audio context resumed with Web Audio!');
      setEntered(true);
    });
  } else {
    console.log('Using HTML5 audio fallback or no Web Audio support');
    setEntered(true);
  }
}

const landingStyle = {
  width: '100vw',
  height: '100vh',
  background: 'linear-gradient(to bottom, #000000, #101025)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontFamily: 'Arial, sans-serif'
};

const landingTitleStyle = {
  fontSize: '3rem',
  marginBottom: '1rem',
  textShadow: '0 0 10px rgba(120, 160, 255, 0.8)',
  animation: 'pulse 2s infinite'
};

const landingDescStyle = {
  fontSize: '1.2rem',
  maxWidth: '600px',
  textAlign: 'center',
  marginBottom: '2rem',
  lineHeight: '1.6'
};

const enterButtonStyle = {
  padding: '1rem 2rem',
  fontSize: '1.5rem',
  background: 'linear-gradient(45deg, #4466ff, #aa44ff)',
  border: 'none',
  borderRadius: '50px',
  color: 'white',
  cursor: 'pointer',
  boxShadow: '0 0 15px rgba(120, 160, 255, 0.5)',
  transition: 'all 0.3s ease'
};

const controlsStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  padding: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  zIndex: 10,
  background: 'rgba(10, 15, 30, 0.7)',
  backdropFilter: 'blur(5px)',
  transition: 'opacity 0.5s ease',
  opacity: showControls ? 1 : 0,
  pointerEvents: showControls ? 'auto' : 'none',
  borderBottom: '1px solid rgba(80, 120, 220, 0.3)'
};

const buttonStyle = {
  padding: '0.5rem 1rem',
  margin: '0 0.3rem',
  background: 'rgba(40, 50, 80, 0.8)',
  border: '1px solid rgba(80, 120, 220, 0.5)',
  borderRadius: '4px',
  color: 'white',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'all 0.2s ease'
};

const activeButtonStyle = {
  ...buttonStyle,
  background: 'rgba(60, 100, 200, 0.8)',
  boxShadow: '0 0 10px rgba(80, 150, 255, 0.5)'
};

const sliderContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  margin: '0 1rem'
};

const sliderLabelStyle = {
  marginRight: '0.5rem',
  fontSize: '0.9rem'
};

const buttonGroupStyle = {
  display: 'flex',
  alignItems: 'center'
};

const fpsCounterStyle = {
  position: 'absolute',
  bottom: '20px',
  left: '20px',
  background: 'rgba(0, 0, 0, 0.6)',
  color: fps < 30 ? '#ff5555' : fps < 50 ? '#ffaa55' : '#55ff55',
  padding: '0.3rem 0.6rem',
  borderRadius: '4px',
  fontSize: '0.9rem',
  zIndex: 11
};

const helpButtonStyle = {
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'rgba(60, 80, 170, 0.8)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '1.5rem',
  zIndex: 11,
  boxShadow: '0 0 10px rgba(100, 150, 255, 0.5)'
};

const performanceButtonStyle = {
  position: 'absolute',
  bottom: '20px',
  right: '80px',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'rgba(60, 80, 170, 0.8)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '1.2rem',
  zIndex: 11,
  boxShadow: '0 0 10px rgba(100, 150, 255, 0.5)'
};

const popupStyle = {
  position: 'absolute',
  bottom: '70px',
  right: '20px',
  width: '300px',
  background: 'rgba(15, 20, 35, 0.95)',
  backdropFilter: 'blur(10px)',
  color: 'white',
  padding: '1rem',
  borderRadius: '10px',
  zIndex: 12,
  boxShadow: '0 0 20px rgba(60, 100, 220, 0.5)',
  maxHeight: '400px',
  overflowY: 'auto',
  border: '1px solid rgba(80, 120, 220, 0.3)'
};

const performanceOptionStyle = (mode) => ({
  padding: '0.5rem 0.8rem',
  margin: '0.5rem 0',
  background: performanceMode === mode 
    ? 'rgba(60, 100, 200, 0.6)' 
    : 'rgba(30, 40, 70, 0.6)',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  border: performanceMode === mode 
    ? '1px solid rgba(100, 150, 255, 0.6)'
    : '1px solid rgba(60, 80, 140, 0.3)',
  transition: 'all 0.2s ease'
});

const instrumentSelectorStyle = {
  padding: '0.5rem',
  background: 'rgba(40, 50, 80, 0.8)',
  border: '1px solid rgba(80, 120, 220, 0.5)',
  borderRadius: '4px',
  color: 'white',
  fontSize: '0.9rem',
  margin: '0 0.3rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

if (!entered) {
  return (
    <div style={landingStyle}>
      <h1 style={landingTitleStyle}>Interactive Sound Spheres</h1>
      <p style={landingDescStyle}>
        Welcome to a dynamic 3D audio-visual experience. Press keys to create sounds and visual elements,
        record sequences, and watch as the environment responds to your music.
      </p>
      <button 
        style={enterButtonStyle} 
        onClick={handleEnterClick}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        Enter Experience
      </button>
    </div>
  );
}
return (
  <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
    <Canvas 
      style={{ width: '100%', height: '100%' }} 
      dpr={Math.min(1.5, window.devicePixelRatio)}
      frameloop={performanceMode === 'high' ? 'always' : 'demand'}
      gl={{ 
        antialias: performanceMode === 'high',
        powerPreference: 'high-performance',
        alpha: true
      }}
    >
      <Scene 
        ref={sceneRef} 
        onKeyPress={handleKeyPress} 
        visualMode={visualMode}
        performanceSettings={PERFORMANCE_PRESETS[performanceMode]}
        instrumentCategory={instrumentCategory}
        selectedSound={selectedSound}
      />
    </Canvas>

    <div style={controlsStyle}>
      <div style={buttonGroupStyle}>
        <button 
          onClick={() => sceneRef.current?.startLoop()}
          style={buttonStyle}
          onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
        >
          Start Loop
        </button>
        <button 
          onClick={() => sceneRef.current?.stopLoop()} 
          style={buttonStyle}
          onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
        >
          Stop Loop
        </button>
        <button 
          onClick={() => sceneRef.current?.deleteLoop()} 
          style={buttonStyle}
          onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
        >
          Clear Loop
        </button>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        <div style={sliderContainerStyle}>
          <span style={sliderLabelStyle}>Camera Speed:</span>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.1" 
            value={cameraSpeed} 
            onChange={handleCameraSpeedChange}
            style={{ accentColor: 'rgba(80, 120, 220, 0.8)' }}
          />
        </div>
        
        <button 
          onClick={handleCameraModeToggle}
          style={cameraMode === 'orbit' ? activeButtonStyle : buttonStyle}
          onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
          onMouseOut={(e) => e.target.style.background = cameraMode === 'orbit' 
            ? 'rgba(60, 100, 200, 0.8)' 
            : 'rgba(40, 50, 80, 0.8)'}
        >
          Camera: {cameraMode.charAt(0).toUpperCase() + cameraMode.slice(1)}
        </button>
        
        <button 
          onClick={handleVisualModeToggle}
          style={buttonStyle}
          onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
        >
          Visual: {visualMode.charAt(0).toUpperCase() + visualMode.slice(1)}
        </button>

        <select 
          value={instrumentCategory} 
          onChange={handleInstrumentChange}
          style={instrumentSelectorStyle}
        >
          {Object.keys(soundLibrary).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select 
          value={selectedSound} 
          onChange={handleSoundChange}
          style={instrumentSelectorStyle}
        >
          {soundLibrary[instrumentCategory].map(sound => (
            <option key={sound} value={sound}>{sound}</option>
          ))}
        </select>
      </div>
      
      <div style={buttonGroupStyle}>
        <div style={{
          background: 'rgba(20, 25, 45, 0.6)',
          padding: '0.5rem',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>Sound Intensity:</span>
          <div style={{
            width: '100px',
            height: '8px',
            background: 'rgba(30, 40, 60, 0.5)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${soundIntensity * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4466ff, #aa44ff)',
              transition: 'width 0.1s ease'
            }} />
          </div>
        </div>
      </div>
    </div>

    <div style={fpsCounterStyle}>
      {fps} FPS
    </div>

    <div 
      style={performanceButtonStyle} 
      onClick={togglePerformancePopup}
      title="Performance Settings"
    >
      ⚙️
    </div>

    <div 
      style={helpButtonStyle} 
      onClick={toggleHelpPopup}
      title="Help"
    >
      ?
    </div>
    
    {showPerformancePopup && (
      <div style={popupStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid rgba(80, 120, 220, 0.5)', paddingBottom: '0.5rem' }}>
          Performance Settings
        </h3>
        <div style={performanceOptionStyle('low')} onClick={() => changePerformanceMode('low')}>
          <span>Low</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>For older devices</span>
        </div>
        <div style={performanceOptionStyle('medium')} onClick={() => changePerformanceMode('medium')}>
          <span>Medium</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Balanced</span>
        </div>
        <div style={performanceOptionStyle('high')} onClick={() => changePerformanceMode('high')}>
          <span>High</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Best visuals</span>
        </div>
        <div style={performanceOptionStyle('ultra')} onClick={() => changePerformanceMode('ultra')}>
          <span>Ultra</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>For powerful GPUs</span>
        </div>
        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
          Lower settings will improve performance on less powerful devices.
        </p>
      </div>
    )}
    
    {showHelpPopup && (
      <div style={popupStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid rgba(80, 120, 220, 0.5)', paddingBottom: '0.5rem' }}>
          How to Use
        </h3>
        <p>Press keyboard keys to create sounds and visual spheres in 3D space:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Number keys (1-6) create different sounds</li>
          <li>Letter keys (Q,W,E,R,T,A,S,D,F) create different sounds</li>
          <li>Press 'C' to change camera mode</li>
        </ul>
        <p>You can record sequences:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Press "Start Loop" to record a sequence</li>
          <li>Press keys to add sounds</li>
          <li>Press "Stop Loop" when done</li>
          <li>Press "Start Loop" to play back your sequence on repeat</li>
        </ul>
        <p>Use the controls at the top to adjust camera speed, visual mode, and sound selection.</p>
        <p>Different instruments can be selected from the dropdown menu.</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          Tip: Move your mouse or press any key to show controls if they've disappeared.
        </p>
      </div>
    )}
  </div>
);
}
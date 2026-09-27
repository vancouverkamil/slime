// Customization: your slime look (colour, hat, trail) and the option lists.
var playerBodyColor  = '#00ff00';
var playerHat        = 'none';
var playerHatAnim    = 'none';
var playerHatDrawing = [];
var hatConfigs = {
  left:  { hat: 'none', color: '#00ff00', drawing: [], anim: 'none', trail: 'none' },
  right: { hat: 'none', color: '#ff0000', drawing: [], anim: 'none', trail: 'none' }
};
var previewAnimInterval = null;
var HAT_ANIM_OPTIONS = [
  { id: 'none',    label: 'None'    },
  { id: 'glow',   label: 'Glow'    },
  { id: 'chaser', label: 'Chaser'  },
  { id: 'rainbow',label: 'Rainbow' },
  { id: 'pulse',  label: 'Pulse'   },
  { id: 'sparkle',label: 'Sparkle' },
  { id: 'wave',   label: 'Wave'    },
];
var BODY_COLORS = ['#00ff00','#00ffcc','#0066ff','#aa00ff','#ff2200','#ff8800','#ff00aa','#eeeeee'];
var BODY_OVERLAYS = [
  { id:'none',    label:'Classic'  },
  { id:'shine',   label:'Shine'    },
  { id:'stripes', label:'Stripes'  },
  { id:'dots',    label:'Polka'    },
  { id:'stars',   label:'Stars'    },
  { id:'grid',    label:'Grid'     },
];
var playerBodyOverlay = (typeof localStorage !== 'undefined' && localStorage.getItem('slimeBodyOverlay')) || 'none';
var playerTrail       = (typeof localStorage !== 'undefined' && localStorage.getItem('slimeTrail'))       || 'none';
var TRAIL_OPTIONS = [
  { id: 'none',    label: 'None'    },
  { id: 'comet',   label: 'Comet'   },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'pulse',   label: 'Pulse'   },
  { id: 'neon',    label: 'Neon'    },
];
var HAT_OPTIONS = [
  { id:'none',       label:'None'         },
  { id:'crown',      label:'Crown'        },
  { id:'goldcrown',  label:'Gold Crown',   minLevel:70 },
  { id:'tophat',     label:'Top Hat'      },
  { id:'cowboy',     label:'Cowboy'       },
  { id:'halo',       label:'Halo'         },
  { id:'party',      label:'Party'        },
  { id:'custom',     label:'Custom'       },
  { id:'devil',      label:'Devil Horns',  shopPrice:400  },
  { id:'prismatic',  label:'Prismatic',    shopPrice:600  },
  { id:'dragonfire', label:'Dragon Fire',  shopPrice:800  },
  { id:'cosmic',     label:'Cosmic Crown', shopPrice:1200 },
  { id:'angelic',    label:'Triple Halo',  shopPrice:1500 },
  { id:'overlord',   label:'Overlord',     shopPrice:2500 },
];

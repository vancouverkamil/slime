// Slimeverse: shared state. The world is the neo-zen pixel town copied from
// Money Radar (js/slimeverse/town/), explored by everyone's slimes.
// Positions are town pixels: x across, z = feet row down the map (the town's y),
// y = jump height above the ground.
var slimeverseActive    = false;
var slimeversePlayers   = {};   // id -> latest server snapshot
var slimeverseVisualPlayers = {};
var slimeverseSelfId    = null;
var slimeverseWorld     = { width: 1536, depth: 640 };
var slimeverseInputInterval = null;
var slimeverseFrame     = 0;
var slimeTown           = null; // the town (window.SlimeTown instance), built once on first visit

// Fixed-timestep accumulator: physics steps at exactly 16 ms regardless of
// monitor refresh rate. mvLastTime = 0 means "initialise on next frame".
var mvLastTime = 0;
var mvAccum    = 0;
var svRenderTime = 0;

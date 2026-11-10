export const HOTEL = Object.freeze({
  floors: 4,
  visibleFloorOffset: 47,
  cityAltitude: -118,
  floorHeight: 3.4,
  halfWidth: 12,
  halfLength: 15,
  corridorHalfWidth: 1.7,
  roomCenters: [-10.5, -3.5, 3.5, 10.5],
  doorWidth: 1.5,
});
export const PLAYER = Object.freeze({
  radius: 0.33,
  eyeHeight: 1.64,
  walkingSpeed: 4.3,
  sprintSpeed: 7.1,
  crouchSpeed: 2.05,
  gravity: 17.0,
  jumpSpeed: 6.3,
  maxStep: 0.0167,
});
/** Indoor design stays neutral and warm; outdoor city retains its own neon palette. */
export const COLORS = Object.freeze({
  asphalt: 0x292d31, sidewalk: 0xc5c2bd, slab: 0xd9d5cb,
  ceiling: 0xf2f0ea, outerWall: 0xb5b4b0, innerWall: 0xe8e6df, darkWall: 0xaaa59c,
  trim: 0x746f66, cyan: 0xc0a88a, magenta: 0x867b75,
  warm: 0xffe4b6, carpet: 0x928e86, wood: 0xc29c76,
  fabric: 0x9c9992, black: 0x434341, glass: 0x9eb1b8,
  ceramic: 0xe9e6df,
});

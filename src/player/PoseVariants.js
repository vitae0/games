/** Declarative grounded subposes. Their index is local to their parent
 * posture: no extra global keyboard shortcuts or independent stance modes.
 */
export const FLOOR_VARIANTS = Object.freeze({
  floorSit: Object.freeze([
    Object.freeze({id:'legsForward',label:'Bacaklar önde'}),
    Object.freeze({id:'crossLegged',label:'Bağdaş kur'}),
    Object.freeze({id:'butterfly',label:'Kelebek oturuşu'}),
    Object.freeze({id:'sideLeft',label:'Sola yana otur'}),
    Object.freeze({id:'sideRight',label:'Sağa yana otur'}),
    Object.freeze({id:'oneKnee',label:'Tek diz yukarıda'}),
    Object.freeze({id:'hugKnees',label:'Dizlere sarıl'}),
  ]),
  kneel: Object.freeze([
    Object.freeze({id:'bothKnees',label:'İki diz üzerinde'}),
    Object.freeze({id:'seiza',label:'Topuklara otur'}),
    Object.freeze({id:'forwardKneel',label:'Öne eğil'}),
    Object.freeze({id:'reachKneel',label:'Kolları uzat'}),
  ]),
  floorLie: Object.freeze([
    Object.freeze({id:'straight',label:'Düz uzan'}),
    Object.freeze({id:'fetal',label:'Dizleri topla'}),
    Object.freeze({id:'raisedKnee',label:'Bir diz yukarı'}),
    Object.freeze({id:'stretch',label:'Esneme'}),
  ]),
});

export function cycleFloorVariant(posture, currentIndex = 0, delta = 1) {
  const variants = FLOOR_VARIANTS[posture];
  if (!variants) return 0;
  return ((currentIndex + delta) % variants.length + variants.length) % variants.length;
}

export function floorVariant(posture, index = 0) {
  const variants = FLOOR_VARIANTS[posture];
  if (!variants) return null;
  return variants[cycleFloorVariant(posture,index,0)];
}

/** Rotations accumulate for smooth animations; labels use modulo four. */
export function lyingDirection(quarterTurns = 0) {
  return ['Sırtüstü','Sol yan','Yüzüstü','Sağ yan'][
    ((quarterTurns % 4) + 4) % 4
  ];
}

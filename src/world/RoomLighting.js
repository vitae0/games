import * as THREE from 'three';

/** Lightweight room lighting: one real local point light, many emissive fixtures. */
export class RoomLighting {
  constructor(scene) {
    this.scene=scene;
    this.entries=[];
    this.geometry=new THREE.BoxGeometry(1.18,.055,.28);
    this.point=new THREE.PointLight(0xffe6c5,0,5.5,2);
    this.scene.add(this.point);
    this.active=null;
  }
  register(floor,x,y,z,name='Oda') {
    const material=new THREE.MeshBasicMaterial({color:0xffdfb6,toneMapped:false});
    const mesh=new THREE.Mesh(this.geometry,material);
    mesh.position.set(x,y,z);
    mesh.name='room-light-fixture';
    this.scene.add(mesh);
    const room={floor,x,y,z,name,on:true,mesh,material};
    this.entries.push(room);
    return {
      getLabel:()=>`${name} · Işığı ${room.on?'kapat':'aç'}`,
      toggle:()=>{
        room.on=!room.on;
        room.material.color.setHex(room.on?0xffdfb6:0x32353d);
        this.point.intensity=this.active===room&&room.on?2.5:0;
        return room.on;
      },
      room,
    };
  }
  update(player) {
    if(!player){this.point.intensity=0;return;}
    let best=32,active=null;
    for (const room of this.entries){
      if(!room.on || room.floor!==player.floor)continue;
      const d=(room.x-player.position.x)**2+(room.z-player.position.z)**2;
      if(d<best){best=d;active=room;}
    }
    this.active=active;
    this.point.intensity=active?2.5:0;
    if(active)this.point.position.set(active.x,active.y-.65,active.z);
  }
  dispose(){
    this.scene.remove(this.point);this.point.dispose();
    for(const r of this.entries){this.scene.remove(r.mesh);r.material.dispose();}
    this.geometry.dispose();this.entries.length=0;
  }
}

import * as THREE from 'three';

/** 3D -> screen-space UI: action cards stay attached to the actual objects.
 * Only nearby actions are projected; no hundreds of DOM nodes or 3D text meshes.
 */
export function collectWorldActions(interactables,player,camera,limit=7){
  const result=[];
  if(!player||!camera)return result;
  for(const action of interactables){
    if(action.floor!==player.floor || !action.position)continue;
    const dx=action.position.x-player.position.x;
    const dz=action.position.z-player.position.z;
    const dist=Math.hypot(dx,dz);
    if(dist>2.35 || dist<.01)continue;
    const pos=action.labelPosition??action.position;
    const world=new THREE.Vector3(pos.x,pos.y+.30,pos.z);
    const local=camera.worldToLocal(world.clone());
    if(local.z>=-.06)continue;
    const projected=world.project(camera);
    if(!Number.isFinite(projected.x)||!Number.isFinite(projected.y)||
       projected.z<-1||projected.z>1)continue;
    if(Math.abs(projected.x)>1.06||Math.abs(projected.y)>1.04)continue;
    result.push({action,distance:dist,x:(projected.x+1)/2,y:(1-projected.y)/2});
  }
  return result.sort((a,b)=>a.distance-b.distance).slice(0,limit);
}

export class WorldActionLabels {
  constructor({hotel,player,camera,touch=false,root=document.querySelector('#app')??document.body}){
    this.hotel=hotel;this.player=player;this.camera=camera;this.touch=touch;
    this.root=document.createElement('div');
    this.root.className='world-action-layer';
    this.root.setAttribute('aria-label','Nesnelerin üzerindeki etkileşim düğmeleri');
    root.appendChild(this.root);
    this.buttons=Array.from({length:7},()=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='world-action-button hidden';
      button.addEventListener('pointerdown',event=>{event.stopPropagation();});
      button.addEventListener('pointerup',event=>event.stopPropagation());
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const action=button.action;
        if(action && this.player.active && !this.player.events.isModalOpen())
          action.activate(this.player);
      });
      this.root.appendChild(button);
      return button;
    });
  }
  update(){
    const player=this.player;
    if(!player.active||player.events.isModalOpen()){
      for(const btn of this.buttons)btn.classList.add('hidden');
      return;
    }
    this.camera.updateMatrixWorld();
    const actions=collectWorldActions(this.hotel.interactables,player,this.camera,7);
    const seen=[];
    for(let i=0;i<this.buttons.length;i++){
      const btn=this.buttons[i],item=actions[i];
      if(!item){btn.classList.add('hidden');btn.action=null;continue;}
      // Avoid label pile-up when several switches share a cabinet.
      let y=item.y;
      for(const s of seen)if(Math.abs(s.x-item.x)<.145&&Math.abs(s.y-y)<.063)
        y=Math.min(.94,s.y+.065);
      seen.push({x:item.x,y});
      btn.action=item.action;
      btn.textContent=(this.touch?'DOKUN':'E')+' · '+item.action.getLabel();
      btn.style.left=`${(item.x*100).toFixed(2)}%`;
      btn.style.top=`${(y*100).toFixed(2)}%`;
      btn.classList.remove('hidden');
    }
  }
  dispose(){this.root.remove();this.buttons.length=0;}
}

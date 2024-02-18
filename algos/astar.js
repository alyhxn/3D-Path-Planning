import * as THREE from 'three';

class Astar{
  constructor(scene, sizes, start, end, obstacles, simulation = true){
      console.log('astar')
      this.scene = scene;
      this.open_set = new Map();
      this.nodes = [start];
      this.ground_truth = new Map();
      this.parents = new Map();
      this.parents.set(start, null);
      this.check = true;
      this.current = start;
      this.start = start;
      this.end = end;
      this.obstacles = obstacles;
      this.simulation = simulation;
      this.ground_truth.set(start, 0);
      const box_geom = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const current_mat = new THREE.MeshMatcapMaterial({
          color: 'white'
        })
        
      this.instanceMesh = new THREE.InstancedMesh(box_geom, current_mat, 50*20*50);
      this.instanceMesh.count = 0;
      this.instanceMesh.setColorAt(0, new THREE.Color(0x000000));
      scene.add(this.instanceMesh);
  }
  run(){
    while(!this.planning()){
    }
    return this.find_path();
  }
  planning(){
    // console.log(this.current);
    let current = {...this.current}
    let temp;
    const direction = [0.25, 0.25, 0.25, -0.25, -0.25, -0.25];
    for(let i=0; i<6; i++){
        temp = {...current};
        temp[i%3] += direction[i];

        if(0 <= temp[0] && temp[0] < 50 && 0 <= temp[1] && temp[1] < 20 && 0 <= temp[2] && temp[2] < 50){
          if(!(this.checkOpenSet(temp)) && !(this.checkCloseSet(temp)) && !(this.checkCollision(temp))){
              this.ground_truth.set(temp, this.getFromMap(this.ground_truth, current) + 1);
              this.open_set.set(temp,this.heuristic(temp, this.end) * 8 + this.ground_truth.get(temp));
              // console.log(heuristic(temp, end) + 1)
              this.parents.set(temp, current);
          }
        }
    }
    // console.log(...this.open_set.keys())
    // console.log(this.open_set.values())
    // console.log(this.open_set.size);
    if (this.open_set.size == 0){
        return true;
    }
    const min = Math.min(...this.open_set.values());
    const key = [...this.open_set].find(([k, val]) => val === min)[0];
    this.open_set.delete(key);
    this.nodes.push(key);
    current = key;
    if(current[0] == this.end[0] && current[1] == this.end[1] && current[2] == this.end[2]){
        return true;
    }
    this.current = current;
    if(this.simulation){
      this.draw();
    }
    return false;
  }

  checkOpenSet(item){
      const keys = this.open_set.keys();
      let value;
      for(let i=0; i<this.open_set.size; i++){
        value = keys.next().value
        if (item[0] == value[0] && item[1] == value[1] && item[2] == value[2]){
          return true
        }
      }
      return false
    }
  checkCloseSet(item){
      for (let i=0; i<this.nodes.length; i++){
        if (this.nodes[i][0] == item[0] && this.nodes[i][1] == item[1] && this.nodes[i][2] == item[2]){
          return true
        }
      }
      return false
  }
  checkCollision(item){
    for (let i=0; i<this.obstacles.length; i++){
        if (this.obstacles[i][0] == Math.floor(item[0]) && this.obstacles[i][1] == Math.floor(item[1]) && this.obstacles[i][2] == Math.floor(item[2])){
          return true
        }
      }
      return false
  }
  getFromMap(map, node){
    const keys = map.keys();
    let key;
    for(let i=0; i<map.size; i++){
        key = keys.next().value;
        if (node[0] == key[0] && node[1] == key[1] && node[2] == key[2]){
            return map.get(key);
        }
    }
  }
  heuristic(start, end){
      return Math.sqrt((start[0] - end[0])**2 + (start[1] - end[1])**2 + (start[2] - end[2])**2);
  }
  find_path(){
    let current = this.end;
    let count = 0
    current = this.getFromMap(this.parents, current);
    while(current){
      count++;
      this.addMesh(current, 0xf00ff0);
      current = this.getFromMap(this.parents, current);
    }
    return count/4;
  }
  arrayIsEqual(temp1, temp2){
    const length = Object.keys(temp1).length;
    if(length == temp2.length){
      for(let i=0; i<length; i++){
        if(temp1[i] != temp2[i])
          return false
      }
      return true
    }
    return false
  }
  addMesh(position, color){
    const temp = new THREE.Object3D();
    temp.position.set(position[0] + 0.125,position[1] + 0.125,position[2] + 0.125);
    temp.updateMatrix();
    this.instanceMesh.setMatrixAt(this.instanceMesh.count, temp.matrix);
    this.instanceMesh.setColorAt(this.instanceMesh.count, new THREE.Color(color))
    this.instanceMesh.count++;
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    this.instanceMesh.instanceColor.needsUpdate = true;
  }
  draw(){
    this.addMesh(this.current, 0x0000ff);
  }
  dispose(){
    this.instanceMesh.geometry.dispose();
    this.instanceMesh.material.dispose();
    this.scene.remove(this.instanceMesh);
  }
}

export default Astar;
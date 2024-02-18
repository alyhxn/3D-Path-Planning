import * as THREE from 'three';

export default class RRRT{
    constructor(scene, sizes, start, end, obstacles_mesh, obstacles, simulation){
        this.scene = scene;
        this.sizes = sizes;
        this.start = start;
        this.end = end;
        this.obstacles_mesh = obstacles_mesh;
        this.obstacles = obstacles;
        this.simulation = simulation;
        this.nodes = [this.start];
        this.parents = new Map();
        this.open_set = new Map();
        this.g_cost = new Map();
        this.g_cost.set(start, 0)
        const vec = new THREE.Vector3(0, 0, 0)
        this.open_set.set(this.start, [0, vec, vec, false])
        this.step_size = 1;

        let geometry = new THREE.SphereGeometry(0.1);
        let material = new THREE.MeshMatcapMaterial({color: 'white'});
        this.mesh_node = new THREE.InstancedMesh(geometry, material, 50 * 50 * 20);
        this.mesh_node.count = 0;
        this.mesh_node.setColorAt(0, new THREE.Color(0x000000));
        this.scene.add(this.mesh_node);

        geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(50 * 50 * 20 * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);
        material = new THREE.MeshMatcapMaterial();
        this.mesh_line = new THREE.LineSegments(geometry, material);
        this.scene.add(this.mesh_line);

        this.raycaster = new THREE.Raycaster();
    }
    run(){
        while(!this.planning()){
        }
        this.simulation = true;
        this.find_path();
    }
    planning(){
        if (this.open_set.size == 0){
            alert("Path not found!")
            return true;
        }
        // console.log(this.open_set);
        const values = [...this.open_set.values()];
        const min = Math.min(...values.map((value, index) => { return value[0];}));
        // console.log(min)
        const current = [...this.open_set].find(([k, val]) => val[0] === min)[0];
        // console.log('Before ',...this.open_set)
        // console.log('Planning current: ', current);
        if(this.isEqual(current, this.start))
            this.open_set.delete(current);
        else
            this.wallFollow(current);
        
        // this.del(current, this.open_set);
        return this.targetFollow(current);
    }
    isEqual(temp1, temp2){
        for(let i = 0; i<temp1.length; i++)
            if(temp1[i] != temp2[i])
                return false;
        return true;
    }
    targetFollow(current){
        const intersection = this.raycast(current, this.end);
        if(!intersection){
            this.drawNode(this.end, current, 0x0000ff);
            this.addNode(this.end, current);
            // console.log('ok')
            return true;
        }
        // console.log(intersection);
        const point = intersection.point;
        const normal = intersection.face.normal;
        let index, value;
        Object.values(normal).map((v, i) => {
            if(v){
               index = i;
               value = v;
            }
        });
        const new_node = [this.round(point.x + normal.x * 0.1, 1),
            this.round(point.y + normal.y * 0.1, 1),
            this.round(point.z + normal.z * 0.1, 1)];
        for(let i=0; i<3; i++){
            if(i==index)
                continue
            new_node[i] -= 1;
            new_node[i] = Math.ceil(new_node[i]) + 0.9;
        }
        
        if(this.checkExistence(new_node, current, true)){
            // console.log('ok: ', new_node);
            return false;
        }
        this.drawNode(new_node, current, 0x0000ff);
        this.parents.set(new_node, current);
        const cost = this.getCost(new_node, current);
        let direction = this.rotate(normal, Math.PI/2);
        const dir_obs = this.rotate(normal, Math.PI);
        let dir_next = new THREE.Vector3();
        dir_next.crossVectors(direction, dir_obs);

        this.open_set.set(new_node, [cost, direction, dir_obs, dir_next]);
        // console.log('Middle ',...this.open_set)
        this.wallFollow(new_node);

        direction = this.rotate(direction, Math.PI);
        dir_next = this.rotate(dir_next, Math.PI);
        this.open_set.set(new_node, [cost, direction, dir_obs, dir_next]);
        this.wallFollow(new_node);

        [direction, dir_next] = [dir_next, direction];
        dir_next = this.rotate(dir_next, Math.PI);
        this.open_set.set(new_node, [cost, direction, dir_obs, dir_next]);
        this.wallFollow(new_node);

        direction = this.rotate(direction, Math.PI);
        dir_next = this.rotate(dir_next, Math.PI);
        this.open_set.set(new_node, [cost, direction, dir_obs, dir_next]);
        this.wallFollow(new_node);

        this.addNode(new_node, current);
        return false;
    }
    raycast(pos1, pos2){
        const v1 = new THREE.Vector3(pos1[0], pos1[1], pos1[2]);
        const v2 = new THREE.Vector3(pos2[0], pos2[1], pos2[2]);
        const dir = new THREE.Vector3();
        dir.subVectors(v2, v1).normalize();
        this.raycaster.set(v1, dir);
        const far = new THREE.Vector3();
        this.raycaster.far = far.subVectors(v1, v2).length();
        const inter = this.raycaster.intersectObject(this.obstacles_mesh)
        if(inter.length == 0){
            return false
        }
        // const point = inter[0].point;
        // this.drawCircle([point.x, point.y, point.z], 0xff0000);
        return inter[0];
    }
    round(value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }
    wallFollow(parent){
        let [_, direction, dir_obs, dir_next] = this.open_set.get(parent);
        this.open_set.delete(parent);
        // console.log('After ',...this.open_set)

        let current = [...parent];
        let index, value, index_obs, value_obs;
        Object.values(direction).map((v, i) => {
            if(v){
               index = i;
               value = v;
            }
        });
        Object.values(dir_obs).map((v, i) => {
            if(v){
               index_obs = i;
               value_obs = v;
            }
        });
        // console.log('Current '+current);
        // console.log('Direction ',direction);
        if(value<0)
            current[index] = Math.floor(current[index])
        else
            current[index] = Math.ceil(current[index])
        current[index] += value * 0.1

        let current_obs;

        let check = false;
        let check2 = false;
        let temp;
        while(true){
            current_obs = [current[0] + dir_obs.x * 0.2, current[1] + dir_obs.y * 0.2, current[2] + dir_obs.z * 0.2];
            // console.log(current_obs);
            // this.drawCircle(current_obs, 0x00ff00);
            if(this.checkCollision(current)){
                check = true;
                current[index] -= value * 0.2;
                if(!dir_next){
                    dir_next = this.rotate(dir_obs, Math.PI);
                    dir_obs = direction;
                }
                else{
                    this.open_set.set(current, [this.getCost(current, parent), this.rotate(dir_obs, Math.PI), direction, false]);
                    this.wallFollow(current);
                }
                // console.log(1)
            }
            else if(!this.checkCollision(current_obs)){
                check = true;
                if(dir_next){
                    check2 = true;
                    temp = [...current];
                    this.drawNode(temp, parent, 0x0000ff)
                    this.open_set.set(temp, [this.getCost(temp, parent), dir_obs, this.rotate(direction, Math.PI), false]);
                    current[index] -= value * 0.2;
                }
                else{
                    dir_next = dir_obs;
                    dir_obs = this.rotate(direction, Math.PI);
                }
                // console.log(2)
            }
            if(check){
                current[index] = this.round(current[index], 1);
                if(check2)
                    this.addNode(temp, parent);
                if(this.checkExistence(current, parent, false)){
                    // console.log('Failed: '+current);
                    return;
                }
                this.drawNode(current, parent, 0x0000ff);
                
                this.addNode(current, parent);
                // console.log('Child '+current);
                // console.log('.');
                const cost = this.getCost(current, parent);
                this.open_set.set(current, [cost, dir_next, dir_obs, false]);
                return;
            }
            current[index] += value * this.step_size;
            // current = [current[0] + direction.x * this.step_size, current[1] + direction.y * this.step_size, current[2] + direction.z * this.step_size];

        }   
    }
    checkCollision(item){
        if(0 > item[0] || item[0] >= 50 || 0 > item[1] || item[1] >= 20 || 0 > item[2] || item[2] >= 50)
            return true
            for (let i=0; i<this.obstacles.length; i++){
                if (this.obstacles[i][0] == Math.floor(item[0]) && this.obstacles[i][1] == Math.floor(item[1]) && this.obstacles[i][2] == Math.floor(item[2])){
                return true
                }
            }
        
        return false
    }
    checkExistence(temp, parent, check){
        //strict
        if(check){
            if(this.getDistance(parent, temp) < 1)
                return true;
            for(const node of this.nodes)
                if(this.getDistance(node, temp) < 0.2)
                    return true;
        }//loose
        else
            for(const node of this.nodes)
                if(this.getDistance(node, temp) < 0.2){
                    if(node[0] == parent[0] && node[1] == parent[1] && node[2] == parent[2])
                        continue
                    return true;
                }

        return false;
    }
    getCost(child, parent){
        this.g_cost.set(child, this.getMapValue(parent, this.g_cost) + 1);
        // this.g_cost.set(child, this.getMapValue(parent, this.g_cost) + this.getDistance(child, parent));
        return this.getDistance(child, this.end) + this.g_cost.get(child);
    }
    getDistance(from, to){
        return Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]);
    }
    getMapValue(node, map){
        const keys = map.keys();
        let key;
        for(let i=0; i<map.size; i++){
            key = keys.next().value;
            if (node[0] == key[0] && node[1] == key[1] && node[2] == key[2]){
                return map.get(key);
            }
        }
    }
    del(node, map){
        const keys = map.keys();
        let key;
        for(let i=0; i<map.size; i++){
            key = keys.next().value;
            if (node[0] == key[0] && node[1] == key[1] && node[2] == key[2]){
                map.delete(key);
                return true;
            }
        }
        return false;
    }
    addNode(child, parent){
        this.nodes.push(child)
        this.parents.set(child, parent);
    }
    getDirection(pos1, pos2){
        const diff = [pos1[0] - pos2[0], pos1[1] - pos2[1], pos1[2] - pos2[2]];
        const length = Math.sqrt(diff[0] ** 2 + diff[1] ** 2 + diff[2] ** 2);
        const normal = [diff[0]/length, diff[1]/length, diff[2]/length];
        return normal;
    }
    rotate(vector, radians){
        let temp = {...vector};
        if(vector.y!=0){
            temp.x = Math.round(Math.cos(radians) * vector.x - Math.sin(radians) * vector.y);
            temp.y = Math.round(Math.sin(radians) * vector.x + Math.cos(radians) * vector.y);
        }
        else{
            temp.x = Math.round(Math.cos(radians) * vector.x - Math.sin(radians) * vector.z);
            temp.z = Math.round(Math.sin(radians) * vector.x + Math.cos(radians) * vector.z);
        }
        return temp;
    }
    find_path(){
        let current = this.end;
        let parent = current;
        while(current){
            this.drawNode(current, parent, 0xffff00);
            parent = current
            current = this.getMapValue(current, this.parents);
            // console.log(current)
        }
    }
    drawNode(position, parent, color){
        if(this.simulation){
            const temp = new THREE.Object3D();
            temp.position.set(position[0], position[1], position[2]);
            temp.updateMatrix();
            this.mesh_node.setMatrixAt(this.mesh_node.count, temp.matrix);
            this.mesh_node.setColorAt(this.mesh_node.count, new THREE.Color(color));
            this.mesh_node.count++;
            this.mesh_node.instanceColor.needsUpdate = true;
            this.mesh_node.instanceMatrix.needsUpdate = true;
            
            const count = this.mesh_line.geometry.drawRange.count;
            this.mesh_line.geometry.getAttribute('position').setXYZ(count, parent[0], parent[1], parent[2]);
            this.mesh_line.geometry.getAttribute('position').setXYZ(count+1, position[0], position[1], position[2]);
            this.mesh_line.geometry.setDrawRange(0, count + 2);
            this.mesh_line.geometry.attributes.position.needsUpdate = true;
        }
    }
    drawCircle(position, color){
        const temp = new THREE.Object3D();
        temp.position.set(position[0], position[1], position[2]);
        temp.updateMatrix();
        this.mesh_node.setMatrixAt(this.mesh_node.count, temp.matrix);
        this.mesh_node.setColorAt(this.mesh_node.count, new THREE.Color(color));
        this.mesh_node.count++;
        this.mesh_node.instanceColor.needsUpdate = true;
        this.mesh_node.instanceMatrix.needsUpdate = true;
    }
    dispose(){
        this.mesh_node.geometry.dispose();
        this.mesh_node.material.dispose();
        this.scene.remove(this.mesh_node);
        this.scene.remove(this.mesh_line);
    }
}
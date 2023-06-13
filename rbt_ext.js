import * as THREE from 'three';

export default class RBT_Ext{
    constructor(scene, sizes, start, end, obstacles_mesh, obstacles, simulation){
        console.log('RBT')
        this.scene = scene;
        this.sizes = sizes;
        this.start = start;
        this.end = end;
        this.obstacles_mesh = obstacles_mesh;
        this.obstacles = obstacles;
        this.simulation = simulation;
        this.nodes = [this.start];
        this.parents = new Map();
        this.open_set = new Map()
        const vec = new THREE.Vector3(0, 0, 0)
        this.open_set.set(this.start, [0, vec, vec, false])
        this.g_cost = new Map();
        this.g_cost.set(start, 0)
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
        this.parent_optimize();
        // this.find_path(0xff00ff);
        // this.raycast_optimize();
        this.node_optimize();
        this.raycast_optimize();

        return this.find_path(0xffff00);

    }
    planning(){
        if (this.open_set.size == 0){
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
        for(let i = 0; i<temp1.length; i++){
            if(temp1[i] != temp2[i])
                return false;
        }
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
        const new_node = [this.round(point.x + normal.x * 0.1, 1),
            this.round(point.y + normal.y * 0.1, 1),
            this.round(point.z + normal.z * 0.1, 1)];
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
        this.addNode(new_node, current);

        [direction, dir_next] = [dir_next, direction];
        dir_next = this.rotate(dir_next, Math.PI);
        this.open_set.set(new_node, [cost, direction, dir_obs, dir_next]);
        this.wallFollow(new_node);

        direction = this.rotate(direction, Math.PI);
        dir_next = this.rotate(dir_next, Math.PI);
        this.open_set.set(new_node, [cost, direction, dir_obs, dir_next]);
        this.wallFollow(new_node);
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
        let prev = current;
        while(true){
            current_obs = [current[0] + dir_obs.x * 0.2, current[1] + dir_obs.y * 0.2, current[2] + dir_obs.z * 0.2];
            // console.log(current_obs);
            // this.drawCircle(current_obs, 0x00ff00);
            if(this.checkCollision(current)){
                check = true;
                if(!dir_next){
                    dir_next = this.rotate(dir_obs, Math.PI);
                    dir_obs = direction;
                }
                current[index] -= value * 0.2;
                // console.log(1)
            }
            else if(!this.checkCollision(current_obs)){
                check = true;
                if(dir_next)
                    current[index] -= value * 0.2;
                else{
                    dir_next = dir_obs;
                    dir_obs = this.rotate(direction, Math.PI);
                }
                // console.log(2)
            }
            if(check){
                current[index] = this.round(current[index], 1);
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
            prev = [...current];
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
                if(this.getDistance(node, temp) < 1)
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
            this.g_cost.set(child, this.getMapValue(parent, this.g_cost) + this.getDistance(child, parent));
            return this.getDistance(child, this.end) * 2 + this.g_cost.get(child);
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
    find_path(color){
        let current = this.end;
        let parent = current;
        let distance = 0;
        while(current){
            distance += this.getDistance(current, parent)
            this.drawNode(current, parent, color);
            parent = current
            current = this.getMapValue(current, this.parents);
            // console.log(current)
        }
        return distance;
    }
    parent_optimize(){
        let current = this.end;
        let temp, prev, count = 0;
        while(true){
            temp = this.parents.get(current);
            // console.log(temp, current);
            if(!temp)
                break
            prev = temp
            count = 0
            while(temp && !this.raycast(current, temp) && count < 5){
                // console.log(temp);
                prev = temp
                temp = this.parents.get(temp);
                count++;
            }
            if(count==5 && temp)
                prev = temp
            this.parents.set(current, prev);
            current = this.parents.get(current);
        }
    }
    node_optimize(){
        let first, second, third, current, prev;
        let dir = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
        first = this.end;
        second = this.parents.get(first);
        third = this.parents.get(second);
        while(third){
            // console.log(1)
            v1.set(second[0], second[1], second[2]);
            v2.set(third[0], third[1], third[2]);
            dir.subVectors(v2, v1).normalize();
            current = [second[0] + dir.x, second[1] + dir.y , second[2] + dir.z ];
            prev = second;
            // console.log('Distance: ',this.getDistance(current, third))
            while(this.getDistance(current, third) > 2){
                // console.log('current: ', current)
                // this.drawCircle(current, 0x00ffff)
                if(this.raycast(first, current))
                    break
                prev = current
                current = [current[0] + dir.x, current[1] + dir.y , current[2] + dir.z ];
                // console.log('Direction: ', dir);
                // console.log('Distance: ',this.getDistance(current, third))
            }
            this.parents.set(first, prev);
            this.parents.set(prev, third);
            first = this.parents.get(first);
            second = this.parents.get(first);
            third = this.parents.get(second);
        }
    }
    raycast_optimize(){
        let first, second, third, inter, point, normal, index, value, temp, small, new_node, distance;
        first = this.end;
        second = this.parents.get(first);
        third = this.parents.get(second);
        while(third){
            small = Infinity
            // console.log(1)
            inter = this.raycast(first, this.start);
            if(!inter)
                break
            point = inter.point;
            point = [point.x, point.y, point.z]
            normal = inter.face.normal;
            // console.log('Normal: ', normal);
            Object.values(normal).map((v, i) => {
                if(v){
                   index = i;
                   value = v;
                }
            });
            // console.log('Inter: ', point)
            // console.log('Second: ',second)

            for(let i=0; i<3; i++){
                temp = [...second];
                if(i==index)
                    continue
                temp[i] = point[i];
                // this.drawCircle(temp, 0x00ffff)
                // console.log('Temp: ',temp)
                // console.log(this.raycast(third, temp))
                if(!this.raycast(third, temp) && !this.raycast(first, temp)){
                    distance = this.getDistance(temp, this.end) + this.getDistance(temp, this.start);
                    if(distance < small){
                        // console.log('Distance: ', distance);
                        new_node = temp
                        small = distance
                    }
                }
            }
            distance = this.getDistance(second, this.end) + this.getDistance(second, this.start);
            if(!new_node || distance < small){
                new_node = second;
            }
            // console.log('New node: ', new_node)
            // console.log('.');
            this.parents.set(first, new_node);
            this.parents.set(new_node, third);
            first = this.parents.get(first);
            second = this.parents.get(first);
            third = this.parents.get(second);
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
        this.mesh_line.geometry.dispose();
        this.mesh_line.material.dispose();
        this.scene.remove(this.mesh_node);
        this.scene.remove(this.mesh_line);
    }
    
}
export const LOOP_TYPE = Object.freeze({ CLAMP: 1, LOOP: 2 });
export const PLAY_STATE = Object.freeze({ PLAY: 1, STOP: 2, PAUSE: 3 });

class AnimationPlayer {
  constructor (animation_set, entity, fps) {
    this.update_hooks = [];
    this.loop_type = LOOP_TYPE.CLAMP;
    this.play_state = PLAY_STATE.STOP;
    this.animation_set = animation_set;
    this.entity = entity;
    if(this.animation_set.animations.length > 0) {
      this.current_animation = this.animation_set.animations[0];
    }
    else {
      this.current_animation = '';
    }

    // set initial node positions for Cesium entity
    const cesium_nodes = {};

    for(var node_name in this.animation_set.nodes) {
      if(typeof this.entity.model.nodeTransformations !== 'undefined' &&
         typeof this.entity.model.nodeTransformations[node_name] !== 'undefined') {
        cesium_nodes[node_name] = this.entity.model.nodeTransformations[node_name];
      }
      else {
        cesium_nodes[node_name] = {
          translation: new Cesium.Cartesian3(0, 0, 0),
          rotation: new Cesium.Cartesian4(0, 0, 0, 1),
          scale: new Cesium.Cartesian3(1, 1, 1)
        };
      }
    }

    this.entity.model.nodeTransformations = cesium_nodes;
    this.interval_id = -1;
    this.current_time = 0;
    this.speed = 1;
    this._frame_duration = 1.0 / fps;
  }

  setAnimation (animation_name) {
    for(var i = 0; i < this.animation_set.animations.length; i++) {
      if(animation_name === this.animation_set.animations[i].name) {
        this.current_animation = this.animation_set.animations[i];

        return;
      }
    }
    console.error('Can\'t set current animation: ' + animation_name + ' does not exist');
  }

  setFPS (fps) {
    this._frame_duration = 1.0 / fps;

    if (this.play_state === PLAY_STATE.PLAY) {
      clearInterval(this.interval_id);
      this.interval_id = -1;
      this.interval_id = window.setInterval(() => this._update(), this._frame_duration * 1000);
    }
  }

  play (animation_name) {
    if(typeof animation_name === 'undefined') {
      if(this.play_state === PLAY_STATE.PLAY) {
        return;
      }
      else if(this.play_state === PLAY_STATE.PAUSE) {
        this.play_state = PLAY_STATE.PLAY;
      }
      else if(this.play_state === PLAY_STATE.STOP) {
        this.play_state = PLAY_STATE.PLAY;
      }

      this.interval_id = window.setInterval(() => this._update(), this._frame_duration * 1000);

      return;
    }

    const animations = this.animation_set.animations;

    for(var i = 0; i < animations.length; i++) {
      if(animations[i].name === animation_name) {
        this.current_animation = animations[i];
        if(this.play_state === PLAY_STATE.PLAY) {
          return;
        }
        else if(this.play_state === PLAY_STATE.PAUSE) {
          this.play_state = PLAY_STATE.PLAY;
        }
        else if(this.play_state === PLAY_STATE.STOP) {
          this.play_state = PLAY_STATE.PLAY;
        }

        this.interval_id = window.setInterval(() => this._update(), this._frame_duration * 1000);

        return;
      }
    }
    console.error('Can\'t play animation: ' + animation_name + ' does not exist');
  }

  _update () {
    this.setTime(this.current_time + this._frame_duration * this.speed);

    if(this.play_state === PLAY_STATE.PLAY) {
      this.update_hooks.forEach(fn => fn());
    }
  }

  setPercent (percent) {
    if(percent < 0.0) {
      percent = 0.0;
    }
    else if(percent > 1.0) {
      percent = 1.0;
    }
    const time = this.current_animation.duration * percent;

    this.setTime(time);
    this.update_hooks.forEach(fn => fn());
  }

  setTime (current_time) {
    this.current_time = current_time;
    if(this.speed > 0) {
      if(this.current_time > this.current_animation.duration) {
        if(this.loop_type === LOOP_TYPE.CLAMP) {
          this.current_time = this.current_animation.duration;
        }
        else if(this.loop_type === LOOP_TYPE.LOOP) {
          this.current_time = 0;
        }
      }
    }
    else if(this.speed < 0) {
      if(this.current_time < 0) {
        if(this.loop_type === LOOP_TYPE.CLAMP) {
          this.current_time = 0;
        }
        else if(this.loop_type === LOOP_TYPE.LOOP) {
          this.current_time = this.current_animation.duration;
        }
      }
    }

    for(var track_name in this.current_animation.tracks) {
      const track = this.current_animation.tracks[track_name];

      const node = this.animation_set.nodes[track_name];

      const curr_trans_keys = this.getKeysAtTime(track.translation_keys, this.current_time);

      const curr_rot_keys = this.getKeysAtTime(track.rotation_keys, this.current_time);

      const curr_scale_keys = this.getKeysAtTime(track.scale_keys, this.current_time);

      //--------------------------
      // Translation
      //--------------------------
      if(typeof curr_trans_keys !== 'undefined' && curr_trans_keys.length > 0) {
        const orig_trans = node.translation;

        const invMat = node.inv_rotation_matrix;

        if(curr_trans_keys[0].time == curr_trans_keys[1].time) {
          const result = new Cesium.Cartesian3(curr_trans_keys[0].value[0] - orig_trans[0], curr_trans_keys[0].value[1] - orig_trans[1], curr_trans_keys[0].value[2] - orig_trans[2]);
          //get the result expressed in local node space

          Cesium.Matrix3.multiplyByVector(invMat, result, result);
          this.entity.model.nodeTransformations[track_name].translation = result;
        }
        else {
          const keyDelta = curr_trans_keys[1].time - curr_trans_keys[0].time;

          const timeDelta = this.current_time - curr_trans_keys[0].time;

          const t = timeDelta / keyDelta;

          const start = new Cesium.Cartesian3(curr_trans_keys[0].value[0], curr_trans_keys[0].value[1], curr_trans_keys[0].value[2]);

          const end = new Cesium.Cartesian3(curr_trans_keys[1].value[0], curr_trans_keys[1].value[1], curr_trans_keys[1].value[2]);

          //interpolate the translation keys
          const result = new Cesium.Cartesian3();

          Cesium.Cartesian3.lerp(start, end, t, result);

          //account for delta / relative offset from original translation
          result.x -= orig_trans[0];
          result.y -= orig_trans[1];
          result.z -= orig_trans[2];

          //get the result expressed in local node space
          Cesium.Matrix3.multiplyByVector(invMat, result, result);

          this.entity.model.nodeTransformations[track_name].translation = result;
        }
      }

      //--------------------------
      // Rotation
      //--------------------------
      if(typeof curr_rot_keys !== 'undefined' && curr_rot_keys.length > 0) {
        const orig_inv = node.inv_rotation;

        const invMat = node.inv_rotation_matrix;

        if(curr_rot_keys[0].time == curr_rot_keys[1].time) {
          const result = new Cesium.Quaternion(curr_rot_keys[0].value[0], curr_rot_keys[0].value[1], curr_rot_keys[0].value[2], curr_rot_keys[0].value[3]);

          //isolate the axis
          const resultAxis = new Cesium.Cartesian3(1, 0, 0);

          const resultAngle = Cesium.Quaternion.computeAngle(result);

          if(Math.abs(resultAngle) > Cesium.Math.EPSILON5) {
            Cesium.Quaternion.computeAxis(result, resultAxis);
          }

          //transform to local node space
          Cesium.Matrix3.multiplyByVector(invMat, resultAxis, resultAxis);

          //get the new quaternion expressed in local node space
          Cesium.Quaternion.fromAxisAngle(resultAxis, resultAngle, result);
          //calc the rotation delta/difference
          Cesium.Quaternion.multiply(result, orig_inv, result);
          this.entity.model.nodeTransformations[track_name].rotation = result;
        }
        else {
          const keyDelta = curr_rot_keys[1].time - curr_rot_keys[0].time;

          const timeDelta = this.current_time - curr_rot_keys[0].time;

          const t = timeDelta / keyDelta;

          const start = new Cesium.Quaternion(curr_rot_keys[0].value[0], curr_rot_keys[0].value[1], curr_rot_keys[0].value[2], curr_rot_keys[0].value[3]);

          const end = new Cesium.Quaternion(curr_rot_keys[1].value[0], curr_rot_keys[1].value[1], curr_rot_keys[1].value[2], curr_rot_keys[1].value[3]);

          //slerp the rotation keys
          const result = new Cesium.Quaternion();

          Cesium.Quaternion.slerp(start, end, t, result);

          //isolate the axis
          const resultAxis = new Cesium.Cartesian3(1, 0, 0);

          const resultAngle = Cesium.Quaternion.computeAngle(result);

          if(Math.abs(resultAngle) > Cesium.Math.EPSILON5) {
            Cesium.Quaternion.computeAxis(result, resultAxis);
          }

          //transform to local node space
          Cesium.Matrix3.multiplyByVector(invMat, resultAxis, resultAxis);

          //get the new quaternion expressed in local node space
          Cesium.Quaternion.fromAxisAngle(resultAxis, resultAngle, result);

          //calc the rotation delta/difference
          Cesium.Quaternion.multiply(result, orig_inv, result);

          this.entity.model.nodeTransformations[track_name].rotation = result;
        }
      }

      //--------------------------
      // Scale
      //--------------------------
      if(typeof curr_scale_keys !== 'undefined' && curr_scale_keys.length > 0) {
        const orig_scale = this.animation_set.nodes[track_name].scale;

        if(curr_scale_keys[0].time == curr_scale_keys[1].time) {
          const result = new Cesium.Cartesian3(curr_scale_keys[0].value[0] / orig_scale[0], curr_scale_keys[0].value[1] / orig_scale[1], curr_scale_keys[0].value[2] / orig_scale[2]);

          this.entity.model.nodeTransformations[track_name].scale = result;
        }
        else {
          const keyDelta = curr_scale_keys[1].time - curr_scale_keys[0].time;

          const timeDelta = this.current_time - curr_scale_keys[0].time;

          const t = timeDelta / keyDelta;

          const start = new Cesium.Cartesian3(curr_scale_keys[0].value[0], curr_scale_keys[0].value[1], curr_scale_keys[0].value[2]);

          const end = new Cesium.Cartesian3(curr_scale_keys[1].value[0], curr_scale_keys[1].value[1], curr_scale_keys[1].value[2]);

          const result = new Cesium.Cartesian3();

          Cesium.Cartesian3.lerp(start, end, t, result);

          //account for delta / relative offset from original scale
          result.x /= orig_scale[0];
          result.y /= orig_scale[1];
          result.z /= orig_scale[2];
          this.entity.model.nodeTransformations[track_name].scale = result;
        }
      }
    }
  }

  getKeysAtTime (keys, time) {
    const result = [];

    if(keys.length == 0) {
      return result;
    }

    //we need to return some value even if the first key for this track isn't reached quite yet
    if(keys[0].time > time) {
      result.push(keys[0]);
      result.push(keys[0]);

      return result;
    }

    //just clamp the last key if we are at the end
    if(time > keys[keys.length - 1].time) {
      result.push(keys[keys.length - 1]);
      result.push(keys[keys.length - 1]);

      return result;
    }

    for(var i = 0; i < keys.length - 1; i++) {
      if(keys[i].time <= time && keys[i + 1].time >= time) {
        result.push(keys[i]);
        result.push(keys[i + 1]);

        return result;
      }
    }
  }

  stop () {
    this.play_state = PLAY_STATE.STOP;
    this.current_time = 0;
    //reset the node transforms on the entity to the default pose
    const cesium_nodes = {};

    for(var node_name in this.animation_set.nodes) {
      cesium_nodes[node_name] = {
        translation: new Cesium.Cartesian3(0, 0, 0),
        rotation: new Cesium.Cartesian4(0, 0, 0, 1),
        scale: new Cesium.Cartesian3(1, 1, 1)
      };
    }
    this.entity.model.nodeTransformations = cesium_nodes;

    //clear the update interval
    clearInterval(this.interval_id);
    this.interval_id = -1;
  }

  pause () {
    this.play_state = PLAY_STATE.PAUSE;
    clearInterval(this.interval_id);
    this.interval_id = -1;
  }

  addUpdateHook (fn) {
    this.update_hooks.push(fn);
  }

  clearUpdateHooks () {
    this.update_hooks.length = 0;
  }
}

export const createAnimationPlayer = (animation_set, entity, {
  frame_rate = 60,
  loop = LOOP_TYPE.LOOP,
  speed = 2
}) => {
  const player = new AnimationPlayer(animation_set, entity, frame_rate);

  player.loop_type = loop;
  player.speed = speed;

  return player;
};


export class AnimationKey {
  constructor (time, value) {
    this.time = time;
    this.value = value;
  }
}

export class AnimationTrack {
  constructor () {
    this.translation_keys = [];
    this.rotation_keys = [];
    this.scale_keys = [];
  }
}

export class Animation {
  constructor (name) {
    this.name = name;
    this.duration = 0;
    this.tracks = {}; // a dictionary whose keys are node names
  }
}

export class AnimationSet {
  constructor (animations, nodes) {
    this.animations = animations;
    this.nodes = nodes;
  }
}

function _parseAnimationNodesFromArrayBuffer (array_buffer) {
  // get the length of the JSON data starting at 12 byte offset according to gltf standard
  const dv = new DataView(array_buffer, 12, 4);
  // don't forget to set little-endian = true when parsing from data view (gltf standard!)

  const json_chunk_length = dv.getUint32(0, true);

  console.log('gltf JSON length: ' + json_chunk_length + ' bytes');

  // get the actual JSON data itself
  const json_data_chunk = array_buffer.slice(20, 20 + json_chunk_length);

  const decoder = new TextDecoder('UTF-8');

  const json_text = decoder.decode(json_data_chunk);

  const gltf_json = JSON.parse(json_text);

  console.log('gltf JSON loaded successfully:');

  // store links to parent nodes
  for(var i = 0; i < gltf_json.nodes.length; i++) {
    if(typeof gltf_json.nodes[i].children !== 'undefined') {
      for(var k = 0; k < gltf_json.nodes[i].children.length; k++) {
        gltf_json.nodes[gltf_json.nodes[i].children[k]].parent = gltf_json.nodes[i].name;
      }
    }
  }

  return gltf_json.nodes;
}

function parseAnimationsFromArrayBuffer (array_buffer) {
  const animations = [];

  // get the length of the JSON data starting at 12 byte offset according to gltf standard
  let dv = new DataView(array_buffer, 12, 4);
  // don't forget to set little-endian = true when parsing from data view (gltf tandard!)

  const json_chunk_length = dv.getUint32(0, true);

  console.log('gltf JSON length: ' + json_chunk_length + ' bytes');

  // get the actual JSON data itself
  const json_data_chunk = array_buffer.slice(20, 20 + json_chunk_length);

  const decoder = new TextDecoder('UTF-8');

  const json_text = decoder.decode(json_data_chunk);

  const gltf_json = JSON.parse(json_text);

  console.log('gltf JSON loaded successfully:');
  console.log(gltf_json);

  // get the length of the gltf embedded binary data
  const bin_offset = 20 + json_chunk_length;

  dv = new DataView(array_buffer, bin_offset, 4);
  const bin_chunk_length = dv.getUint32(0, true);

  console.log('gltf bin length: ' + bin_chunk_length + ' bytes');

  // get the actual binary data, we add 8 to get past the "type" and "chunk length" headers
  const bin_data_chunk = array_buffer.slice(bin_offset + 8, bin_offset + 8 + bin_chunk_length);

  //--------------------------------------------------
  // get and process all animations
  //--------------------------------------------------
  if(typeof gltf_json.animations === 'undefined') {
    return [];
  }
  for(var i = 0; i < gltf_json.animations.length; i++) {
    let anim_name = gltf_json.animations[i].name;

    if(typeof anim_name === 'undefined' || anim_name == '') {
      anim_name = 'animation_' + i;
    }
    const curr_animation = new Animation(anim_name);

    console.log('processing animation: ' + anim_name);

    for(var k = 0; k < gltf_json.animations[i].channels.length; k++) {
      const channel = gltf_json.animations[i].channels[k];

      // the following will be either "translation, rotation, or scale"
      const dof_type = channel.target.path;

      const node = gltf_json.nodes[channel.target.node];

      if(typeof node === 'undefined') {
        console.warn('node is undefined for channel ' + k);
        continue;
      }

      let node_name = node.name;

      if(typeof node_name === 'undefined' || node.name == '') {
        node_name = 'node_' + channel.target.node;
      }

      // add a new track to this animation for the node if it does not exist already
      if(typeof curr_animation.tracks[node_name] === 'undefined') {
        curr_animation.tracks[node_name] = new AnimationTrack();
      }

      const sampler = gltf_json.animations[i].samplers[channel.sampler];

      //--------------------------------------------------
      // get input accessor (keyframe times for this channel's sampler) and process the data for it
      //--------------------------------------------------
      const input = gltf_json.accessors[sampler.input];
      //console.log("min: " + input.min + " max: " + input.max);

      const input_accessor_byte_offset =  (typeof input.byteOffset === 'undefined' ? 0 : input.byteOffset);

      if(input.componentType != 5126) {
        console.warn('input component type is not a float!');
      }

      // each element (keyframe timestamp) is a 4 byte float
      const input_element_size = 4;

      //use the buffer view and accessor to offset into the binary buffer to retrieve our data
      const input_bufferView = gltf_json.bufferViews[input.bufferView];

      const input_accessor_data_offset = input_bufferView.byteOffset + input_accessor_byte_offset;

      const input_bin = bin_data_chunk.slice(input_accessor_data_offset, input_accessor_data_offset + input_element_size * input.count);

      const input_dv = new DataView(input_bin);

      // parse and store each timestamp out of the buffer
      const timestamps = [];

      for(var j = 0; j < input.count; j++) {
        const timestamp = input_dv.getFloat32(j * 4, true);

        if(timestamp > curr_animation.duration) {
          curr_animation.duration = timestamp;
        }
        timestamps.push(timestamp);
      }

      //--------------------------------------------------
      // get output accessor (keyframe values for this channel's sampler) and process the data for it
      //--------------------------------------------------
      const output = gltf_json.accessors[sampler.output];

      const output_accessor_byte_offset =  (typeof output.byteOffset === 'undefined' ? 0 : output.byteOffset);

      // we only care about VEC3 and VEC4 since we are only dealing with rotation, scale, and translation,
      // and we are going to assume they are floating point (componentType = 5126 according to gltf spec)
      if(output.componentType != 5126) {
        console.warn('output component type is not a float!');
      }

      const output_component_count = (output.type == 'VEC3' ? 3 : 4);
      // 4 byte floats in according to gltf spec

      const output_element_size = output_component_count * 4;

      //use the buffer view and accessor to offset into the binary buffer to retrieve our value data
      const output_bufferView = gltf_json.bufferViews[output.bufferView];

      const output_accessor_data_offset = output_bufferView.byteOffset + output_accessor_byte_offset;

      const output_bin = bin_data_chunk.slice(output_accessor_data_offset, output_accessor_data_offset + output_element_size * output.count);

      const output_dv = new DataView(output_bin);

      // parse and store each value
      const values = [];

      for(var j = 0; j < output.count * output_component_count; j += output_component_count) {
        const value = [];

        for(var l = 0; l < output_component_count; l++) {
          value.push(output_dv.getFloat32(j * 4 + l * 4, true));
        }
        values.push(value);
      }

      if(dof_type == 'translation') {
        for(var j = 0; j < output.count; j++) {
          curr_animation.tracks[node_name].translation_keys.push(new AnimationKey(timestamps[j], values[j]));
        }
      }
      else if(dof_type == 'rotation') {
        for(var j = 0; j < output.count; j++) {
          curr_animation.tracks[node_name].rotation_keys.push(new AnimationKey(timestamps[j], values[j]));
        }
      }
      else if(dof_type == 'scale') {
        for(var j = 0; j < output.count; j++) {
          curr_animation.tracks[node_name].scale_keys.push(new AnimationKey(timestamps[j], values[j]));
        }
      }
    }
    animations.push(curr_animation);
  }

  return animations;
}

function _parseAnimationSetFromArrayBuffer (array_buffer) {
  const animation_nodes = _parseAnimationNodesFromArrayBuffer(array_buffer);
  // convert nodes to dictionary format

  const nodes_dict = {};

  for(var i = 0; i < animation_nodes.length; i++) {
    nodes_dict[animation_nodes[i].name] = animation_nodes[i];

    //if the node defines its TRS info as a matrix, we need to capture that (see glTF 2.0 spec)
    if(typeof animation_nodes[i].matrix !== 'undefined') {
      const mat = new Cesium.Matrix4();

      Cesium.Matrix4.fromColumnMajorArray(animation_nodes[i].matrix, mat);
      nodes_dict[animation_nodes[i].name].matrix = mat;
    }

    //set default values for translation rotation and scale if they do not exist
    if(typeof nodes_dict[animation_nodes[i].name].translation === 'undefined') {
      nodes_dict[animation_nodes[i].name].translation = [ 0, 0, 0 ];
    }

    if(typeof nodes_dict[animation_nodes[i].name].rotation === 'undefined') {
      nodes_dict[animation_nodes[i].name].rotation = [ 0, 0, 0, 1 ];
      nodes_dict[animation_nodes[i].name].inv_rotation_matrix = Cesium.Matrix3.IDENTITY;
      nodes_dict[animation_nodes[i].name].inv_rotation = new Cesium.Quaternion(0, 0, 0, 1);
    }
    else {
      //compute and store the inverse rotation matrix and quaternion for future calculations
      const orig_rot = nodes_dict[animation_nodes[i].name].rotation;

      const orig_quat = new Cesium.Quaternion(orig_rot[0], orig_rot[1], orig_rot[2], orig_rot[3]);

      const orig_quat_inv = new Cesium.Quaternion();

      Cesium.Quaternion.inverse(orig_quat, orig_quat_inv);
      const invMat = new Cesium.Matrix3();

      Cesium.Matrix3.fromQuaternion(orig_quat_inv, invMat);
      nodes_dict[animation_nodes[i].name].inv_rotation_matrix = invMat;
      nodes_dict[animation_nodes[i].name].inv_rotation = orig_quat_inv;
    }

    if(typeof nodes_dict[animation_nodes[i].name].scale === 'undefined') {
      nodes_dict[animation_nodes[i].name].scale = [ 0, 0, 0 ];
    }
  }

  const animations = parseAnimationsFromArrayBuffer(array_buffer);

  console.log(nodes_dict);

  return new AnimationSet(animations, nodes_dict);
}

export const parseAnimationSetFromUri = (array_buffer) => _parseAnimationSetFromArrayBuffer(array_buffer);


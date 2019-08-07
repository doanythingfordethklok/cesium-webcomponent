
export const calcNodeWorldSpaceTransform = (animation_set, entity, currParentNode) => {
  const worldSpaceQuat = new Cesium.Quaternion();
  const node_stack = new Array();
  const transform_stack = new Array();
  const animation_transform_stack = new Array();

  //gather the chain of transformations
  while (
    typeof currParentNode !== 'undefined' &&
        typeof currParentNode.name !== 'undefined' &&
        currParentNode.name != ''
  ) {
    let matrixMode = false;

    if (typeof currParentNode.matrix !== 'undefined') {
      matrixMode = true;
    }

    const parentTransform = new Cesium.Matrix4();

    if (matrixMode) {
      Cesium.Matrix4.clone(currParentNode.matrix, parentTransform);
      const pos = new Cesium.Cartesian4();

      Cesium.Matrix4.getColumn(parentTransform, 3, pos);
      const temp = pos.x;

      pos.x = pos.z;
      pos.z = pos.y;
      pos.y = temp;
      Cesium.Matrix4.setColumn(parentTransform, 3, pos, parentTransform);
    }
    else {
      let parentQuat = new Cesium.Quaternion(
        currParentNode.rotation[0],
        currParentNode.rotation[1],
        currParentNode.rotation[2],
        currParentNode.rotation[3]
      );

      const angle = Cesium.Quaternion.computeAngle(parentQuat);

      //don't try to alter the quaternion if the angle is zero
      if (Math.abs(angle) > Cesium.Math.EPSILON5) {
        const axis = new Cesium.Cartesian3();

        Cesium.Quaternion.computeAxis(parentQuat, axis);
        const newAxis = new Cesium.Cartesian3(axis.z, axis.x, axis.y);

        parentQuat = Cesium.Quaternion.fromAxisAngle(newAxis, angle);
      }

      const parentTrans = new Cesium.Cartesian3(
        currParentNode.translation[2],
        currParentNode.translation[0],
        currParentNode.translation[1]
      );

      let parentScale = new Cesium.Cartesian3(
        currParentNode.scale[0],
        currParentNode.scale[1],
        currParentNode.scale[2]
      );

      const scaleMag = Cesium.Cartesian3.magnitude(parentScale);

      if (scaleMag < Math.EPSILON5 || scaleMag == 0.0) {
        parentScale = new Cesium.Cartesian3(1, 1, 1);
      }
      Cesium.Matrix4.fromTranslationQuaternionRotationScale(parentTrans, parentQuat, parentScale, parentTransform);
    }

    //compute the animated transform
    const nodeAnimTransform = entity.model.nodeTransformations[currParentNode.name];

    const nodeAnimTrans = new Cesium.Cartesian3(
      nodeAnimTransform.translation._value.z,
      nodeAnimTransform.translation._value.x,
      nodeAnimTransform.translation._value.y
    );

    let nodeAnimRot = nodeAnimTransform.rotation._value;

    const nodeAnimScale = nodeAnimTransform.scale._value;

    const angle = Cesium.Quaternion.computeAngle(nodeAnimRot);

    //don't try to alter the quaternion if the angle is zero
    if (Math.abs(angle) > Cesium.Math.EPSILON5) {
      const axis = new Cesium.Cartesian3();

      Cesium.Quaternion.computeAxis(nodeAnimRot, axis);
      const newAxis = new Cesium.Cartesian3(axis.z, axis.x, axis.y);

      nodeAnimRot = Cesium.Quaternion.fromAxisAngle(newAxis, angle);
    }
    const nodeAnimMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
      nodeAnimTrans,
      nodeAnimRot,
      nodeAnimScale
    );

    Cesium.Matrix4.multiply(parentTransform, nodeAnimMatrix, parentTransform);

    transform_stack.push(parentTransform);
    currParentNode = animation_set.nodes[currParentNode.parent];
  }

  const modelMatrix = new Cesium.Matrix4();

  Cesium.Matrix4.fromTranslationQuaternionRotationScale(
    entity.position._value,
    entity.orientation._value,
    new Cesium.Cartesian3(1, 1, 1),
    modelMatrix
  );

  while (transform_stack.length > 0) {
    Cesium.Matrix4.multiply(modelMatrix, transform_stack.pop(), modelMatrix);
  }

  return modelMatrix;
};


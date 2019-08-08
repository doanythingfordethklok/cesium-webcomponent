export const getEntityPositionFromTransform = (matrix, translation, result = new Cesium.Cartesian3()) => {
  if (matrix) {
    Cesium.Matrix4.multiplyByPoint(matrix, translation, result);
  }

  return result;
};

export const getEntityOrientationFromTransform = (matrix) => {
  const orientation = new Cesium.Quaternion();

  if (matrix) {
    const rotMatrix = new Cesium.Matrix3();

    Cesium.Matrix4.getRotation(matrix, rotMatrix);
    Cesium.Quaternion.fromRotationMatrix(rotMatrix, orientation);
  }

  return orientation;
};

export const getRayFromMatrix = (matrix, translation) => {
  if (matrix) {
    // given origin and direction (default to along the z axis)
    // apply the translation to both which generates a vector.
    const origin = getEntityPositionFromTransform(matrix, translation);
    const dir = new Cesium.Cartesian4();

    Cesium.Matrix4.getColumn(matrix, 2, dir);

    return new Cesium.Ray(origin, new Cesium.Cartesian3(dir.x, dir.y, dir.z) );
  }

  return new Cesium.Ray();
};

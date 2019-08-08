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
    const rotMatrix = new Cesium.Matrix3();

    Cesium.Matrix4.getRotation(matrix, rotMatrix);

    // given origin and direction (default to along the z axis)
    // apply the translation to both which generates a vector.
    const origin = getEntityPositionFromTransform(matrix, translation);
    const direction = new Cesium.Cartesian3();

    Cesium.Matrix3.multiplyByVector(rotMatrix, getEntityPositionFromTransform(matrix, translation, translation), direction);

    return new Cesium.Ray(origin, direction);
  }

  return new Cesium.Ray();
};

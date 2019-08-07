
export const calculatePositionFromMatrix = (matrix, translation, position = new Cesium.Cartesian3()) => {
  const tmp = new Cesium.Matrix4();

  if (matrix) {
    Cesium.Matrix4.multiplyByTranslation(matrix, translation, tmp);
    Cesium.Matrix4.getTranslation(tmp, position);
  }

  return position;
};

export const calculateOrientationFromMatrix = (matrix) => {
  const orientation = new Cesium.Quaternion();

  if (matrix) {
    const rotMatrix = new Cesium.Matrix3();

    Cesium.Matrix4.getRotation(matrix, rotMatrix);
    Cesium.Quaternion.fromRotationMatrix(rotMatrix, orientation);
  }

  return orientation;
};

export const calculateDirectionFromMatrix = (matrix, translation) => {
  if (matrix) {
    const rotMatrix = new Cesium.Matrix3();

    Cesium.Matrix4.getRotation(matrix, rotMatrix);

    // given origin and direction (default to along the z axis)
    // apply the translation to both which generates a vector.
    const origin = calculatePositionFromMatrix(matrix, translation);
    const direction = new Cesium.Cartesian3();

    Cesium.Matrix3.multiplyByVector(rotMatrix, calculatePositionFromMatrix(matrix, translation, translation), direction);

    return new Cesium.Ray(origin, direction);
  }

  return new Cesium.Ray();
};

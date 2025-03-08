// Create a new file: src/utils/ModelPreprocessor.js

import * as THREE from 'three';

/**
 * Utility class to analyze and fix common issues with 3D models
 */
export class ModelPreprocessor {
  /**
   * Analyze a loaded 3D model and log information about it
   * @param {THREE.Object3D} model - The loaded 3D model
   */
  static analyzeModel(model) {
    console.group(`Model Analysis: ${model.name || 'Unnamed Model'}`);
    
    // Count mesh objects and materials
    let meshCount = 0;
    let materialCount = 0;
    let meshesWithoutMaterial = 0;
    let totalVertices = 0;
    let totalFaces = 0;
    
    // Get overall dimensions of the model
    const boundingBox = new THREE.Box3().setFromObject(model);
    const dimensions = new THREE.Vector3();
    boundingBox.getSize(dimensions);
    
    // Analyze model structure
    this._traverseModelTree(model, (obj, level) => {
      const indentation = '  '.repeat(level);
      console.log(`${indentation}${obj.type}: ${obj.name || 'unnamed'}`);
      
      if (obj.isMesh) {
        meshCount++;
        totalVertices += obj.geometry.attributes.position.count;
        if (obj.geometry.index) {
          totalFaces += obj.geometry.index.count / 3;
        } else {
          totalFaces += obj.geometry.attributes.position.count / 3;
        }
        
        if (!obj.material) {
          meshesWithoutMaterial++;
        } else {
          materialCount++;
          console.log(`${indentation}  Material: ${obj.material.type}`);
        }
      }
    });
    
    console.log('Model statistics:');
    console.log(`- Dimensions: X=${dimensions.x.toFixed(2)}, Y=${dimensions.y.toFixed(2)}, Z=${dimensions.z.toFixed(2)}`);
    console.log(`- Center: X=${(boundingBox.min.x + boundingBox.max.x)/2}, Y=${(boundingBox.min.y + boundingBox.max.y)/2}, Z=${(boundingBox.min.z + boundingBox.max.z)/2}`);
    console.log(`- Meshes: ${meshCount}`);
    console.log(`- Materials: ${materialCount}`);
    console.log(`- Meshes without material: ${meshesWithoutMaterial}`);
    console.log(`- Total vertices: ${totalVertices}`);
    console.log(`- Total faces: ${totalFaces}`);
    
    console.groupEnd();
    
    return {
      dimensions,
      center: new THREE.Vector3(
        (boundingBox.min.x + boundingBox.max.x)/2,
        (boundingBox.min.y + boundingBox.max.y)/2,
        (boundingBox.min.z + boundingBox.max.z)/2
      ),
      meshCount,
      materialCount,
      meshesWithoutMaterial,
      totalVertices,
      totalFaces
    };
  }
  
  /**
   * Fix common model issues
   * @param {THREE.Object3D} model - The model to fix
   * @param {Object} options - Options for fixing the model
   */
  static fixModel(model, options = {}) {
    const {
      centerModel = true,
      normalizeScale = true,
      fixMaterials = true,
      applyRotation = true,
      targetScale = 6
    } = options;
    
    // Analyze the model first
    const analysis = this.analyzeModel(model);
    
    // Fix missing materials
    if (fixMaterials && analysis.meshesWithoutMaterial > 0) {
      const defaultMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.2,
        roughness: 0.8
      });
      
      model.traverse(obj => {
        if (obj.isMesh && !obj.material) {
          console.log(`Applied default material to ${obj.name || 'unnamed mesh'}`);
          obj.material = defaultMaterial;
        }
      });
    }
    
    // Center the model
    if (centerModel) {
      model.position.sub(analysis.center);
    }
    
    // Normalize scale
    if (normalizeScale) {
      const maxDimension = Math.max(analysis.dimensions.x, analysis.dimensions.y, analysis.dimensions.z);
      const scaleFactor = targetScale / maxDimension;
      model.scale.multiplyScalar(scaleFactor);
      console.log(`Normalized scale by factor: ${scaleFactor}`);
    }
    
    // Apply a default rotation based on common problems
    if (applyRotation) {
      // Assume Y-up to Z-up conversion (common issue)
      model.rotation.set(-Math.PI/2, 0, 0);
      console.log(`Applied automatic rotation correction`);
    }
    
    return model;
  }
  
  /**
   * Helper method to traverse the model tree
   * @private
   */
  static _traverseModelTree(model, callback, level = 0) {
    callback(model, level);
    
    if (model.children && model.children.length > 0) {
      model.children.forEach(child => {
        this._traverseModelTree(child, callback, level + 1);
      });
    }
  }
}

// Export a ready-to-use instance
export default new ModelPreprocessor();
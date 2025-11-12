// Performance optimization utilities for Bishi Collection Management System

import { ref, set, push, get } from "firebase/database";
import { db } from "../firebase";

// Optimized Firebase write operations
export const optimizedWrite = async (path, data) => {
  try {
    // Use batch write for better performance
    const dataRef = ref(db, path);
    await set(dataRef, {
      ...data,
      timestamp: Date.now() // Use timestamp for better indexing
    });
    return { success: true };
  } catch (error) {
    console.error("Write error:", error);
    return { success: false, error: error.message };
  }
};

// Optimized Firebase push operations
export const optimizedPush = async (path, data) => {
  try {
    const newRef = push(ref(db, path));
    await set(newRef, {
      ...data,
      timestamp: Date.now(),
      id: newRef.key // Store the key for easier reference
    });
    return { success: true, id: newRef.key };
  } catch (error) {
    console.error("Push error:", error);
    return { success: false, error: error.message };
  }
};

// Debounce function for search inputs
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Optimize data for Firebase (remove undefined values, convert to proper types)
export const optimizeDataForFirebase = (data) => {
  const optimized = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    // Skip undefined values
    if (value === undefined) return;
    
    // Convert empty strings to null for better Firebase performance
    if (value === "") {
      optimized[key] = null;
      return;
    }
    
    // Convert string numbers to actual numbers
    if (typeof value === "string" && !isNaN(value) && value !== "") {
      optimized[key] = Number(value);
      return;
    }
    
    // Keep other values as is
    optimized[key] = value;
  });
  
  return optimized;
};

// Batch operations for multiple writes
export const batchWrite = async (operations) => {
  try {
    const promises = operations.map(({ path, data }) => 
      set(ref(db, path), optimizeDataForFirebase(data))
    );
    
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error("Batch write error:", error);
    return { success: false, error: error.message };
  }
};

// Check if data exists before writing (to avoid unnecessary writes)
export const conditionalWrite = async (path, data) => {
  try {
    const snapshot = await get(ref(db, path));
    
    // Only write if data doesn't exist or is different
    if (!snapshot.exists() || JSON.stringify(snapshot.val()) !== JSON.stringify(data)) {
      await set(ref(db, path), optimizeDataForFirebase(data));
      return { success: true, written: true };
    }
    
    return { success: true, written: false, message: "Data unchanged, skipped write" };
  } catch (error) {
    console.error("Conditional write error:", error);
    return { success: false, error: error.message };
  }
};

// Performance monitoring
export const performanceMonitor = {
  startTime: null,
  
  start() {
    this.startTime = performance.now();
  },
  
  end(operation) {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      console.log(`${operation} took ${duration.toFixed(2)}ms`);
      this.startTime = null;
      return duration;
    }
  }
};

import { ref, get, set, remove } from "firebase/database";
import { db } from "../firebase";

/**
 * Utility to restructure agents with sequential IDs like 1, 2, 3, 4...
 * This will convert AGTMAY8746 to agent ID "1"
 */

// Get next agent ID
export const getNextAgentId = async () => {
  try {
    const agentsRef = ref(db, 'agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      const existingIds = Object.keys(agents).map(id => parseInt(id)).filter(id => !isNaN(id));
      
      if (existingIds.length === 0) {
        return 1; // First agent
      }
      
      // Return next sequential ID
      return Math.max(...existingIds) + 1;
    }
    
    return 1; // First agent
  } catch (error) {
    console.error("Error getting next agent ID:", error);
    return 1;
  }
};

// Convert agents to sequential IDs
export const convertAgentsToSequentialIds = async () => {
  try {
    console.log("Starting agent ID conversion to sequential numbers...");
    
    // Get all existing agents
    const agentsRef = ref(db, 'agents');
    const snapshot = await get(agentsRef);
    
    if (!snapshot.exists()) {
      console.log("No agents found to convert");
      return { success: true, message: "No agents found" };
    }
    
    const existingAgents = snapshot.val();
    const convertedAgents = {};
    const conversionMap = [];
    let sequentialId = 1;
    
    // Process each agent and assign sequential ID
    for (const [originalId, agentData] of Object.entries(existingAgents)) {
      // Skip if already a number
      if (!isNaN(parseInt(originalId))) {
        convertedAgents[originalId] = agentData;
        conversionMap.push({
          originalId: originalId,
          newId: originalId,
          agentName: agentData.agentInfo?.agentName || "Unknown",
          status: "already_sequential"
        });
        continue;
      }
      
      // Convert to sequential ID
      const newAgentId = sequentialId.toString();
      
      // Update agent data with new ID
      convertedAgents[newAgentId] = {
        ...agentData,
        agentInfo: {
          ...agentData.agentInfo,
          agentId: newAgentId,
          originalAgentId: originalId // Keep reference to original ID
        }
      };
      
      // Update all customers under this agent to reference new agent ID
      if (convertedAgents[newAgentId].customers) {
        Object.keys(convertedAgents[newAgentId].customers).forEach(customerId => {
          if (convertedAgents[newAgentId].customers[customerId]) {
            convertedAgents[newAgentId].customers[customerId].agentId = newAgentId;
          }
        });
      }
      
      conversionMap.push({
        originalId: originalId,
        newId: newAgentId,
        agentName: agentData.agentInfo?.agentName || "Unknown",
        status: "converted"
      });
      
      sequentialId++;
      console.log(`Converted: ${originalId} -> ${newAgentId}`);
    }
    
    // Backup existing data
    const backupRef = ref(db, `agents_backup_sequential_${Date.now()}`);
    await set(backupRef, existingAgents);
    console.log("Backup created successfully");
    
    // Clear existing agents
    await remove(agentsRef);
    console.log("Existing agents cleared");
    
    // Set converted agents
    await set(agentsRef, convertedAgents);
    console.log("Sequential agents saved");
    
    return {
      success: true,
      message: `Successfully converted ${conversionMap.filter(c => c.status === 'converted').length} agents to sequential IDs`,
      conversionMap: conversionMap
    };
    
  } catch (error) {
    console.error("Error converting agents:", error);
    return {
      success: false,
      message: "Error converting agents: " + error.message
    };
  }
};

// Add new agent with sequential ID
export const addAgentWithSequentialId = async (agentData) => {
  try {
    // Get next sequential ID
    const agentId = await getNextAgentId();
    
    // Create agent data structure with sequential ID as key
    const newAgentData = {
      agentInfo: {
        agentId: agentId.toString(),
        agentName: agentData.agentName,
        mobileNumber: agentData.mobileNumber,
        password: agentData.password,
        route: agentData.route,
        status: agentData.status || "active",
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      },
      customers: {},
      weeklyCollections: {},
      transactions: {},
      stats: {
        totalCustomers: 0,
        totalCollections: 0,
        totalCommission: 0,
        activeCustomers: 0,
        pendingCollections: 0,
        lastUpdated: Date.now()
      }
    };
    
    // Save to Firebase with sequential ID as key
    const agentRef = ref(db, `agents/${agentId}`);
    await set(agentRef, newAgentData);
    
    console.log("Agent added successfully with sequential ID:", agentId);
    return {
      success: true,
      agentId: agentId.toString(),
      message: "Agent added successfully"
    };
    
  } catch (error) {
    console.error("Error adding agent:", error);
    return {
      success: false,
      message: "Error adding agent: " + error.message
    };
  }
};

// Get all agents (now with sequential IDs as keys)
export const getAllSequentialAgents = async () => {
  try {
    const agentsRef = ref(db, 'agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      return Object.entries(agents).map(([agentId, agentData]) => ({
        id: agentId, // This is now the sequential ID
        agentId: agentId,
        ...agentData.agentInfo,
        customers: agentData.customers || {},
        stats: agentData.stats || {}
      })).sort((a, b) => parseInt(a.id) - parseInt(b.id)); // Sort by ID
    }
    return [];
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

export default {
  getNextAgentId,
  convertAgentsToSequentialIds,
  addAgentWithSequentialId,
  getAllSequentialAgents
};

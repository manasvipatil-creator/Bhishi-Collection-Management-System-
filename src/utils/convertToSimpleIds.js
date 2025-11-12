import { ref, get, set, remove } from "firebase/database";
import { db } from "../firebase";

/**
 * Convert existing agents to simple sequential IDs (1, 2, 3...)
 * and add customers with IDs 1, 2, 3 to the first agent
 */

export const convertAgentsToSimpleIds = async () => {
  try {
    console.log("Converting agents to simple IDs (1, 2, 3...)");
    
    // Get all existing agents
    const agentsRef = ref(db, 'agents');
    const snapshot = await get(agentsRef);
    
    if (!snapshot.exists()) {
      console.log("No agents found");
      return { success: false, message: "No agents found to convert" };
    }
    
    const existingAgents = snapshot.val();
    const newAgents = {};
    let agentCounter = 1;
    
    // Convert each agent to simple ID
    for (const [oldId, agentData] of Object.entries(existingAgents)) {
      const newAgentId = agentCounter.toString();
      
      // Update agent data with new simple ID
      newAgents[newAgentId] = {
        ...agentData,
        agentInfo: {
          ...agentData.agentInfo,
          agentId: newAgentId,
          originalAgentId: oldId // Keep reference to original ID
        }
      };
      
      // Update customer references if they exist
      if (newAgents[newAgentId].customers) {
        Object.keys(newAgents[newAgentId].customers).forEach(customerId => {
          if (newAgents[newAgentId].customers[customerId]) {
            newAgents[newAgentId].customers[customerId].agentId = newAgentId;
          }
        });
      }
      
      console.log(`Converted agent: ${oldId} -> ${newAgentId}`);
      agentCounter++;
    }
    
    // Create backup
    const backupRef = ref(db, `agents_backup_simple_${Date.now()}`);
    await set(backupRef, existingAgents);
    console.log("Backup created");
    
    // Clear existing agents
    await remove(agentsRef);
    
    // Set new simple structure
    await set(agentsRef, newAgents);
    
    console.log("Agents converted to simple IDs successfully");
    return {
      success: true,
      message: `Successfully converted ${Object.keys(newAgents).length} agents to simple IDs`,
      newStructure: newAgents
    };
    
  } catch (error) {
    console.error("Error converting agents:", error);
    return {
      success: false,
      message: "Error converting agents: " + error.message
    };
  }
};

export const addCustomersToAgent1 = async () => {
  try {
    const agentId = "1";
    
    const customers = [
      {
        customerId: "1",
        customerName: "Rajesh Kumar",
        mobileNumber: "9876543210",
        address: "123 Main Street, Mumbai",
        joinDate: "2024-10-13",
        monthlyDue: 5000,
        weeklyAmount: 1250,
        balance: 0,
        status: "active",
        agentId: agentId,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        totalSubmitted: 0,
        missedPayments: 0,
        lastPaymentDate: null
      },
      {
        customerId: "2",
        customerName: "Priya Sharma",
        mobileNumber: "9876543211",
        address: "456 Park Avenue, Mumbai",
        joinDate: "2024-10-13",
        monthlyDue: 3000,
        weeklyAmount: 750,
        balance: 0,
        status: "active",
        agentId: agentId,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        totalSubmitted: 0,
        missedPayments: 0,
        lastPaymentDate: null
      },
      {
        customerId: "3",
        customerName: "Amit Patel",
        mobileNumber: "9876543212",
        address: "789 Garden Road, Mumbai",
        joinDate: "2024-10-13",
        monthlyDue: 4000,
        weeklyAmount: 1000,
        balance: 0,
        status: "active",
        agentId: agentId,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        totalSubmitted: 0,
        missedPayments: 0,
        lastPaymentDate: null
      }
    ];

    console.log("Adding customers to agent 1");
    
    for (const customer of customers) {
      const customerRef = ref(db, `agents/${agentId}/customers/${customer.customerId}`);
      await set(customerRef, customer);
      console.log(`Added customer ${customer.customerId}: ${customer.customerName}`);
    }
    
    return {
      success: true,
      message: "Successfully added customers 1, 2, 3 to agent 1"
    };
    
  } catch (error) {
    console.error("Error adding customers:", error);
    return {
      success: false,
      message: "Error adding customers: " + error.message
    };
  }
};

export const convertAndAddAll = async () => {
  try {
    // Step 1: Convert agents to simple IDs
    const conversionResult = await convertAgentsToSimpleIds();
    
    if (!conversionResult.success) {
      return conversionResult;
    }
    
    // Step 2: Add customers to agent 1
    const customerResult = await addCustomersToAgent1();
    
    if (!customerResult.success) {
      return customerResult;
    }
    
    return {
      success: true,
      message: "Successfully converted agents to simple IDs (1, 2, 3...) and added customers (1, 2, 3) to agent 1"
    };
    
  } catch (error) {
    console.error("Error in conversion process:", error);
    return {
      success: false,
      message: "Error in conversion process: " + error.message
    };
  }
};

export default {
  convertAgentsToSimpleIds,
  addCustomersToAgent1,
  convertAndAddAll
};

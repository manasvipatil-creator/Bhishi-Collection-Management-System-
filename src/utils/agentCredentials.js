import { ref, get, set, push, update } from "firebase/database";
import { db } from "../firebase";

/**
 * Agent Credentials Management for Bishi Collection System
 * Handles agent authentication and credential management
 */

// Add agent with credentials
export const addAgentWithCredentials = async (agentData) => {
  try {
    console.log('👤 Adding agent with credentials...');
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const newAgentRef = push(agentsRef);
    
    const agent = {
      // Basic agent info
      address: agentData.address || '',
      contactPerson: agentData.contactPerson || agentData.name || '',
      createdAt: new Date().toISOString(),
      
      // Credentials object
      credentials: {
        email: agentData.email || '',
        firmName: agentData.firmName || '',
        id: agentData.email || newAgentRef.key,
        password: agentData.password || 'defaultpass123', // You might want to hash this
        role: agentData.role || 'agent'
      },
      
      // Agent details
      agentInfo: {
        agentName: agentData.name || agentData.contactPerson || '',
        mobileNumber: agentData.phone || '',
        route: agentData.route || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      },
      
      // Initialize empty collections
      customers: {},
      stats: {
        totalCustomers: 0,
        activeCustomers: 0,
        totalCollections: 0,
        totalCommission: 0,
        pendingCollections: 0,
        lastUpdated: Date.now()
      }
    };
    
    await set(newAgentRef, agent);
    console.log(`✅ Agent added successfully with ID: ${newAgentRef.key}`);
    
    return {
      success: true,
      agentId: newAgentRef.key,
      message: 'Agent added with credentials successfully'
    };
    
  } catch (error) {
    console.error('❌ Error adding agent with credentials:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Authenticate agent using credentials
export const authenticateAgent = async (email, password) => {
  try {
    console.log('🔐 Authenticating agent...');
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      
      // Find agent with matching credentials
      for (const [agentId, agentData] of Object.entries(agents)) {
        if (agentData.credentials && 
            agentData.credentials.email === email && 
            agentData.credentials.password === password) {
          
          console.log(`✅ Authentication successful for: ${email}`);
          
          return {
            success: true,
            agentId: agentId,
            agentData: {
              id: agentId,
              name: agentData.agentInfo?.agentName || agentData.contactPerson,
              email: agentData.credentials.email,
              firmName: agentData.credentials.firmName,
              role: agentData.credentials.role,
              phone: agentData.agentInfo?.mobileNumber,
              route: agentData.agentInfo?.route,
              address: agentData.address
            }
          };
        }
      }
      
      console.log('❌ Invalid credentials');
      return {
        success: false,
        message: 'Invalid email or password'
      };
    } else {
      console.log('❌ No agents found');
      return {
        success: false,
        message: 'No agents found in database'
      };
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update agent credentials
export const updateAgentCredentials = async (agentId, credentialsData) => {
  try {
    console.log(`🔄 Updating credentials for agent: ${agentId}`);
    
    const credentialsRef = ref(db, `bishi_collection/agents/${agentId}/credentials`);
    
    const updates = {};
    if (credentialsData.email) updates.email = credentialsData.email;
    if (credentialsData.password) updates.password = credentialsData.password;
    if (credentialsData.firmName) updates.firmName = credentialsData.firmName;
    if (credentialsData.role) updates.role = credentialsData.role;
    
    await update(credentialsRef, updates);
    
    console.log('✅ Credentials updated successfully');
    return {
      success: true,
      message: 'Credentials updated successfully'
    };
    
  } catch (error) {
    console.error('❌ Error updating credentials:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all agents with credentials
export const getAllAgentsWithCredentials = async () => {
  try {
    console.log('📋 Fetching all agents with credentials...');
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      
      const agentsList = Object.entries(agents).map(([agentId, agentData]) => ({
        id: agentId,
        name: agentData.agentInfo?.agentName || agentData.contactPerson || 'Unknown',
        email: agentData.credentials?.email || '',
        firmName: agentData.credentials?.firmName || '',
        phone: agentData.agentInfo?.mobileNumber || '',
        route: agentData.agentInfo?.route || '',
        address: agentData.address || '',
        status: agentData.agentInfo?.status || 'active',
        createdAt: agentData.createdAt || agentData.agentInfo?.createdAt,
        role: agentData.credentials?.role || 'agent',
        totalCustomers: agentData.stats?.totalCustomers || 0,
        totalCollections: agentData.stats?.totalCollections || 0
      }));
      
      console.log(`✅ Found ${agentsList.length} agents`);
      return agentsList;
    } else {
      console.log('📭 No agents found');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching agents:', error);
    return [];
  }
};

// Check if email already exists
export const checkEmailExists = async (email) => {
  try {
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      
      for (const agentData of Object.values(agents)) {
        if (agentData.credentials && agentData.credentials.email === email) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking email:', error);
    return false;
  }
};

// Reset agent password
export const resetAgentPassword = async (email, newPassword) => {
  try {
    console.log(`🔑 Resetting password for: ${email}`);
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      
      for (const [agentId, agentData] of Object.entries(agents)) {
        if (agentData.credentials && agentData.credentials.email === email) {
          const passwordRef = ref(db, `bishi_collection/agents/${agentId}/credentials/password`);
          await set(passwordRef, newPassword);
          
          console.log('✅ Password reset successfully');
          return {
            success: true,
            message: 'Password reset successfully'
          };
        }
      }
      
      return {
        success: false,
        message: 'Email not found'
      };
    } else {
      return {
        success: false,
        message: 'No agents found'
      };
    }
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create sample agents with credentials
export const createSampleAgentsWithCredentials = async () => {
  try {
    console.log('🚀 Creating sample agents with credentials...');
    
    const sampleAgents = [
      {
        name: 'Amit Patil',
        email: 'amit@gmail.com',
        password: 'amit123',
        firmName: 'RKAssociates',
        phone: '9876543210',
        address: 'Vijaynagar Sangli',
        route: 'Route A - Central Area'
      },
      {
        name: 'Priya Sharma',
        email: 'priya@gmail.com',
        password: 'priya123',
        firmName: 'Sharma Collections',
        phone: '9876543211',
        address: 'Market Road Kolhapur',
        route: 'Route B - Market Area'
      },
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@gmail.com',
        password: 'rajesh123',
        firmName: 'Kumar Finance',
        phone: '9876543212',
        address: 'Station Road Pune',
        route: 'Route C - Station Area'
      }
    ];
    
    const results = [];
    
    for (const agentData of sampleAgents) {
      const result = await addAgentWithCredentials(agentData);
      results.push(result);
    }
    
    console.log('🎉 Sample agents created successfully!');
    return {
      success: true,
      message: `Created ${results.filter(r => r.success).length} sample agents`,
      results
    };
    
  } catch (error) {
    console.error('❌ Error creating sample agents:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  addAgentWithCredentials,
  authenticateAgent,
  updateAgentCredentials,
  getAllAgentsWithCredentials,
  checkEmailExists,
  resetAgentPassword,
  createSampleAgentsWithCredentials
};

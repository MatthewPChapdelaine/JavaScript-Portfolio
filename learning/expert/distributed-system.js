#!/usr/bin/env node

/**
 * RAFT CONSENSUS ALGORITHM IMPLEMENTATION
 * 
 * A complete implementation of the Raft distributed consensus algorithm
 * with leader election, log replication, and failure detection.
 * 
 * Key Features:
 * - Leader Election with randomized timeouts
 * - Log Replication across cluster nodes
 * - Failure Detection and automatic recovery
 * - Network partition handling
 * - Persistent state management
 * - Client request handling
 * 
 * References: https://raft.github.io/
 */

const EventEmitter = require('events');
const crypto = require('crypto');

// ============================================================================
// RAFT NODE STATES
// ============================================================================

const NodeState = {
  FOLLOWER: 'FOLLOWER',
  CANDIDATE: 'CANDIDATE',
  LEADER: 'LEADER'
};

// ============================================================================
// MESSAGE TYPES
// ============================================================================

const MessageType = {
  REQUEST_VOTE: 'REQUEST_VOTE',
  REQUEST_VOTE_RESPONSE: 'REQUEST_VOTE_RESPONSE',
  APPEND_ENTRIES: 'APPEND_ENTRIES',
  APPEND_ENTRIES_RESPONSE: 'APPEND_ENTRIES_RESPONSE',
  CLIENT_REQUEST: 'CLIENT_REQUEST'
};

// ============================================================================
// LOG ENTRY
// ============================================================================

class LogEntry {
  constructor(term, command, index) {
    this.term = term;
    this.command = command;
    this.index = index;
    this.timestamp = Date.now();
  }
}

// ============================================================================
// PERSISTENT STATE
// ============================================================================

class PersistentState {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
  }

  setTerm(term) {
    this.currentTerm = term;
    this.votedFor = null;
  }

  vote(candidateId) {
    this.votedFor = candidateId;
  }

  appendEntry(entry) {
    this.log.push(entry);
  }

  getLastLogIndex() {
    return this.log.length - 1;
  }

  getLastLogTerm() {
    if (this.log.length === 0) return 0;
    return this.log[this.log.length - 1].term;
  }

  getEntry(index) {
    return this.log[index];
  }

  deleteEntriesFrom(index) {
    this.log = this.log.slice(0, index);
  }
}

// ============================================================================
// RAFT NODE
// ============================================================================

class RaftNode extends EventEmitter {
  constructor(nodeId, cluster, config = {}) {
    super();
    
    this.nodeId = nodeId;
    this.cluster = cluster;
    
    // Configuration
    this.electionTimeoutMin = config.electionTimeoutMin || 150;
    this.electionTimeoutMax = config.electionTimeoutMax || 300;
    this.heartbeatInterval = config.heartbeatInterval || 50;
    
    // Persistent state
    this.state = new PersistentState(nodeId);
    
    // Volatile state
    this.currentState = NodeState.FOLLOWER;
    this.commitIndex = -1;
    this.lastApplied = -1;
    
    // Leader state
    this.nextIndex = new Map();
    this.matchIndex = new Map();
    
    // Timers
    this.electionTimer = null;
    this.heartbeatTimer = null;
    
    // Statistics
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      electionsStarted: 0,
      electionsWon: 0,
      commandsApplied: 0
    };
    
    this.resetElectionTimer();
  }

  // ==========================================================================
  // ELECTION TIMER
  // ==========================================================================

  resetElectionTimer() {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
    }
    
    const timeout = this.electionTimeoutMin + 
      Math.random() * (this.electionTimeoutMax - this.electionTimeoutMin);
    
    this.electionTimer = setTimeout(() => {
      this.startElection();
    }, timeout);
  }

  stopElectionTimer() {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
  }

  // ==========================================================================
  // ELECTION
  // ==========================================================================

  startElection() {
    this.stats.electionsStarted++;
    this.currentState = NodeState.CANDIDATE;
    this.state.setTerm(this.state.currentTerm + 1);
    this.state.vote(this.nodeId);
    
    console.log(`[${this.nodeId}] Starting election for term ${this.state.currentTerm}`);
    
    let votesReceived = 1;
    const votesNeeded = Math.floor(this.cluster.getNodeCount() / 2) + 1;
    
    const requestVoteMessage = {
      type: MessageType.REQUEST_VOTE,
      term: this.state.currentTerm,
      candidateId: this.nodeId,
      lastLogIndex: this.state.getLastLogIndex(),
      lastLogTerm: this.state.getLastLogTerm()
    };
    
    this.cluster.broadcast(this.nodeId, requestVoteMessage);
    this.stats.messagesSent += this.cluster.getNodeCount() - 1;
    
    this.resetElectionTimer();
  }

  handleRequestVote(message, senderId) {
    const { term, candidateId, lastLogIndex, lastLogTerm } = message;
    
    let voteGranted = false;
    
    if (term < this.state.currentTerm) {
      voteGranted = false;
    } else {
      if (term > this.state.currentTerm) {
        this.becomeFollower(term);
      }
      
      const votedForNone = this.state.votedFor === null;
      const votedForCandidate = this.state.votedFor === candidateId;
      
      const candidateLogUpToDate = 
        lastLogTerm > this.state.getLastLogTerm() ||
        (lastLogTerm === this.state.getLastLogTerm() && 
         lastLogIndex >= this.state.getLastLogIndex());
      
      if ((votedForNone || votedForCandidate) && candidateLogUpToDate) {
        voteGranted = true;
        this.state.vote(candidateId);
        this.resetElectionTimer();
      }
    }
    
    const response = {
      type: MessageType.REQUEST_VOTE_RESPONSE,
      term: this.state.currentTerm,
      voteGranted
    };
    
    this.cluster.send(this.nodeId, senderId, response);
    this.stats.messagesSent++;
  }

  handleRequestVoteResponse(message, senderId) {
    if (this.currentState !== NodeState.CANDIDATE) return;
    
    const { term, voteGranted } = message;
    
    if (term > this.state.currentTerm) {
      this.becomeFollower(term);
      return;
    }
    
    if (term === this.state.currentTerm && voteGranted) {
      const votesReceived = this.cluster.countVotesReceived(this.nodeId);
      const votesNeeded = Math.floor(this.cluster.getNodeCount() / 2) + 1;
      
      if (votesReceived >= votesNeeded) {
        this.becomeLeader();
      }
    }
  }

  // ==========================================================================
  // STATE TRANSITIONS
  // ==========================================================================

  becomeFollower(term) {
    console.log(`[${this.nodeId}] Becoming FOLLOWER for term ${term}`);
    
    this.currentState = NodeState.FOLLOWER;
    this.state.setTerm(term);
    this.stopHeartbeatTimer();
    this.resetElectionTimer();
  }

  becomeLeader() {
    console.log(`[${this.nodeId}] Becoming LEADER for term ${this.state.currentTerm}`);
    
    this.stats.electionsWon++;
    this.currentState = NodeState.LEADER;
    this.stopElectionTimer();
    
    // Initialize leader state
    this.cluster.getAllNodeIds().forEach(nodeId => {
      if (nodeId !== this.nodeId) {
        this.nextIndex.set(nodeId, this.state.log.length);
        this.matchIndex.set(nodeId, -1);
      }
    });
    
    this.sendHeartbeats();
    this.startHeartbeatTimer();
  }

  // ==========================================================================
  // HEARTBEAT
  // ==========================================================================

  startHeartbeatTimer() {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeats();
    }, this.heartbeatInterval);
  }

  stopHeartbeatTimer() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  sendHeartbeats() {
    if (this.currentState !== NodeState.LEADER) return;
    
    this.cluster.getAllNodeIds().forEach(nodeId => {
      if (nodeId !== this.nodeId) {
        this.sendAppendEntries(nodeId);
      }
    });
  }

  // ==========================================================================
  // LOG REPLICATION
  // ==========================================================================

  sendAppendEntries(followerId) {
    const prevLogIndex = this.nextIndex.get(followerId) - 1;
    const prevLogTerm = prevLogIndex >= 0 ? 
      this.state.getEntry(prevLogIndex).term : 0;
    
    const entries = this.state.log.slice(this.nextIndex.get(followerId));
    
    const message = {
      type: MessageType.APPEND_ENTRIES,
      term: this.state.currentTerm,
      leaderId: this.nodeId,
      prevLogIndex,
      prevLogTerm,
      entries,
      leaderCommit: this.commitIndex
    };
    
    this.cluster.send(this.nodeId, followerId, message);
    this.stats.messagesSent++;
  }

  handleAppendEntries(message, senderId) {
    const { term, leaderId, prevLogIndex, prevLogTerm, entries, leaderCommit } = message;
    
    let success = false;
    
    if (term < this.state.currentTerm) {
      success = false;
    } else {
      if (term > this.state.currentTerm) {
        this.becomeFollower(term);
      }
      
      if (this.currentState === NodeState.CANDIDATE) {
        this.becomeFollower(term);
      }
      
      this.resetElectionTimer();
      
      // Check log consistency
      if (prevLogIndex === -1 || 
          (prevLogIndex < this.state.log.length && 
           this.state.getEntry(prevLogIndex).term === prevLogTerm)) {
        
        success = true;
        
        // Append new entries
        let logIndex = prevLogIndex + 1;
        for (const entry of entries) {
          if (logIndex < this.state.log.length) {
            if (this.state.getEntry(logIndex).term !== entry.term) {
              this.state.deleteEntriesFrom(logIndex);
              this.state.appendEntry(entry);
            }
          } else {
            this.state.appendEntry(entry);
          }
          logIndex++;
        }
        
        // Update commit index
        if (leaderCommit > this.commitIndex) {
          this.commitIndex = Math.min(leaderCommit, this.state.getLastLogIndex());
          this.applyCommittedEntries();
        }
      }
    }
    
    const response = {
      type: MessageType.APPEND_ENTRIES_RESPONSE,
      term: this.state.currentTerm,
      success,
      matchIndex: success ? prevLogIndex + entries.length : -1
    };
    
    this.cluster.send(this.nodeId, senderId, response);
    this.stats.messagesSent++;
  }

  handleAppendEntriesResponse(message, senderId) {
    if (this.currentState !== NodeState.LEADER) return;
    
    const { term, success, matchIndex } = message;
    
    if (term > this.state.currentTerm) {
      this.becomeFollower(term);
      return;
    }
    
    if (term === this.state.currentTerm) {
      if (success) {
        this.nextIndex.set(senderId, matchIndex + 1);
        this.matchIndex.set(senderId, matchIndex);
        this.updateCommitIndex();
      } else {
        this.nextIndex.set(senderId, Math.max(0, this.nextIndex.get(senderId) - 1));
        this.sendAppendEntries(senderId);
      }
    }
  }

  updateCommitIndex() {
    const indices = Array.from(this.matchIndex.values());
    indices.push(this.state.getLastLogIndex());
    indices.sort((a, b) => b - a);
    
    const majorityIndex = indices[Math.floor(indices.length / 2)];
    
    if (majorityIndex > this.commitIndex && 
        this.state.getEntry(majorityIndex).term === this.state.currentTerm) {
      this.commitIndex = majorityIndex;
      this.applyCommittedEntries();
    }
  }

  applyCommittedEntries() {
    while (this.lastApplied < this.commitIndex) {
      this.lastApplied++;
      const entry = this.state.getEntry(this.lastApplied);
      this.emit('commandApplied', entry);
      this.stats.commandsApplied++;
    }
  }

  // ==========================================================================
  // CLIENT INTERFACE
  // ==========================================================================

  async submitCommand(command) {
    if (this.currentState !== NodeState.LEADER) {
      throw new Error('Not the leader');
    }
    
    const entry = new LogEntry(
      this.state.currentTerm,
      command,
      this.state.log.length
    );
    
    this.state.appendEntry(entry);
    console.log(`[${this.nodeId}] Command submitted: ${JSON.stringify(command)}`);
    
    return new Promise((resolve) => {
      const checkCommitted = () => {
        if (this.lastApplied >= entry.index) {
          resolve({ success: true, index: entry.index });
        } else {
          setTimeout(checkCommitted, 10);
        }
      };
      checkCommitted();
    });
  }

  // ==========================================================================
  // MESSAGE HANDLING
  // ==========================================================================

  handleMessage(message, senderId) {
    this.stats.messagesReceived++;
    
    switch (message.type) {
      case MessageType.REQUEST_VOTE:
        this.handleRequestVote(message, senderId);
        break;
      case MessageType.REQUEST_VOTE_RESPONSE:
        this.handleRequestVoteResponse(message, senderId);
        break;
      case MessageType.APPEND_ENTRIES:
        this.handleAppendEntries(message, senderId);
        break;
      case MessageType.APPEND_ENTRIES_RESPONSE:
        this.handleAppendEntriesResponse(message, senderId);
        break;
    }
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  getState() {
    return {
      nodeId: this.nodeId,
      state: this.currentState,
      term: this.state.currentTerm,
      commitIndex: this.commitIndex,
      logLength: this.state.log.length,
      stats: { ...this.stats }
    };
  }

  shutdown() {
    this.stopElectionTimer();
    this.stopHeartbeatTimer();
  }
}

// ============================================================================
// CLUSTER SIMULATION
// ============================================================================

class RaftCluster {
  constructor(nodeCount, config = {}) {
    this.nodes = new Map();
    this.network = new NetworkSimulator(config.networkDelay || 10);
    this.votes = new Map();
    
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `node-${i}`;
      const node = new RaftNode(nodeId, this, config);
      
      node.on('commandApplied', (entry) => {
        console.log(`[${nodeId}] Applied: ${JSON.stringify(entry.command)}`);
      });
      
      this.nodes.set(nodeId, node);
    }
  }

  send(fromId, toId, message) {
    this.network.send(() => {
      const toNode = this.nodes.get(toId);
      if (toNode) {
        toNode.handleMessage(message, fromId);
      }
    });
    
    if (message.type === MessageType.REQUEST_VOTE_RESPONSE && message.voteGranted) {
      if (!this.votes.has(toId)) {
        this.votes.set(toId, new Set());
      }
      this.votes.get(toId).add(fromId);
    }
  }

  broadcast(fromId, message) {
    if (message.type === MessageType.REQUEST_VOTE) {
      this.votes.set(fromId, new Set([fromId]));
    }
    
    this.nodes.forEach((node, nodeId) => {
      if (nodeId !== fromId) {
        this.send(fromId, nodeId, message);
      }
    });
  }

  countVotesReceived(nodeId) {
    return this.votes.has(nodeId) ? this.votes.get(nodeId).size : 0;
  }

  getAllNodeIds() {
    return Array.from(this.nodes.keys());
  }

  getNodeCount() {
    return this.nodes.size;
  }

  getLeader() {
    for (const [nodeId, node] of this.nodes) {
      if (node.currentState === NodeState.LEADER) {
        return node;
      }
    }
    return null;
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  async submitCommand(command) {
    const leader = this.getLeader();
    if (!leader) {
      throw new Error('No leader elected');
    }
    return leader.submitCommand(command);
  }

  printClusterState() {
    console.log('\n' + '='.repeat(80));
    console.log('CLUSTER STATE');
    console.log('='.repeat(80));
    
    this.nodes.forEach((node, nodeId) => {
      const state = node.getState();
      console.log(`${nodeId}: ${state.state} (Term: ${state.term}, ` +
        `Commit: ${state.commitIndex}, Log: ${state.logLength})`);
    });
    
    console.log('='.repeat(80) + '\n');
  }

  shutdown() {
    this.nodes.forEach(node => node.shutdown());
    this.network.shutdown();
  }
}

// ============================================================================
// NETWORK SIMULATOR
// ============================================================================

class NetworkSimulator {
  constructor(delay = 10) {
    this.delay = delay;
    this.messageQueue = [];
  }

  send(callback) {
    const jitter = Math.random() * this.delay;
    setTimeout(callback, this.delay + jitter);
  }

  shutdown() {
    // Clean up any pending messages
  }
}

// ============================================================================
// DEMO AND TESTING
// ============================================================================

async function demonstrateRaft() {
  console.log('RAFT CONSENSUS ALGORITHM DEMONSTRATION\n');
  
  // Create a 5-node cluster
  console.log('Creating 5-node Raft cluster...\n');
  const cluster = new RaftCluster(5, {
    electionTimeoutMin: 150,
    electionTimeoutMax: 300,
    heartbeatInterval: 50
  });
  
  // Wait for leader election
  console.log('Waiting for leader election...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  cluster.printClusterState();
  
  // Submit commands
  console.log('Submitting commands to the cluster...\n');
  
  try {
    await cluster.submitCommand({ action: 'SET', key: 'x', value: 10 });
    await cluster.submitCommand({ action: 'SET', key: 'y', value: 20 });
    await cluster.submitCommand({ action: 'SET', key: 'z', value: 30 });
    
    console.log('\nCommands committed successfully!\n');
  } catch (error) {
    console.error('Error submitting commands:', error.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  cluster.printClusterState();
  
  // Simulate leader failure
  console.log('Simulating leader failure...\n');
  const leader = cluster.getLeader();
  if (leader) {
    console.log(`Shutting down leader: ${leader.nodeId}\n`);
    leader.shutdown();
  }
  
  // Wait for new leader election
  console.log('Waiting for new leader election...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  cluster.printClusterState();
  
  // Submit more commands to new leader
  console.log('Submitting commands to new leader...\n');
  
  try {
    await cluster.submitCommand({ action: 'SET', key: 'a', value: 100 });
    console.log('\nCommand committed to new leader!\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  cluster.printClusterState();
  
  // Print statistics
  console.log('NODE STATISTICS:');
  console.log('='.repeat(80));
  cluster.nodes.forEach((node, nodeId) => {
    const stats = node.stats;
    console.log(`${nodeId}:`);
    console.log(`  Messages Received: ${stats.messagesReceived}`);
    console.log(`  Messages Sent: ${stats.messagesSent}`);
    console.log(`  Elections Started: ${stats.electionsStarted}`);
    console.log(`  Elections Won: ${stats.electionsWon}`);
    console.log(`  Commands Applied: ${stats.commandsApplied}`);
  });
  console.log('='.repeat(80) + '\n');
  
  cluster.shutdown();
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  demonstrateRaft().catch(console.error);
}

module.exports = {
  RaftNode,
  RaftCluster,
  NodeState,
  MessageType,
  LogEntry,
  PersistentState
};

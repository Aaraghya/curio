import { useState, useEffect } from 'react';

interface Node {
  id: string;
  label: string;
  type: string;
  description: string;
  domain: 'Technology' | 'History' | 'Science' | 'Culture';
  x: number; // Percent 0-100
  y: number;
}

interface Edge {
  source: string;
  target: string;
  connection_type: string;
  description: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export function useGraphLayout(graphData: GraphData | null) {
  const [nodes, setNodes] = useState<Node[]>([]);
  
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) {
      setNodes([]);
      return;
    }

    // Initialize node positions around the center (50, 50) with slight randomness
    const initializedNodes = graphData.nodes.map((node, i) => {
      // Keep root node fixed exactly at the center (50, 50)
      if (i === 0) {
        return { ...node, x: 50, y: 50 };
      }
      
      const angle = (i * 2 * Math.PI) / (graphData.nodes.length - 1);
      const radius = 25 + Math.random() * 5; // Distance from center
      return {
        ...node,
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius
      };
    });

    // Run custom force-directed simulation steps
    const simulationNodes = [...initializedNodes];
    const width = 100;
    const height = 100;
    
    const iterations = 80;
    const damping = 0.85;
    
    // Node physical variables
    const velocities = simulationNodes.map(() => ({ dx: 0, dy: 0 }));

    for (let step = 0; step < iterations; step++) {
      // 1. REPULSION FORCE (all pairs push away)
      for (let i = 0; i < simulationNodes.length; i++) {
        for (let j = i + 1; j < simulationNodes.length; j++) {
          const n1 = simulationNodes[i];
          const n2 = simulationNodes[j];
          
          const rx = n2.x - n1.x;
          const ry = n2.y - n1.y;
          const distSq = rx * rx + ry * ry || 0.1;
          const dist = Math.sqrt(distSq);
          
          // Force inverse square law
          const force = 3.0 / distSq; 
          const fx = (rx / dist) * force;
          const fy = (ry / dist) * force;

          // Push n1 left, n2 right
          if (i !== 0) { // Don't move the root seed node
            velocities[i].dx -= fx;
            velocities[i].dy -= fy;
          }
          if (j !== 0) {
            velocities[j].dx += fx;
            velocities[j].dy += fy;
          }
        }
      }

      // 2. SPRING FORCE (attraction along edge lines)
      graphData.edges.forEach(edge => {
        const i = simulationNodes.findIndex(n => n.id === edge.source);
        const j = simulationNodes.findIndex(n => n.id === edge.target);
        
        if (i === -1 || j === -1) return;
        
        const n1 = simulationNodes[i];
        const n2 = simulationNodes[j];
        
        const rx = n2.x - n1.x;
        const ry = n2.y - n1.y;
        const dist = Math.sqrt(rx * rx + ry * ry) || 0.1;
        
        // Target rest length of connection
        const restLength = 15;
        const k = 0.08; // Spring constant
        const force = k * (dist - restLength);
        
        const fx = (rx / dist) * force;
        const fy = (ry / dist) * force;

        if (i !== 0) {
          velocities[i].dx += fx;
          velocities[i].dy += fy;
        }
        if (j !== 0) {
          velocities[j].dx -= fx;
          velocities[j].dy -= fy;
        }
      });

      // 3. CENTER GRAVITY & UPDATE
      for (let i = 1; i < simulationNodes.length; i++) {
        const node = simulationNodes[i];
        
        // Pull gently to center to avoid drifting off canvas bounds
        const gx = (50 - node.x) * 0.015;
        const gy = (50 - node.y) * 0.015;
        
        velocities[i].dx += gx;
        velocities[i].dy += gy;

        // Apply velocity with damping damping
        node.x += velocities[i].dx;
        node.y += velocities[i].dy;
        
        velocities[i].dx *= damping;
        velocities[i].dy *= damping;

        // Clamp to boundary bounds
        node.x = Math.max(8, Math.min(92, node.x));
        node.y = Math.max(8, Math.min(92, node.y));
      }
    }

    setNodes(simulationNodes);
  }, [graphData]);

  return nodes;
}

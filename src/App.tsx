import { useState, useEffect, useRef } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import type { Node, Edge } from 'reactflow'; // "type" keyword to avoid Vite errors
import 'reactflow/dist/style.css';
import axios from 'axios';

const initialNodes: Node[] = [
  { id: '1', data: { label: 'Control Plane: Init Task' }, position: { x: 250, y: 50 }, style: { backgroundColor: '#e2e8f0', padding: 15, borderRadius: 8 } },
  { id: '2', data: { label: 'Go Agent: Polling CSR...' }, position: { x: 250, y: 150 }, style: { backgroundColor: '#e2e8f0', padding: 15, borderRadius: 8 } },
  { id: '3', data: { label: 'Final State' }, position: { x: 250, y: 250 }, style: { backgroundColor: '#e2e8f0', padding: 15, borderRadius: 8 } }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: false },
  { id: 'e2-3', source: '2', target: '3', animated: false }
];

function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('IDLE');
  
  // Naya state logs store karne ke liye
  const [logs, setLogs] = useState<string>("");

  // Auto-scroll ke liye reference
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const startWorkflow = async () => {
    try {
      setStatus('PENDING');
      setLogs("System: Initializing request to backend...\n"); // Initial local log
      
      // Graph ko reset aur animate karo
      setNodes((nds) => nds.map((n) => {
        if (n.id === '1') return { ...n, style: { ...n.style, backgroundColor: '#86efac' } };
        if (n.id === '2') return { ...n, style: { ...n.style, backgroundColor: '#fef08a' } };
        return { ...n, style: { ...n.style, backgroundColor: '#e2e8f0' }, data: { label: 'Final State' } };
      }));
      setEdges((eds) => eds.map((e) => ({ ...e, animated: true })));

      const response = await axios.post('http://localhost:8080/api/workflows/create?taskType=IMPORT_CLUSTER');
      setTaskId(response.data.id);
      
    } catch (error) {
      console.error("Error creating task", error);
      alert("Failed to connect to backend! Spring Boot chal raha hai?");
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (taskId && status === 'PENDING') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:8080/api/workflows/${taskId}`);
          const currentStatus = res.data.status;
          
          // YAHAN CHANGE KIYA HAI: Frontend ka message + Backend ke logs
          if (res.data.terminalLogs) {
            setLogs("System: Initializing request to backend...\n" + res.data.terminalLogs);
          }

          if (currentStatus !== 'PENDING') {
            setStatus(currentStatus);
            
            const isSuccess = currentStatus === 'COMPLETED';
            const color = isSuccess ? '#86efac' : '#fca5a5';

            setNodes((nds) => nds.map((n) => {
              if (n.id === '2') return { ...n, style: { ...n.style, backgroundColor: color } }; 
              if (n.id === '3') return { ...n, style: { ...n.style, backgroundColor: color }, data: { label: `Result: ${currentStatus}` } };
              return n;
            }));
            setEdges((eds) => eds.map((e) => ({ ...e, animated: false })));
          }
        } catch (error) {
          console.error("Error fetching status", error);
        }
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [taskId, status]);

  // Jaise hi 'logs' state change hogi, terminal auto-scroll karega bottom tak
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      
      {/* Header Panel */}
      <div style={{ padding: '20px', backgroundColor: '#1e293b', color: 'white', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <h2>Control Plane Dashboard 🚀</h2>
        <button 
          onClick={startWorkflow} 
          disabled={status === 'PENDING'}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold' }}
        >
          {status === 'PENDING' ? 'Workflow Running...' : 'Start Import Cluster Task'}
        </button>
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#cbd5e1', minHeight: '20px', margin: '10px 0 0 0' }}>
          {taskId ? `Active Task ID: ${taskId}` : ''}
        </p>
      </div>

      {/* Graph Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Live Terminal Box */}
      <div style={{
        backgroundColor: "#0d1117", // GitHub theme dark background
        color: "#4af626", // Hacker terminal green
        padding: "15px",
        fontFamily: "'Courier New', Courier, monospace",
        height: "250px", // Fixed height for terminal
        overflowY: "auto",
        borderTop: "4px solid #30363d",
      }}>
        <h4 style={{ color: "#ffffff", margin: "0 0 10px 0", borderBottom: "1px solid #30363d", paddingBottom: "8px", display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "10px" }}>⚡</span> Live Execution Logs
        </h4>
        
        <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
          {logs ? (
            logs.split('\n').map((line, index) => (
              line.trim() !== "" && <div key={index} style={{ marginBottom: "2px" }}>{line}</div>
            ))
          ) : (
            <div style={{ color: "#8b949e" }}>Waiting for task execution...</div>
          )}
          {/* This empty div is the target for auto-scrolling */}
          <div ref={terminalEndRef} />
        </div>
      </div>

    </div>
  );
}

export default App;
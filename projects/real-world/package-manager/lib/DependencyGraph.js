const fs = require('fs');
const path = require('path');

class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(name, version) {
    if (!this.nodes.has(name)) {
      this.nodes.set(name, {
        id: name,
        label: `${name}\n${version}`,
        version
      });
    }
  }

  addEdge(from, to) {
    this.edges.push({ from, to });
  }

  getGraphData() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }

  generateHTML() {
    const data = this.getGraphData();
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Graph</title>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .header {
      background: rgba(255, 255, 255, 0.95);
      padding: 1.5rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    h1 {
      margin: 0;
      color: #2c3e50;
      font-size: 2rem;
    }

    .stats {
      margin-top: 0.5rem;
      color: #7f8c8d;
    }

    #network {
      width: 100%;
      height: calc(100vh - 120px);
      background: white;
      margin: 1rem;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .controls {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      display: flex;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      background: white;
      border: none;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.2s;
    }

    .btn:hover {
      transform: translateY(-2px);
    }

    .legend {
      position: fixed;
      top: 150px;
      right: 2rem;
      background: white;
      padding: 1.5rem;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .legend h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
    }

    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      color: #555;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      margin-right: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📦 Dependency Graph</h1>
    <div class="stats">
      <strong>${data.nodes.length}</strong> packages | 
      <strong>${data.edges.length}</strong> dependencies
    </div>
  </div>

  <div id="network"></div>

  <div class="legend">
    <h3>Legend</h3>
    <div class="legend-item">
      <div class="legend-color" style="background: #3498db;"></div>
      <span>Package Node</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #95a5a6;"></div>
      <span>Dependency Edge</span>
    </div>
  </div>

  <div class="controls">
    <button class="btn" onclick="network.fit()">Fit View</button>
    <button class="btn" onclick="resetZoom()">Reset Zoom</button>
  </div>

  <script>
    const nodes = new vis.DataSet(${JSON.stringify(data.nodes)});
    const edges = new vis.DataSet(${JSON.stringify(data.edges)});

    const container = document.getElementById('network');
    const data = { nodes, edges };
    
    const options = {
      nodes: {
        shape: 'box',
        margin: 10,
        font: {
          size: 14,
          face: 'Courier New',
          multi: true,
          bold: '14px courier #000'
        },
        color: {
          background: '#3498db',
          border: '#2980b9',
          highlight: {
            background: '#e74c3c',
            border: '#c0392b'
          }
        },
        shadow: true
      },
      edges: {
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.5
          }
        },
        color: {
          color: '#95a5a6',
          highlight: '#e74c3c'
        },
        smooth: {
          type: 'cubicBezier',
          forceDirection: 'horizontal'
        },
        shadow: true
      },
      layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          nodeSpacing: 150,
          levelSeparation: 150
        }
      },
      physics: {
        enabled: false
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: true,
        keyboard: true
      }
    };

    const network = new vis.Network(container, data, options);

    function resetZoom() {
      network.moveTo({
        scale: 1,
        position: { x: 0, y: 0 }
      });
    }

    // Click event
    network.on('click', function(params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        console.log('Clicked node:', nodeId);
      }
    });

    // Hover event
    network.on('hoverNode', function(params) {
      container.style.cursor = 'pointer';
    });

    network.on('blurNode', function(params) {
      container.style.cursor = 'default';
    });
  </script>
</body>
</html>`;

    const outputPath = path.join(process.cwd(), 'dependency-graph.html');
    fs.writeFileSync(outputPath, html);
    
    return outputPath;
  }
}

module.exports = DependencyGraph;

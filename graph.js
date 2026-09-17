/**
 * Interactive 2D Canvas Knowledge Graph
 * Simulates a dynamic force-directed network showing notes and [[Wikilinks]].
 * Supports node dragging, pan/zoom, hover highlights, and click navigation.
 */

class KnowledgeGraph {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.options = options;

    this.nodes = [];
    this.edges = [];
    this.activeNoteId = null;

    // Viewport transform
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;

    // Interaction state
    this.isDraggingNode = false;
    this.draggedNode = null;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.hoveredNode = null;
    this.animId = null;

    this.initEvents();
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 800) * dpr;
    this.canvas.height = (rect.height || 600) * dpr;
    this.canvas.style.width = `${rect.width || 800}px`;
    this.canvas.style.height = `${rect.height || 600}px`;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 800;
    this.height = rect.height || 600;
  }

  setData(notes, activeNoteId) {
    this.activeNoteId = activeNoteId;
    const width = this.width || 800;
    const height = this.height || 600;

    // Map existing positions if updating
    const oldPositions = new Map();
    this.nodes.forEach(n => oldPositions.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }));

    // Build nodes
    this.nodes = notes.map((note, index) => {
      const old = oldPositions.get(note.id);
      const angle = (index / Math.max(1, notes.length)) * Math.PI * 2;
      const radius = 120 + Math.random() * 80;
      return {
        id: note.id,
        title: note.title,
        folder: note.folder,
        tags: note.tags || [],
        x: old ? old.x : width / 2 + Math.cos(angle) * radius,
        y: old ? old.y : height / 2 + Math.sin(angle) * radius,
        vx: old ? old.vx : (Math.random() - 0.5) * 2,
        vy: old ? old.vy : (Math.random() - 0.5) * 2,
        radius: note.id === activeNoteId ? 14 : 10,
        linksCount: 0
      };
    });

    // Build edges from [[Wikilinks]]
    const nodeMap = new Map();
    this.nodes.forEach(n => {
      nodeMap.set(n.id, n);
      nodeMap.set(n.title.trim().toLowerCase(), n);
    });

    this.edges = [];
    notes.forEach(note => {
      const sourceNode = nodeMap.get(note.id);
      if (!sourceNode) return;

      const wikilinks = window.markdownParser.extractWikilinks(note.content);
      wikilinks.forEach(linkTitle => {
        const targetNode = nodeMap.get(linkTitle.toLowerCase());
        if (targetNode && targetNode.id !== sourceNode.id) {
          // Avoid duplicate bidirectional edge representations
          const exists = this.edges.some(
            e => (e.source.id === sourceNode.id && e.target.id === targetNode.id) ||
                 (e.source.id === targetNode.id && e.target.id === sourceNode.id)
          );
          if (!exists) {
            this.edges.push({ source: sourceNode, target: targetNode });
            sourceNode.linksCount++;
            targetNode.linksCount++;
          }
        }
      });
    });

    // Adjust radius based on connections
    this.nodes.forEach(n => {
      n.radius = Math.min(22, 9 + n.linksCount * 2 + (n.id === this.activeNoteId ? 5 : 0));
    });

    this.startSimulation();
  }

  startSimulation() {
    if (this.animId) cancelAnimationFrame(this.animId);

    let iteration = 0;
    const maxIterations = 350;

    const step = () => {
      this.updatePhysics();
      this.render();
      iteration++;
      if (iteration < maxIterations || this.isDraggingNode || this.hoveredNode) {
        this.animId = requestAnimationFrame(step);
      }
    };

    this.animId = requestAnimationFrame(step);
  }

  updatePhysics() {
    const kRepel = 1800;
    const kSpring = 0.035;
    const length = 110;
    const damping = 0.82;
    const centerGravity = 0.015;

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Node Repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n1 = this.nodes[i];
        const n2 = this.nodes[j];
        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 300) {
          const force = kRepel / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // Edge Attraction
    for (const edge of this.edges) {
      let dx = edge.target.x - edge.source.x;
      let dy = edge.target.y - edge.source.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - length) * kSpring;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      edge.source.vx += fx;
      edge.source.vy += fy;
      edge.target.vx -= fx;
      edge.target.vy -= fy;
    }

    // Centering force & update positions
    for (const node of this.nodes) {
      if (node === this.draggedNode) continue;
      node.vx += (centerX - node.x) * centerGravity;
      node.vy += (centerY - node.y) * centerGravity;

      node.vx *= damping;
      node.vy *= damping;

      node.x += node.vx;
      node.y += node.vy;
    }
  }

  render() {
    if (!this.ctx) return;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();

    // Pan and Zoom
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    // Render Edges
    for (const edge of this.edges) {
      const isConnected = this.hoveredNode &&
        (edge.source.id === this.hoveredNode.id || edge.target.id === this.hoveredNode.id);

      this.ctx.beginPath();
      this.ctx.moveTo(edge.source.x, edge.source.y);
      this.ctx.lineTo(edge.target.x, edge.target.y);

      if (isConnected) {
        this.ctx.strokeStyle = '#6366f1';
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
        this.ctx.shadowBlur = 8;
      } else {
        this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
        this.ctx.lineWidth = 1.2;
        this.ctx.shadowBlur = 0;
      }
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;

    // Render Nodes
    for (const node of this.nodes) {
      const isActive = node.id === this.activeNoteId;
      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
      const isNeighbor = this.hoveredNode && this.edges.some(
        e => (e.source.id === this.hoveredNode.id && e.target.id === node.id) ||
             (e.target.id === this.hoveredNode.id && e.source.id === node.id)
      );

      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      if (isActive) {
        this.ctx.fillStyle = '#6366f1';
        this.ctx.shadowColor = 'rgba(99, 102, 241, 0.8)';
        this.ctx.shadowBlur = 15;
      } else if (isHovered) {
        this.ctx.fillStyle = '#ec4899';
        this.ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
        this.ctx.shadowBlur = 12;
      } else if (isNeighbor) {
        this.ctx.fillStyle = '#10b981';
        this.ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
        this.ctx.shadowBlur = 8;
      } else {
        this.ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        this.ctx.shadowBlur = 0;
      }

      this.ctx.fill();

      // Border ring
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.9)';
      this.ctx.stroke();

      // Node label
      this.ctx.shadowBlur = 0;
      this.ctx.font = `${isActive || isHovered ? 'bold 12px' : '11px'} 'Plus Jakarta Sans', sans-serif`;
      this.ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.title, node.x, node.y + node.radius + 14);
    }

    this.ctx.restore();
  }

  // Coordinate transformations
  screenToWorld(screenX, screenY) {
    const x = (screenX - this.panX) / this.zoom;
    const y = (screenY - this.panY) / this.zoom;
    return { x, y };
  }

  findNodeAt(screenX, screenY) {
    const { x, y } = this.screenToWorld(screenX, screenY);
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = x - n.x;
      const dy = y - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 4) {
        return n;
      }
    }
    return null;
  }

  initEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const node = this.findNodeAt(sx, sy);
      if (node) {
        this.isDraggingNode = true;
        this.draggedNode = node;
        window.soundEffects.playClick();
      } else {
        this.isPanning = true;
        this.panStartX = sx - this.panX;
        this.panStartY = sy - this.panY;
      }
      this.startSimulation();
    });

    window.addEventListener('mousemove', e => {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.isDraggingNode && this.draggedNode) {
        const { x, y } = this.screenToWorld(sx, sy);
        this.draggedNode.x = x;
        this.draggedNode.y = y;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
        this.startSimulation();
      } else if (this.isPanning) {
        this.panX = sx - this.panStartX;
        this.panY = sy - this.panStartY;
        this.render();
      } else if (sx >= 0 && sx <= rect.width && sy >= 0 && sy <= rect.height) {
        const prevHover = this.hoveredNode;
        this.hoveredNode = this.findNodeAt(sx, sy);
        this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
        if (prevHover !== this.hoveredNode) {
          this.render();
        }
      }
    });

    window.addEventListener('mouseup', e => {
      if (this.isDraggingNode && this.draggedNode) {
        this.isDraggingNode = false;
        this.draggedNode = null;
      }
      if (this.isPanning) {
        this.isPanning = false;
      }
    });

    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const node = this.findNodeAt(sx, sy);
      if (node && this.options.onSelectNode) {
        this.options.onSelectNode(node.id);
      }
    });

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.max(0.3, Math.min(3.0, this.zoom * zoomFactor));

      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;

      this.render();
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.resize();
      this.render();
    });
  }

  resetView() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.render();
  }

  zoomIn() {
    this.zoom = Math.min(3.0, this.zoom * 1.2);
    this.render();
  }

  zoomOut() {
    this.zoom = Math.max(0.3, this.zoom / 1.2);
    this.render();
  }
}

window.KnowledgeGraph = KnowledgeGraph;

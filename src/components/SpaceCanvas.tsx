import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

export default function SpaceCanvas() {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number; tx: number; ty: number }>({ x: 0, y: 0, tx: 0, ty: 0 });

  // Interpolation targets for the four themes
  const targetColorsRef = useRef<{
    nodeColor: THREE.Color;
    lineColor: THREE.Color;
    starColor: THREE.Color;
    cloudColor1: THREE.Color;
    cloudColor2: THREE.Color;
  }>({
    nodeColor: new THREE.Color(0xffffff),
    lineColor: new THREE.Color(0x333333),
    starColor: new THREE.Color(0x777777),
    cloudColor1: new THREE.Color(0x1a1a1a),
    cloudColor2: new THREE.Color(0x0a0a0a),
  });

  // Keep colors updated based on selection
  useEffect(() => {
    switch (theme) {
      case 'midnight':
        targetColorsRef.current = {
          nodeColor: new THREE.Color('#ffffff'),
          lineColor: new THREE.Color('#3a3a3a'),
          starColor: new THREE.Color('#999999'),
          cloudColor1: new THREE.Color('#0c0c0c'),
          cloudColor2: new THREE.Color('#050505'),
        };
        break;
      case 'nordic':
        targetColorsRef.current = {
          nodeColor: new THREE.Color('#38bdf8'), // glowing sky cyan
          lineColor: new THREE.Color('#0e7490'), // rich polar fjord teal
          starColor: new THREE.Color('#2dd4bf'), // auroral teal glimmering stars
          cloudColor1: new THREE.Color('#030a16'), // deep arctic midnight fjord water
          cloudColor2: new THREE.Color('#020617'),
        };
        break;
      case 'light':
        targetColorsRef.current = {
          nodeColor: new THREE.Color('#020306'),
          lineColor: new THREE.Color('#020306').multiplyScalar(0.7),
          starColor: new THREE.Color('#020306').multiplyScalar(0.5),
          cloudColor1: new THREE.Color('#f1f5f9'),
          cloudColor2: new THREE.Color('#e2e8f0'),
        };
        break;
      case 'instagram':
        targetColorsRef.current = {
          nodeColor: new THREE.Color('#e1306c'), // Instagram pink
          lineColor: new THREE.Color('#f77737'), // Instagram orange
          starColor: new THREE.Color('#bc1888'), // Instagram purple
          cloudColor1: new THREE.Color('#121212'), // Instagram dark
          cloudColor2: new THREE.Color('#000000'),
        };
        break;
    }
  }, [theme]);

  // Track cursor coordinates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Map coordinates to standardized 3D coordinate ratios (-1 to +1)
      mouseRef.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Setup
    const scene = new THREE.Scene();

    // 2. Clearer Depth / Angle Perspective Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 25;

    // 3. WebGL High-performance Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Generate Circular Glowing Alpha Map
    const createCircleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 125;
      canvas.height = 125;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(62.5, 62.5, 0, 62.5, 62.5, 62.5);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.12, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.25)');
        gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(62.5, 62.5, 62.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return new THREE.CanvasTexture(canvas);
    };
    const glowTexture = createCircleTexture();

    // 5. LAYER A: Constellation Nodes (Interactive Social Network Core)
    const nodeCount = 70;
    const initialPositions: THREE.Vector3[] = [];
    const driftPositions: THREE.Vector3[] = [];
    const nodeSpeeds: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const x = (Math.random() - 0.5) * 36;
      const y = (Math.random() - 0.5) * 22;
      const z = (Math.random() - 0.5) * 12;

      const pos = new THREE.Vector3(x, y, z);
      initialPositions.push(pos.clone());
      driftPositions.push(pos.clone());
      nodeSpeeds.push(
        new THREE.Vector3((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008)
      );
    }

    const pointsGeometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      positionArray[i * 3] = driftPositions[i].x;
      positionArray[i * 3 + 1] = driftPositions[i].y;
      positionArray[i * 3 + 2] = driftPositions[i].z;
    }
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.65,
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const constellationPoints = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(constellationPoints);

    // 6. Constellation Linkages (Proximity segments)
    const maxLines = 140;
    const linePositions = new Float32Array(maxLines * 2 * 3);
    const lineColors = new Float32Array(maxLines * 2 * 3);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    });
    const constellationLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(constellationLines);

    // 7. LAYER B: Deep Cosmos Starfield (Soothing ambient drifting backdrop)
    const starCount = 350;
    const starGeometry = new THREE.BufferGeometry();
    const starPosArr = new Float32Array(starCount * 3);
    const starSpeeds: number[] = [];

    for (let i = 0; i < starCount; i++) {
      starPosArr[i * 3] = (Math.random() - 0.5) * 60;
      starPosArr[i * 3 + 1] = (Math.random() - 0.5) * 40;
      starPosArr[i * 3 + 2] = (Math.random() - 0.5) * 20 - 15; // Deeper backplane
      starSpeeds.push(0.02 + Math.random() * 0.05);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPosArr, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.18,
      map: glowTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);

    // 8. LAYER C: Smooth Ambient Nebula Gels (3D blurred colored shapes that drift like plasma)
    const cloudCount = 3;
    const cloudsArray: { mesh: THREE.Mesh; seedX: number; seedY: number; scale: number }[] = [];

    const cloudGeo = new THREE.SphereGeometry(12, 16, 16);
    for (let i = 0; i < cloudCount; i++) {
      const cloudMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? targetColorsRef.current.cloudColor1 : targetColorsRef.current.cloudColor2,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide, // Inside-out soft light bounds
      });
      const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
      cloudMesh.position.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10 - 8);
      scene.add(cloudMesh);
      cloudsArray.push({
        mesh: cloudMesh,
        seedX: Math.random() * 50,
        seedY: Math.random() * 50,
        scale: 1.0 + Math.random() * 0.8,
      });
    }

    // Dynamic anim state colors
    const curNodesColor = new THREE.Color(targetColorsRef.current.nodeColor);
    const curLinesColor = new THREE.Color(targetColorsRef.current.lineColor);
    const curStarsColor = new THREE.Color(targetColorsRef.current.starColor);
    const curCloud1Color = new THREE.Color(targetColorsRef.current.cloudColor1);
    const curCloud2Color = new THREE.Color(targetColorsRef.current.cloudColor2);

    let animationId: number;
    const timer = new THREE.Timer();

    // Limit values to bounce nodes back
    const bounds = { x: 18, y: 12, z: 8 };

    // Primary Loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const delta = Math.min(timer.getDelta(), 0.1); // Cap lag jumps
      const elapsed = timer.getElapsed();

      // Lerp transition active colors matching current theme selections smoothly
      curNodesColor.lerp(targetColorsRef.current.nodeColor, 0.05);
      curLinesColor.lerp(targetColorsRef.current.lineColor, 0.05);
      curStarsColor.lerp(targetColorsRef.current.starColor, 0.05);
      curCloud1Color.lerp(targetColorsRef.current.cloudColor1, 0.05);
      curCloud2Color.lerp(targetColorsRef.current.cloudColor2, 0.05);

      // Inject colors to points materials
      pointsMaterial.color.copy(curNodesColor);
      starMaterial.color.copy(curStarsColor);

      // Update Gels colors
      cloudsArray.forEach((cloud, idx) => {
        const mat = cloud.mesh.material as THREE.MeshBasicMaterial;
        mat.color.copy(idx === 0 ? curCloud1Color : curCloud2Color);

        // Gentle undulating size pulsing of galaxy gel clouds
        const pulse = Math.sin(elapsed * 0.15 + cloud.seedX) * 0.16 + 1.2;
        cloud.mesh.scale.set(pulse * cloud.scale, pulse * cloud.scale, pulse * cloud.scale);

        // Slow calm drift orbit
        cloud.mesh.position.x += Math.cos(elapsed * 0.08 + cloud.seedX) * 0.015;
        cloud.mesh.position.y += Math.sin(elapsed * 0.08 + cloud.seedY) * 0.015;
      });

      // Lerp Mouse Position Coordinates for organic lagging track response
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.08;

      // Project normal mouse targets into 3D scene space values
      const mouse3D = new THREE.Vector3(mouseRef.current.x * bounds.x, mouseRef.current.y * bounds.y, 0);

      // Nodes Updates
      const posAttr = pointsGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < nodeCount; i++) {
        const drift = driftPositions[i];
        const vel = nodeSpeeds[i];

        // Drift speed addition
        drift.x += vel.x * delta * 60;
        drift.y += vel.y * delta * 60;
        drift.z += vel.z * delta * 60;

        // Bounding orbit box bounce checks
        if (Math.abs(drift.x) > bounds.x) {
          vel.x *= -1;
          drift.x = Math.sign(drift.x) * bounds.x;
        }
        if (Math.abs(drift.y) > bounds.y) {
          vel.y *= -1;
          drift.y = Math.sign(drift.y) * bounds.y;
        }
        if (Math.abs(drift.z) > bounds.z) {
          vel.z *= -1;
          drift.z = Math.sign(drift.z) * bounds.z;
        }

        // MOUSE MAGNETISM: Deflect space nodes when the mouse cursor gets inside proximity
        const distanceToMouse = drift.distanceTo(mouse3D);
        const deflectionLimit = 6.0;

        const activePos = drift.clone();
        if (distanceToMouse < deflectionLimit) {
          // Push constellation items away from cursor gracefully (magnetic repulsion)
          const force = (1.0 - distanceToMouse / deflectionLimit) * 1.5;
          const direction = drift.clone().sub(mouse3D).normalize();
          // Gentle scale factor
          activePos.addScaledVector(direction, force);
        }

        posAttr.setXYZ(i, activePos.x, activePos.y, activePos.z);
        // Sync our reference point for connection logic
        driftPositions[i].copy(activePos);
      }
      posAttr.needsUpdate = true;

      // Starfield organic slow falling snow drift
      const starAttr = starGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < starCount; i++) {
        let starsY = starAttr.getY(i);
        let starsZ = starAttr.getZ(i);

        // Fall downwards slowly
        starsY -= starSpeeds[i] * delta * 12;

        // Reset stars on floor plane to flow from heaven back again
        if (starsY < -25) {
          starsY = 25;
          starAttr.setX(i, (Math.random() - 0.5) * 60);
        }

        // Shimmer twinkle
        starAttr.setY(i, starsY);
      }
      starAttr.needsUpdate = true;

      // Draw active links
      let linkIndex = 0;
      const connectionThreshold = 6.5;

      const linePosAttr = lineGeometry.attributes.position as THREE.BufferAttribute;
      const lineColorAttr = lineGeometry.attributes.color as THREE.BufferAttribute;

      // Reset buffers fully
      linePosAttr.array.fill(0);
      lineColorAttr.array.fill(0);

      // Compute links with maximum threshold limits to avoid webgl overload
      for (let i = 0; i < nodeCount && linkIndex < maxLines; i++) {
        const nodeA = driftPositions[i];
        for (let j = i + 1; j < nodeCount && linkIndex < maxLines; j++) {
          const nodeB = driftPositions[j];
          const dist = nodeA.distanceTo(nodeB);

          if (dist < connectionThreshold) {
            const alpha = 1.0 - dist / connectionThreshold;

            // Link vertices positions
            linePosAttr.setXYZ(linkIndex * 2, nodeA.x, nodeA.y, nodeA.z);
            linePosAttr.setXYZ(linkIndex * 2 + 1, nodeB.x, nodeB.y, nodeB.z);

            // Shimmer fade line color
            const alphaColor = curLinesColor.clone().multiplyScalar(alpha * 0.95);
            lineColorAttr.setXYZ(linkIndex * 2, alphaColor.r, alphaColor.g, alphaColor.b);
            lineColorAttr.setXYZ(linkIndex * 2 + 1, alphaColor.r, alphaColor.g, alphaColor.b);

            linkIndex++;
          }
        }
      }
      linePosAttr.needsUpdate = true;
      lineColorAttr.needsUpdate = true;

      // Soothing double orbit scene rotation
      scene.rotation.y = elapsed * 0.012;
      scene.rotation.x = Math.sin(elapsed * 0.03) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    // Resize container observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const width = entry.contentRect.width || container.clientWidth;
      const height = entry.contentRect.height || container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
    resizeObserver.observe(container);

    // Precise garbage mitigation on unmount
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      pointsGeometry.dispose();
      lineGeometry.dispose();
      starGeometry.dispose();
      cloudGeo.dispose();
      pointsMaterial.dispose();
      lineMaterial.dispose();
      starMaterial.dispose();
      glowTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      id="cosmic-matrix-background"
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-transparent"
      style={{ opacity: 0.98 }}
    />
  );
}

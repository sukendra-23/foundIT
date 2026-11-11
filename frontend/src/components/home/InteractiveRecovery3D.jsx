import React, { useEffect, useRef, useState } from 'react';

// Stages in the genuine lost & found recovery lifecycle
const RECOVERY_STAGES = [
  {
    id: 1,
    tag: 'Stage 1',
    title: 'Report Filed',
    subtitle: 'Lost Item Profile & Serial Verification',
    icon: '📱',
    desc: 'The owner registers the lost smartphone with IMEI digits, distinguishing scratches, lock screen details, and location radius.',
    camPos: { x: -3.2, y: 2.2, z: 6.2 },
    lookAt: { x: -1.8, y: 0.8, z: 0 },
    highlight: 'phone',
    accentColor: '#F43F5E'
  },
  {
    id: 2,
    tag: 'Stage 2',
    title: 'Item Discovered',
    subtitle: 'Real-World Belongings Secured',
    icon: '🔑',
    desc: 'A community finder recovers the lost item alongside keychains, wallet, and earbuds. The items are documented with masked identifiers.',
    camPos: { x: 3.2, y: 2.2, z: 6.2 },
    lookAt: { x: 1.8, y: 0.8, z: 0 },
    highlight: 'items',
    accentColor: '#D97706'
  },
  {
    id: 3,
    tag: 'Stage 3',
    title: 'Location Beacon',
    subtitle: 'Proximity Match Detected',
    icon: '📍',
    desc: 'FoundiT algorithm detects an exact geographic overlap between the lost report and discovery location coordinates.',
    camPos: { x: 2.2, y: 2.0, z: 5.0 },
    lookAt: { x: 2.0, y: 0.4, z: -0.4 },
    highlight: 'beacon',
    accentColor: '#F43F5E'
  },
  {
    id: 4,
    tag: 'Stage 4',
    title: 'Admin Verification',
    subtitle: 'Evidence Inspection & Audit Approval',
    icon: '🛡️',
    desc: 'Platform administrators cross-examine proof of ownership. Gated direct chat unlocks once credentials are authenticated.',
    camPos: { x: 0, y: 2.8, z: 5.6 },
    lookAt: { x: 0, y: 1.4, z: 0 },
    highlight: 'shield',
    accentColor: '#10B981'
  },
  {
    id: 5,
    tag: 'Stage 5',
    title: 'Safe Handover',
    subtitle: 'Verified Reunification',
    icon: '🤝',
    desc: 'Owner and finder meet in an authorized public or campus location to inspect and return the belonging safely.',
    camPos: { x: 0, y: 2.2, z: 8.8 },
    lookAt: { x: 0, y: 0.8, z: 0 },
    highlight: 'handover',
    accentColor: '#059669'
  }
];

const InteractiveRecovery3D = () => {
  const mountRef = useRef(null);
  const [activeStage, setActiveStage] = useState(1);
  const [isRotating, setIsRotating] = useState(true);
  const [webGLFailed, setWebGLFailed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Audio synthesizer for non-intrusive UI clicks
  const playTone = (freq = 440) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  };

  useEffect(() => {
    let renderer, scene, camera, animId;
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let spherical = { radius: 10.5, theta: 0.2, phi: 1.25 };
    let targetSpherical = { radius: 10.5, theta: 0.2, phi: 1.25 };
    let targetLookAt = { x: 0, y: 0.8, z: 0 };
    let currentLookAt = { x: 0, y: 0.8, z: 0 };

    const container = mountRef.current;
    if (!container) return;

    // Load Three.js safely
    const initThree = () => {
      const THREE = window.THREE;
      if (!THREE) {
        setTimeout(initThree, 100);
        return;
      }

      try {
        const width = container.clientWidth || 700;
        const height = container.clientHeight || 560;

        // 1. Scene & Camera — Clean Light Studio
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xFAFAFA, 0.015);

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 3, 10.5);

        // 2. Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Clear existing canvas
        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(renderer.domElement);

        // 3. Studio Lighting (Natural, White & Subtle Pink/Greenish Highlights)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
        dirLight.position.set(6, 14, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);

        // Subtle Pink Accent Rim Light
        const pinkLight = new THREE.PointLight(0xF43F5E, 1.2, 18);
        pinkLight.position.set(-5, 4, 3);
        scene.add(pinkLight);

        // Subtle Emerald Fill Light
        const emeraldLight = new THREE.PointLight(0x10B981, 1.2, 18);
        emeraldLight.position.set(5, 3, -2);
        scene.add(emeraldLight);

        // 4. Ground: Shadow Plane & Studio Grid
        const shadowPlaneGeo = new THREE.PlaneGeometry(24, 24);
        const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.08 });
        const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.5;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        const gridHelper = new THREE.GridHelper(18, 24, 0xCBD5E1, 0xE2E8F0);
        gridHelper.position.y = -0.49;
        scene.add(gridHelper);

        // Center Studio Focus Ring
        const ringGeo = new THREE.RingGeometry(2.4, 2.44, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x0F172A, side: THREE.DoubleSide, transparent: true, opacity: 0.12 });
        const centerRing = new THREE.Mesh(ringGeo, ringMat);
        centerRing.rotation.x = Math.PI / 2;
        centerRing.position.y = -0.48;
        scene.add(centerRing);

        // ═════════════════════════════════════════════════════════════════════
        // 5. Authentic Real-World Lost & Found Belongings
        // ═════════════════════════════════════════════════════════════════════

        // ── Item A: Modern Smartphone with Lost Item Report Card ─────────────
        const phoneGroup = new THREE.Group();
        phoneGroup.position.set(-2.2, 0.7, 0);

        // Phone Chassis (Sleek silver/titanium edge)
        const phoneBodyGeo = new THREE.BoxGeometry(1.2, 2.3, 0.1);
        const phoneBodyMat = new THREE.MeshStandardMaterial({
          color: 0xE2E8F0,
          metalness: 0.85,
          roughness: 0.2
        });
        const phoneBody = new THREE.Mesh(phoneBodyGeo, phoneBodyMat);
        phoneBody.castShadow = true;
        phoneBody.receiveShadow = true;
        phoneGroup.add(phoneBody);

        // Camera Bump on back
        const camBumpGeo = new THREE.BoxGeometry(0.42, 0.42, 0.04);
        const camBumpMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.9, roughness: 0.2 });
        const camBump = new THREE.Mesh(camBumpGeo, camBumpMat);
        camBump.position.set(-0.32, 0.8, -0.07);
        phoneGroup.add(camBump);

        // Lens 1 & Lens 2
        const lensGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.1 });
        const lens1 = new THREE.Mesh(lensGeo, lensMat);
        lens1.rotation.x = Math.PI / 2;
        lens1.position.set(-0.32, 0.88, -0.09);
        phoneGroup.add(lens1);
        const lens2 = new THREE.Mesh(lensGeo, lensMat);
        lens2.rotation.x = Math.PI / 2;
        lens2.position.set(-0.32, 0.72, -0.09);
        phoneGroup.add(lens2);

        // Phone Screen: Realistic FoundiT Lost Item Report UI
        const screenCanvas = document.createElement('canvas');
        screenCanvas.width = 300;
        screenCanvas.height = 540;
        const sCtx = screenCanvas.getContext('2d');

        sCtx.fillStyle = '#FFFFFF';
        sCtx.fillRect(0, 0, 300, 540);

        sCtx.fillStyle = '#0F172A';
        sCtx.fillRect(0, 0, 300, 55);
        sCtx.fillStyle = '#FFFFFF';
        sCtx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        sCtx.fillText('FoundiT • Lost Item Case', 18, 34);

        sCtx.fillStyle = '#FFF1F2';
        sCtx.fillRect(18, 72, 264, 34);
        sCtx.strokeStyle = '#FDA4AF';
        sCtx.lineWidth = 1;
        sCtx.strokeRect(18, 72, 264, 34);
        sCtx.fillStyle = '#F43F5E';
        sCtx.font = 'bold 12px sans-serif';
        sCtx.fillText('● REPORT ACTIVE · SEARCHING', 30, 93);

        sCtx.fillStyle = '#F8FAFC';
        sCtx.fillRect(18, 120, 264, 180);
        sCtx.strokeStyle = '#E2E8F0';
        sCtx.strokeRect(18, 120, 264, 180);

        sCtx.fillStyle = '#0F172A';
        sCtx.font = 'bold 16px sans-serif';
        sCtx.fillText('iPhone 15 Pro (128GB)', 32, 150);

        sCtx.fillStyle = '#64748B';
        sCtx.font = '12px sans-serif';
        sCtx.fillText('Color: Natural Titanium', 32, 175);
        sCtx.fillText('Location: Main Library, 2nd Fl', 32, 198);
        sCtx.fillText('Identifier: Red floral sticker on back', 32, 221);
        sCtx.fillText('IMEI: 3594••••••82', 32, 244);

        sCtx.fillStyle = '#ECFDF5';
        sCtx.fillRect(18, 318, 264, 48);
        sCtx.strokeStyle = '#A7F3D0';
        sCtx.strokeRect(18, 318, 264, 48);
        sCtx.fillStyle = '#059669';
        sCtx.font = 'bold 13px sans-serif';
        sCtx.fillText('✓ Candidate Match Detected', 32, 346);

        sCtx.fillStyle = '#0F172A';
        sCtx.fillRect(18, 386, 264, 44);
        sCtx.fillStyle = '#FFFFFF';
        sCtx.font = 'bold 13px sans-serif';
        sCtx.fillText('View Verification Progress →', 56, 413);

        const screenTexture = new THREE.CanvasTexture(screenCanvas);
        const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
        const screenGeo = new THREE.PlaneGeometry(1.08, 2.15);
        const screenMesh = new THREE.Mesh(screenGeo, screenMat);
        screenMesh.position.z = 0.055;
        phoneGroup.add(screenMesh);
        scene.add(phoneGroup);

        // ── Item B: Real-World Belongings (Keys + Tag, Leather Wallet, AirPods) ─────
        const itemsGroup = new THREE.Group();
        itemsGroup.position.set(2.2, 0.8, 0);

        // 1. Classic Leather Bifold Wallet
        const walletGeo = new THREE.BoxGeometry(1.15, 0.78, 0.16);
        const walletMat = new THREE.MeshStandardMaterial({
          color: 0x78350F,
          roughness: 0.75,
          metalness: 0.08
        });
        const wallet = new THREE.Mesh(walletGeo, walletMat);
        wallet.position.set(0, 0.42, 0);
        wallet.rotation.set(0.18, -0.25, 0.08);
        wallet.castShadow = true;
        wallet.receiveShadow = true;
        itemsGroup.add(wallet);

        // Slotted Card with Emerald Accent
        const cardGeo = new THREE.BoxGeometry(0.85, 0.52, 0.02);
        const cardMat1 = new THREE.MeshStandardMaterial({ color: 0x10B981, roughness: 0.3 });
        const card1 = new THREE.Mesh(cardGeo, cardMat1);
        card1.position.set(0.08, 0.62, 0.09);
        card1.rotation.set(0.18, -0.25, 0.08);
        itemsGroup.add(card1);

        // Second Card with Soft Pink Stripe
        const cardMat2 = new THREE.MeshStandardMaterial({ color: 0xF43F5E, roughness: 0.3 });
        const card2 = new THREE.Mesh(cardGeo, cardMat2);
        card2.position.set(0.04, 0.56, 0.07);
        card2.rotation.set(0.18, -0.25, 0.08);
        itemsGroup.add(card2);

        // 2. Real Brass & Silver Keys with Silicone FoundiT Tag
        const keyRingGeo = new THREE.TorusGeometry(0.26, 0.035, 16, 32);
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xD1D5DB, metalness: 0.95, roughness: 0.15 });
        const keyRing = new THREE.Mesh(keyRingGeo, chromeMat);
        keyRing.position.set(-0.65, -0.25, 0.3);
        itemsGroup.add(keyRing);

        // Brass Key
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xD97706, metalness: 0.85, roughness: 0.25 });
        const keyStemGeo = new THREE.BoxGeometry(0.08, 0.48, 0.025);
        const keyStem = new THREE.Mesh(keyStemGeo, brassMat);
        keyStem.position.set(-0.65, -0.58, 0.3);
        itemsGroup.add(keyStem);

        // Silicone Pink FoundiT Tag
        const tagGeo = new THREE.BoxGeometry(0.32, 0.65, 0.04);
        const tagMat = new THREE.MeshStandardMaterial({ color: 0xF43F5E, roughness: 0.4 });
        const foundTag = new THREE.Mesh(tagGeo, tagMat);
        foundTag.position.set(-0.35, -0.4, 0.35);
        foundTag.rotation.z = -0.3;
        itemsGroup.add(foundTag);

        // 3. Sleek AirPods Case (Glossy White with Emerald LED)
        const podGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.36, 32);
        const podMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.12, metalness: 0.05 });
        const podCase = new THREE.Mesh(podGeo, podMat);
        podCase.position.set(0.65, -0.18, 0.25);
        podCase.castShadow = true;
        itemsGroup.add(podCase);

        // Tiny Emerald Status LED dot
        const ledGeo = new THREE.SphereGeometry(0.025, 12, 12);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x10B981 });
        const podLed = new THREE.Mesh(ledGeo, ledMat);
        podLed.position.set(0.65, -0.18, 0.38);
        itemsGroup.add(podLed);

        scene.add(itemsGroup);

        // ── Item C: Geographic Proximity Map Pin & Sonar Rings ────────────────
        const beaconGroup = new THREE.Group();
        beaconGroup.position.set(2.2, 0.3, -0.5);

        const pinHeadGeo = new THREE.SphereGeometry(0.18, 20, 20);
        const pinMat = new THREE.MeshStandardMaterial({ color: 0xF43F5E, roughness: 0.25, metalness: 0.2 });
        const pinHead = new THREE.Mesh(pinHeadGeo, pinMat);
        pinHead.position.y = 0.55;
        beaconGroup.add(pinHead);

        const pinConeGeo = new THREE.ConeGeometry(0.18, 0.45, 20);
        const pinCone = new THREE.Mesh(pinConeGeo, pinMat);
        pinCone.rotation.x = Math.PI;
        pinCone.position.y = 0.28;
        beaconGroup.add(pinCone);

        const pinDotGeo = new THREE.SphereGeometry(0.07, 16, 16);
        const pinDotMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const pinDot = new THREE.Mesh(pinDotGeo, pinDotMat);
        pinDot.position.set(0, 0.55, 0.14);
        beaconGroup.add(pinDot);

        scene.add(beaconGroup);

        // Pulsing Sonar Ring on Ground
        const radarGeo = new THREE.RingGeometry(0.15, 0.75, 32);
        const radarMat = new THREE.MeshBasicMaterial({ color: 0xF43F5E, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const radarRing = new THREE.Mesh(radarGeo, radarMat);
        radarRing.rotation.x = Math.PI / 2;
        radarRing.position.set(2.2, -0.46, -0.5);
        scene.add(radarRing);

        // ── Item D: Administrative Verification Shield & Checkmark ───────────
        const shieldGroup = new THREE.Group();
        shieldGroup.position.set(0, 1.6, 0);

        const shieldGeo = new THREE.CylinderGeometry(0.85, 0.25, 1.45, 6);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x10B981,
          transparent: true,
          opacity: 0.65,
          roughness: 0.15,
          metalness: 0.1
        });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldGroup.add(shieldMesh);

        // Embossed 3D Emerald Checkmark
        const checkStem1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.35, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x064E3B, roughness: 0.2 })
        );
        checkStem1.position.set(-0.12, 0, 0.5);
        checkStem1.rotation.z = -Math.PI / 4;
        shieldGroup.add(checkStem1);

        const checkStem2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.65, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x064E3B, roughness: 0.2 })
        );
        checkStem2.position.set(0.14, 0.08, 0.5);
        checkStem2.rotation.z = Math.PI / 3.5;
        shieldGroup.add(checkStem2);

        const energyRingGeo = new THREE.TorusGeometry(1.15, 0.018, 16, 64);
        const energyRingMat = new THREE.MeshBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0.45 });
        const energyRing = new THREE.Mesh(energyRingGeo, energyRingMat);
        energyRing.rotation.x = Math.PI / 3;
        shieldGroup.add(energyRing);

        scene.add(shieldGroup);

        // ── Item E: Controlled Messaging Bubble & Security Padlock ───────────
        const chatGroup = new THREE.Group();
        chatGroup.position.set(-0.8, 2.5, 0.5);

        const bubbleGeo = new THREE.SphereGeometry(0.42, 24, 24);
        bubbleGeo.scale(1.2, 0.85, 0.85);
        const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2, metalness: 0.05 });
        const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
        bubble.castShadow = true;
        chatGroup.add(bubble);

        const lockGeo = new THREE.BoxGeometry(0.2, 0.18, 0.1);
        const lockMat = new THREE.MeshStandardMaterial({ color: 0xD97706, metalness: 0.8, roughness: 0.2 });
        const lockMesh = new THREE.Mesh(lockGeo, lockMat);
        lockMesh.position.set(0, -0.04, 0.36);
        chatGroup.add(lockMesh);

        const lockShackleGeo = new THREE.TorusGeometry(0.07, 0.02, 12, 24, Math.PI);
        const lockShackle = new THREE.Mesh(lockShackleGeo, chromeMat);
        lockShackle.position.set(0, 0.07, 0.36);
        chatGroup.add(lockShackle);

        scene.add(chatGroup);

        setLoaded(true);

        // 6. Interactive Controls (Orbit Drag & Zoom)
        const onMouseDown = (e) => {
          isDragging = true;
          prevMousePos = { x: e.clientX, y: e.clientY };
        };

        const onMouseMove = (e) => {
          if (!isDragging) return;
          const deltaX = e.clientX - prevMousePos.x;
          const deltaY = e.clientY - prevMousePos.y;
          targetSpherical.theta -= deltaX * 0.007;
          targetSpherical.phi = Math.max(0.3, Math.min(Math.PI / 2 - 0.05, targetSpherical.phi - deltaY * 0.007));
          prevMousePos = { x: e.clientX, y: e.clientY };
        };

        const onMouseUp = () => { isDragging = false; };

        const onWheel = (e) => {
          e.preventDefault();
          targetSpherical.radius = Math.max(5, Math.min(18, targetSpherical.radius + e.deltaY * 0.008));
        };

        // Touch handlers for mobile
        const onTouchStart = (e) => {
          if (e.touches.length === 1) {
            isDragging = true;
            prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
        };

        const onTouchMove = (e) => {
          if (!isDragging || e.touches.length !== 1) return;
          const deltaX = e.touches[0].clientX - prevMousePos.x;
          const deltaY = e.touches[0].clientY - prevMousePos.y;
          targetSpherical.theta -= deltaX * 0.008;
          targetSpherical.phi = Math.max(0.3, Math.min(Math.PI / 2 - 0.05, targetSpherical.phi - deltaY * 0.008));
          prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };

        const onTouchEnd = () => { isDragging = false; };

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('wheel', onWheel, { passive: false });
        container.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd);

        // 7. Animation Loop
        let clock = new THREE.Clock();

        const animate = () => {
          animId = requestAnimationFrame(animate);
          const t = clock.getElapsedTime();

          if (isRotating && !isDragging) {
            targetSpherical.theta += 0.0025;
          }

          spherical.theta += (targetSpherical.theta - spherical.theta) * 0.06;
          spherical.phi += (targetSpherical.phi - spherical.phi) * 0.06;
          spherical.radius += (targetSpherical.radius - spherical.radius) * 0.06;

          currentLookAt.x += (targetLookAt.x - currentLookAt.x) * 0.06;
          currentLookAt.y += (targetLookAt.y - currentLookAt.y) * 0.06;
          currentLookAt.z += (targetLookAt.z - currentLookAt.z) * 0.06;

          camera.position.x = currentLookAt.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
          camera.position.y = currentLookAt.y + spherical.radius * Math.cos(spherical.phi);
          camera.position.z = currentLookAt.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
          camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

          // Subtle Organic Floating
          phoneGroup.position.y = 0.7 + Math.sin(t * 1.5) * 0.06;
          phoneGroup.rotation.y = Math.sin(t * 0.8) * 0.12;

          itemsGroup.position.y = 0.8 + Math.cos(t * 1.6) * 0.07;
          wallet.rotation.y = -0.25 + Math.sin(t * 0.8) * 0.1;
          keyRing.rotation.z = Math.sin(t * 2) * 0.15;

          shieldGroup.position.y = 1.6 + Math.sin(t * 1.2) * 0.06;
          energyRing.rotation.z = t * 0.8;
          energyRing.rotation.y = t * 0.5;

          chatGroup.position.y = 2.5 + Math.sin(t * 2.0) * 0.05;
          chatGroup.rotation.y = Math.cos(t * 0.9) * 0.15;

          const radarScale = 1 + (t % 2.2) * 1.4;
          radarRing.scale.set(radarScale, radarScale, 1);
          radarMat.opacity = Math.max(0, 0.6 - (t % 2.2) * 0.28);

          beaconGroup.position.y = 0.3 + Math.sin(t * 2.5) * 0.06;

          renderer.render(scene, camera);
        };

        animate();

        // 8. Resize Handler
        const onResize = () => {
          if (!container || !renderer || !camera) return;
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        // Store references for cleanup and stage updates
        container.__setStage = (stage) => {
          targetLookAt = { ...stage.lookAt };
          const dx = stage.camPos.x - stage.lookAt.x;
          const dy = stage.camPos.y - stage.lookAt.y;
          const dz = stage.camPos.z - stage.lookAt.z;
          const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
          targetSpherical.radius = r;
          targetSpherical.theta = Math.atan2(dx, dz);
          targetSpherical.phi = Math.acos(dy / r);
        };

        container.__resetView = () => {
          targetLookAt = { x: 0, y: 0.8, z: 0 };
          targetSpherical = { radius: 10.5, theta: 0.2, phi: 1.25 };
        };

      } catch (err) {
        console.warn('[FoundiT 3D] WebGL initialization fallback:', err);
        setWebGLFailed(true);
      }
    };

    initThree();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (renderer) renderer.dispose();
      while (container.firstChild) container.removeChild(container.firstChild);
    };
  }, []);

  const handleSelectStage = (stageId) => {
    setActiveStage(stageId);
    playTone(320 + stageId * 60);
    const stage = RECOVERY_STAGES.find(s => s.id === stageId);
    if (stage && mountRef.current?.__setStage) {
      mountRef.current.__setStage(stage);
    }
  };

  const handleReset = () => {
    setActiveStage(1);
    playTone(400);
    if (mountRef.current?.__resetView) {
      mountRef.current.__resetView();
    }
  };

  const currentStageInfo = RECOVERY_STAGES.find(s => s.id === activeStage) || RECOVERY_STAGES[0];

  return (
    <section className="foundit-section foundit-section-muted" id="explore-3d">
      <div className="foundit-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="section-badge">
            <span>✨</span>
            <span>Interactive 3D Recovery Showcase</span>
          </div>
          <h2 className="section-title-large">
            Explore FoundiT: <span style={{ background: 'linear-gradient(135deg, #0F172A 0%, #F43F5E 55%, #10B981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>From Lost to Found</span>
          </h2>
          <p className="section-desc-lead">
            Select each stage on the side panel to dynamically inspect how FoundiT handles real-world belongings from initial loss to secure verified return.
          </p>
        </div>

        {/* 2-Column Split: Steps Placed at the SIDE (Left) + 3D Canvas (Right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 390px) 1fr',
          gap: 28,
          alignItems: 'stretch'
        }} className="recovery-3d-split-layout">

          {/* LEFT COLUMN: Dedicated Steps Control Sidebar */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 24,
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              {/* Sidebar Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 16,
                borderBottom: '1px solid #F1F5F9',
                marginBottom: 16
              }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Process Navigation
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                    5-Stage Architecture
                  </h3>
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0F172A',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '4px 10px',
                  borderRadius: 9999
                }}>
                  Step {activeStage} of 5
                </span>
              </div>

              {/* 5 Step Selectable Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {RECOVERY_STAGES.map((stage) => {
                  const isActive = activeStage === stage.id;
                  return (
                    <div
                      key={stage.id}
                      onClick={() => handleSelectStage(stage.id)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 16,
                        border: `1.5px solid ${isActive ? '#0F172A' : '#E2E8F0'}`,
                        background: isActive ? '#FFFFFF' : '#F8FAFC',
                        boxShadow: isActive ? '0 8px 20px -6px rgba(15, 23, 42, 0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = '#CBD5E1';
                          e.currentTarget.style.background = '#FFFFFF';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.background = '#F8FAFC';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Step Number Circle */}
                          <div style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: isActive ? '#0F172A' : '#E2E8F0',
                            color: isActive ? '#FFFFFF' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12.5,
                            fontWeight: 800,
                            flexShrink: 0,
                            transition: 'all 0.2s ease'
                          }}>
                            {stage.id}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 15 }}>{stage.icon}</span>
                              <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>
                                {stage.title}
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>
                              {stage.subtitle}
                            </div>
                          </div>
                        </div>

                        {/* Active indicator dot or chevron */}
                        <span style={{
                          color: isActive ? stage.accentColor : '#94A3B8',
                          fontSize: 14,
                          fontWeight: 700,
                          transform: isActive ? 'translateX(2px)' : 'none',
                          transition: 'all 0.2s ease'
                        }}>
                          {isActive ? '●' : '→'}
                        </span>
                      </div>

                      {/* Expanded description when active */}
                      {isActive && (
                        <div style={{
                          marginTop: 4,
                          paddingTop: 10,
                          borderTop: '1px dashed #E2E8F0',
                          fontSize: 12.5,
                          color: '#475569',
                          lineHeight: 1.6
                        }}>
                          {stage.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions & Stage Stepper Buttons */}
            <div style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="canvas-icon-btn"
                  title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
                  onClick={() => setIsRotating(!isRotating)}
                  style={{ width: 34, height: 34, fontSize: 13 }}
                >
                  {isRotating ? '⏸️' : '▶️'}
                </button>
                <button
                  className="canvas-icon-btn"
                  title="Reset 3D perspective"
                  onClick={handleReset}
                  style={{ width: 34, height: 34, fontSize: 13 }}
                >
                  🔄
                </button>
                <button
                  className="canvas-icon-btn"
                  title={soundEnabled ? 'Mute sound effects' : 'Enable interaction tones'}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{ width: 34, height: 34, fontSize: 13 }}
                >
                  {soundEnabled ? '🔊' : '🔇'}
                </button>
              </div>

              {activeStage < 5 ? (
                <button
                  onClick={() => handleSelectStage(activeStage + 1)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 10,
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1E293B'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0F172A'; }}
                >
                  <span>Next Step</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 10,
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#10B981'; }}
                >
                  <span>Restart Tour</span>
                  <span>↺</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Dedicated 3D Canvas Viewport (Unobstructed) */}
          <div style={{
            position: 'relative',
            width: '100%',
            minHeight: 560,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            borderRadius: 24,
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Top Minimalist Header Tag */}
            <div style={{
              position: 'absolute',
              top: 18,
              left: 20,
              zIndex: 10,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid #E2E8F0',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: 9999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentStageInfo.accentColor || '#10B981' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
                {currentStageInfo.icon} {currentStageInfo.title} View
              </span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>• 3D Realtime</span>
            </div>

            {/* Three.js Canvas Mount */}
            {!webGLFailed ? (
              <div ref={mountRef} className="canvas-viewport" style={{ width: '100%', height: '100%', flex: 1 }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 64 }}>🛡️📱🤝</div>
                <h3 style={{ color: '#0F172A', margin: 0 }}>FoundiT Recovery Ecosystem</h3>
                <p style={{ color: '#64748B', maxWidth: 440, textAlign: 'center', fontSize: 14 }}>
                  A structured pipeline bringing together finders, owners, and administrators with strict verification gates.
                </p>
              </div>
            )}

            {/* Bottom Right: Drag Hint */}
            <div className="canvas-drag-hint">
              <span>🖱️</span>
              <span>Drag to rotate • Scroll to zoom</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveRecovery3D;

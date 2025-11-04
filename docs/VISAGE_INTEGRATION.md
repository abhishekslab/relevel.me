# Ready Player Me Visage Integration

This document explains how the Ready Player Me Visage library is integrated into the relevel.me dashboard for animated avatar display.

## Overview

**Visage** is Ready Player Me's official React component library for displaying 3D avatars on the web. It's built on top of Three.js, React Three Fiber, and Drei, providing a high-level abstraction for avatar rendering and animation.

## Architecture

### Key Concept: Standalone Canvas

The most important aspect of Visage's `Avatar` component is that it **creates its own `<Canvas>` internally**. This means:

- ✅ **DO**: Place the `<Avatar>` component as a standalone element in your DOM
- ❌ **DON'T**: Try to use it inside an existing React Three Fiber `<Canvas>`

### Our Implementation

In `web/app/dashboard/page.tsx`, we use a **layered approach**:

```tsx
<div className="relative min-h-screen w-full">
  {/* Layer 1: Starfield background */}
  <div className="absolute inset-0 -z-10">
    <Canvas camera={{ position: [0, 0, 10], fov: 55 }}>
      <Scene />
      <Stars radius={80} depth={50} count={2500} factor={2} fade />
    </Canvas>
  </div>

  {/* Layer 2: Avatar (Visage creates its own Canvas) */}
  <div className="absolute inset-0 pointer-events-none">
    <Avatar
      armatureType={armatureType}
      danceIndex={currentDanceIndex}
      isAnimating={isAnimating}
    />
  </div>
</div>
```

## Components

### Avatar Component (`web/app/dashboard/page.tsx:554-579`)

Our custom `Avatar` wrapper handles animation state and passes props to Visage:

```tsx
function Avatar({ armatureType, danceIndex, isAnimating }: AvatarProps) {
  const avatarUrl = 'https://models.readyplayer.me/68f39e2ac955f67d168fc54c.glb'
  const animationSrc = isAnimating
    ? DANCE_ANIMATIONS[armatureType][danceIndex]
    : undefined

  return (
    <VisageAvatar
      modelSrc={avatarUrl}
      animationSrc={animationSrc}
      cameraInitialDistance={3.5}
      cameraTarget={1.2}
      fov={50}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent'
      }}
      shadows={false}
      halfBody={false}
    />
  )
}
```

## Visage Avatar Props

### Essential Props

| Prop | Type | Description |
|------|------|-------------|
| `modelSrc` | `string \| Blob` | URL or binary data of the Ready Player Me `.glb` avatar file |
| `animationSrc` | `string \| Blob` | Optional. URL or binary data of animation file (`.glb` or `.fbx`) |
| `style` | `CSSProperties` | CSS styles for the canvas element. **Note:** `background` must be set via this prop |

### Camera Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cameraInitialDistance` | `number` | Full-body: `3.5` | Initial Z-axis distance from avatar |
| `cameraTarget` | `number` | Full-body: `1.2` | Y-axis target (height to look at) |
| `fov` | `number` | `50` | Camera field of view |
| `cameraZoomTarget` | `Vector3` | - | Custom zoom target position |

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `halfBody` | `boolean` | `false` | Show only upper body (bust view) |
| `shadows` | `boolean` | `false` | Enable ground shadows |
| `scale` | `number` | `1.0` | Size multiplier for the avatar |
| `idleRotation` | `boolean` | `false` | Enable automatic rotation |

### Animation Props

| Prop | Type | Description |
|------|------|-------------|
| `animations` | `AnimationsT` | Object containing multiple animation clips |
| `activeAnimation` | `string` | Key of the animation to play from `animations` |
| `onLoadedAnimation` | `{ src: string, onLoaded: () => void }` | Callback when animation loads |
| `onAnimationEnd` | `(action: AnimationAction) => void` | Callback when animation finishes |

## Animation System

### Animation Sources

Animations are stored in `/public/animation/` directory:

```
public/animation/
├── feminine/fbx/dance/
│   ├── F_Dances_001.fbx
│   ├── F_Dances_004.fbx
│   └── ...
└── masculine/fbx/dance/
    ├── F_Dances_001.fbx
    ├── M_Dances_001.fbx
    └── ...
```

### Animation Configuration

Defined in `web/app/dashboard/page.tsx:61-84`:

```tsx
type ArmatureType = 'feminine' | 'masculine'

const DANCE_ANIMATIONS = {
  feminine: [
    '/animation/feminine/fbx/dance/F_Dances_001.fbx',
    '/animation/feminine/fbx/dance/F_Dances_004.fbx',
    // ... 8 total animations
  ],
  masculine: [
    '/animation/masculine/fbx/dance/F_Dances_001.fbx',
    '/animation/masculine/fbx/dance/M_Dances_001.fbx',
    // ... 8 total animations
  ]
}
```

### Animation Controls

Located in the HUD (top-right corner):

- **Music note button** - Toggle animations on/off
- **Left/Right arrows** - Cycle through dance animations
- **Counter** - Shows current animation (e.g., "1/8")
- **F/M button** - Switch between Feminine/Masculine armatures

## State Management

Animation state is managed at the dashboard level:

```tsx
const [armatureType, setArmatureType] = useState<ArmatureType>('feminine')
const [currentDanceIndex, setCurrentDanceIndex] = useState(0)
const [isAnimating, setIsAnimating] = useState(false)
```

## Ready Player Me Avatar

### Getting an Avatar URL

1. Visit [Ready Player Me](https://readyplayer.me/)
2. Create or customize your avatar
3. Export as `.glb` format
4. Use the provided URL (e.g., `https://models.readyplayer.me/{avatar-id}.glb`)

### Avatar Format

Ready Player Me avatars are:
- **Format**: `.glb` (binary glTF)
- **Rigging**: Standard humanoid skeleton compatible with Mixamo animations
- **Optimization**: Optimized for web delivery (~2-5MB)

## Supported Animation Formats

Visage supports two animation formats:

1. **GLB** (`.glb`) - Binary glTF with embedded animations
2. **FBX** (`.fbx`) - Autodesk FBX format (our implementation uses this)

Both formats are automatically validated before loading.

## Performance Considerations

### GPU Tiers

Visage includes automatic GPU detection via `useDeviceDetector`:

```tsx
import { useDeviceDetector } from '@readyplayerme/visage'

const deviceDetector = useDeviceDetector()
// Returns: { gpu: TierResult, network: NetworkTierResult }
```

You can use this to adjust quality settings based on device capabilities.

### Loading States

Visage handles loading states internally with Suspense. You can provide a custom loader:

```tsx
<VisageAvatar
  modelSrc={avatarUrl}
  loader={<MyCustomLoader />}
/>
```

## Troubleshooting

### Common Issues

**1. "Canvas is not part of THREE namespace" error**
- **Cause**: Trying to use `<Avatar>` inside an existing `<Canvas>`
- **Solution**: Place `<Avatar>` outside any React Three Fiber `<Canvas>`

**2. Avatar not visible**
- Check `background: 'transparent'` is set in style
- Verify z-index stacking of layers
- Ensure `pointer-events-none` on overlay div if needed

**3. Animation not playing**
- Verify `animationSrc` is defined and points to valid file
- Check browser console for loading errors
- Ensure FBX file is compatible with the avatar rig

**4. Camera angle issues**
- Adjust `cameraInitialDistance` (higher = further away)
- Adjust `cameraTarget` (higher = look at head, lower = look at feet)
- Adjust `fov` for perspective changes

## Dependencies

```json
{
  "@readyplayerme/visage": "^6.16.0",
  "@react-three/fiber": "^8.15.16",
  "@react-three/drei": "^9.109.0",
  "@react-three/postprocessing": "^2.x",
  "@amplitude/analytics-browser": "^2.x",
  "three": "^0.160.0"
}
```

**Note**: Install with `--legacy-peer-deps` flag due to peer dependency version mismatches:

```bash
npm install @readyplayerme/visage --legacy-peer-deps
```

## Further Resources

- [Visage Documentation](https://readyplayerme.github.io/visage/)
- [Visage GitHub](https://github.com/readyplayerme/visage)
- [Ready Player Me Docs](https://docs.readyplayer.me/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)

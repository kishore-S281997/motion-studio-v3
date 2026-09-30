# Motion Studio V3

A browser-based motion graphics editor prototype built with React + Vite.

## What works
- Selectable layers
- Add rectangle, circle and text layers
- Inspector controls for X/Y, scale, rotation and opacity
- Changes at the current playhead create/update keyframes
- Visual timeline with keyframe markers
- Play/pause, scrub by clicking keyframes, duration and loop
- Prompt commands for bounce, slide, fade, color, rotation, scale and duration
- Save/open Motion Studio project JSON
- Export a multi-layer Lottie JSON file
- Responsive dark editor UI

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

Vercel settings:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Prompt examples
- Make it bounce
- Slide from left
- Fade in
- Rotate 20 degrees
- Make it red
- Make it bigger
- Make it 2 seconds
- Scale to 1.5

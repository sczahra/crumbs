# Ironhold Prison Sim

A lightweight, third-person prison simulation built for the browser. Patrol the cell block, keep distance from guards, and survive the yard rotation.

## Features
- **Cell block layout:** explore a structured block with randomized cell assignments each run.
- **Third-person orbit camera:** drag to orbit the scene while moving through the yard.
- **Guard patrols & alert system:** stay clear of guards to keep alert levels down.
- **Touch-ready controls:** on-screen joystick, sprint, and interact controls for mobile play.

## Run the game
No build tools required. Start a local web server and open the link in your browser:

```bash
python -m http.server 8000
```

Then visit: [http://localhost:8000](http://localhost:8000)

## Controls
- **Keyboard:** WASD or arrow keys to move, Shift to sprint.
- **Touch/Mouse:** use the on-screen joystick, Sprint, and Interact buttons.

## Asset notes
All visuals are procedurally generated in the canvas renderer. No external assets are required.

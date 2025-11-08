# Crumbs Driver Prototype

This repository contains a Godot 4.5.1 prototype that lays the foundation for a third-person driving and building experience inspired by classic open-world titles. The project lives inside the [`project/`](project/) directory and ships with placeholder scenes and scripts you can expand into production-ready systems.

## Features
- **Third-person on-foot controller** with smooth acceleration, vehicle interaction prompts, and build-mode toggling.
- **Driveable vehicle prototype** that handles acceleration, braking, steering, and camera switching when entered or exited.
- **Dual-purpose camera rig** that follows either the player or the currently occupied vehicle with configurable offsets.
- **Grid-based building sandbox** that lets you preview modular house pieces with a translucent ghost material before placement.
- **Ready-to-run Godot project** configured with useful input actions and a simple test level.

## Controls
| Action | Key / Input |
| --- | --- |
| Move | `WASD` or Arrow Keys |
| Enter vehicle | `E` |
| Exit vehicle | `Q` |
| Accelerate | `W` or Up Arrow |
| Reverse | `S` or Down Arrow |
| Brake | `Space` |
| Steer | `A` / `D` |
| Toggle build mode | `B` |
| Confirm build placement | Left Mouse Button |
| Cycle build piece | `Tab` |

## Getting Started
1. Install **Godot 4.5.1**.
2. Open the editor and import the project by selecting the [`project/project.godot`](project/project.godot) file.
3. Run the main scene (`F5`) to explore the prototype.

Feel free to replace the placeholder meshes with your own realistic vehicle and architectural assets, expand the physics, and evolve the build system to match your creative vision.

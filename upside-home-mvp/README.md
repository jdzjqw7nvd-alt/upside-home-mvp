# Upside Home MVP

A retro sci-fi maze game built with HTML5 Canvas and modular JavaScript. The goal is simple: navigate the labyrinth, find the key, and bring it back to HOME.

## Concept

- A monochrome, 1980s-inspired maze with strict navigation focus.
- No combat, no enemies, no bridges, no extra systems.
- The challenge is spatial memory and orientation under limited visibility.

## Core Mechanics

- Maps are loaded from JSON files with tile-based collision.
- The aura system limits visibility from Level 2 onward, creating tension and forcing careful backtracking.
- The key is placed at the farthest reachable tile in the final labyrinth.
- Doors connect each labyrinth (entry at top center, exit at bottom center), and the last exit opens only with the key.
- The player returns to HOME and wins at the lower center door.

## Why It Works

- Visibility constraints increase difficulty without adding complexity.
- A minimalist design keeps the experience readable and easy to present.
- The project is intentionally small to highlight design logic over feature volume.

## Run

Open `index.html` in a browser. If your browser blocks JSON loading from local files, run a simple local server (for example `python3 -m http.server`) and open `http://localhost:8000/upside-home-mvp/`.

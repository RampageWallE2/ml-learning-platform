# Gamified Learning Platform for Machine Learning Foundations

## Overview

This project is a gamified learning platform designed to make the mathematical foundations behind Machine Learning more intuitive, interactive, and engaging.

Instead of relying mainly on traditional lessons and memorization, the platform combines visual explanations, interactive activities, practical exercises, and game-inspired progression.

Users explore a virtual learning world where their progress unlocks new areas and learning experiences. The long-term goal is to connect theoretical knowledge with practical applications in Machine Learning, data analysis, artificial intelligence, and real-world industry scenarios.

## Objectives

The project aims to:

* Provide an engaging alternative to traditional mathematical learning.
* Encourage understanding and reasoning instead of memorization.
* Represent learning progress through an explorable and gamified environment.
* Include interactive exercises and educational minigames.
* Connect mathematical concepts with practical Machine Learning applications.
* Build a platform that can progressively expand with new learning paths and content.

## Technologies

### Frontend

* **Angular** — Main web application framework.
* **TypeScript** — Application logic and strongly typed development.
* **SCSS** — Styling and responsive interface design.
* **Phaser** — Interactive world, player movement, cameras, tilemaps, and game-like mechanics.
* **SVG / D3.js** — Interactive mathematical and data visualizations.
* **GSAP** — Advanced interface and visual animations when required.

### Backend

* **Python**
* **Flask** — REST API and backend application.
* **SQLAlchemy** — Database interaction and ORM.
* **Flask-Migrate / Alembic** — Database migrations.

### Database

* **PostgreSQL** — Persistent storage for users, learning content, progress, results, and platform data.

### Infrastructure

* **Docker** — Containerized development and deployment.
* **AWS** — Cloud infrastructure and production deployment.
* **Nginx** — Web server and reverse proxy for production environments.

Additional Machine Learning and mathematical libraries may be incorporated as the platform evolves.

## General Architecture

The project separates the educational application from the interactive game environment.

```text
Angular Application
│
├── Authentication
├── Learning Content
├── Exercises
├── Progress
├── User Interface
│
└── Interactive World
      └── Phaser

          ↓

      Flask REST API

          ↓

      PostgreSQL
```

Angular manages the main application and learning experience, while Phaser is responsible for the explorable world and game-oriented interactions.

The backend manages application data, user progress, content, and communication with the database.

## Learning Experience

The platform is designed around progressive learning.

Rather than presenting all available content at once, users advance through an interactive world where new areas and activities become available as their knowledge develops.

The learning experience may combine:

* Visual explanations
* Interactive experimentation
* Guided practice
* Educational minigames
* Immediate feedback
* Progress tracking
* Gamification
* Practical applications

The game mechanics are intended to support learning rather than become the main objective of the platform.

## Project Structure

```text
project/
├── frontend/        # Angular application and interactive world
├── backend/         # Flask API
├── docs/            # Project documentation
├── infra/           # Infrastructure and deployment configuration
└── README.md
```

## Project Status

The project is currently under active development.

The initial version focuses on validating the core learning experience, interactive world, progression system, and technical architecture before expanding the platform.

## Vision

The long-term vision is to create a scalable learning environment where mathematics, Machine Learning, data, and artificial intelligence can be explored through an experience that feels less like studying isolated theory and more like progressing through a world of increasingly challenging problems.

The platform is intended to evolve beyond a simple course website into an interactive learning system capable of connecting knowledge with real-world applications.

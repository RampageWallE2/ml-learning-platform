# Gamified Learning Platform for Machine Learning Foundations

## Ejecutar desde un clon limpio

Solo necesitas Git y Docker con Compose (Docker Desktop encendido en Windows).
Desde la raíz del repositorio:

```bash
docker compose up --build
```

Espera a que Angular indique que terminó de compilar y abre **http://localhost:4200**.
No necesitas instalar Node/Python, copiar archivos `.env`, crear tablas ni ejecutar
migraciones manualmente. Se crean los contenedores de PostgreSQL, Flask y Angular;
la API aplica las migraciones y la web espera a que esté saludable.

- Registra una cuenta nueva con correo y contraseña; una instalación nueva no trae usuarios.
- Los datos se conservan en el volumen `postgres_data` entre reinicios.
- `docker compose down` detiene el entorno sin borrar ese volumen. No añadas `-v`
  si quieres mantener las cuentas y el progreso.
- Este comando es **desarrollo local**, con recarga de código y credenciales locales
  públicas de ejemplo. No lo uses para desplegar en AWS ni con datos reales.
- La web publica el puerto 4200; API y PostgreSQL se publican solo en loopback, en 5000
  y 5432. Si están ocupados, detén el programa correspondiente o configura otros puertos.

### Configuración opcional, no requisito del arranque

El `.env` de la raíz está ignorado por Git y sirve únicamente para personalizaciones.
Docker no lee `backend/.env` ni otros `.env` dentro de los montajes de código.
Las plantillas `.env.production.example` y `.env.ec2.example` son para despliegue,
no deben copiarse para este arranque local.

Para probar desde un celular, añade al `.env` raíz el origen LAN **real** del navegador:

```dotenv
CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://192.168.1.36:4200
CSRF_TRUSTED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://192.168.1.36:4200
```

La IP es un ejemplo: reemplázala por la de tu computadora y permite 4200 solo en tu
red de pruebas. Recrea los contenedores después de cambiar variables. No se autorizan
orígenes arbitrarios ni se desactiva CSRF para facilitar el acceso.

Google queda deshabilitado por defecto. Para habilitarlo necesitas un cliente OAuth
configurado para los orígenes utilizados y `GOOGLE_CLIENT_ID` en el `.env` raíz;
Compose transmite el mismo ID público a frontend y backend. No es un secreto OAuth.
Los puertos opcionales son `FRONTEND_PORT`, `BACKEND_PORT` y `POSTGRES_PORT`; si cambias
el puerto web, actualiza también los orígenes CORS/CSRF. Ninguna de estas variables
es obligatoria para el comando inicial.

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

## Preparación local de producción

La guía reproducible de pruebas, ensayo HTTPS con Docker, copias y restauración está en [docs/preparacion-produccion.md](docs/preparacion-produccion.md). El ensayo usa un proyecto y base de datos separados; no publica nada en AWS ni sustituye la validación en dispositivos reales. Revisar también [distribución, datos y soporte](docs/distribucion-soporte.md) antes de una entrega pública.

El backend utiliza únicamente PostgreSQL, también en las pruebas con base de datos. Ejecutarlas mediante `compose.verify.yml` mantiene sus datos desechables separados del entorno habitual. No hay alternativa SQLite ni uso automático de `DATABASE_URL` cuando falta `TEST_DATABASE_URL`.

## Prueba en AWS EC2

Para instalar una demostración HTTP en una EC2 Ubuntu nueva desde Windows, consultar
[despliegue automatizado](docs/despliegue-ec2-automatico.md). Instala Docker y utiliza
imágenes publicadas manualmente en GHCR, sin compilar en la instancia ni subir datos locales.
La automatización no crea recursos AWS ni reemplaza bases existentes.

La guía de preparación HTTPS está en [docs/despliegue-aws-prueba.md](docs/despliegue-aws-prueba.md). Reutiliza `compose.production.yml`, separa sus datos del desarrollo y usa `.env.ec2.example` como plantilla sin secretos. Incluye certificados, validación previa y renovación todavía pendientes. Los resultados HTTP de la instancia anterior son históricos; esa EC2 fue terminada y no validan la instalación automatizada en una nueva instancia.

## Imágenes Docker en GHCR

La publicación manual de imágenes Docker versionadas en GitHub Container Registry, sin desplegar en AWS, está descrita en [docs/publicacion-ghcr.md](docs/publicacion-ghcr.md). Los push y pull requests solo verifican; publicar requiere ejecutar el workflow manualmente en `master`. Reutiliza las verificaciones existentes y ofrece un complemento de Compose para consumir las imágenes sin recompilarlas en el servidor.

## Vision

The long-term vision is to create a scalable learning environment where mathematics, Machine Learning, data, and artificial intelligence can be explored through an experience that feels less like studying isolated theory and more like progressing through a world of increasingly challenging problems.

The platform is intended to evolve beyond a simple course website into an interactive learning system capable of connecting knowledge with real-world applications.

# 🦞 Claw-Comparator (OpenClaw Systems Analyzer)

Una herramienta analítica avanzada diseñada para comparar, medir divergencias y visualizar la evolución estructural y conceptual entre distintos sistemas de agentes basados en **OpenClaw**.

## 🚀 Objetivo del Proyecto
Proveer una plataforma intuitiva (Dashboard) que no solo compare código plano (diff tradicional), sino que analice **conceptos, intenciones y directrices semánticas** mediante Inteligencia Artificial (Gemini), persistiendo el contexto en el tiempo para analizar la evolución entre dos agentes generados autónomamente.

---

## 🏗 Arquitectura y Stack Tecnológico

El desarrollo está guiado estrictamente por la **PRIME DIRECTIVE**, manteniendo una separación limpia de responsabilidades (SoC), un fuerte Agnósticismo de Dependencias y Componentización en UI.

### Frontend (`/frontend`)
- **Framework:** React + Vite
- **Navegación:** `react-router-dom` (Rutas: `/` Home Histórico, `/analyzer` Vista de Análisis y Detalles)
- **Visualización:** `d3` (Circle Packing para conceptos Semánticos, OrgChart para estructura de archivos).
- **Herramientas de Diff:** `react-diff-viewer-continued` (Visualizador side-by-side de colisiones).
- **Estándar Visual:** Sistema atómico (Tokens centralizados para colores, espacios, etc.). Sin *magic numbers*.

### Backend (`/backend`)
- **Server:** Node.js + Express (API REST Ciega - no interviene en presentación).
- **Base de Datos:** SQLite (`sqlite3`) vía persistencia en `comparator.sqlite` (Almacena históricos de ejecución y evita recálculos mediante caché de análisis IA).
- **IA y Semántica:** SDK unificado `@google/genai` (Modelo Primario `gemini-2.5-pro` para extracción estructurada de conceptos: Añadidos vs Eliminados).
- **Generación de Diff:** Librería `diff` para text-diff a nivel AST/archivos.

---

## ⚙️ Principales Funcionalidades Actuales

1. **Gestor Histórico de Reportes (Home):**
   - Sistema de base de datos interconectado que almacena escaneos anteriores en SQLite.
   - Navegación instantánea a escaneos previos sin re-ejecución.

2. **Árbol Estructural Comparativo (OrgChart - D3):**
   - Visualización de un organigrama que cruza el sistema Base y el sistema Modificado, marcando visualmente en colores de estado (Tokens) qué agentes o componentes son nuevos o desaparecieron.

3. **Análisis Semántico con Inteligencia Artificial (Circle Packing - D3):**
   - Prompting en el backend que resume las diferencias lógicas y de directriz sistémica de los agentes.
   - Renderizado en diagramas de burbujas (Pack) separando *Conceptos Agregados* y *Conceptos Eliminados*.

4. **Visor Side-by-Side (Diff Modal):**
   - Análisis plano del código original y las divergencias con resaltado semántico.

---

## 🛠 Instalación y Despliegue Local

### 1. Clonar e inicializar Backend
```bash
cd backend
npm install
# Asegúrate de tener tu un .env válido con GEMINI_API_KEY=tu_clave
npm run dev
```

### 2. Inicializar Frontend
```bash
cd frontend
npm install
npm run dev
```
*(El backend corre en `localhost:3001` y el frontend en el puerto designado por Vite).*

---

## 📍 Estado Actual y Contexto para Retomar (Savepoint)

**Estado de la implementación:**
- El sistema cuenta con los endpoints backend (`/api/reports`, `/api/analyze`, `/api/diff`, `/api/agent-concepts`, `/api/reports/:id/tree`) funcionales.
- La persistencia vía transacciones en SQLite está completada.
- El Frontend posee una interconexión funcional (Pages: Home y Analysis), mostrando un D3 Circle Packing y llamadas a modales.

**Próximos pasos recomendados al retomar:**
1. **D3 OrgChart Integration:** Tenemos código en `D3OrgChart.jsx` que debe engarzarse correctamente con los datos estructurados provenientes de `/api/reports/:id/tree` para mostrar el organigrama comparativo de archivos.
2. **Refinamiento del Workflow de Navegación:** Segurar el flujo de UX (Desde el listado histórico en Home -> Carga del Reporte -> Visualización separada en Tabs o Secciones de 'Files Diff' vs 'Semantic Concepts').
3. **Manejo de estados de borde (UI):** Asegurar pantallas de carga, estados vacíos y manejo de errores visible al usuario según la Regla III (UI Resiliente).

---
*Documento autogenerado para protocolo de conservación de contexto.*

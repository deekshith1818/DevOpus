# DevOpus — Complete End-to-End Project Context

> This document contains EVERY detail about the DevOpus project. Feed this to any AI to have a full-context conversation about the codebase.

---

## PROJECT IDENTITY

- **Name:** DevOpus
- **Type:** AI-Powered Code Generation Platform
- **What it does:** Converts natural language prompts into fully functional React/TypeScript applications using a 4-agent AI pipeline with live preview
- **Problem Statement:** CodeRefine — Generative AI–Powered Code Review & Optimization Engine

---

## TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend Framework | FastAPI | ≥0.115 |
| Backend Language | Python | ≥3.11 |
| AI Framework | LangGraph + LangChain | ≥0.6.3 |
| LLM Provider | Anthropic Claude (Haiku) | claude-haiku-4-5-20251001 |
| Frontend Framework | Next.js (App Router) | 16.1.5 |
| Frontend Language | TypeScript + React | React 19 |
| CSS | Tailwind CSS | v4 |
| Database | Supabase (PostgreSQL) | — |
| Authentication | Supabase Auth (GitHub + Google OAuth) | — |
| File Storage | Supabase Storage | Bucket: `project-assets` |
| Code Preview | Sandpack (by CodeSandbox) | @codesandbox/sandpack-react |
| Icons | Lucide React | latest |
| Animations | Framer Motion | — |
| Diagrams | Mermaid.js | — |
| GitHub Export | PyGithub | ≥2.8.1 |
| PDF Parsing | PyPDF | ≥6.6.2 |
| Package Manager | uv (Python), npm (Node) | — |

---

## ENVIRONMENT VARIABLES

### Backend ([.env](file:///c:/devOpus/Lucidz/.env) in project root)
```
ANTHROPIC_API_KEY=sk-ant-...        # Claude API key
SUPABASE_URL=https://xxx.supabase.co  # Supabase project URL
SUPABASE_SERVICE_KEY=eyJ...          # Supabase service role key (full access)
```

### Frontend ([.env.local](file:///c:/devOpus/Lucidz/frontend/.env.local) in `frontend/`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # Supabase anon/public key
```

---

## PROJECT FILE STRUCTURE

```
c:\devOpus\Lucidz\
├── app.py                    # FastAPI server — ALL endpoints + SSE streaming (960 lines)
├── db.py                     # Supabase CRUD — projects + versions (246 lines)
├── utils.py                  # Multimodal processing — images + PDFs (217 lines)
├── github_utils.py           # GitHub export via PyGithub (118 lines)
├── pyproject.toml            # Python dependencies
├── .env                      # Environment variables
│
├── agent/                    # AI AGENT PIPELINE
│   ├── __init__.py
│   ├── graph.py              # LangGraph DAG — 3 agent nodes (193 lines)
│   ├── prompts.py            # 6 prompt functions — the "brain" (483 lines)
│   ├── states.py             # Pydantic data models (50 lines)
│   └── tools.py              # File system tools (unused in headless mode) (54 lines)
│
└── frontend/                 # NEXT.JS FRONTEND
    └── src/
        ├── app/
        │   ├── layout.tsx           # Root layout — wraps ThemeProvider + SupabaseProvider
        │   ├── page.tsx             # Landing page — hero, features, pricing (46KB)
        │   ├── globals.css          # Global CSS — dark/light theme variables, Sandpack overrides
        │   ├── login/page.tsx       # Login — GitHub + Google OAuth
        │   ├── dashboard/page.tsx   # Dashboard — project list, delete, navigate
        │   ├── generate/page.tsx    # New generation — prompt → 4-agent pipeline → preview
        │   └── project/[id]/page.tsx # Existing project — load, follow-up, version history
        │
        ├── components/
        │   ├── ChatInterface.tsx        # Left sidebar — plan/architect/review display + chat (29KB)
        │   ├── CodePreview.tsx          # Sandpack integration — file normalization + live preview (11KB)
        │   ├── SmartInput.tsx           # Input bar — text, image drag-drop, PDF upload (12KB)
        │   ├── MermaidDiagram.tsx       # Mermaid.js flowchart renderer (13KB)
        │   ├── VersionHistorySidebar.tsx # Version timeline + revert (6KB)
        │   ├── DownloadBtn.tsx          # ZIP download + GitHub export (8KB)
        │   ├── SupabaseProvider.tsx      # Auth context provider (2.7KB)
        │   └── ThemeProvider.tsx         # Dark/light theme toggle (1.4KB)
        │
        └── lib/
            ├── supabase.ts     # Supabase browser client factory
            ├── storage.ts      # Asset upload helper (base64 → FormData → backend)
            └── utils.ts        # clsx utility
```

---

## BACKEND — DETAILED FILE BREAKDOWN

---

### FILE: [app.py](file:///c:/devOpus/Lucidz/app.py) (960 lines) — The Main Server

**Purpose:** FastAPI server with all REST + streaming endpoints.

**Imports:**
```python
from fastapi import FastAPI, HTTPException, Query, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent.graph import graph, planner_llm, architect_llm, coder_llm
from agent.states import Plan, TaskPlan, GeneratedProject
from agent.prompts import planner_prompt, architect_prompt, coder_system_prompt, coder_task_prompt, coder_followup_prompt, reviewer_prompt
from utils import process_multimodal_input, create_vision_message_content
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_anthropic import ChatAnthropic
import db as database
import github_utils
```

**LLM Instances (defined in app.py):**
```python
reviewer_llm = ChatAnthropic(model_name="claude-sonnet-4-6", max_tokens=4096)
```
Note: planner_llm, architect_llm, coder_llm are imported from [agent/graph.py](file:///c:/devOpus/Lucidz/agent/graph.py).

**CORS:** `allow_origins=["*"]` — open for local development.

**Pydantic Request Models:**
```python
class AttachmentModel(BaseModel):
    name: str           # "screenshot.png"
    type: str           # "image" or "pdf"
    data: str           # Base64 data URL
    mimeType: str       # "image/png"

class GenerateRequest(BaseModel):
    prompt: str
    attachment: Optional[AttachmentModel] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    image_asset_url: Optional[str] = None

class FollowUpRequest(BaseModel):
    prompt: str
    current_files: dict[str, str]
    review_feedback: str = ""
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    image_asset_url: Optional[str] = None

class ExportToGithubRequest(BaseModel):
    project_id: str
    github_token: str
    repo_name: Optional[str] = None

class SaveProjectRequest(BaseModel):
    user_id: str
    name: str
    description: str = ""
    code_snapshot: Optional[dict] = None
    project_id: Optional[str] = None
```

**ALL ENDPOINTS:**

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/generate-stream` | POST | Main generation — runs 4-agent pipeline, streams SSE events |
| 2 | `/followup-stream` | POST | Modifies existing code via follow-up prompts |
| 3 | `/generate` | POST | Non-streaming generation (backwards compatibility) |
| 4 | `/health` | GET | Health check — returns `{status: "ok", db_configured: bool}` |
| 5 | `/api/upload-asset` | POST | Uploads image to Supabase Storage, returns public URL |
| 6 | `/projects/save` | POST | Save/update project with code_snapshot |
| 7 | `/projects/user/{user_id}` | GET | List all projects (metadata only, no code) |
| 8 | `/projects/single/{project_id}` | GET | Get single project with full code_snapshot |
| 9 | `/projects` | GET | List projects using Authorization header |
| 10 | `/projects/{project_id}` | GET | Get project metadata |
| 11 | `/projects/{project_id}` | DELETE | Delete project + all versions |
| 12 | `/projects/{project_id}/latest` | GET | Get latest version snapshot |
| 13 | `/projects/{project_id}/versions` | GET | List all version snapshots |
| 14 | `/versions/{version_id}` | GET | Get specific version with full details |
| 15 | `/api/export-to-github` | POST | Export project to GitHub repository |

**KEY FUNCTION: [generate_stream()](file:///c:/devOpus/Lucidz/app.py#222-422) — The Main Pipeline (lines 222-421)**

This is an async generator that yields SSE events. Flow:

```
Step 1: Process multimodal input (image/PDF)
Step 2: Run planner_agent → yield plan_complete event
Step 3: Run architect_agent → yield architect_complete event (with Mermaid diagram)
Step 4: Run coder_agent → yield coding_complete event (with files dict)
Step 5: Run reviewer_agent → yield complete event (with files + review)
Step 6: Save to Supabase (project row + version)
```

Each agent runs in `loop.run_in_executor()` to avoid blocking the async event loop.

SSE event format:
```
data: {"stage": "planning", "message": "Constructing a Master Plan...."}\n\n
data: {"stage": "plan_complete", "plan": "📋 PROJECT PLAN\n..."}\n\n
data: {"stage": "architect_complete", "architect": "🏗️ IMPL STEPS\n...", "diagram": "graph TD; ..."}\n\n
data: {"stage": "coding_complete", "files": {"/App.tsx": "...", "/components/Header.tsx": "..."}}\n\n
data: {"stage": "complete", "files": {...}, "review": "## Code Review\n..."}\n\n
data: {"stage": "saved", "project_id": "uuid"}\n\n
```

**KEY FUNCTION: [run_coder_followup()](file:///c:/devOpus/Lucidz/app.py#454-509) — Follow-Up Modifications (lines 454-508)**

Sends ALL current files to the LLM as combined text:
```python
all_code_parts = []
for filepath, code in current_files.items():
    all_code_parts.append(f"// === FILE: {filepath} ===\n{code}")
current_code = "\n\n".join(all_code_parts)
```

Then calls [coder_followup_prompt(modification_request, current_code, review_feedback)](file:///c:/devOpus/Lucidz/agent/prompts.py#353-421).

**Helper Functions:**
- [format_plan_as_text(plan_obj)](file:///c:/devOpus/Lucidz/app.py#86-116) — Converts Plan Pydantic model to readable text
- [format_architect_as_text(task_plan_obj)](file:///c:/devOpus/Lucidz/app.py#118-144) — Converts TaskPlan to readable text
- [extract_architecture_diagram(task_plan_obj)](file:///c:/devOpus/Lucidz/app.py#146-165) — Extracts Mermaid code string

---

### FILE: [agent/graph.py](file:///c:/devOpus/Lucidz/agent/graph.py) (193 lines) — The LangGraph Pipeline

**LLM Configuration:**
```python
planner_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=8192)
architect_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=16384)
coder_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=64000)
```

**Graph Definition:**
```python
graph = StateGraph(dict)
graph.add_node("planner", planner_agent)
graph.add_node("architect", architect_agent)
graph.add_node("coder", coder_agent)
graph.add_edge("planner", "architect")
graph.add_edge("architect", "coder")
graph.add_edge("coder", END)
graph.set_entry_point("planner")
agent = graph.compile()
```

**Agent Functions:**

| Function | Input | Output | Mechanism |
|----------|-------|--------|-----------|
| [planner_agent(state)](file:///c:/devOpus/Lucidz/agent/graph.py#27-77) | `user_prompt`, optional `image_data` | `{"plan": Plan}` | `planner_llm.with_structured_output(Plan)` — forces Pydantic schema |
| [architect_agent(state)](file:///c:/devOpus/Lucidz/agent/graph.py#79-91) | `plan: Plan` | `{"task_plan": TaskPlan}` | `architect_llm.with_structured_output(TaskPlan)` |
| [coder_agent(state)](file:///c:/devOpus/Lucidz/agent/graph.py#93-165) | `task_plan: TaskPlan` | `{"generated_project": GeneratedProject}` | Raw LLM invoke → JSON parse → extract [files](file:///c:/devOpus/Lucidz/agent/tools.py#33-41) dict |

The [coder_agent](file:///c:/devOpus/Lucidz/agent/graph.py#93-165) does NOT use `with_structured_output` because the code strings are too large for Pydantic validation. Instead it:
1. Invokes the LLM with system + user messages
2. Strips markdown code fences if present
3. Tries `json.loads()`, falls back to regex `\{[\s\S]*\}` extraction
4. Removes any `/App.js` or `/App.jsx` files (only [.tsx](file:///c:/devOpus/Lucidz/frontend/src/app/page.tsx) allowed)

---

### FILE: [agent/prompts.py](file:///c:/devOpus/Lucidz/agent/prompts.py) (483 lines) — All 6 Prompt Functions

**1. [planner_prompt(user_prompt, image_asset_url=None)](file:///c:/devOpus/Lucidz/agent/prompts.py#3-82) → str**
- Role: Technical Product Manager
- Input: User's text prompt + optional uploaded asset URL
- Output format: JSON PRD with `project_name`, `tagline`, `core_features`, `user_flow`, `design_theme`, `component_breakdown`, `extracted_content`
- Special: Extracts ALL data from uploaded PDFs/resumes — names, skills, projects, education, certifications
- Forces React SPA (no Next.js), Tailwind CSS, Lucide icons, modular `/components/` structure

**2. [architect_prompt(plan)](file:///c:/devOpus/Lucidz/agent/prompts.py#84-126) → str**
- Role: Senior Software Architect
- Input: Plan JSON from planner
- Output: [TaskPlan](file:///c:/devOpus/Lucidz/agent/states.py#24-31) with [architecture_diagram](file:///c:/devOpus/Lucidz/app.py#146-165) (Mermaid `graph TD`) + `implementation_steps`
- Forces modular file structure: `/App.tsx` + `/components/*.tsx`
- Must generate Mermaid flowchart showing component relationships

**3. [coder_system_prompt()](file:///c:/devOpus/Lucidz/agent/prompts.py#128-265) → str**
- Role: Expert React Developer for Sandpack
- Rules: Pure React (no Next.js), `/App.tsx` as entry, modular components, TypeScript only, no `.js`/`.jsx`, no `@/` imports, Tailwind inline classes, no `@apply`, JSON-only output
- Design rules: Beautiful/modern UI, theme appropriate for app type, hover effects, Lucide icons

**4. [coder_task_prompt(task_plan_json, image_asset_url=None)](file:///c:/devOpus/Lucidz/agent/prompts.py#267-349) → str**
- Passes architecture plan to coder
- Enforces using exact data from plan (no placeholders)
- Output: `{"files": {"/App.tsx": "...", "/components/Header.tsx": "...", "/package.json": "...", "/README.md": "..."}}`

**5. [coder_followup_prompt(modification_request, current_code, review_feedback, image_asset_url)](file:///c:/devOpus/Lucidz/agent/prompts.py#353-421) → str**
- For follow-up modifications
- Sends ALL current files as context
- Rules: preserve existing functionality, incremental changes, maintain modular architecture
- Output: `{"summary": "...", "files": {"/App.tsx": "...", ...}}` — must include ALL files (modified + unmodified)

**6. [reviewer_prompt(user_prompt, plan, architecture, code_files)](file:///c:/devOpus/Lucidz/agent/prompts.py#423-483) → str**
- Role: Senior QA Engineer and Code Reviewer
- Reviews: Missing features, logic gaps, UX issues, best practices
- Focus on 3-5 critical issues only (no nitpicking)
- Output: `{"review_feedback": "## Code Review\n..."}`

---

### FILE: [agent/states.py](file:///c:/devOpus/Lucidz/agent/states.py) (50 lines) — Pydantic Models

```python
class File(BaseModel):
    path: str       # "/components/Header.tsx"
    purpose: str    # "Navigation header with logo and links"

class Plan(BaseModel):
    name: str           # "Modern Portfolio Website"
    description: str    # "A responsive portfolio..."
    techstack: str      # "React, TypeScript, Tailwind CSS"
    features: list[str] # ["Dark mode", "Contact form", "Project showcase"]
    files: list[File]   # [{path: "/App.tsx", purpose: "Root entry point"}, ...]

class ImplementationTask(BaseModel):
    filepath: str           # "/components/Hero.tsx"
    task_description: str   # "Create hero section with animated gradient..."

class TaskPlan(BaseModel):
    architecture_diagram: str = ""              # Mermaid.js graph TD code
    implementation_steps: list[ImplementationTask]
    model_config = ConfigDict(extra="allow")    # Allows extra fields like plan

class CoderState(BaseModel):
    task_plan: TaskPlan
    current_step_idx: int = 0
    current_file_content: Optional[str] = None

class GeneratedFile(BaseModel):
    path: str       # "/components/Header.tsx"
    content: str    # Full code string

class GeneratedProject(BaseModel):
    files: dict[str, str]   # {"/App.tsx": "code...", "/components/Header.tsx": "code..."}
```

---

### FILE: [db.py](file:///c:/devOpus/Lucidz/db.py) (246 lines) — Supabase Database Layer

**Connection:**
```python
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key)
```

**Database Tables:**

**[projects](file:///c:/devOpus/Lucidz/app.py#807-825) table:**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID | FK to Supabase auth.users |
| name | text | Project name |
| description | text | Project description |
| code_snapshot | jsonb | `{files: {"/App.tsx": {code: "..."}}, plan_snapshot, architect_snapshot, ...}` |
| plan_snapshot | text | Planner output |
| architect_snapshot | text | Architect output |
| diagram_snapshot | text | Mermaid diagram code |
| review_snapshot | text | Reviewer output |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**[versions](file:///c:/devOpus/Lucidz/app.py#867-877) table:**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| project_id | UUID | FK to projects |
| prompt | text | The prompt used for this version |
| code_snapshot | jsonb | Files at this version |
| plan_snapshot | text | Plan at this version |
| architect_snapshot | text | Architecture at this version |
| diagram_snapshot | text | Diagram at this version |
| review_snapshot | text | Review at this version |
| summary | text | AI-generated change summary |
| created_at | timestamptz | Auto |

**Functions:**
- [is_configured()](file:///c:/devOpus/Lucidz/db.py#19-22) → bool
- [create_project(user_id, name, description, code_snapshot)](file:///c:/devOpus/Lucidz/db.py#24-40) → dict
- [save_project(user_id, name, description, code_snapshot, project_id)](file:///c:/devOpus/Lucidz/db.py#42-67) → dict (upsert)
- [get_project_with_code(project_id)](file:///c:/devOpus/Lucidz/db.py#69-76) → dict (includes code_snapshot)
- [save_version(project_id, prompt, code_snapshot, plan, architect, diagram, review, summary)](file:///c:/devOpus/Lucidz/db.py#78-130) → dict
- [get_project(project_id)](file:///c:/devOpus/Lucidz/app.py#827-841) → dict (metadata only)
- [get_latest_version(project_id)](file:///c:/devOpus/Lucidz/app.py#843-853) → dict
- [get_user_projects(user_id)](file:///c:/devOpus/Lucidz/db.py#158-172) → list (sorted by updated_at desc)
- [delete_project(project_id)](file:///c:/devOpus/Lucidz/db.py#174-181) → bool (cascade deletes versions)
- [get_project_versions(project_id)](file:///c:/devOpus/Lucidz/app.py#867-877) → list
- [get_version(version_id)](file:///c:/devOpus/Lucidz/db.py#200-214) → dict
- [upload_asset_to_storage(file_content, filename, content_type)](file:///c:/devOpus/Lucidz/db.py#216-246) → str (public URL)

**Important:** [save_version()](file:///c:/devOpus/Lucidz/db.py#78-130) inherits plan/architect/diagram/review from the latest version if not provided (for follow-ups that only change code).

---

### FILE: [utils.py](file:///c:/devOpus/Lucidz/utils.py) (217 lines) — Multimodal Processing

**[process_multimodal_input(user_prompt, attachment)](file:///c:/devOpus/Lucidz/utils.py#25-67) → MultimodalResult**
- No attachment: returns prompt as-is
- PDF: extracts text page-by-page with PyPDF, appends as `[CONTEXT: UPLOADED DOCUMENT]`
- Image: extracts base64 from data URL, returns for Claude Vision API

**[_process_pdf_attachment(user_prompt, data_url, filename)](file:///c:/devOpus/Lucidz/utils.py#69-135) → MultimodalResult**
- Strips `data:application/pdf;base64,` prefix
- Decodes base64 → bytes → PyPDF reader
- Extracts text from each page
- Appends enhanced prompt: "If this is a resume/CV, create a portfolio website"

**[_process_image_attachment(user_prompt, data_url, mime_type)](file:///c:/devOpus/Lucidz/utils.py#137-183) → MultimodalResult**
- Strips `data:image/png;base64,` prefix
- Returns raw base64 + mime type for Claude's multimodal API
- Adds context: "If UI screenshot → replicate layout. If photo → use as profile image."

**[create_vision_message_content(text, image_data, mime_type)](file:///c:/devOpus/Lucidz/utils.py#185-217) → list**
- Builds Claude multimodal content array with image block + text block

---

### FILE: [github_utils.py](file:///c:/devOpus/Lucidz/github_utils.py) (118 lines) — GitHub Export

**[create_github_repo(github_token, repo_name, files, description)](file:///c:/devOpus/Lucidz/github_utils.py#6-118) → str (repo URL)**
1. Authenticates with PyGithub
2. Gets or creates repository (auto_init=True for initial README)
3. Creates Git blobs for each file
4. Builds Git tree from blobs
5. Creates commit (with parent if updating, without if new)
6. Pushes to `main` branch
7. Returns `repo.html_url`

---

## FRONTEND — DETAILED FILE BREAKDOWN

---

### FILE: [app/layout.tsx](file:///c:/devOpus/Lucidz/frontend/src/app/layout.tsx) — Root Layout

```tsx
<html lang="en" data-theme="dark">
  <body>
    <SupabaseProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SupabaseProvider>
  </body>
</html>
```

Wraps entire app in auth context + theme context.

---

### FILE: [app/page.tsx](file:///c:/devOpus/Lucidz/frontend/src/app/page.tsx) (46KB) — Landing Page

Sections: Navbar (with theme toggle), Hero (animated gradient text), Features (bento grid with glowing cards), How It Works, Pricing, Footer. Uses Framer Motion for scroll animations.

---

### FILE: [app/login/page.tsx](file:///c:/devOpus/Lucidz/frontend/src/app/login/page.tsx) — Authentication

- Google OAuth button (direct `signInWithOAuth`)
- GitHub OAuth via Supabase Auth UI component
- Redirects to `/dashboard` on success
- Requests [repo](file:///c:/devOpus/Lucidz/github_utils.py#6-118) scope for GitHub (needed for export feature)

---

### FILE: [app/dashboard/page.tsx](file:///c:/devOpus/Lucidz/frontend/src/app/dashboard/page.tsx) — Project Dashboard

- Fetches projects from `/projects/user/{user_id}`
- Displays project cards with name, description, timestamps
- Click → navigates to `/project/{id}`
- Delete button with confirmation
- "New Project" button → `/generate`
- Theme toggle in header

---

### FILE: [app/generate/page.tsx](file:///c:/devOpus/Lucidz/frontend/src/app/generate/page.tsx) (764 lines) — New Generation Page

**State:**
```tsx
const [files, setFiles] = useState<SandpackFiles>({});
const [plan, setPlan] = useState('');
const [architect, setArchitect] = useState('');
const [diagram, setDiagram] = useState('');
const [review, setReview] = useState('');
const [stage, setStage] = useState<GenerationStage>('idle');
const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
```

**[handleGenerate(prompt, attachments)](file:///c:/devOpus/Lucidz/frontend/src/app/generate/page.tsx#114-318):**
1. Uploads image asset if present → gets persistent URL
2. POSTs to `/generate-stream` with prompt, attachment, user_id
3. Reads SSE stream with ReadableStream API
4. Splits on `\n\n` event boundaries (not single `\n`)
5. Joins multi-line `data:` fields before JSON.parse
6. Updates state per stage: plan, architect, diagram, files, review

**[handleFollowUp(prompt, attachments)](file:///c:/devOpus/Lucidz/frontend/src/app/generate/page.tsx#394-503):**
1. Normalizes files from `{code: "..."}` objects to plain strings
2. POSTs to `/followup-stream` with prompt, current_files, review_feedback
3. Same SSE parsing as above
4. Updates files state with modified code

**Layout:** Split-pane — ChatInterface on left, CodePreview on right. Responsive with mobile tabs.

---

### FILE: `app/project/[id]/page.tsx` (641 lines) — Existing Project Page

**On mount (`useEffect`):**
1. Fetches project from `/projects/single/{projectId}`
2. Loads `code_snapshot.files` into state
3. Loads plan, architect, diagram, review from project or fallback to latest version
4. Loads chat history from versions list

**Follow-up handler:** Same as generate page but normalizes `{code: "..."}` → plain strings before sending.

**Features:** Version history sidebar, revert to any version, GitHub export button.

---

### COMPONENT: [ChatInterface.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/ChatInterface.tsx) (29KB)

**Props:**
```tsx
interface ChatInterfaceProps {
    plan: string;
    architect: string;
    review: string;
    diagram: string;
    stage: GenerationStage;
    onSubmit: (prompt: string, attachments: AttachmentPayload) => void;
    isLoading: boolean;
    followUpMessages: Array<{prompt: string; response: string}>;
    sidebarWidth: number;
    initialPrompt?: string;
}
```

**Sections:**
- Plan display (collapsible, expandable to modal)
- Architecture display with embedded MermaidDiagram
- Code Review display (collapsible, expandable to modal)
- Follow-up chat messages (user prompts + AI responses)
- SmartInput at bottom for follow-up prompts
- Stage progress indicators (animated dots)

---

### COMPONENT: [CodePreview.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/CodePreview.tsx) (11KB)

**Purpose:** Wraps Sandpack to render generated files as live preview.

**Processing pipeline:**
1. Find `/App.tsx` content from input files
2. Skip config files (vite.config, tsconfig, postcss.config, etc.)
3. Normalize paths (`/src/App.tsx` → `/App.tsx`)
4. Skip `.js`/`.jsx` files (only [.tsx](file:///c:/devOpus/Lucidz/frontend/src/app/page.tsx))
5. Skip [.css](file:///c:/devOpus/Lucidz/frontend/src/app/globals.css) files (Tailwind via CDN)
6. Fix import paths for nested components (`../hooks/` → correct relative)
7. Remove CSS imports from all files
8. Auto-generate `/types.ts` if type references found but no types file
9. Inject custom `index.html` with Tailwind CDN script
10. Configure Sandpack with custom dark theme

**Sandpack config:**
```tsx
<SandpackProvider
    template="react-ts"
    theme={lucidTheme}
    files={sandpackFormattedFiles}
    customSetup={{ dependencies: { 'lucide-react': 'latest' } }}
    options={{
        activeFile: '/App.tsx',
        externalResources: ['https://cdn.tailwindcss.com'],
    }}
>
    <SandpackFileExplorer />    {/* Left: file tree */}
    <SandpackCodeEditor />      {/* Center: editable code */}
    <SandpackPreview />          {/* Right: live preview */}
</SandpackProvider>
```

**Code is editable** (readOnly removed). Changes hot-reload instantly in preview.

---

### COMPONENT: [SmartInput.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/SmartInput.tsx) (12KB)

**Features:**
- Text input (auto-resize textarea)
- Image upload (click, drag-and-drop, clipboard paste)
- PDF upload (click to select)
- Attachment previews with remove buttons
- Submit on Enter (Shift+Enter for newline)
- Base64 file reading via FileReader API

**Attachment format:**
```tsx
interface AttachmentPayload {
    images: Array<{name: string; type: 'image'; data: string; mimeType: string}>;
    pdf: {name: string; type: 'pdf'; data: string; mimeType: string} | null;
}
```

---

### COMPONENT: [MermaidDiagram.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/MermaidDiagram.tsx) (13KB)

Renders Mermaid.js flowcharts from the architect's [architecture_diagram](file:///c:/devOpus/Lucidz/app.py#146-165) string. Uses `mermaid.render()` to convert graph code to SVG. Handles errors gracefully.

---

### COMPONENT: [VersionHistorySidebar.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/VersionHistorySidebar.tsx) (6KB)

- Displays timeline of all project versions
- Each version shows: prompt, timestamp, summary
- Click "Revert" → fetches version's code_snapshot → replaces current files
- Stores current version ID in sessionStorage

---

### COMPONENT: [DownloadBtn.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/DownloadBtn.tsx) (8KB)

**ZIP Download:** Bundles all files into a ZIP using JSZip, triggers browser download.
**GitHub Export:** Gets GitHub token from Supabase session, calls `/api/export-to-github`.

---

### COMPONENT: [SupabaseProvider.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/SupabaseProvider.tsx) (78 lines)

React Context provider for Supabase auth state.
```tsx
// Provides: { supabase, session, user, isLoading }
// Hook: useSupabase()
```

On mount:
1. Calls `supabase.auth.getSession()`
2. If session expired → signs out, clears state
3. Subscribes to `onAuthStateChange` for live auth updates
4. Cleanup: unsubscribes on unmount

---

### COMPONENT: [ThemeProvider.tsx](file:///c:/devOpus/Lucidz/frontend/src/components/ThemeProvider.tsx) (1.4KB)

```tsx
// Provides: { theme: 'dark' | 'light', toggleTheme: () => void }
// Hook: useTheme()
```

Persists theme in localStorage. Applies `data-theme` attribute to `<html>`.

---

### FILE: [globals.css](file:///c:/devOpus/Lucidz/frontend/src/app/globals.css) — Theme System

```css
:root {
    --lucid-bg: #050505;
    --lucid-bg-secondary: #09090b;
    --lucid-text: #fafafa;
    --lucid-text-secondary: #a1a1aa;
    --lucid-border: #1a1a1a;
    --lucid-green: #22c55e;
    --lucid-green-dim: rgba(34, 197, 94, 0.15);
}

[data-theme='light'] {
    --lucid-bg: #f8f9fa;
    --lucid-bg-secondary: #ffffff;
    --lucid-text: #1a1a2e;
    --lucid-text-secondary: #4a4a68;
    --lucid-border: #e2e2e8;
    --lucid-green: #16a34a;
}
```

---

## COMPLETE DATA FLOW — Generation

```
1. User types "Build a portfolio website" + uploads resume PDF
   └── SmartInput reads PDF as base64 data URL

2. Frontend calls POST /generate-stream
   └── Body: { prompt, attachment: {name, type:"pdf", data, mimeType}, user_id }

3. Backend: process_multimodal_input()
   └── PDF detected → PyPDF extracts text → appends as [CONTEXT: UPLOADED DOCUMENT]

4. Backend: planner_agent()
   └── planner_llm.with_structured_output(Plan).invoke(planner_prompt)
   └── Returns Plan with extracted resume data in features/files/extracted_content
   └── SSE: {stage: "plan_complete", plan: "📋 PROJECT PLAN\n..."}

5. Backend: architect_agent()
   └── architect_llm.with_structured_output(TaskPlan).invoke(architect_prompt)
   └── Returns TaskPlan with Mermaid diagram + implementation steps
   └── SSE: {stage: "architect_complete", architect: "🏗️ ...", diagram: "graph TD; ..."}

6. Backend: run_coder_agent()
   └── coder_llm.invoke([system_prompt, task_prompt])
   └── Response: raw JSON string → strip code fences → json.loads()
   └── Extract files dict → remove .js/.jsx conflicts
   └── SSE: {stage: "coding_complete", files: {"/App.tsx": "...", "/components/...": "..."}}

7. Backend: reviewer_llm.invoke(reviewer_prompt)
   └── Analyzes code vs requirements
   └── SSE: {stage: "complete", files: {...}, review: "## Code Review\n..."}

8. Backend: Save to Supabase
   └── Create or update project row with code_snapshot (all agent outputs)
   └── Create version snapshot
   └── SSE: {stage: "saved", project_id: "uuid"}

9. Frontend: SSE events update React state
   └── ChatInterface shows Plan, Architecture (Mermaid), Review
   └── CodePreview renders files in Sandpack with live preview
```

---

## COMPLETE DATA FLOW — Follow-Up Modification

```
1. User types "Add a dark mode toggle to the header"
   └── Project page has existing files in state

2. Frontend normalizes files: {code: "..."} objects → plain strings

3. Frontend calls POST /followup-stream
   └── Body: { prompt, current_files: {"/App.tsx": "code", "/components/Header.tsx": "code", ...} }

4. Backend: run_coder_followup()
   └── Combines ALL files: "// === FILE: /App.tsx ===\n{code}\n\n// === FILE: /components/Header.tsx ===\n..."
   └── Calls coder_followup_prompt with combined code + modification request
   └── LLM returns modified JSON with ALL files (modified + unmodified)

5. Backend: SSE
   └── {stage: "complete", files: {...updated files...}, summary: "Added dark mode toggle..."}

6. Frontend: Updates files state → Sandpack hot-reloads preview

7. Backend: Saves to Supabase
   └── Updates project code_snapshot
   └── Creates new version snapshot with prompt + summary
```

---

## HOW TO RUN

**Backend:**
```bash
cd c:\devOpus\Lucidz
uv run uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd c:\devOpus\Lucidz\frontend
npm run dev
```

Frontend runs on `http://localhost:3000`, Backend on `http://localhost:8000`.
API docs at `http://localhost:8000/docs` (Swagger UI).

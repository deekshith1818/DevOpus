"""
FastAPI application for the headless Code Generator API.
Provides a /generate-stream endpoint that streams real-time agent progress using LangGraph streaming.
Includes project persistence via Supabase.
"""
import json
import asyncio
from typing import Optional, Any
from fastapi import FastAPI, HTTPException, Query, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.graph import graph, planner_llm, architect_llm, coder_llm
from agent.states import Plan, TaskPlan, GeneratedProject
from agent.prompts import planner_prompt, architect_prompt, coder_system_prompt, coder_task_prompt, coder_followup_prompt, reviewer_prompt
from utils import process_multimodal_input, create_vision_message_content
from langchain_core.messages import HumanMessage, SystemMessage
import re
import db as database
import github_utils

# Reviewer uses Sonnet like planner/architect
from langchain_anthropic import ChatAnthropic
reviewer_llm = ChatAnthropic(model_name="claude-sonnet-4-6", max_tokens=4096)

app = FastAPI(
    title="Code Generator API",
    description="Headless API that generates React/Next.js code from natural language prompts",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AttachmentModel(BaseModel):
    """Attachment model for multimodal input."""
    name: str
    type: str  # 'image' or 'pdf'
    data: str  # Base64 data URL
    mimeType: str


class GenerateRequest(BaseModel):
    """Request model for the /generate endpoint."""
    prompt: str
    attachment: Optional[AttachmentModel] = None
    user_id: Optional[str] = None  # From Supabase Auth
    project_id: Optional[str] = None  # Existing project to add version to
    image_asset_url: Optional[str] = None  # persistent image asset URL


class FollowUpRequest(BaseModel):
    """Request model for the /followup-stream endpoint."""
    prompt: str  # The modification request
    current_files: dict[str, str]  # Current generated code to modify
    review_feedback: str = ""  # Optional code review feedback to include
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    image_asset_url: Optional[str] = None  # persistent image asset URL


class ExportToGithubRequest(BaseModel):
    """Request model for exporting to GitHub."""
    project_id: str
    github_token: str
    repo_name: Optional[str] = None


class SaveProjectRequest(BaseModel):
    """Request model for saving a project with code_snapshot."""
    user_id: str
    name: str
    description: str = ""
    code_snapshot: Optional[dict] = None
    project_id: Optional[str] = None


def format_plan_as_text(plan_obj) -> str:
    """Convert Plan object to human-readable text."""
    if plan_obj is None:
        return ""
    
    try:
        if hasattr(plan_obj, 'name'):
            lines = []
            lines.append(f"📋 PROJECT PLAN")
            lines.append(f"{'=' * 50}")
            lines.append(f"")
            lines.append(f"🎯 Name: {plan_obj.name}")
            lines.append(f"📝 Description: {plan_obj.description}")
            lines.append(f"🛠️ Tech Stack: {plan_obj.techstack}")
            lines.append(f"")
            lines.append(f"✨ FEATURES:")
            for i, feature in enumerate(plan_obj.features, 1):
                lines.append(f"   {i}. {feature}")
            lines.append(f"")
            lines.append(f"📁 FILES TO GENERATE:")
            for file in plan_obj.files:
                lines.append(f"   • {file.path}")
                lines.append(f"     └─ {file.purpose}")
            return "\n".join(lines)
        else:
            if hasattr(plan_obj, 'model_dump'):
                return json.dumps(plan_obj.model_dump(), indent=2)
            return str(plan_obj)
    except Exception as e:
        return f"Error formatting plan: {str(e)}"


def format_architect_as_text(task_plan_obj) -> str:
    """Convert TaskPlan object to human-readable text."""
    if task_plan_obj is None:
        return ""
    
    try:
        if hasattr(task_plan_obj, 'implementation_steps'):
            lines = []
            lines.append(f"")
            lines.append(f"🏗️ IMPLEMENTATION STEPS")
            lines.append(f"{'=' * 50}")
            lines.append(f"")
            
            for i, step in enumerate(task_plan_obj.implementation_steps, 1):
                lines.append(f"📄 Step {i}: {step.filepath}")
                desc = step.task_description[:150] + '...' if len(step.task_description) > 150 else step.task_description
                lines.append(f"   {desc}")
                lines.append(f"")
            
            return "\n".join(lines)
        else:
            if hasattr(task_plan_obj, 'model_dump'):
                return json.dumps(task_plan_obj.model_dump(), indent=2)
            return str(task_plan_obj)
    except Exception as e:
        return f"Error formatting architect output: {str(e)}"


def extract_architecture_diagram(task_plan_obj) -> str:
    """Extract the Mermaid.js architecture diagram from TaskPlan."""
    if task_plan_obj is None:
        return ""
    
    try:
        if hasattr(task_plan_obj, 'architecture_diagram'):
            diagram = task_plan_obj.architecture_diagram
            if diagram and isinstance(diagram, str):
                # Clean up the diagram - remove markdown fences if present
                diagram = diagram.strip()
                if diagram.startswith('```'):
                    lines = diagram.split('\n')
                    diagram = '\n'.join(lines[1:-1]) if lines[-1].strip() == '```' else '\n'.join(lines[1:])
                return diagram.strip()
        return ""
    except Exception as e:
        print(f"Error extracting diagram: {str(e)}")
        return ""


def run_coder_agent(task_plan: TaskPlan, image_asset_url: Optional[str] = None) -> dict:
    """Run the coder agent independently to generate files."""
    system_prompt = coder_system_prompt()
    user_prompt = coder_task_prompt(task_plan.model_dump_json(), image_asset_url)
    
    response = coder_llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ])
    
    response_text = response.content
    
    # Strip markdown code blocks if present
    cleaned_text = response_text.strip()
    if cleaned_text.startswith("```"):
        lines = cleaned_text.split('\n')
        json_lines = []
        for i, line in enumerate(lines):
            if i == 0:
                continue
            if line.strip() == "```":
                continue
            json_lines.append(line)
        cleaned_text = '\n'.join(json_lines)
    
    try:
        generated_data = json.loads(cleaned_text)
    except json.JSONDecodeError:
        json_match = re.search(r'\{[\s\S]*\}', cleaned_text)
        if json_match:
            try:
                generated_data = json.loads(json_match.group(0))
            except json.JSONDecodeError as e:
                raise ValueError(f"Could not parse JSON: {str(e)}")
        else:
            raise ValueError(f"No JSON object found in coder response")
    
    if "files" in generated_data:
        files_dict = generated_data["files"]
    else:
        files_dict = generated_data
    
    # Remove conflicting files
    files_to_remove = []
    for path in files_dict.keys():
        normalized = path.lower()
        if normalized in ['/app.js', '/app.jsx', 'app.js', 'app.jsx']:
            files_to_remove.append(path)
    
    for path in files_to_remove:
        del files_dict[path]
    
    return files_dict


async def generate_stream(prompt: str, attachment: Optional[dict] = None, user_id: Optional[str] = None, project_id: Optional[str] = None, image_asset_url: Optional[str] = None):
    """
    Generator that streams agent progress as Server-Sent Events.
    Runs each agent step separately for true real-time streaming.
    """
    try:
        # Process multimodal input
        multimodal_result = process_multimodal_input(prompt, attachment)
        processed_prompt = multimodal_result["text"]
        image_data = multimodal_result["image_data"]
        image_mime_type = multimodal_result["image_mime_type"]
        
        # Step 1: PLANNING
        yield f"data: {json.dumps({'stage': 'planning', 'message': 'Constructing a Master Plan....'})}\n\n"
        
        # Run planner agent (with vision if image is present)
        loop = asyncio.get_event_loop()
        
        if image_data:
            # Use vision-enabled planner for image input
            # Build multimodal content for Claude vision
            human_content = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": image_mime_type or "image/png",
                        "data": image_data
                    }
                },
                {
                    "type": "text",
                    "text": f"""Analyze this image carefully. Based on what you see:

1. If it's a UI/design mockup: Plan to replicate the exact layout, colors, components, and styling.
2. If it's a wireframe: Use this as the structural basis for the UI design.
3. If it's a photo/logo: Incorporate this appropriately (profile image, branding, etc.).

User's request: {processed_prompt}

Now create a detailed product plan as specified in the system instructions."""
                }
            ]
            
            messages = [
                SystemMessage(content=planner_prompt(processed_prompt, image_asset_url)),
                HumanMessage(content=human_content)
            ]
            
            plan_resp = await loop.run_in_executor(
                None,
                lambda: planner_llm.with_structured_output(Plan).invoke(messages)
            )
        else:
            # Standard text-only planner
            plan_resp = await loop.run_in_executor(
                None,
                lambda: planner_llm.with_structured_output(Plan).invoke(
                    planner_prompt(processed_prompt, image_asset_url)
                )
            )
        
        if plan_resp is None:
            yield f"data: {json.dumps({'stage': 'error', 'message': 'Planner failed to create a plan'})}\n\n"
            return
        
        plan_text = format_plan_as_text(plan_resp)
        yield f"data: {json.dumps({'stage': 'plan_complete', 'plan': plan_text})}\n\n"
        
        # Step 2: ARCHITECTING
        yield f"data: {json.dumps({'stage': 'architecting', 'message': 'Orchestrating things....'})}\n\n"
        
        # Run architect agent
        task_plan_resp = await loop.run_in_executor(
            None,
            lambda: architect_llm.with_structured_output(TaskPlan).invoke(
                architect_prompt(plan=plan_resp.model_dump_json())
            )
        )
        
        if task_plan_resp is None:
            yield f"data: {json.dumps({'stage': 'error', 'message': 'Architect failed to create implementation steps'})}\n\n"
            return
        
        task_plan_resp.plan = plan_resp
        architect_text = format_architect_as_text(task_plan_resp)
        diagram_code = extract_architecture_diagram(task_plan_resp)
        
        yield f"data: {json.dumps({'stage': 'architect_complete', 'architect': architect_text, 'diagram': diagram_code})}\n\n"
        
        # Step 3: CODING
        yield f"data: {json.dumps({'stage': 'coding', 'message': 'Generating the code....'})}\n\n"
        
        # Run coder agent
        files_dict = await loop.run_in_executor(
            None,
            lambda: run_coder_agent(task_plan_resp, image_asset_url)
        )
        
        # Send files (coder complete)
        yield f"data: {json.dumps({'stage': 'coding_complete', 'files': files_dict})}\n\n"
        
        # Step 4: REVIEWING
        yield f"data: {json.dumps({'stage': 'reviewing', 'message': 'Reviewing code quality....'})}\n\n"
        
        # Prepare code for review
        code_content = "\n\n".join([f"// File: {path}\n{content}" for path, content in files_dict.items()])
        
        # Run reviewer agent
        review_resp = await loop.run_in_executor(
            None,
            lambda: reviewer_llm.invoke(
                reviewer_prompt(
                    user_prompt=prompt,
                    plan=plan_text,
                    architecture=architect_text,
                    code_files=code_content
                )
            )
        )
        
        # Parse review response
        review_text = review_resp.content
        try:
            # Try to parse as JSON
            cleaned = review_text.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split('\n')
                cleaned = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
            
            review_data = json.loads(cleaned)
            review_feedback = review_data.get("review_feedback", review_text)
        except json.JSONDecodeError:
            # If not JSON, use raw text
            review_feedback = review_text
        
        # Send complete stage with files and review
        yield f"data: {json.dumps({'stage': 'complete', 'files': files_dict, 'review': review_feedback})}\n\n"
        
        # Step 5: SAVE TO DATABASE (if user is authenticated)
        if user_id and database.is_configured():
            try:
                # Create project if none exists
                if not project_id:
                    # Use plan name or first part of prompt as project name
                    project_name = getattr(plan_resp, 'name', prompt[:50]) if plan_resp else prompt[:50]
                    project_desc = getattr(plan_resp, 'description', '') if plan_resp else ''
                    project = database.create_project(user_id, project_name, project_desc)
                    project_id = project.get('id')
                
                if project_id:
                    # Save all data to project row FIRST
                    print(f"📦 files_dict has {len(files_dict)} files: {list(files_dict.keys())}")
                    try:
                        code_snapshot_full = {
                            "files": {path: {"code": content} for path, content in files_dict.items()},
                            "plan_snapshot": plan_text,
                            "architect_snapshot": architect_text,
                            "diagram_snapshot": diagram_code,
                            "review_snapshot": review_feedback if isinstance(review_feedback, str) else str(review_feedback),
                            "prompt": prompt
                        }
                        print(f"📦 Saving {len(code_snapshot_full.get('files', {}))} files + agent outputs")
                        database.supabase.table("projects").update({
                            "code_snapshot": code_snapshot_full,
                            "plan_snapshot": plan_text,
                            "architect_snapshot": architect_text,
                            "diagram_snapshot": diagram_code,
                            "review_snapshot": review_feedback if isinstance(review_feedback, str) else str(review_feedback),
                            "updated_at": "now()"
                        }).eq("id", project_id).execute()
                        print(f"✅ All data saved to project {project_id}")
                    except Exception as snap_err:
                        print(f"⚠️ Failed to save project data: {str(snap_err)}")
                    
                    # Then try to save version (supplementary, may fail if versions table schema differs)
                    try:
                        database.save_version(
                            project_id=project_id,
                            prompt=prompt,
                            code_snapshot=files_dict,
                            plan_snapshot=plan_text,
                            architect_snapshot=architect_text,
                            diagram_snapshot=diagram_code,
                            review_snapshot=review_feedback if isinstance(review_feedback, str) else str(review_feedback)
                        )
                    except Exception as ver_err:
                        print(f"⚠️ Version save failed (non-fatal): {str(ver_err)}")
                    
                    yield f"data: {json.dumps({'stage': 'saved', 'project_id': project_id})}\n\n"
            except Exception as save_err:
                print(f"Save Error (non-fatal): {str(save_err)}")
                # Don't fail the whole stream if saving fails
                yield f"data: {json.dumps({'stage': 'save_error', 'message': str(save_err)})}\n\n"
        
    except Exception as e:
        print(f"Stream Error: {str(e)}")
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'stage': 'error', 'message': str(e)})}\n\n"


@app.post("/generate-stream")
async def generate_stream_endpoint(request: GenerateRequest):
    """
    Streaming endpoint that sends real-time agent progress.
    Uses Server-Sent Events (SSE) format.
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    # Convert attachment to dict if present
    attachment_dict = None
    if request.attachment:
        attachment_dict = {
            "name": request.attachment.name,
            "type": request.attachment.type,
            "data": request.attachment.data,
            "mimeType": request.attachment.mimeType
        }
    
    return StreamingResponse(
        generate_stream(request.prompt, attachment_dict, request.user_id, request.project_id, request.image_asset_url),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


def run_coder_followup(modification_request: str, current_files: dict, review_feedback: str = "", image_asset_url: Optional[str] = None) -> dict:
    """Run the coder agent to modify existing code based on follow-up request."""
    # Get the current App.tsx code
    current_code = current_files.get("/App.tsx", current_files.get("App.tsx", ""))
    
    if not current_code:
        raise ValueError("No App.tsx found in current files")
    
    system_prompt = coder_system_prompt()
    user_prompt = coder_followup_prompt(modification_request, current_code, review_feedback, image_asset_url)
    
    response = coder_llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ])
    
    response_text = response.content
    
    # Strip markdown code blocks if present
    cleaned_text = response_text.strip()
    if cleaned_text.startswith("```"):
        lines = cleaned_text.split('\n')
        json_lines = []
        for i, line in enumerate(lines):
            if i == 0:
                continue
            if line.strip() == "```":
                continue
            json_lines.append(line)
        cleaned_text = '\n'.join(json_lines)
    
    try:
        generated_data = json.loads(cleaned_text)
    except json.JSONDecodeError:
        json_match = re.search(r'\{[\s\S]*\}', cleaned_text)
        if json_match:
            try:
                generated_data = json.loads(json_match.group(0))
            except json.JSONDecodeError as e:
                raise ValueError(f"Could not parse JSON: {str(e)}")
        else:
            raise ValueError(f"No JSON object found in coder response")
    
    if "files" in generated_data:
        files_dict = generated_data["files"]
    else:
        files_dict = generated_data
    
    summary = generated_data.get("summary", "Modifications applied successfully.")
    
    return {"files": files_dict, "summary": summary}


async def followup_stream(modification_request: str, current_files: dict, review_feedback: str = "", user_id: Optional[str] = None, project_id: Optional[str] = None, image_asset_url: Optional[str] = None):
    """Generator that streams follow-up modification progress as SSE."""
    try:
        yield f"data: {json.dumps({'stage': 'modifying', 'message': 'Applying modifications....'})}\n\n"
        
        loop = asyncio.get_event_loop()
        result_dict = await loop.run_in_executor(
            None,
            lambda: run_coder_followup(modification_request, current_files, review_feedback, image_asset_url)
        )
        
        files_dict = result_dict.get("files", {})
        summary = result_dict.get("summary", "Modifications applied successfully.")
        
        yield f"data: {json.dumps({'stage': 'complete', 'files': files_dict, 'summary': summary})}\n\n"
        
        # Save the follow-up: all data to project row FIRST, then version
        if user_id and project_id and database.is_configured():
            try:
                # Fetch existing project to preserve agent outputs from initial generation
                existing = {}
                try:
                    existing_project = database.get_project_with_code(project_id)
                    existing = existing_project.get("code_snapshot", {}) or {}
                except Exception:
                    pass
                
                plan_text = existing.get("plan_snapshot", "")
                architect_text = existing.get("architect_snapshot", "")
                diagram_code = existing.get("diagram_snapshot", "")
                review_text = existing.get("review_snapshot", "")
                original_prompt = existing.get("prompt", "")
                
                code_snapshot_full = {
                    "files": {path: {"code": content} for path, content in files_dict.items()},
                    "plan_snapshot": plan_text,
                    "architect_snapshot": architect_text,
                    "diagram_snapshot": diagram_code,
                    "review_snapshot": review_text,
                    "prompt": original_prompt,
                    "last_followup": modification_request,
                    "followup_summary": summary
                }
                database.supabase.table("projects").update({
                    "code_snapshot": code_snapshot_full,
                    "plan_snapshot": plan_text,
                    "architect_snapshot": architect_text,
                    "diagram_snapshot": diagram_code,
                    "review_snapshot": review_text,
                    "updated_at": "now()"
                }).eq("id", project_id).execute()
                print(f"✅ Follow-up: all data saved to project {project_id}")
            except Exception as snap_err:
                print(f"⚠️ Failed to save follow-up data: {str(snap_err)}")
            
            # Then try version save (may fail if versions table schema differs)
            try:
                database.save_version(
                    project_id=project_id,
                    prompt=modification_request,
                    code_snapshot=files_dict,
                    summary=summary
                )
            except Exception as ver_err:
                print(f"⚠️ Follow-up version save failed (non-fatal): {str(ver_err)}")
            
            yield f"data: {json.dumps({'stage': 'saved', 'project_id': project_id})}\n\n"
        
    except Exception as e:
        print(f"Follow-up Stream Error: {str(e)}")
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'stage': 'error', 'message': str(e)})}\n\n"


@app.post("/followup-stream")
async def followup_stream_endpoint(request: FollowUpRequest):
    """
    Streaming endpoint for follow-up modifications.
    Skips planner/architect and goes directly to coder.
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Modification prompt is required")
    
    if not request.current_files:
        raise HTTPException(status_code=400, detail="Current files are required")
    
    return StreamingResponse(
        followup_stream(request.prompt, request.current_files, request.review_feedback, request.user_id, request.project_id, request.image_asset_url),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# Keep the old endpoint for backwards compatibility
class GenerateResponse(BaseModel):
    """Response model for the /generate endpoint."""
    files: dict[str, str]
    plan: str = ""
    architect: str = ""
    diagram: str = ""


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """Non-streaming endpoint (for backwards compatibility)."""
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    try:
        from agent.graph import agent
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: agent.invoke(
                {"user_prompt": request.prompt},
                {"recursion_limit": 100}
            )
        )
        
        if "generated_project" not in result:
            raise HTTPException(status_code=500, detail="Agent failed to generate project")

        generated_project = result["generated_project"]
        
        if isinstance(generated_project, dict):
            files = generated_project.get("files", {})
        else:
            files = getattr(generated_project, "files", {})
        
        plan_text = format_plan_as_text(result.get("plan")) if "plan" in result else ""
        architect_text = format_architect_as_text(result.get("task_plan")) if "task_plan" in result else ""
        diagram_code = extract_architecture_diagram(result.get("task_plan")) if "task_plan" in result else ""

        return GenerateResponse(files=files, plan=plan_text, architect=architect_text, diagram=diagram_code)
    
    except Exception as e:
        print(f"Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "db_configured": database.is_configured()}


# ========================================
# Asset Upload API
# ========================================

@app.post("/api/upload-asset")
async def upload_asset(file: UploadFile = File(...)):
    """Upload an asset file to Supabase Storage and return the public URL."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        file_content = await file.read()
        
        # Generate a unique path: assets/{uuid}_{filename}
        import uuid
        unique_id = str(uuid.uuid4())
        filename = f"assets/{unique_id}_{file.filename}"
        
        public_url = database.upload_asset_to_storage(
            file_content=file_content,
            filename=filename,
            content_type=file.content_type or "application/octet-stream"
        )
        
        return {"url": public_url}
    except Exception as e:
        print(f"Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# Project Persistence API Endpoints
# ========================================


@app.post("/projects/save")
async def save_project_endpoint(request: SaveProjectRequest):
    """Save or update a project with code_snapshot."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Format code_snapshot into the mandatory format
        code_snapshot = request.code_snapshot
        if code_snapshot and "files" not in code_snapshot:
            # Wrap raw files dict into { "files": { "/path": { "code": "..." } } }
            code_snapshot = {"files": {path: {"code": content} if isinstance(content, str) else content for path, content in code_snapshot.items()}}
        
        result = database.save_project(
            user_id=request.user_id,
            name=request.name,
            description=request.description,
            code_snapshot=code_snapshot,
            project_id=request.project_id
        )
        
        project_id = result.get("id") or request.project_id
        return {"project_id": project_id, "status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/user/{user_id}")
async def list_user_projects(user_id: str):
    """List all projects for a user (metadata only, no code_snapshot)."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        projects = database.get_user_projects(user_id)
        # Strip code_snapshot from response to keep it lightweight
        lightweight = []
        for p in projects:
            lightweight.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "description": p.get("description"),
                "created_at": p.get("created_at"),
                "updated_at": p.get("updated_at"),
            })
        return lightweight
    except Exception as e:
        print(f"❌ Error fetching projects for user {user_id}: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/single/{project_id}")
async def get_single_project(project_id: str):
    """Get a single project with full code_snapshot."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        project = database.get_project_with_code(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        code_snapshot = project.get("code_snapshot")
        
        # Fallback: if code_snapshot is empty/null, try to get it from the latest version
        if not code_snapshot or (isinstance(code_snapshot, dict) and not code_snapshot.get("files")):
            try:
                latest = database.get_latest_version(project_id)
                if latest and latest.get("code_snapshot"):
                    version_code = latest["code_snapshot"]
                    # Version code_snapshot is {"/App.tsx": "code"} format
                    # Convert to Sandpack format {files: {"/App.tsx": {code: "..."}}}
                    if isinstance(version_code, dict):
                        if "files" not in version_code:
                            code_snapshot = {"files": {path: {"code": content} if isinstance(content, str) else content for path, content in version_code.items()}}
                        else:
                            code_snapshot = version_code
                        
                        # Backfill: save to project row so future loads are fast
                        try:
                            database.supabase.table("projects").update({
                                "code_snapshot": code_snapshot,
                                "updated_at": "now()"
                            }).eq("id", project_id).execute()
                            print(f"✅ Backfilled code_snapshot for project {project_id}")
                        except Exception:
                            pass  # Non-fatal
            except Exception as e:
                print(f"⚠️ Fallback version lookup failed: {e}")
        
        return {
            "id": project.get("id"),
            "name": project.get("name"),
            "description": project.get("description"),
            "code_snapshot": code_snapshot,
            "plan_snapshot": project.get("plan_snapshot", ""),
            "architect_snapshot": project.get("architect_snapshot", ""),
            "diagram_snapshot": project.get("diagram_snapshot", ""),
            "review_snapshot": project.get("review_snapshot", ""),
            "created_at": project.get("created_at"),
            "updated_at": project.get("updated_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects")
async def list_projects(authorization: Optional[str] = Header(None)):
    """List all projects for the authenticated user."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    try:
        token = authorization.replace("Bearer ", "")
        user_response = database.supabase.auth.get_user(token)
        user_id = user_response.user.id
        
        projects = database.get_user_projects(user_id)
        return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token or unauthorized")


@app.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get a single project's metadata."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        project = database.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/{project_id}/latest")
async def get_latest_version(project_id: str):
    """Get the latest version snapshot for a project."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        version = database.get_latest_version(project_id)
        return version if version else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project and all its versions."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        database.delete_project(project_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/{project_id}/versions")
async def get_project_versions(project_id: str):
    """List all version snapshots for a project."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        versions = database.get_project_versions(project_id)
        return {"versions": versions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/versions/{version_id}")
async def get_version(version_id: str):
    """Get a specific version snapshot with full details."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        version = database.get_version(version_id)
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        return version
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export-to-github")
async def export_to_github(request: ExportToGithubRequest):
    """Export a project's latest code snapshot to a new GitHub repository."""
    if not database.is_configured():
        raise HTTPException(status_code=503, detail="Database not configured")

    try:
        # Fetch project with code_snapshot
        project = database.get_project_with_code(request.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        code_snapshot = project.get("code_snapshot")
        if not code_snapshot:
            raise HTTPException(status_code=404, detail="No code found for this project")
        
        # Extract files from code_snapshot
        raw_files = code_snapshot.get("files", code_snapshot) if isinstance(code_snapshot, dict) else {}
        
        # Convert {code: "..."} objects to plain strings for GitHub API
        files = {}
        for path, content in raw_files.items():
            if isinstance(content, str):
                files[path] = content
            elif isinstance(content, dict) and "code" in content:
                files[path] = content["code"]
            else:
                files[path] = str(content)
        
        if not files:
            raise HTTPException(status_code=404, detail="No files found in code snapshot")
        
        # Use provided repo name or derive from project name
        repo_name = request.repo_name
        if not repo_name:
            project_name = project.get("name", "")
            if project_name:
                # Sanitize: lowercase, replace spaces with hyphens, remove special chars
                import re as re_mod
                repo_name = re_mod.sub(r'[^a-zA-Z0-9-]', '', project_name.replace(' ', '-').strip('-'))
            if not repo_name:
                repo_name = f"DevOpus-project-{request.project_id[:8]}"
        
        # Create repo and push files
        repo_url = github_utils.create_github_repo(
            github_token=request.github_token,
            repo_name=repo_name,
            files=files
        )
        
        return {"repo_url": repo_url}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Code Generator API...")
    print("📡 Server running on http://localhost:8000")
    print(f"🗄️ Database: {'Connected' if database.is_configured() else 'Not configured'}")
    print("📖 API docs at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)

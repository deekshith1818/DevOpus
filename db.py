"""
Supabase database helper functions for project persistence.
Provides CRUD operations for projects and version snapshots.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")

supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None


def is_configured() -> bool:
    """Check if Supabase is properly configured."""
    return supabase is not None


def create_project(user_id: str, name: str, description: str = "", code_snapshot: dict = None) -> dict:
    """Create a new project and return it."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    row = {
        "user_id": user_id,
        "name": name,
        "description": description
    }
    if code_snapshot is not None:
        row["code_snapshot"] = code_snapshot
    
    result = supabase.table("projects").insert(row).execute()
    
    return result.data[0] if result.data else {}


def save_project(
    user_id: str,
    name: str,
    description: str = "",
    code_snapshot: dict = None,
    project_id: str = None
) -> dict:
    """Save (upsert) a project with code_snapshot. If project_id given, update; else insert."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    if project_id:
        # Update existing project
        update_data = {"name": name, "description": description, "updated_at": "now()"}
        if code_snapshot is not None:
            update_data["code_snapshot"] = code_snapshot
        result = supabase.table("projects").update(update_data).eq("id", project_id).execute()
    else:
        # Insert new project
        row = {"user_id": user_id, "name": name, "description": description}
        if code_snapshot is not None:
            row["code_snapshot"] = code_snapshot
        result = supabase.table("projects").insert(row).execute()
    
    return result.data[0] if result.data else {}


def get_project_with_code(project_id: str) -> dict:
    """Fetch a single project including its code_snapshot."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    result = supabase.table("projects").select("*").eq("id", project_id).single().execute()
    return result.data if result.data else {}


def save_version(
    project_id: str,
    prompt: str,
    code_snapshot: dict,
    plan_snapshot: str = "",
    architect_snapshot: str = "",
    diagram_snapshot: str = "",
    review_snapshot: str = "",
    summary: str = ""
) -> dict:
    """Save a version snapshot for a project."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    # If this is a follow-up, it might not have plan/architect/diagram.
    # We should inherit them from the latest version to prevent them from disappearing.
    if not plan_snapshot or not architect_snapshot:
        latest = get_latest_version(project_id)
        if latest:
            plan_snapshot = plan_snapshot or latest.get("plan_snapshot", "")
            architect_snapshot = architect_snapshot or latest.get("architect_snapshot", "")
            diagram_snapshot = diagram_snapshot or latest.get("diagram_snapshot", "")
            review_snapshot = review_snapshot or latest.get("review_snapshot", "")

    # Calculate version count for ordering
    existing = (
        supabase.table("versions")
        .select("id")
        .eq("project_id", project_id)
        .execute()
    )
    next_version = len(existing.data) + 1 if existing.data else 1

    # Insert the version
    result = supabase.table("versions").insert({
        "project_id": project_id,
        "prompt": prompt,
        "code_snapshot": code_snapshot,
        "plan_snapshot": plan_snapshot,
        "architect_snapshot": architect_snapshot,
        "diagram_snapshot": diagram_snapshot,
        "review_snapshot": review_snapshot,
        "summary": summary
    }).execute()
    
    # Update project's updated_at timestamp and sync code_snapshot
    update_data = {"updated_at": "now()"}
    if code_snapshot:
        update_data["code_snapshot"] = code_snapshot
    supabase.table("projects").update(update_data).eq("id", project_id).execute()
    
    return result.data[0] if result.data else {}


def get_project(project_id: str) -> dict:
    """Fetch a single project by ID."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    result = supabase.table("projects").select("*").eq("id", project_id).single().execute()
    return result.data if result.data else {}


def get_latest_version(project_id: str) -> dict:
    """Fetch the most recent version snapshot for a project."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    result = (
        supabase.table("versions")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    
    return result.data[0] if result.data else {}


def get_user_projects(user_id: str) -> list:
    """Fetch all projects for a user, ordered by most recently updated."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    result = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    
    return result.data if result.data else []


def delete_project(project_id: str) -> bool:
    """Delete a project and all its versions (cascade)."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    supabase.table("projects").delete().eq("id", project_id).execute()
    return True


def get_project_versions(project_id: str) -> list:
    """Fetch all version snapshots for a project (lightweight list)."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    # Select all fields to be resilient to schema differences
    result = (
        supabase.table("versions")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    )
    
    return result.data if result.data else []


def get_version(version_id: str) -> dict:
    """Fetch a specific version snapshot with full details."""
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    result = (
        supabase.table("versions")
        .select("*")
        .eq("id", version_id)
        .single()
        .execute()
    )
    
    return result.data if result.data else {}


def upload_asset_to_storage(file_content: bytes, filename: str, content_type: str) -> str:
    """
    Upload a file to the 'project-assets' bucket and return the public URL.
    """
    if not supabase:
        raise RuntimeError("Supabase is not configured")
    
    bucket_name = "project-assets"
    
    # Ensure the bucket exists (auto-create if not)
    try:
        supabase.storage.get_bucket(bucket_name)
    except Exception:
        try:
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"✅ Created storage bucket: {bucket_name}")
        except Exception as e:
            print(f"⚠️ Bucket creation failed (may already exist): {e}")
    
    # Upload file
    supabase.storage.from_(bucket_name).upload(
        path=filename,
        file=file_content,
        file_options={"content-type": content_type, "upsert": "true"}
    )
    
    # Get public URL
    public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
    
    return public_url

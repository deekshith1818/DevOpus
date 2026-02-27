"""
One-time migration: Re-number all existing versions to be project-specific (v1, v2, v3...).
Run once: python fix_versions.py
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_KEY", "")
)

# 1. Get all distinct project IDs that have versions
all_versions = supabase.table("versions").select("id, project_id, created_at, version_number").order("created_at", desc=False).execute()

if not all_versions.data:
    print("No versions found.")
    exit()

# 2. Group by project_id
projects = {}
for v in all_versions.data:
    pid = v["project_id"]
    if pid not in projects:
        projects[pid] = []
    projects[pid].append(v)

# 3. Re-number each project's versions starting from 1
total_updated = 0
for pid, versions in projects.items():
    print(f"\nProject {pid}: {len(versions)} versions")
    for i, v in enumerate(versions, start=1):
        old_num = v.get("version_number")
        if old_num != i:
            supabase.table("versions").update({"version_number": i}).eq("id", v["id"]).execute()
            print(f"  v{old_num} -> v{i} (id: {v['id'][:8]}...)")
            total_updated += 1
        else:
            print(f"  v{i} already correct")

print(f"\nDone! Updated {total_updated} version numbers across {len(projects)} projects.")

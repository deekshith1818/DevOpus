import base64
from typing import Dict
from github import Github, InputGitTreeElement
from fastapi import HTTPException

def create_github_repo(github_token: str, repo_name: str, files: Dict[str, str], description: str = "Generated with DevOpus"):
    """
    Creates a new GitHub repository and pushes the provided files to it.
    
    Args:
        github_token: User's GitHub OAuth token
        repo_name: Name for the new repository
        files: Dictionary of filename -> content
        description: Repository description
        
    Returns:
        str: URL of the created repository
    """
    try:
        # Authenticate
        g = Github(github_token)
        user = g.get_user()
        
        # 1. Get or Create Repo
        repo = None
        try:
            repo = user.get_repo(repo_name)
        except Exception:
            try:
                # auto_init=True creates an initial commit with a README
                repo = user.create_repo(repo_name, description=description, auto_init=True)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to create repository: {str(e)}")

        # 2. Create Blobs and Tree
        elements = []
        for file_path, content in files.items():
            path = file_path.lstrip('/')
            blob = repo.create_git_blob(content, "utf-8")
            elements.append(InputGitTreeElement(path=path, mode='100644', type='blob', sha=blob.sha))

        # 3. Handle Branch Reference / Commits
        branch_name = "main"
        ref_name = f"heads/{branch_name}" # GitHub API expects 'heads/branch', PyGithub might use 'refs/heads/branch'
        full_ref_name = f"refs/heads/{branch_name}"

        try:
            # Try to get existing reference
            # Note: get_git_ref expects "heads/main" or "refs/heads/main" depending on library version, 
            # but usually "heads/main" works best for get_git_ref(ref) where ref is "heads/main"
            # actually PyGithub get_git_ref takes the full part after /repos/{owner}/{repo}/git/ref/
            # usually like "heads/main"
            
            ref = repo.get_git_ref(ref_name)
            
            # IF FOUND (Update)
            # Get latest commit SHA to use as parent
            latest_commit_sha = ref.object.sha
            base_tree = repo.get_git_tree(latest_commit_sha)
            
            # Create new tree
            tree = repo.create_git_tree(elements, base_tree)
            
            # Create commit with parent
            parent_commits = [repo.get_git_commit(latest_commit_sha)]
            message = "Update via DevOpus 🚀"
            new_commit = repo.create_git_commit(message, tree, parent_commits)
            
            # Update ref
            ref.edit(new_commit.sha)
            
        except Exception:
            # IF NOT FOUND (Create)
            # This handles the case where repo exists but might be empty or correct ref doesn't exist
            # If auto_init=True was just used, ref SHOULD exist.
            # But if we created it manually or some other state.
            
            # Verify if we have a default branch at all
            try:
                default_branch = repo.default_branch
                if default_branch:
                     # If default branch exists (e.g. master), we might be trying to create 'main'
                     # Let's just create 'main' from scratch or from default
                     pass
            except:
                pass

            # Create new tree (no base)
            tree = repo.create_git_tree(elements)
            
            # Create commit (no parents)
            message = "Initial commit via DevOpus 🚀"
            new_commit = repo.create_git_commit(message, tree, [])
            
            # Create ref
            try:
                repo.create_git_ref(full_ref_name, new_commit.sha)
            except Exception as e:
                 # Last ditch effort: maybe it was 'master'?
                 if branch_name == 'main':
                     try:
                         repo.create_git_ref("refs/heads/master", new_commit.sha)
                     except:
                         raise e
                 else:
                     raise e

        return repo.html_url
            
        return repo.html_url

    except Exception as e:
        print(f"GitHub Export Error: {str(e)}")
        # Re-raise HTTP exceptions, wrap others
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to export to GitHub: {str(e)}")

from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class File(BaseModel):
    path: str = Field(description="The path to the file to be created or modified")
    purpose: str = Field(description="The purpose of the file, e.g. 'main application logic', 'data processing module', etc.")
    

class Plan(BaseModel):
    name: str = Field(description="The name of app to be built")
    description: str = Field(description="A oneline description of the app to be built, e.g. 'A web application for managing personal finances'")
    techstack: str = Field(description="The tech stack to be used for the app, e.g. 'python', 'javascript', 'react', 'flask', etc.")
    features: list[str] = Field(description="A list of features that the app should have, e.g. 'user authentication', 'data visualization', etc.")
    files: list[File] = Field(description="A list of files to be created, each with a 'path' and 'purpose'")


class ImplementationTask(BaseModel):
    filepath: str = Field(description="The path to the file to be modified")
    task_description: str = Field(description="A detailed description of the task to be performed on the file, e.g. 'add user authentication', 'implement data processing logic', etc.")


class TaskPlan(BaseModel):
    architecture_diagram: str = Field(
        default="", 
        description="A Mermaid.js graph TD code string representing the component architecture (e.g., 'graph TD; A[App] --> B[Header];')"
    )
    implementation_steps: list[ImplementationTask] = Field(description="A list of steps to be taken to implement the task")
    model_config = ConfigDict(extra="allow")


class CoderState(BaseModel):
    task_plan: TaskPlan = Field(description="The plan for the task to be implemented")
    current_step_idx: int = Field(0, description="The index of the current step in the implementation steps")
    current_file_content: Optional[str] = Field(None, description="The content of the file currently being edited or created")


class GeneratedFile(BaseModel):
    """Represents a single generated file with path and content."""
    path: str = Field(description="The file path, e.g., '/App.tsx', '/components/Header.tsx'")
    content: str = Field(description="The complete code content of the file")


class GeneratedProject(BaseModel):
    """The complete output from the coder agent - a dictionary of file paths to code content."""
    files: dict[str, str] = Field(
        default_factory=dict,
        description="A dictionary where keys are file paths (e.g., '/App.tsx') and values are the complete code strings"
    )
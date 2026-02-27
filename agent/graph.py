import json
import re
from typing import Optional
from dotenv import load_dotenv
from langchain.globals import set_verbose, set_debug
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.constants import END
from langgraph.graph import StateGraph

from agent.prompts import planner_prompt, architect_prompt, coder_system_prompt, coder_task_prompt
from agent.states import Plan, TaskPlan, GeneratedProject

_ = load_dotenv()

set_debug(True)
set_verbose(True)

# Model configuration - separate models for each role
# Planner & Architect: Claude Sonnet 4.5 (high intelligence for planning)
# Coder: Claude Haiku 4.5 (cost-efficient for code generation)
# max_tokens increased to prevent truncation on complex tasks

planner_llm = ChatAnthropic(model="claude-sonnet-4-6", temperature=0, max_tokens=4096)
architect_llm = ChatAnthropic(model="claude-sonnet-4-6", temperature=0, max_tokens=8192)
coder_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=16384)


def planner_agent(state: dict) -> dict:
    """Converts user prompt into a structured Plan. Supports vision for image inputs."""
    user_prompt = state["user_prompt"]
    image_data: Optional[str] = state.get("image_data")
    image_mime_type: Optional[str] = state.get("image_mime_type", "image/png")
    
    # Get the formatted planner prompt as system context
    system_prompt = planner_prompt(user_prompt)
    
    if image_data:
        # Multimodal message: Use vision to analyze the uploaded image
        print("[planner_agent] Using vision mode with uploaded image")
        
        # Construct multimodal content for Claude
        human_content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_mime_type,
                    "data": image_data
                }
            },
            {
                "type": "text",
                "text": f"""Analyze this image carefully. Based on what you see:

1. If it's a UI/design mockup: Plan to replicate the exact layout, colors, components, and styling.
2. If it's a wireframe: Use this as the structural basis for the UI design.
3. If it's a photo/logo: Incorporate this appropriately (profile image, branding, etc.).

User's request: {user_prompt}

Now create a detailed product plan as specified in the system instructions."""
            }
        ]
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_content)
        ]
        
        resp = planner_llm.with_structured_output(Plan).invoke(messages)
    else:
        # Standard text-only planner
        resp = planner_llm.with_structured_output(Plan).invoke(system_prompt)
    
    if resp is None:
        raise ValueError("Planner did not return a valid response.")
    return {"plan": resp}


def architect_agent(state: dict) -> dict:
    """Creates TaskPlan from Plan."""
    plan: Plan = state["plan"]
    resp = architect_llm.with_structured_output(TaskPlan).invoke(
        architect_prompt(plan=plan.model_dump_json())
    )
    if resp is None:
        raise ValueError("Architect did not return a valid response.")

    resp.plan = plan
    print(resp.model_dump_json())
    return {"task_plan": resp}


def coder_agent(state: dict) -> dict:
    """
    Headless coder agent that generates code as JSON.
    Does NOT write files to disk - returns a dictionary of file paths to code content.
    """
    task_plan: TaskPlan = state["task_plan"]
    
    system_prompt = coder_system_prompt()
    user_prompt = coder_task_prompt(task_plan.model_dump_json())
    
    # Invoke the LLM to get the generated code as JSON
    response = coder_llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ])
    
    # Parse the JSON response
    response_text = response.content
    
    # Strip markdown code blocks if present
    # Handle ```json ... ``` or ``` ... ```
    cleaned_text = response_text.strip()
    if cleaned_text.startswith("```"):
        # Remove opening fence (```json or ```)
        lines = cleaned_text.split('\n')
        # Skip first line (opening fence) and remove closing fence
        json_lines = []
        for i, line in enumerate(lines):
            if i == 0:  # Skip opening fence
                continue
            if line.strip() == "```":  # Skip closing fence
                continue
            json_lines.append(line)
        cleaned_text = '\n'.join(json_lines)
    
    # Try to extract JSON from the response
    try:
        generated_data = json.loads(cleaned_text)
    except json.JSONDecodeError:
        # Fallback: find JSON object pattern
        json_match = re.search(r'\{[\s\S]*\}', cleaned_text)
        if json_match:
            try:
                generated_data = json.loads(json_match.group(0))
            except json.JSONDecodeError as e:
                raise ValueError(f"Could not parse JSON: {str(e)}\nResponse preview: {cleaned_text[:500]}")
        else:
            raise ValueError(f"No JSON object found in coder response: {cleaned_text[:500]}")
    
    # Extract files from the response
    if "files" in generated_data:
        files_dict = generated_data["files"]
    else:
        # Assume the entire response is the files dictionary
        files_dict = generated_data
    
    # POST-PROCESSING: Remove any App.js files to prevent conflicts
    # The frontend expects only App.tsx
    files_to_remove = []
    for path in files_dict.keys():
        normalized = path.lower()
        # Remove App.js, App.jsx, /App.js, /App.jsx
        if normalized in ['/app.js', '/app.jsx', 'app.js', 'app.jsx']:
            files_to_remove.append(path)
    
    for path in files_to_remove:
        print(f"[coder_agent] Removing conflicting file: {path}")
        del files_dict[path]
    
    generated_project = GeneratedProject(files=files_dict)
    
    return {"generated_project": generated_project, "status": "DONE"}


# Build the graph
graph = StateGraph(dict)

graph.add_node("planner", planner_agent)
graph.add_node("architect", architect_agent)
graph.add_node("coder", coder_agent)

graph.add_edge("planner", "architect")
graph.add_edge("architect", "coder")
graph.add_edge("coder", END)

graph.set_entry_point("planner")
agent = graph.compile()


if __name__ == "__main__":
    result = agent.invoke(
        {"user_prompt": "Build a colourful modern todo app in React"},
        {"recursion_limit": 100}
    )
    print("Final State:", result)
    if "generated_project" in result:
        print("\nGenerated Files:")
        for path, content in result["generated_project"].files.items():
            print(f"\n--- {path} ---")
            print(content[:200] + "..." if len(content) > 200 else content)

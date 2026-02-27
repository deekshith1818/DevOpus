"""
Multimodal processing utilities for handling images and PDFs.
"""
import base64
import io
from typing import Optional, TypedDict
from pypdf import PdfReader


class MultimodalResult(TypedDict):
    """Result of multimodal processing."""
    text: str
    image_data: Optional[str]  # Base64 raw string (without data: prefix)
    image_mime_type: Optional[str]


class AttachmentInput(TypedDict, total=False):
    """Input attachment structure from frontend."""
    name: str
    type: str  # 'image' or 'pdf'
    data: str  # Base64 data URL
    mimeType: str


def process_multimodal_input(
    user_prompt: str, 
    attachment: Optional[AttachmentInput] = None
) -> MultimodalResult:
    """
    Process multimodal input containing text and optional attachment.
    
    Args:
        user_prompt: The user's text prompt
        attachment: Optional attachment dict with name, type, data, mimeType
        
    Returns:
        MultimodalResult with processed text and optional image data
    """
    # Case 1: No attachment
    if not attachment:
        return {
            "text": user_prompt,
            "image_data": None,
            "image_mime_type": None
        }
    
    attachment_type = attachment.get("type", "")
    data_url = attachment.get("data", "")
    mime_type = attachment.get("mimeType", "")
    filename = attachment.get("name", "uploaded_file")
    
    # Case 2: PDF - Extract text and append to prompt
    if attachment_type == "pdf" or mime_type == "application/pdf":
        return _process_pdf_attachment(user_prompt, data_url, filename)
    
    # Case 3: Image - Extract base64 for vision API
    if attachment_type == "image" or mime_type.startswith("image/"):
        return _process_image_attachment(user_prompt, data_url, mime_type)
    
    # Unknown type - return as-is
    print(f"Warning: Unknown attachment type: {attachment_type}, mime: {mime_type}")
    return {
        "text": user_prompt,
        "image_data": None,
        "image_mime_type": None
    }


def _process_pdf_attachment(
    user_prompt: str, 
    data_url: str, 
    filename: str
) -> MultimodalResult:
    """
    Process PDF attachment by extracting text and appending to prompt.
    
    Args:
        user_prompt: Original user prompt
        data_url: Base64 data URL of the PDF
        filename: Name of the uploaded file
        
    Returns:
        MultimodalResult with enriched text prompt
    """
    try:
        # Remove data URL prefix to get raw base64
        # Format: data:application/pdf;base64,<base64_data>
        if ";base64," in data_url:
            base64_data = data_url.split(";base64,")[1]
        else:
            base64_data = data_url
        
        # Decode base64 to bytes
        pdf_bytes = base64.b64decode(base64_data)
        pdf_stream = io.BytesIO(pdf_bytes)
        
        # Extract text from PDF
        reader = PdfReader(pdf_stream)
        extracted_text = []
        
        for page_num, page in enumerate(reader.pages, 1):
            page_text = page.extract_text()
            if page_text:
                extracted_text.append(f"--- Page {page_num} ---\n{page_text}")
        
        full_text = "\n\n".join(extracted_text)
        
        if not full_text.strip():
            full_text = "(No readable text could be extracted from this PDF)"
        
        # Create enriched prompt with document context
        enriched_prompt = f"""{user_prompt}

[CONTEXT: UPLOADED DOCUMENT - {filename}]
{full_text}
[/CONTEXT]

IMPORTANT: Use the document above to inform the project plan. If this appears to be a resume/CV, create a portfolio website showcasing the person's skills, experience, and projects."""
        
        return {
            "text": enriched_prompt,
            "image_data": None,
            "image_mime_type": None
        }
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        # Return original prompt with error note
        error_prompt = f"{user_prompt}\n\n[Note: A PDF was uploaded ({filename}) but could not be processed: {str(e)}]"
        return {
            "text": error_prompt,
            "image_data": None,
            "image_mime_type": None
        }


def _process_image_attachment(
    user_prompt: str, 
    data_url: str, 
    mime_type: str
) -> MultimodalResult:
    """
    Process image attachment by extracting base64 for vision API.
    
    Args:
        user_prompt: Original user prompt
        data_url: Base64 data URL of the image
        mime_type: MIME type of the image
        
    Returns:
        MultimodalResult with image data for vision API
    """
    try:
        # Remove data URL prefix to get raw base64
        # Format: data:image/png;base64,<base64_data>
        if ";base64," in data_url:
            base64_data = data_url.split(";base64,")[1]
        else:
            base64_data = data_url
        
        # Enhance prompt for image-based generation
        enhanced_prompt = f"""{user_prompt}

IMPORTANT CONTEXT: The user has uploaded an image. Analyze this image carefully:
- If it's a UI screenshot or design mockup: Replicate the layout, colors, components, and styling as closely as possible.
- If it's a photo of a person: This is likely for a portfolio - use this as a profile image placeholder.
- If it's a logo or branding: Incorporate these brand elements into the design.
- If it's a wireframe or sketch: Use this as the structural basis for the UI."""
        
        return {
            "text": enhanced_prompt,
            "image_data": base64_data,
            "image_mime_type": mime_type or "image/png"
        }
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return {
            "text": user_prompt,
            "image_data": None,
            "image_mime_type": None
        }


def create_vision_message_content(text: str, image_data: Optional[str], mime_type: Optional[str]) -> list:
    """
    Create message content array for vision-enabled LLM calls.
    
    Args:
        text: The text prompt
        image_data: Optional base64 image data (without data: prefix)
        mime_type: MIME type of the image
        
    Returns:
        List of content blocks for the LLM message
    """
    content = []
    
    # Add image if present
    if image_data and mime_type:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": mime_type,
                "data": image_data
            }
        })
    
    # Add text
    content.append({
        "type": "text",
        "text": text
    })
    
    return content

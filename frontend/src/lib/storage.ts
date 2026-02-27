/**
 * Uploads an asset to the backend storage and returns the public URL.
 * @param fileData - Base64 data URL of the file
 * @param fileName - Name of the file
 * @param fileType - MIME type of the file
 * @returns Promise resolving to the public URL or null if failed
 */
export async function uploadAsset(fileData: string, fileName: string, _fileType: string): Promise<string | null> {
    try {
        // Convert base64 data URL to Blob
        const response = await fetch(fileData);
        const blob = await response.blob();

        const formData = new FormData();
        formData.append('file', blob, fileName);

        const uploadResponse = await fetch('http://localhost:8000/api/upload-asset', {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            console.error('Upload failed:', uploadResponse.status, errorData);
            throw new Error(errorData.detail || `Upload failed with status ${uploadResponse.status}`);
        }

        const data = await uploadResponse.json();
        return data.url;
    } catch (error) {
        console.error('Asset upload error:', error);
        return null;
    }
}

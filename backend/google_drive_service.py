from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from pathlib import Path
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class GoogleDriveService:
    """Service for managing files on Google Drive"""
    
    FOLDER_STRUCTURE = {
        'Рахунки': None,
        'Договори': None,
        'Акти': None,
        'Замовлення': None,
        'Видаткові накладні': None
    }
    
    def __init__(self, credentials_path: str):
        """Initialize Google Drive service with credentials"""
        self.credentials_path = credentials_path
        self.service = None
        self.root_folder_id = None
        self._initialize_service()
        
    def _initialize_service(self):
        """Initialize the Google Drive API service"""
        try:
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=['https://www.googleapis.com/auth/drive']
            )
            self.service = build('drive', 'v3', credentials=credentials)
            logger.info("Google Drive service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Google Drive service: {str(e)}")
            raise
    
    def create_folder(self, folder_name: str, parent_folder_id: Optional[str] = None) -> str:
        """Create a folder in Google Drive and return its ID"""
        try:
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            
            if parent_folder_id:
                file_metadata['parents'] = [parent_folder_id]
            
            folder = self.service.files().create(
                body=file_metadata,
                fields='id, webViewLink'
            ).execute()
            
            # Make folder accessible to anyone with the link
            permission = {
                'type': 'anyone',
                'role': 'reader'
            }
            self.service.permissions().create(
                fileId=folder['id'],
                body=permission
            ).execute()
            
            logger.info(f"Created folder '{folder_name}' with ID: {folder['id']}")
            return folder['id']
            
        except Exception as e:
            logger.error(f"Error creating folder '{folder_name}': {str(e)}")
            raise
    
    def find_folder(self, folder_name: str, parent_folder_id: Optional[str] = None) -> Optional[str]:
        """Find a folder by name and return its ID"""
        try:
            query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            
            if parent_folder_id:
                query += f" and '{parent_folder_id}' in parents"
            
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            items = results.get('files', [])
            if items:
                return items[0]['id']
            return None
            
        except Exception as e:
            logger.error(f"Error finding folder '{folder_name}': {str(e)}")
            return None
    
    def setup_folder_structure(self) -> Dict[str, str]:
        """Create or find the folder structure and return folder IDs"""
        try:
            # Create or find root folder
            root_folder_name = 'Документи КНП'
            root_id = self.find_folder(root_folder_name)
            
            if not root_id:
                root_id = self.create_folder(root_folder_name)
            
            self.root_folder_id = root_id
            logger.info(f"Root folder ID: {root_id}")
            
            # Create or find subfolders
            for folder_name in self.FOLDER_STRUCTURE.keys():
                folder_id = self.find_folder(folder_name, root_id)
                
                if not folder_id:
                    folder_id = self.create_folder(folder_name, root_id)
                
                self.FOLDER_STRUCTURE[folder_name] = folder_id
                logger.info(f"Folder '{folder_name}' ID: {folder_id}")
            
            return self.FOLDER_STRUCTURE
            
        except Exception as e:
            logger.error(f"Error setting up folder structure: {str(e)}")
            raise
    
    def upload_file(
        self,
        file_path: str,
        folder_name: str,
        custom_name: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Upload a file to Google Drive and return file info
        
        Args:
            file_path: Path to the local file
            folder_name: Name of the folder (must be in FOLDER_STRUCTURE)
            custom_name: Optional custom name for the file
            
        Returns:
            Dict with file_id, webViewLink, and webContentLink
        """
        try:
            # Ensure folder structure exists
            if not self.FOLDER_STRUCTURE.get(folder_name):
                self.setup_folder_structure()
            
            folder_id = self.FOLDER_STRUCTURE.get(folder_name)
            if not folder_id:
                raise ValueError(f"Folder '{folder_name}' not found in structure")
            
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Prepare file metadata
            file_name = custom_name if custom_name else file_path.name
            file_metadata = {
                'name': file_name,
                'parents': [folder_id]
            }
            
            # Upload file
            media = MediaFileUpload(str(file_path), resumable=True)
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink, webContentLink'
            ).execute()
            
            # Make file accessible to anyone with the link
            permission = {
                'type': 'anyone',
                'role': 'reader'
            }
            self.service.permissions().create(
                fileId=file['id'],
                body=permission
            ).execute()
            
            logger.info(f"Uploaded file '{file_name}' to folder '{folder_name}'")
            
            return {
                'file_id': file['id'],
                'web_view_link': file['webViewLink'],
                'web_content_link': file.get('webContentLink', '')
            }
            
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            raise
    
    def delete_file(self, file_id: str):
        """Delete a file from Google Drive"""
        try:
            self.service.files().delete(fileId=file_id).execute()
            logger.info(f"Deleted file with ID: {file_id}")
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            raise
    
    def get_file_link(self, file_id: str) -> Dict[str, str]:
        """Get links for a file"""
        try:
            file = self.service.files().get(
                fileId=file_id,
                fields='webViewLink, webContentLink'
            ).execute()
            
            return {
                'web_view_link': file.get('webViewLink', ''),
                'web_content_link': file.get('webContentLink', '')
            }
        except Exception as e:
            logger.error(f"Error getting file link: {str(e)}")
            raise

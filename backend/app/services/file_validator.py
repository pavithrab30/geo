"""
Secure file validation service.
Prevents ZIP Slip attacks, validates file types and contents.
"""
import logging
import os
import zipfile
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)

ALLOWED_SHAPEFILE_EXTENSIONS = {".shp", ".shx", ".dbf", ".prj", ".cpg", ".sbn", ".sbx"}
REQUIRED_SHAPEFILE_EXTENSIONS = {".shp", ".shx", ".dbf"}


def validate_zip_shapefile(zip_path: Path) -> Tuple[bool, str]:
    """
    Validate a ZIP file containing a Shapefile.

    Checks:
    - Valid ZIP format
    - No ZIP Slip path traversal
    - Contains required .shp, .shx, .dbf files
    - No executable or dangerous file types
    - File size limits per entry

    Returns (is_valid, error_message)
    """
    DANGEROUS_EXTENSIONS = {".exe", ".bat", ".cmd", ".sh", ".ps1", ".py", ".js", ".php"}
    MAX_ENTRY_SIZE = 500 * 1024 * 1024  # 500 MB per entry

    if not zipfile.is_zipfile(zip_path):
        return False, "Uploaded file is not a valid ZIP archive."

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()

            # ZIP Slip prevention: reject any entry with path traversal
            for name in names:
                resolved = os.path.normpath(name)
                if resolved.startswith("..") or os.path.isabs(resolved):
                    logger.warning("ZIP Slip attempt detected: %s", name)
                    return False, f"Security violation: path traversal detected in '{name}'."

            # Reject dangerous file types
            for name in names:
                ext = Path(name).suffix.lower()
                if ext in DANGEROUS_EXTENSIONS:
                    return False, f"Dangerous file type detected in archive: '{name}'."

            # Check entry sizes to prevent zip bombs
            for info in zf.infolist():
                if info.file_size > MAX_ENTRY_SIZE:
                    return False, f"Entry '{info.filename}' exceeds maximum allowed size."

            # Collect shapefile-related extensions (flatten nested dirs)
            found_extensions = set()
            for name in names:
                ext = Path(name).suffix.lower()
                if ext in ALLOWED_SHAPEFILE_EXTENSIONS:
                    found_extensions.add(ext)

            missing = REQUIRED_SHAPEFILE_EXTENSIONS - found_extensions
            if missing:
                return (
                    False,
                    f"Missing required Shapefile components: {', '.join(sorted(missing))}. "
                    f"ZIP must contain .shp, .shx and .dbf files.",
                )

    except zipfile.BadZipFile as exc:
        logger.error("Bad ZIP file: %s", exc)
        return False, "Corrupted or invalid ZIP file."
    except Exception as exc:
        logger.error("Unexpected error validating ZIP: %s", exc)
        return False, f"Failed to validate ZIP file: {exc}"

    return True, ""


def validate_kml_file(file_path: Path) -> Tuple[bool, str]:
    """
    Basic validation for KML files.
    Checks XML structure and KML namespace presence.
    """
    try:
        content = file_path.read_bytes()
        # Check for KML namespace markers
        if b"kml" not in content.lower():
            return False, "File does not appear to be a valid KML document."
        # Try parsing as XML
        import xml.etree.ElementTree as ET  # noqa: PLC0415
        ET.fromstring(content)
    except ET.ParseError as exc:
        return False, f"KML file is not valid XML: {exc}"
    except Exception as exc:
        return False, f"Could not validate KML file: {exc}"

    return True, ""
